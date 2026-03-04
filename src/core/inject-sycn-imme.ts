/**
 * sync immediately (once) from source tab to target tab
 */
export async function injectSyncOnceScript(
	sourceTabId: number,
	targetTabId: number,
	keys: string[]
) {
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

	const writeRes = await chrome.scripting.executeScript({
		target: { tabId: targetTabId },
		func: doSyncFieldsToTarget,
		args: [localStorageData!, sessionStorageData!, cookieData!]
	})

	const writeStatus = writeRes[0]?.result
	console.log("[SyncStorage] Write status:", writeStatus)

	if (
		writeStatus &&
		(writeStatus.localStorage || writeStatus.sessionStorage || writeStatus.cookie)
	) {
		return { error: false, msgKey: "syncSuccess" }
	}

	return { error: true, msgKey: "syncFailed" }
}

export function getSyncFieldsData(keys: string[]) {
	console.log("[SyncStorage] Getting data for keys:", keys)
	const localStorageData: Record<string, any> = {}
	const sessionStorageData: Record<string, any> = {}
	const cookieData: Record<string, any> = {}

	keys.forEach((key) => {
		// LocalStorage
		const lsValue = localStorage.getItem(key)
		if (lsValue) {
			localStorageData[key] = lsValue
		}

		// SessionStorage
		try {
			const ssValue = sessionStorage.getItem(key)
			if (ssValue) {
				sessionStorageData[key] = ssValue
			}
		} catch (e) {
			console.warn("[SyncStorage] Failed to read sessionStorage for key:", key, e)
		}

		// Cookie
		try {
			const cookieMatch = document.cookie.match(new RegExp(`(^|;\\s*)(${key})=([^;]*)`))
			if (cookieMatch) {
				// decodeURIComponent might be needed depending on how it was stored,
				// but usually we just want to copy the raw value.
				cookieData[key] = cookieMatch[3]
			}
		} catch (e) {
			console.warn("[SyncStorage] Failed to read cookie for key:", key, e)
		}
	})

	console.log("[SyncStorage] Collected data:", {
		localStorageData,
		sessionStorageData,
		cookieData
	})

	return { localStorageData, sessionStorageData, cookieData }
}

export function doSyncFieldsToTarget(
	localStorageData: Record<string, any>,
	sessionStorageData: Record<string, any>,
	cookieData: Record<string, any>
) {
	console.log("[SyncStorage] Writing data to target:", {
		localStorageData,
		sessionStorageData,
		cookieData
	})

	const status = {
		localStorage: false,
		sessionStorage: false,
		cookie: false
	}

	if (localStorageData && Object.keys(localStorageData).length > 0) {
		try {
			Object.entries(localStorageData).forEach(([k, v]) => localStorage.setItem(k, v))
			status.localStorage = true
		} catch (e) {
			console.error("[SyncStorage] Failed to write localStorage:", e)
		}
	}

	if (sessionStorageData && Object.keys(sessionStorageData).length > 0) {
		try {
			Object.entries(sessionStorageData).forEach(([k, v]) => {
				sessionStorage.setItem(k, v)
				if (sessionStorage.getItem(k) !== v) {
					console.warn(`[SyncStorage] Verification failed for sessionStorage key: ${k}`)
				}
			})
			status.sessionStorage = true
		} catch (e) {
			console.error("[SyncStorage] Failed to write sessionStorage:", e)
		}
	}

	if (cookieData && Object.keys(cookieData).length > 0) {
		try {
			Object.entries(cookieData).forEach(([k, v]) => {
				// biome-ignore lint/suspicious/noDocumentCookie: <ok>
				document.cookie = `${k}=${v}; path=/`
			})
			status.cookie = true
		} catch (e) {
			console.error("[SyncStorage] Failed to write cookie:", e)
		}
	}

	return status
}
