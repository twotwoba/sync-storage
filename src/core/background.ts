import { checkWhetherTabExists } from "@/lib/utils"
import { injectSyncOnceScript } from "./inject-sycn-imme"

/**
 * onInstalled hook
 * This is triggered when the extension is installed or updated.
 */
chrome.runtime.onInstalled.addListener(({ reason }) => {
	// This is a new installation, do something like showing a welcome message
	if (reason === "install") {
		chrome.storage.session.setAccessLevel({
			accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS"
		})
	}
})

/**
 * onMessage hook
 * This is triggered when messages are sent from content scripts or popup scripts.
 */
chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
	try {
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
		}

		/* if (message.type === "sync_observe") {
			const { source, target, keys } = message.payload
			const sourceTabId = await checkWhetherTabExists(source)
			const targetTabId = await checkWhetherTabExists(target)
			await injectSyncObserveScript(sourceTabId, targetTabId, keys)
		} */

		// if (message.type === "update_target_state") {
		// 	;(async () => {
		// 		const { tabId, data, cookie } = message.payload
		// 		await updateTargetState(tabId, data, cookie)
		// 	})()
		// }

		return true
	} catch (error) {
		console.error("Error handling message:", error)
		return false
	}
})

// [TODO]
chrome.tabs.onRemoved.addListener((tabId) => {
	chrome.tabs.sendMessage(tabId, { type: "cleanup" })
	return true
})
