/**
 * sync immediately need opening both source and target tabs,
 * and ensure the source tab has logged in
 *
 * And here, sync data by watching this:
 * - source tab login status
 * - source tab open status
 * - target tab open status
 */
export async function injectSyncObserveScript(
	sourceTabId: number,
	targetTabId: number,
	keys: string[]
) {
	await chrome.scripting.executeScript({
		target: { tabId: sourceTabId },
		func: syncAtObserve,
		args: [targetTabId, keys]
	})
}

/**
 * Sync data from source tab to target tab while observing changes.
 * (of course, it will sync once immediately first)
 */
function syncAtObserve(targetTabId: number, keys: string[]) {
	// Clean up existing listeners
	// if (window.__storage_event_handler) {
	// 	window.removeEventListener("storage", window.__storage_event_handler)
	// }
	/** Storage event listener for cross-tab changes */
	// FIXME: storage event listener doesn't work in content script
	window.__storage_event_handler = (e: StorageEvent) => {
		if (e.key && keys.includes(e.key)) {
			const cookie = document.cookie.split("; ").find((row) => row.startsWith(e.key!))
			const cookieValue = cookie ? cookie.split("=")[1] : null
			chrome.runtime.sendMessage({
				type: "update_target_state",
				payload: {
					tabId: targetTabId,
					data: { [e.key]: e.newValue },
					cookie: { [e.key]: cookieValue }
				}
			})
		}
	}
	window.addEventListener("storage", window.__storage_event_handler)
}
