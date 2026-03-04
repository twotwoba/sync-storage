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
	if (changeInfo.status !== "complete" || !tab.url) {
		return
	}

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
	for (const state of Object.values(observeStates)) {
		if (state.sourceTabId === tabId) {
			state.sourceTabId = null
			state.isSourceReady = false
		}
		if (state.targetTabId === tabId) {
			state.targetTabId = null
		}
	}
})

/**
 * onMessage hook
 */
chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
	try {
		// Scenario A & B entry point: sync once
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

		// Start background observing (Scenario B - Wait for sync)
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
				sendResponse({ error: false })
			})()
			return true
		}

		// Stop background observing
		if (message.type === "sync_observe_stop") {
			const { id } = message.payload
			;(async () => {
				await stopObserve(id)
				sendResponse({ error: false })
			})()
			return true
		}

		// Source page login status update
		if (message.type === "observe_source_status") {
			const { ruleId, isReady } = message.payload
			const state = observeStates.get(ruleId)
			const rule = activeRules.get(ruleId)

			if (!rule || !state) {
				return true
			}

			const wasReady = state.isSourceReady
			state.isSourceReady = isReady

			if (!wasReady && isReady) {
				trySync(ruleId).then((result) => {
					if (result && !result.error) {
						// Auto cleanup after background sync completes
						stopObserve(ruleId)
					}
				})
			}
			return true
		}

		// Check current observe status
		if (message.type === "sync_check_observe_status") {
			const { id } = message.payload
			sendResponse({ isObserving: activeRules.has(id) })
			return true
		}

		return true
	} catch (error) {
		console.error("Error handling message:", error)
		return false
	}
})
