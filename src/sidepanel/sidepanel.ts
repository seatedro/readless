import { setTheme } from "../util/theme";

let port: chrome.runtime.Port;

document.addEventListener("DOMContentLoaded", () => {
  setTheme();

  const summaryContent = document.getElementById(
    "summaryContent",
  ) as HTMLDivElement;
  const loadingSpinner = document.getElementById(
    "loadingSpinner",
  ) as HTMLDivElement;

  port = chrome.runtime.connect(undefined, { name: "readless" });

  port.onMessage.addListener((request) => {
    if (request.action === "displaySummary") {
      console.log("displaying summary");
      loadingSpinner.classList.toggle("hidden");
      loadingSpinner.classList.toggle("flex");
      summaryContent.textContent = request.summary;
    } else if (request.action === "error") {
      loadingSpinner.classList.toggle("hidden");
      loadingSpinner.classList.toggle("flex");
      summaryContent.textContent = `error: ${request.message}`;
    } else if (request.action === "summarizing") {
      loadingSpinner.classList.toggle("hidden");
      loadingSpinner.classList.toggle("flex");
      summaryContent.textContent = "";
    }
  });
});

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "textSelected" && port) {
    port.postMessage({ action: "textSelected", text: request.text });
  }
  return true;
});
