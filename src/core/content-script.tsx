/**
 * * content-script.ts(x) - Content script for Chrome Extension
 */

/**
 * listen for messages from background
 */
chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
    if (message.type === "cleanup") {
        /* // FIXME
		window.removeEventListener("storage", window.__storage_event_handler!)
		window.__storage_event_handler = null */
        /* 	if (window.__localStorage_observer) {
			clearInterval(window.__localStorage_observer)
			window.__localStorage_observer = null
		} */
    }
    return true;
});
