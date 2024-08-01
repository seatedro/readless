document.addEventListener("DOMContentLoaded", () => {
  const apiKeyInput = document.getElementById(
    "apiKeyInput",
  ) as HTMLInputElement;
  const saveApiKeyBtn = document.getElementById(
    "saveApiKeyBtn",
  ) as HTMLButtonElement;
  const apiKeyStatus = document.getElementById(
    "apiKeyStatus",
  ) as HTMLParagraphElement;
  const openSidePanelBtn = document.getElementById(
    "openSidePanelBtn",
  ) as HTMLButtonElement;

  // Check if the API key exists in storage
  chrome.storage.sync.get("openaiApiKey", (result) => {
    if (result.openaiApiKey) {
      apiKeyStatus.textContent = "api key is set!";
    } else {
      apiKeyStatus.textContent = "please enter your openai api key";
    }
  });

  // Save the API key to storage
  saveApiKeyBtn.addEventListener("click", () => {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      chrome.storage.sync.set({ openaiApiKey: apiKey }, () => {
        apiKeyStatus.textContent = "api key saved!";
        apiKeyInput.value = "";
      });
    } else {
      apiKeyStatus.textContent = "please enter a valid api key!";
    }
  });

  // summarizeBtn.addEventListener("click", () => {
  //   chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  //     const activeTab = tabs[0];
  //     if (activeTab.id) {
  //       // Open the side panel
  //       // chrome.sidePanel.open({ windowId: activeTab.windowId });
  //       chrome.tabs.sendMessage(activeTab.id, { action: "summarize" });
  //     }
  //   });
  // });

  openSidePanelBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab.id) {
        chrome.sidePanel.open({ windowId: activeTab.windowId });
      }
    });
  });
});
