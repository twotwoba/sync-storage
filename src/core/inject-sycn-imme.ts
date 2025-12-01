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
	const { localStorageData, cookieData } = res[0]?.result || {}

	if (!Object.keys(localStorageData || {}).length) {
		return { error: true, msgKey: "syncFieldsNotFound" }
	}

	await chrome.scripting.executeScript({
		target: { tabId: targetTabId },
		func: doSyncFieldsToTarget,
		args: [localStorageData!, cookieData!]
	})

	return { error: false, msgKey: "syncSuccess" }
}

export function getSyncFieldsData(keys: string[]) {
	const localStorageData: Record<string, any> = {}
	const cookieData: Record<string, any> = {}
	keys.forEach((key) => {
		const value = localStorage.getItem(key)
		if (value) {
			localStorageData[key] = value
		}
		const cookieValue = document.cookie
			.split("; ")
			.find((row) => row.startsWith(`${key}=`))
			?.split("=")[1]
		if (cookieValue) {
			cookieData[key] = cookieValue
		}
	})
	return { localStorageData, cookieData }
}

export function doSyncFieldsToTarget(data: Record<string, any>, cookies: Record<string, any>) {
	Object.entries(data).forEach(([k, v]) => localStorage.setItem(k, v))
	// TODO: Add option to toggle cookie sync
	Object.entries(cookies).forEach(([k, v]) => {
		// biome-ignore lint/suspicious/noDocumentCookie: <ok>
		document.cookie = `${k}=${v}; path=/`
	})
}
