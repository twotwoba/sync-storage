import { doSyncFieldsToTarget, getSyncFieldsData } from "./inject-sycn-imme"

/**
 * Inject detector script into source page to check login status periodically
 */
export async function injectSourceDetector(tabId: number, ruleId: string, keys: string[]) {
	try {
		await chrome.scripting.executeScript({
			target: { tabId },
			func: detectSourceLoginStatus,
			args: [ruleId, keys]
		})
	} catch (error) {
		console.error("[Observe] Failed to inject source detector:", error)
	}
}

/**
 * Detector function executed in source page
 * Periodically checks if storage (local/session/cookie) has the required sync keys
 */
function detectSourceLoginStatus(ruleId: string, keys: string[]) {
	// Cleanup previous polling
	const existingIntervalKey = `__sync_storage_interval_${ruleId}`
	if ((window as any)[existingIntervalKey]) {
		clearInterval((window as any)[existingIntervalKey])
	}

	const checkAndNotify = () => {
		const hasKeys = keys.some((k) => {
			return (
				localStorage.getItem(k) ||
				sessionStorage.getItem(k) ||
				document.cookie.match(new RegExp(`(^|;\\s*)(${k})=([^;]*)`))
			)
		})
		chrome.runtime.sendMessage({
			type: "observe_source_status",
			payload: { ruleId, isReady: hasKeys }
		})
	}

	// Check immediately
	checkAndNotify()

	// Check every 2 seconds
	;(window as any)[existingIntervalKey] = setInterval(checkAndNotify, 2000)
}

/**
 * Cleanup detector script from source page
 */
export async function cleanupSourceDetector(tabId: number, ruleId: string) {
	try {
		await chrome.scripting.executeScript({
			target: { tabId },
			func: (ruleId: string) => {
				const existingIntervalKey = `__sync_storage_interval_${ruleId}`
				if ((window as any)[existingIntervalKey]) {
					clearInterval((window as any)[existingIntervalKey])
					delete (window as any)[existingIntervalKey]
				}
			},
			args: [ruleId]
		})
	} catch (_error) {
		// Tab might be closed, ignore error
	}
}

/**
 * Perform sync: read data from source page, write to target page
 */
export async function performSync(
	sourceTabId: number,
	targetTabId: number,
	keys: string[]
): Promise<{ error: boolean; msgKey: string }> {
	try {
		// 1. Read data from source page
		const res = await chrome.scripting.executeScript({
			target: { tabId: sourceTabId },
			func: getSyncFieldsData,
			args: [keys]
		})
		const { localStorageData, sessionStorageData, cookieData } = res[0]?.result || {}

		const hasData =
			Object.keys(localStorageData || {}).length > 0 ||
			Object.keys(sessionStorageData || {}).length > 0 ||
			Object.keys(cookieData || {}).length > 0

		if (!hasData) {
			return { error: true, msgKey: "syncFieldsNotFound" }
		}

		// 2. Write to target page
		const writeRes = await chrome.scripting.executeScript({
			target: { tabId: targetTabId },
			func: doSyncFieldsToTarget,
			args: [localStorageData!, sessionStorageData!, cookieData!]
		})

		const writeStatus = writeRes[0]?.result

		if (
			writeStatus &&
			(writeStatus.localStorage || writeStatus.sessionStorage || writeStatus.cookie)
		) {
			return { error: false, msgKey: "autoSyncSuccess" }
		}

		return { error: true, msgKey: "syncFailed" }
	} catch (error) {
		return { error: true, msgKey: String(error) }
	}
}
