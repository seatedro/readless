import { setTheme } from "../util/theme";

document.addEventListener("DOMContentLoaded", () => {
  setTheme();

  const apiKeyInput = document.getElementById(
    "apiKeyInput",
  ) as HTMLInputElement;
  const editApiKeyBtn = document.getElementById(
    "editApiKeyBtn",
  ) as HTMLButtonElement;
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
      apiKeyStatus.textContent = "API key is set!";
      apiKeyInput.value = result.openaiApiKey;
      apiKeyInput.disabled = true;
      openSidePanelBtn.classList.remove("hidden");
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
    editApiKeyBtn.classList.add("hidden");
    saveApiKeyBtn.classList.remove("hidden");
    openSidePanelBtn.classList.add("hidden");
  });

  // Handle API save
  saveApiKeyBtn.addEventListener("click", () => {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey && apiKey.startsWith("sk-")) {
      chrome.storage.sync.set({ openaiApiKey: apiKey }, () => {
        apiKeyStatus.textContent = "API key saved!";
        apiKeyInput.disabled = true;
      });
      editApiKeyBtn.classList.remove("hidden");
      saveApiKeyBtn.classList.add("hidden");
      openSidePanelBtn.classList.remove("hidden");
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
