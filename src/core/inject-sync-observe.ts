import { doSyncFieldsToTarget, getSyncFieldsData } from "./inject-sycn-imme"

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

/**
 * 在源页面注入检测脚本，定期检查登录状态
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
 * 在源页面执行的检测函数
 * 定期检查 localStorage 是否有需要同步的 keys
 */
function detectSourceLoginStatus(ruleId: string, keys: string[]) {
	// 清理之前的轮询
	const existingIntervalKey = `__sync_storage_interval_${ruleId}`
	if ((window as any)[existingIntervalKey]) {
		clearInterval((window as any)[existingIntervalKey])
	}

	const checkAndNotify = () => {
		const hasKeys = keys.some((k) => localStorage.getItem(k))
		chrome.runtime.sendMessage({
			type: "observe_source_status",
			payload: { ruleId, isReady: hasKeys }
		})
	}

	// 立即检查一次
	checkAndNotify()

	// 每 2 秒检查一次
	;(window as any)[existingIntervalKey] = setInterval(checkAndNotify, 2000)
}

/**
 * 清理源页面的检测脚本
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
		// tab 可能已经关闭，忽略错误
	}
}

/**
 * 执行同步：从源页面读取数据，写入目标页面
 */
export async function performSync(
	sourceTabId: number,
	targetTabId: number,
	keys: string[]
): Promise<{ error: boolean; msg: string }> {
	try {
		// 1. 从源页面读取数据
		const res = await chrome.scripting.executeScript({
			target: { tabId: sourceTabId },
			func: getSyncFieldsData,
			args: [keys]
		})
		const { localStorageData, cookieData } = res[0]?.result || {}

		if (!Object.keys(localStorageData || {}).length) {
			return { error: true, msg: "同步字段不存在" }
		}

		// 2. 写入目标页面
		await chrome.scripting.executeScript({
			target: { tabId: targetTabId },
			func: doSyncFieldsToTarget,
			args: [localStorageData!, cookieData!]
		})

		return { error: false, msg: "自动同步成功！" }
	} catch (error) {
		return { error: true, msg: String(error) }
	}
}
