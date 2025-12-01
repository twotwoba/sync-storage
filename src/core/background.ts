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
 * Tab updated event - detect tab open and navigation
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	// Only process when page load is complete
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
 * Tab removed event - cleanup state
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
		// Sync once
		if (message.type === "sync_once") {
			;(async () => {
				const { source, target, keys } = message.payload
				const sourceTabId = await checkWhetherTabExists(source)
				const targetTabId = await checkWhetherTabExists(target)
				const res = await injectSyncOnceScript(sourceTabId, targetTabId, keys)
				sendResponse(res)
			})()
			return true
		}

		// Start observing
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
				sendResponse({ error: false, msgKey: "observeStarted" })
			})()
			return true
		}

		// Stop observing
		if (message.type === "sync_observe_stop") {
			const { id } = message.payload
			;(async () => {
				await stopObserve(id)
				sendResponse({ error: false, msgKey: "observeStopped" })
			})()
			return true
		}

		// Source page login status update
		if (message.type === "observe_source_status") {
			const { ruleId, isReady } = message.payload
			const state = observeStates.get(ruleId)
			if (state) {
				const wasReady = state.isSourceReady
				state.isSourceReady = isReady
				// If changed from not ready to ready, try sync
				if (!wasReady && isReady) {
					console.log("[Observe] Source became ready for rule:", ruleId)
					trySync(ruleId)
				}
			}
			return true
		}

		// Query observe status
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
