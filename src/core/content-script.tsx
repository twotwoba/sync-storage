/**
 * * content-script.ts(x)
 * listen for messages from background
 */
chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
	if (message.type === "cleanup") {
		//
	}
	return true
})
