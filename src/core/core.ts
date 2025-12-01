// ============================================
// 监听规则状态管理
// ============================================

import { isUrlMatch } from "@/lib/utils"
import { cleanupSourceDetector, injectSourceDetector, performSync } from "./inject-sync-observe"

/**
 * 监听规则类型
 */
export interface ObserveRule {
	id: string
	sourceUrl: string
	targetUrl: string
	keys: string[]
	enabled: boolean
}

/**
 * 监听状态类型
 */
export interface ObserveState {
	sourceTabId: number | null
	targetTabId: number | null
	isSourceReady: boolean // 源站是否有需要同步的数据
	lastSyncTime: number
}

export const activeRules = new Map<string, ObserveRule>()
export const observeStates = new Map<string, ObserveState>()

/**
 * 启动监听规则
 */
export async function startObserve(rule: ObserveRule) {
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
export async function stopObserve(ruleId: string) {
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
export async function onSourceTabReady(ruleId: string, tabId: number) {
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
export function onTargetTabReady(ruleId: string, tabId: number) {
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
export async function trySync(ruleId: string) {
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
