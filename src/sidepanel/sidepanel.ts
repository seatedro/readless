import { setTheme } from "../util/theme";

let port: chrome.runtime.Port;

document.addEventListener("DOMContentLoaded", () => {
  setTheme();

  const summarizeBtn = document.getElementById(
    "summarizeBtn",
  ) as HTMLButtonElement;
  const summaryContent = document.getElementById(
    "summaryContent",
  ) as HTMLDivElement;

  port = chrome.runtime.connect(undefined, { name: "readless" });

  summarizeBtn.addEventListener("click", () => {
    port.postMessage({ action: "getSelectedText" });
  });

  port.onMessage.addListener((request) => {
    if (request.action === "displaySummary") {
      console.log("displaying summary");
      summaryContent.textContent = request.summary;
    } else if (request.action === "error") {
      summaryContent.textContent = `error: ${request.message}`;
    }
  });
});
