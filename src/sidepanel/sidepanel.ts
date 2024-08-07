import { setTheme } from "../util/theme";
import { type SummaryItem, type TabData } from "../background";
import { UIkit, Icons } from "franken-ui/uikit/js/dist";

UIkit.use(Icons);
// @ts-ignore
window.UIkit = UIkit;

let port: chrome.runtime.Port;
let currentSumamry = "";

document.addEventListener("DOMContentLoaded", () => {
  setTheme();

  const summaryContent = document.getElementById(
    "summaryContent",
  ) as HTMLDivElement;

  port = chrome.runtime.connect(undefined, { name: "readless" });

  port.onMessage.addListener((request) => {
    if (request.action === "streamSummary") {
      currentSumamry += request.chunk;
      summaryContent.textContent = currentSumamry;
    } else if (request.action === "error") {
      summaryContent.textContent = `error: ${request.message}`;
    } else if (request.action === "summarizing") {
      currentSumamry = "";
      summaryContent.textContent = "";
    } else if (request.action === "updateTabData") {
      updateSidePanel(request.tabData);
    }
  });
});

function updateSidePanel(tabData: TabData) {
  const summaryContent = document.getElementById(
    "summaryContent",
  ) as HTMLDivElement;
  const apiCallCount = document.getElementById(
    "apiCallCount",
  ) as HTMLSpanElement;
  const accordionContainer = document.getElementById(
    "accordionContainer",
  ) as HTMLDivElement;

  if (tabData.history.length) {
    const lastSummary = tabData.history[tabData.history.length - 1].summary;
    summaryContent.textContent = lastSummary;

    // Clear previous historical summaries
    accordionContainer.innerHTML = "";

    // Add historical summaries
    tabData.history
      .slice(0, -1)
      .reverse()
      .forEach((item, index) => {
        const accordionItem = createSummaryItem(
          item,
          tabData.history.length - index - 1,
        );
        accordionContainer.appendChild(accordionItem);
      });
  } else {
    summaryContent.textContent = "No summaries yet for this page. 😢";
    accordionContainer.innerHTML = "";
  }

  apiCallCount.textContent = `${tabData.apiCalls}`;
}

function createSummaryItem(item: SummaryItem, index: number): HTMLLIElement {
  const accordionItem = document.createElement("li");
  const summary = document.createElement("a");
  summary.href = "";
  summary.className =
    "uk-accordion-title p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700";
  //TODO: Need to create a title element for the summary
  summary.textContent = `Summary ${index}`;

  const icon = document.createElement("span");
  icon.className = "uk-accordion-icon";
  icon.setAttribute("uk-icon", "icon: chevron-down; ratio: 0.8");
  summary.appendChild(icon);

  const content = document.createElement("div");
  content.className =
    "uk-accordion-content p-2 border-t border-gray-200 dark:border-gray-700";
  content.textContent = item.summary;

  accordionItem.appendChild(summary);
  accordionItem.appendChild(content);

  // Highlight original text
  accordionItem.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "highlightText",
          text: item.originalText,
          domPath: item.domPath,
          rangeInfo: item.rangeInfo,
        });
      }
    });
  });

  return accordionItem;
}

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "textSelected" && port) {
    port.postMessage({
      action: "textSelected",
      text: request.text,
      domPath: request.domPath,
      rangeInfo: request.rangeInfo,
    });
  }
  return true;
});
