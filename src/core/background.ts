import { checkWhetherTabExists, isUrlMatch } from "@/lib/utils"
import { injectSyncOnceScript } from "./inject-sycn-imme"
import {
	cleanupSourceDetector,
	injectSourceDetector,
	type ObserveRule,
	type ObserveState,
	performSync
} from "./inject-sync-observe"

// ============================================
// 监听规则状态管理
// ============================================
const activeRules = new Map<string, ObserveRule>()
const observeStates = new Map<string, ObserveState>()

/**
 * 启动监听规则
 */
async function startObserve(rule: ObserveRule) {
	console.log("[Observe] Starting observe for rule:", rule.id)

	activeRules.set(rule.id, rule)
	observeStates.set(rule.id, {
		sourceTabId: null,
		targetTabId: null,
		isSourceReady: false,
		lastSyncTime: 0
	})

	// 检查现有的 tabs
	await checkExistingTabs(rule)
}

/**
 * 停止监听规则
 */
async function stopObserve(ruleId: string) {
	console.log("[Observe] Stopping observe for rule:", ruleId)

	const state = observeStates.get(ruleId)
	if (state?.sourceTabId) {
		await cleanupSourceDetector(state.sourceTabId, ruleId)
	}

	activeRules.delete(ruleId)
	observeStates.delete(ruleId)
}

/**
 * 检查现有的 tabs 是否匹配规则
 */
async function checkExistingTabs(rule: ObserveRule) {
	const tabs = await chrome.tabs.query({})
	const state = observeStates.get(rule.id)
	if (!state) return

	for (const tab of tabs) {
		if (tab.id && tab.url) {
			if (isUrlMatch(tab.url, rule.sourceUrl)) {
				await onSourceTabReady(rule.id, tab.id)
			}
			if (isUrlMatch(tab.url, rule.targetUrl)) {
				onTargetTabReady(rule.id, tab.id)
			}
		}
	}
}

/**
 * 源 tab 准备就绪
 */
async function onSourceTabReady(ruleId: string, tabId: number) {
	const state = observeStates.get(ruleId)
	const rule = activeRules.get(ruleId)
	if (!state || !rule) return

	// 如果是新的 source tab，清理旧的检测器
	if (state.sourceTabId && state.sourceTabId !== tabId) {
		await cleanupSourceDetector(state.sourceTabId, ruleId)
	}

	state.sourceTabId = tabId
	console.log("[Observe] Source tab ready:", tabId, "for rule:", ruleId)

	// 注入检测脚本
	await injectSourceDetector(tabId, ruleId, rule.keys)
}

/**
 * 目标 tab 准备就绪
 */
function onTargetTabReady(ruleId: string, tabId: number) {
	const state = observeStates.get(ruleId)
	if (!state) return

	state.targetTabId = tabId
	console.log("[Observe] Target tab ready:", tabId, "for rule:", ruleId)

	// 检查是否可以同步
	trySync(ruleId)
}

/**
 * 尝试执行同步
 */
async function trySync(ruleId: string) {
	const state = observeStates.get(ruleId)
	const rule = activeRules.get(ruleId)
	if (!state || !rule) return

	// 检查所有条件
	if (!state.sourceTabId || !state.targetTabId || !state.isSourceReady) {
		console.log("[Observe] Sync conditions not met:", {
			sourceTabId: state.sourceTabId,
			targetTabId: state.targetTabId,
			isSourceReady: state.isSourceReady
		})
		return
	}

	// 防止重复同步（5秒内不重复）
	const now = Date.now()
	if (now - state.lastSyncTime < 5000) {
		console.log("[Observe] Sync throttled")
		return
	}

	console.log("[Observe] All conditions met, performing sync...")
	state.lastSyncTime = now

	const result = await performSync(state.sourceTabId, state.targetTabId, rule.keys)
	console.log("[Observe] Sync result:", result)

	// 通知 popup 同步完成
	chrome.runtime
		.sendMessage({
			type: "observe_sync_complete",
			payload: { ruleId, ...result }
		})
		.catch(() => {
			// popup 可能没打开，忽略错误
		})
}

// ============================================
// Chrome 事件监听
// ============================================

/**
 * onInstalled hook
 */
chrome.runtime.onInstalled.addListener(({ reason }) => {
	if (reason === "install") {
		chrome.storage.session.setAccessLevel({
			accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS"
		})
	}
})

/**
 * Tab 更新事件 - 检测 tab 打开和导航
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	// 只在页面加载完成时处理
	if (changeInfo.status !== "complete" || !tab.url) return

	for (const [ruleId, rule] of activeRules) {
		if (isUrlMatch(tab.url, rule.sourceUrl)) {
			onSourceTabReady(ruleId, tabId)
		}
		if (isUrlMatch(tab.url, rule.targetUrl)) {
			onTargetTabReady(ruleId, tabId)
		}
	}
})

/**
 * Tab 关闭事件 - 清理状态
 */
chrome.tabs.onRemoved.addListener((tabId) => {
	for (const [ruleId, state] of observeStates) {
		if (state.sourceTabId === tabId) {
			state.sourceTabId = null
			state.isSourceReady = false
			console.log("[Observe] Source tab closed for rule:", ruleId)
		}
		if (state.targetTabId === tabId) {
			state.targetTabId = null
			console.log("[Observe] Target tab closed for rule:", ruleId)
		}
	}
})

/**
 * onMessage hook
 */
chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
	try {
		// 立即同步
		if (message.type === "sync_once") {
			;(async () => {
				const { source, target, keys } = message.payload
				const sourceTabId = await checkWhetherTabExists(source)
				const targetTabId = await checkWhetherTabExists(target)
				const res = await injectSyncOnceScript(sourceTabId, targetTabId, keys)
				if (res?.error) {
					sendResponse(res)
				} else {
					sendResponse({ error: false, msg: "同步成功！" })
				}
			})()
			return true
		}

		// 开启监听
		if (message.type === "sync_observe_start") {
			const { id, source, target, keys } = message.payload
			;(async () => {
				await startObserve({
					id,
					sourceUrl: source,
					targetUrl: target,
					keys,
					enabled: true
				})
				sendResponse({ error: false, msg: "监听已开启" })
			})()
			return true
		}

		// 停止监听
		if (message.type === "sync_observe_stop") {
			const { id } = message.payload
			;(async () => {
				await stopObserve(id)
				sendResponse({ error: false, msg: "监听已停止" })
			})()
			return true
		}

		// 源页面登录状态更新
		if (message.type === "observe_source_status") {
			const { ruleId, isReady } = message.payload
			const state = observeStates.get(ruleId)
			if (state) {
				const wasReady = state.isSourceReady
				state.isSourceReady = isReady
				// 如果从未就绪变为就绪，尝试同步
				if (!wasReady && isReady) {
					console.log("[Observe] Source became ready for rule:", ruleId)
					trySync(ruleId)
				}
			}
			return true
		}

		// 查询监听状态
		if (message.type === "sync_observe_status") {
			const { id } = message.payload
			const isActive = activeRules.has(id)
			const state = observeStates.get(id)
			sendResponse({
				isActive,
				state: state
					? {
							hasSource: !!state.sourceTabId,
							hasTarget: !!state.targetTabId,
							isSourceReady: state.isSourceReady
						}
					: null
			})
			return true
		}

		return true
	} catch (error) {
		console.error("Error handling message:", error)
		return false
	}
})
