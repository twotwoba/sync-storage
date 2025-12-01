/**
 * onInstalled hook
 * This is triggered when the extension is installed or updated.
 */
chrome.runtime.onInstalled.addListener(({ reason }) => {
    // This is a new installation, do something like showing a welcome message
    if (reason === "install") {
        chrome.storage.session.setAccessLevel({
            accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS",
        });
    }
});

/**
 * onMessage hook
 * This is triggered when messages are sent from content scripts or popup scripts.
 */
chrome.runtime.onMessage.addListener(async (message, _, __) => {
    try {
        if (message.type === "sync_once") {
            const { source, target, keys } = message.payload;
            const sourceTabId = await checkWhetherTabExists(source);
            const targetTabId = await checkWhetherTabExists(target);
            await injectSyncOnceScript(sourceTabId, targetTabId, keys);
            return true;
        }

        /* if (message.type === "sync_observe") {
			const { source, target, keys } = message.payload
			const sourceTabId = await checkWhetherTabExists(source)
			const targetTabId = await checkWhetherTabExists(target)
			await injectSyncObserveScript(sourceTabId, targetTabId, keys)
			return true
		} */

        if (message.type === "update_target_state") {
            const { tabId, data, cookie } = message.payload;
            await updateTargetState(tabId, data, cookie);
            return true;
        }

        if (message.type === "cleanup_listener") {
            chrome.runtime.sendMessage({ type: "cleanup" });
            return true;
        }

        return true;
    } catch (error) {
        console.error("Error handling message:", error);
        return false;
    }
});
chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.tabs.sendMessage(tabId, { type: "cleanup" });
    return true;
});

/**
 * check whether the source/target URL already has a tab opened
 * if not, open a new tab in the background
 */
async function checkWhetherTabExists(url: string) {
    let tabId = null;
    if (url.endsWith("/")) {
        url = url.slice(0, -1);
    }
    const tabs = await chrome.tabs.query({ url: `${url}/*` });
    if (tabs.length === 0) {
        const newTab = await chrome.tabs.create({ url: url, active: false });
        tabId = newTab.id!;
    } else {
        tabId = tabs[0].id!;
    }
    return tabId;
}

/**
 * sync immediately (once) from source tab to target tab
 * This function will be injected into the source tab
 */
function syncAtOnce(targetTabId: number, keys: string[]) {
    const localStorageData: Record<string, any> = {};
    const cookieData: Record<string, any> = {};
    keys.forEach((key) => {
        const value = localStorage.getItem(key);
        if (value) {
            localStorageData[key] = value;
        }
        const cookieValue = document.cookie
            .split("; ")
            .find((row) => row.startsWith(`${key}=`))
            ?.split("=")[1];
        if (cookieValue) {
            cookieData[key] = cookieValue;
        }
    });
    chrome.runtime.sendMessage({
        type: "update_target_state",
        payload: {
            tabId: targetTabId,
            data: localStorageData,
            cookie: cookieData,
        },
    });
}
/**
 * Sync data from source tab to target tab while observing changes.
 * (of course, it will sync once immediately first)
 */
function syncAtObserve(targetTabId: number, keys: string[]) {
    /** sync at once */
    function syncAtOnceInner(targetTabId: number, keys: string[]) {
        const localStorageData: Record<string, any> = {};
        const cookieData: Record<string, any> = {};
        keys.forEach((key) => {
            const value = localStorage.getItem(key);
            if (value) {
                localStorageData[key] = value;
            }
            const cookieValue = document.cookie
                .split("; ")
                .find((row) => row.startsWith(`${key}=`))
                ?.split("=")[1];
            if (cookieValue) {
                cookieData[key] = cookieValue;
            }
        });
        chrome.runtime.sendMessage({
            type: "update_target_state",
            payload: {
                tabId: targetTabId,
                data: localStorageData,
                cookie: cookieData,
            },
        });
    }
    syncAtOnceInner(targetTabId, keys);

    // Clean up existing listeners
    // if (window.__storage_event_handler) {
    // 	window.removeEventListener("storage", window.__storage_event_handler)
    // }
    /** Storage event listener for cross-tab changes */
    // FIXME: storage event listener doesn't work in content script
    window.__storage_event_handler = (e: StorageEvent) => {
        if (e.key && keys.includes(e.key)) {
            const cookie = document.cookie
                .split("; ")
                .find((row) => row.startsWith(e.key!));
            const cookieValue = cookie ? cookie.split("=")[1] : null;
            chrome.runtime.sendMessage({
                type: "update_target_state",
                payload: {
                    tabId: targetTabId,
                    data: { [e.key]: e.newValue },
                    cookie: { [e.key]: cookieValue },
                },
            });
        }
    };
    window.addEventListener("storage", window.__storage_event_handler);

    /**
     * Fallback: Poll localStorage for changes since storage events
     * don't trigger for same-window changes
     */
    /* 	const originalData: Record<string, string | null> = {}
		keys.forEach(key => {
			originalData[key] = localStorage.getItem(key)
		})

		if (window.__localStorage_observer) {
			clearInterval(window.__localStorage_observer)
		}
		window.__localStorage_observer = setInterval(() => {
			let hasChanged = false
			keys.forEach(key => {
				const currentValue = localStorage.getItem(key)
				if (originalData[key] !== currentValue) {
					originalData[key] = currentValue
					hasChanged = true
				}
			})
			if (hasChanged) {
				syncAtOnceInner(targetTabId, keys)
			}
		}, 1000) // Check every second */
}

/**
 * Update the local storage/cookies of the target tab with the provided data.
 */
async function updateTargetState(
    targetTabId: number,
    localStorageData: Record<string, any>,
    cookieData: Record<string, any>,
) {
    await chrome.scripting.executeScript({
        target: { tabId: targetTabId },
        func: (data: Record<string, any>, cookies: Record<string, any>) => {
            if (data) {
                Object.entries(data).forEach(([k, v]) => {
                    localStorage.setItem(k, v);
                });
            }
            if (cookies) {
                Object.entries(cookies).forEach(([k, v]) => {
                    // biome-ignore lint/suspicious/noDocumentCookie: <ok>
                    document.cookie = `${k}=${v}; path=/`;
                });
            }
            /*
			if (cookieData) {
				const tab = await chrome.tabs.get(targetTabId)
				const url = new URL(tab.url!)
				Object.entries(cookieData).forEach(([k, v]) => {
					chrome.cookies.set({
						url: tab.url!,
						name: k,
						value: v as string,
						domain: url.hostname,
						path: "/"
					})
				})
			 } */
        },
        args: [localStorageData, cookieData],
    });
}

async function injectSyncOnceScript(
    sourceTabId: number,
    targetTabId: number,
    keys: string[],
) {
    await chrome.scripting.executeScript({
        target: { tabId: sourceTabId },
        func: syncAtOnce,
        args: [targetTabId, keys],
    });
}
async function injectSyncObserveScript(
    sourceTabId: number,
    targetTabId: number,
    keys: string[],
) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId: sourceTabId },
            func: syncAtObserve,
            args: [targetTabId, keys],
        });
    } catch (error) {
        console.error("Failed to inject sync observe script:", error);
        setTimeout(async () => {
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: sourceTabId },
                    func: syncAtObserve,
                    args: [targetTabId, keys],
                });
            } catch (retryError) {
                console.error("Retry failed:", retryError);
            }
        }, 500);
    }
}
