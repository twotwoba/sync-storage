import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

/**
 * check whether the source/target URL already has a tab opened
 * if not, open a new tab in the background
 */
export async function checkWhetherTabExists(url: string) {
	let tabId = null
	if (url.endsWith("/")) {
		url = url.slice(0, -1)
	}
	const tabs = await chrome.tabs.query({ url: `${url}/*` })
	if (tabs.length === 0) {
		const newTab = await chrome.tabs.create({ url: url, active: false })
		tabId = newTab.id!
	} else {
		tabId = tabs[0].id!
	}
	return tabId
}

/**
 * 获取 URL 的 origin（协议 + 域名）
 */
function getUrlOrigin(url: string): string {
	try {
		return new URL(url).origin
	} catch {
		return url
	}
}

/**
 * 检查 tab URL 是否匹配规则的 URL
 */
export function isUrlMatch(tabUrl: string | undefined, ruleUrl: string): boolean {
	if (!tabUrl) return false
	const tabOrigin = getUrlOrigin(tabUrl)
	const ruleOrigin = getUrlOrigin(ruleUrl)
	return tabOrigin === ruleOrigin
}
