// ============================================
// Observe rule state management
// ============================================

import { isUrlMatch } from "@/lib/utils"
import { cleanupSourceDetector, injectSourceDetector, performSync } from "./inject-sync-observe"

/**
 * Observe rule type
 */
export interface ObserveRule {
	id: string
	sourceUrl: string
	targetUrl: string
	keys: string[]
	enabled: boolean
}

/**
 * Observe state type
 */
export interface ObserveState {
	sourceTabId: number | null
	targetTabId: number | null
	isSourceReady: boolean // Whether source site has data to sync
	lastSyncTime: number
}

export const activeRules = new Map<string, ObserveRule>()
export const observeStates = new Map<string, ObserveState>()

const STORAGE_KEY = "__sync_storage_active_rules"

// Initialize: Load rules from storage to support background persistence
chrome.storage.local.get([STORAGE_KEY], (result) => {
	const storedRules = result[STORAGE_KEY] || []
	for (const rule of storedRules) {
		startObserve(rule, true)
	}
})

async function saveRulesToStorage() {
	const rulesArray = Array.from(activeRules.values())
	await chrome.storage.local.set({ [STORAGE_KEY]: rulesArray })
}

/**
 * Start observe rule
 */
export async function startObserve(rule: ObserveRule, skipReSave = false) {
	activeRules.set(rule.id, rule)
	observeStates.set(rule.id, {
		sourceTabId: null,
		targetTabId: null,
		isSourceReady: false,
		lastSyncTime: 0
	})

	if (!skipReSave) {
		await saveRulesToStorage()
	}

	// Check existing tabs
	await checkExistingTabs(rule)
}

/**
 * Stop observe rule
 */
export async function stopObserve(ruleId: string) {
	const state = observeStates.get(ruleId)
	if (state?.sourceTabId) {
		// Ensure we tell the content script to stop its interval
		await cleanupSourceDetector(state.sourceTabId, ruleId)
	}

	activeRules.delete(ruleId)
	observeStates.delete(ruleId)
	await saveRulesToStorage()
}

/**
 * Check if existing tabs match the rule
 */
async function checkExistingTabs(rule: ObserveRule) {
	const tabs = await chrome.tabs.query({})
	const state = observeStates.get(rule.id)
	if (!state) {
		return
	}

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
 * Source tab is ready
 */
export async function onSourceTabReady(ruleId: string, tabId: number) {
	const state = observeStates.get(ruleId)
	const rule = activeRules.get(ruleId)
	if (!state || !rule) {
		return
	}

	// If new source tab, cleanup old detector
	if (state.sourceTabId && state.sourceTabId !== tabId) {
		await cleanupSourceDetector(state.sourceTabId, ruleId)
	}

	state.sourceTabId = tabId

	// Inject detector script
	await injectSourceDetector(tabId, ruleId, rule.keys)
}

/**
 * Target tab is ready
 */
export function onTargetTabReady(ruleId: string, tabId: number) {
	const state = observeStates.get(ruleId)
	if (!state) {
		return
	}

	state.targetTabId = tabId

	// Check if sync is possible
	trySync(ruleId)
}

/**
 * Try to perform sync
 */
export async function trySync(ruleId: string) {
	const state = observeStates.get(ruleId)
	const rule = activeRules.get(ruleId)
	if (!state || !rule) {
		return null
	}

	// Check all conditions
	if (!state.sourceTabId || !state.targetTabId || !state.isSourceReady) {
		return null
	}

	// Prevent duplicate sync (no repeat within 2 seconds)
	const now = Date.now()
	if (now - state.lastSyncTime < 2000) {
		return null
	}

	state.lastSyncTime = now

	const result = await performSync(state.sourceTabId, state.targetTabId, rule.keys)

	// Notify popup that sync is complete
	chrome.runtime
		.sendMessage({
			type: "observe_sync_complete",
			payload: { ruleId, ...result }
		})
		.catch(() => {
			// Popup might not be open, ignore error
		})

	return result
}
