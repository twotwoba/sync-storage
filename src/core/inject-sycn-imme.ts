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
		return { error: true, msg: "同步失败，请检查「同步字段是否正确」且「目标site是否登录」！" }
	}

	await chrome.scripting.executeScript({
		target: { tabId: targetTabId },
		func: doSyncFieldsToTarget,
		args: [localStorageData!, cookieData!]
	})

	return { error: false, msg: "同步成功！" }
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
	// TODO 默认同步了cookie,后续可以开放个开关
	Object.entries(cookies).forEach(([k, v]) => {
		// biome-ignore lint/suspicious/noDocumentCookie: <ok>
		document.cookie = `${k}=${v}; path=/`
	})
}
