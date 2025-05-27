/**
 * core script for chrome extension
 */
let monitoringTabId = null
let config = {
    monitorSource: '',
    monitorTarget: '',
    syncKeys: [],
    isRunning: false
}

// message from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Sync Storage Chrome Plugin message received', request)

    if (request.type === 'START_MONITORING') {
        config = request.config
        startMonitoring()
        sendResponse({ success: true })
    } else if (request.type === 'STOP_MONITORING') {
        stopMonitoring()
        sendResponse({ success: true })
    } else if (request.type === 'STORAGE_CHANGED') {
        updateLocalStorage(request.key, request.value, config.monitorTarget)
        sendResponse({ success: true })
    }

    return true
})

// if tab is updated, inject content script to monitor localStorage changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // when page is loaded, and the page is being monitored
    if (changeInfo.status === 'complete' && tabId === monitoringTabId && config.isRunning) {
        injectMonitorScript(tabId)
    }
})

// start monitoring
async function startMonitoring() {
    // find source tab
    const sourceUrl = `*://${config.monitorSource}/*`
    const sourceTabs = await chrome.tabs.query({ url: sourceUrl })

    if (sourceTabs.length > 0) {
        // if source tab is existed, use it
        monitoringTabId = sourceTabs[0].id
        config.isRunning = true
        injectMonitorScript(monitoringTabId)
    } else {
        // if source tab is not existed, create new tab
        try {
            // build full url
            let fullUrl = config.monitorSource.startsWith('localhost')
                ? `http://${config.monitorSource}`
                : `https://${config.monitorSource}`

            const newTab = await chrome.tabs.create({ url: fullUrl })
            monitoringTabId = newTab.id
            config.isRunning = true
            // ! warning: no need to inject script here, it will be injected automatically when page is loaded
        } catch (error) {
            console.error('Failed to create new tab:', error)
            config.isRunning = false
            monitoringTabId = null
        }
    }
}

// inject content script to monitor localStorage changes
function injectMonitorScript(tabId) {
    chrome.scripting.executeScript({
        target: { tabId },
        function: monitorLocalStorage,
        args: [config.syncKeys, config.monitorTarget]
    })
}

// stop monitoring
function stopMonitoring() {
    if (monitoringTabId) {
        chrome.scripting.executeScript({
            target: { tabId: monitoringTabId },
            function: stopLocalStorageMonitoring
        })
        monitoringTabId = null
        config.isRunning = false
    }
}

// monitor function in page
function monitorLocalStorage(keys, monitorTarget) {
    // sync existing values
    keys.forEach((key) => {
        const value = localStorage.getItem(key)
        if (value) {
            chrome.runtime.sendMessage({
                type: 'STORAGE_CHANGED',
                key: key,
                value: value
            })
        }
    })

    // monitor changes
    window._storageListener = async (e) => {
        if (keys.includes(e.key)) {
            chrome.runtime.sendMessage({
                type: 'STORAGE_CHANGED',
                key: e.key,
                value: e.newValue
            })
        }
    }
    window.addEventListener('storage', window._storageListener)
}

// stop monitoring function
function stopLocalStorageMonitoring() {
    if (window._storageListener) {
        window.removeEventListener('storage', window._storageListener)
        window._storageListener = null
    }
}

/**
 * @description update target tab's localStorage
 * @param {string} key
 * @param {string} value
 * @param {string} monitorTarget
 */
function updateLocalStorage(key, value, monitorTarget) {
    /** special for localhost */
    let targetUrl = []
    if (monitorTarget.startsWith('localhost')) {
        targetUrl = [`http://${monitorTarget}/*`, `https://${monitorTarget}/*`]
    } else {
        targetUrl = [`*://${monitorTarget}/*`]
    }

    chrome.tabs.query({ url: targetUrl }, (tabs) => {
        if (tabs.length > 0) {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: (key, value) => {
                    localStorage.setItem(key, value)
                },
                args: [key, value]
            })
        }
    })
}
