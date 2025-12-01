import { checkWhetherTabExists, isUrlMatch } from "@/lib/utils"
import {
	activeRules,
	observeStates,
	onSourceTabReady,
	onTargetTabReady,
	startObserve,
	stopObserve,
	trySync
} from "./core"
import { injectSyncOnceScript } from "./inject-sycn-imme"

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
