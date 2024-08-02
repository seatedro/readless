import { setTheme } from "../util/theme";

document.addEventListener("DOMContentLoaded", () => {
  setTheme();

  const apiKeyInput = document.getElementById(
    "apiKeyInput",
  ) as HTMLInputElement;
  const editApiKeyBtn = document.getElementById(
    "editApiKeyBtn",
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
      apiKeyStatus.textContent = "API key is set!";
      apiKeyInput.value = "••••••••••••••••";
      apiKeyInput.disabled = true;
    } else {
      apiKeyStatus.textContent = "Please enter your OpenAI API key";
      apiKeyInput.disabled = false;
    }
  });

  // Handle API key edit
  editApiKeyBtn.addEventListener("click", () => {
    apiKeyInput.disabled = false;
    apiKeyInput.value = "";
    apiKeyInput.focus();
  });

  // Save the API key to storage
  apiKeyInput.addEventListener("blur", () => {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      chrome.storage.sync.set({ openaiApiKey: apiKey }, () => {
        apiKeyStatus.textContent = "API key saved!";
        apiKeyInput.value = "••••••••••••••••";
        apiKeyInput.disabled = true;
      });
    } else {
      apiKeyStatus.textContent = "Please enter a valid API key!";
    }
  });

  openSidePanelBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab.id) {
        chrome.sidePanel.open({ windowId: activeTab.windowId });
      }
    });
  });
});
