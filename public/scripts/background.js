/**
 * @description: service worker for chrome extension
 */

// 存储监听状态和配置信息
let monitoringTabId = null
let config = {
    monitorSource: '',
    monitorTarget: '',
    syncKeys: [],
    isRunning: false
}

// 构建URL匹配模式
function buildUrlPattern(url) {
    // 如果是localhost，使用http/https模式
    if (url.startsWith('localhost:')) {
        return [`http://${url}/*`, `http://${url}/`, `https://${url}/*`, `https://${url}/`]
    }
    // 其他域名使用通配符模式
    return [`*://${url}/*`]
}

// 监听安装事件
chrome.runtime.onInstalled.addListener(() => {
    console.log('Sync Storage Chrome Plugin installed')
})

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Sync Storage Chrome Plugin message received', request)

    if (request.type === 'START_MONITORING') {
        config = request.config
        startMonitoring()
        sendResponse({ success: true })
    } else if (request.type === 'STOP_MONITORING') {
        stopMonitoring()
        sendResponse({ success: true })
    }

    return true
})

// 开始监听
async function startMonitoring() {
    // // 查找或创建目标tab
    // const targetUrls = buildUrlPattern(config.monitorTarget)
    // const targetTabs = await chrome.tabs.query({ url: targetUrls })
    // let targetTab = targetTabs[0]
    // if (!targetTab) {
    //     targetTab = await chrome.tabs.create({ url: `http://${config.monitorTarget}` })
    // }

    // 查找源tab
    const sourceUrls = buildUrlPattern(config.monitorSource)
    const sourceTabs = await chrome.tabs.query({ url: sourceUrls })
    if (sourceTabs.length > 0) {
        monitoringTabId = sourceTabs[0].id
        // 注入内容脚本来监听localStorage变化
        chrome.scripting.executeScript({
            target: { tabId: monitoringTabId },
            function: monitorLocalStorage,
            args: [config.syncKeys]
        })
    }
}

// 停止监听
function stopMonitoring() {
    if (monitoringTabId) {
        chrome.scripting.executeScript({
            target: { tabId: monitoringTabId },
            function: stopLocalStorageMonitoring
        })
        monitoringTabId = null
    }
}

// 在页面中执行的监听函数
function monitorLocalStorage(keys) {
    window._storageListener = (e) => {
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

// 停止监听的函数
function stopLocalStorageMonitoring() {
    if (window._storageListener) {
        window.removeEventListener('storage', window._storageListener)
        window._storageListener = null
    }
}
