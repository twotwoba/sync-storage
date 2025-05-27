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

// start monitoring
async function startMonitoring() {
    // find source tab
    const sourceUrl = `*://${config.monitorSource}/*`
    const sourceTabs = await chrome.tabs.query({ url: sourceUrl })
    if (sourceTabs.length > 0) {
        monitoringTabId = sourceTabs[0].id
        // inject content script to monitor localStorage changes
        chrome.scripting.executeScript({
            target: { tabId: monitoringTabId },
            function: monitorLocalStorage,
            args: [config.syncKeys, config.monitorTarget]
        })
    }
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
