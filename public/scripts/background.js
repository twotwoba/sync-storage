/**
 * core script for chrome extension
 */
let monitoringTabId = null
let config = {
    monitorSource: '',
    monitorTarget: '',
    sourceProtocol: '',
    targetProtocol: '',
    syncKeys: ''
}

// message from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Sync Storage Chrome Plugin message received', request)

    if (request.type === 'START_MONITORING') {
        config = request.config
        startMonitoring()
    } else if (request.type === 'STOP_MONITORING') {
        stopMonitoring()
    } else if (request.type === 'STORAGE_CHANGED') {
        updateLocalStorage(request.key, request.value, request.cookieValue, config.monitorTarget, config.targetProtocol)
        stopMonitoring()
        chrome.runtime.sendMessage({
            type: 'STORAGE_CHANGED_SUCCESS'
        })
    }
    return true // keep the message channel open for sendResponse
})

// if tab is updated, inject content script to monitor localStorage changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // when page is loaded, and the page is being monitored
    if (changeInfo.status === 'complete' && tabId === monitoringTabId) {
        injectMonitorScript(tabId)
    }
})
// start monitoring
async function startMonitoring() {
    // find source tab
    const sourceUrl = `${config.sourceProtocol}${config.monitorSource}/*`
    const sourceTabs = await chrome.tabs.query({ url: sourceUrl })

    if (sourceTabs.length > 0) {
        // if source tab is existed, use it
        monitoringTabId = sourceTabs[0].id
        injectMonitorScript(monitoringTabId)
    } else {
        // if source tab is not existed, create new tab
        try {
            const newTabUrl = `${config.sourceProtocol}${config.monitorSource}`
            const newTab = await chrome.tabs.create({ url: newTabUrl })
            monitoringTabId = newTab.id
            // ! warning: no need to inject script here, it will be injected automatically when page is loaded
        } catch (error) {
            console.error('Failed to create new tab:', error)
            monitoringTabId = null
        }
    }
}
// inject content script to monitor localStorage changes
function injectMonitorScript(tabId) {
    chrome.scripting.executeScript({
        target: { tabId },
        function: monitorLocalStorage,
        args: [config.syncKeys.split('\n').map((key) => key.trim())]
    })
}
// monitor function in page
function monitorLocalStorage(keys) {
    // sync existing values
    keys.forEach(async (key) => {
        const value = localStorage.getItem(key)
        const cookie = document.cookie.split('; ').find((row) => row.startsWith(key + '='))
        const cookieValue = cookie ? cookie.split('=')[1] : null

        if (value || cookieValue) {
            chrome.runtime.sendMessage({
                type: 'STORAGE_CHANGED',
                key: key,
                value: value,
                cookieValue: cookieValue
            })
        }
    })

    // monitor changes
    window._storageListener = async (e) => {
        if (keys.includes(e.key)) {
            const cookie = document.cookie.split('; ').find((row) => row.startsWith(e.key))
            const cookieValue = cookie ? cookie.split('=')[1] : null

            chrome.runtime.sendMessage({
                type: 'STORAGE_CHANGED',
                key: e.key,
                value: e.newValue,
                cookieValue: cookieValue
            })
        }
    }
    window.addEventListener('storage', window._storageListener)
}

// stop monitoring
function stopMonitoring() {
    if (monitoringTabId) {
        chrome.scripting.executeScript({
            target: { tabId: monitoringTabId },
            function: stopLocalStorageMonitoring
        })
        monitoringTabId = null
    }
}
// stop monitoring function
function stopLocalStorageMonitoring() {
    if (window._storageListener) {
        window.removeEventListener('storage', window._storageListener)
        window._storageListener = null
    }
}

/**
 * @description update target tab's localStorage and cookies
 * @param {string} key
 * @param {string} value
 * @param {string} cookieValue
 * @param {string} monitorTarget
 * @param {string} targetProtocol
 */
function updateLocalStorage(key, value, cookieValue, monitorTarget, targetProtocol) {
    const targetUrl = `${targetProtocol}${monitorTarget}/*`
    chrome.tabs.query({ url: targetUrl }, (tabs) => {
        if (tabs.length > 0) {
            // 更新 localStorage
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: (key, value, cookieValue) => {
                    // 更新 localStorage
                    if (value) {
                        localStorage.setItem(key, value)
                    }

                    // 更新 cookie
                    if (cookieValue) {
                        document.cookie = `${key}=${cookieValue}; path=/`
                    }
                },
                args: [key, value, cookieValue]
            })
        }
    })
}
