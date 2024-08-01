chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSelectedText") {
    const selectedText = window.getSelection()?.toString();
    if (selectedText) {
      chrome.runtime.sendMessage({
        action: "textSelected",
        text: selectedText,
      });
    } else {
      chrome.runtime.sendMessage({
        action: "error",
        message: "No text selected",
      });
    }
  }
  return true;
});
