import OpenAI from "openai";

let openai: OpenAI;
let sidepanelPort: chrome.runtime.Port | null = null;
let currentTabId: number | null = null;

export type TabData = {
  url: string;
  history: { originalText: string; summary: string }[];
  isSummarizing: boolean;
  apiCalls: number;
};
type UserData = {
  current: {
    [tabId: number]: TabData;
  };
  old: {
    [url: string]: Pick<TabData, "history" | "apiCalls">;
  };
};
let user: UserData = { current: {}, old: {} };

chrome.tabs.onActivated.addListener((activeInfo) => {
  currentTabId = activeInfo.tabId;
  updateSidePanelContext(currentTabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    if (!user.current[tabId]) {
      user.current[tabId] = {
        url: tab.url,
        history: [],
        isSummarizing: false,
        apiCalls: 0,
      };
    } else {
      user.current[tabId].url = tab.url;
    }

    updateSidePanelContext(tabId);
  }
});

function updateSidePanelContext(tabId: number) {
  if (sidepanelPort) {
    sidepanelPort.postMessage({
      action: "updateTabData",
      tabData: user.current[tabId] || {
        history: [],
        apiCalls: 0,
        url: "",
        isSummarizing: false,
      },
    });
  }
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "readless") {
    sidepanelPort = port;
    chrome.storage.sync.get(["openaiApiKey", "userHistory"], (result) => {
      if (result.openaiApiKey) {
        console.log("OpenAI API key found in storage");
        openai = new OpenAI({ apiKey: result.openaiApiKey });
      }
      if (result.userHistory) {
        user.old = result.userHistory;
      }
      port.onMessage.addListener(handleSidepanelMessage);
      port.onDisconnect.addListener(() => {
        sidepanelPort = null;
      });
      if (currentTabId) {
        updateSidePanelContext(currentTabId);
      }
    });
  }
});

function handleSidepanelMessage(msg: any) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (!activeTab.id) return;
    if (
      msg.action === "textSelected" &&
      !user.current[activeTab.id].isSummarizing &&
      sidepanelPort
    ) {
      user.current[activeTab.id].isSummarizing = true;
      sidepanelPort.postMessage({ action: "summarizing" });
      summarizeText(msg.text, activeTab.id!)
        .then((summary) => {
          if (sidepanelPort) {
            sidepanelPort.postMessage({
              action: "displaySummary",
              summary: summary,
            });
          }
          user.current[activeTab.id!].isSummarizing = false;
          console.log("user history:", user);
        })
        .catch((error) => {
          console.error("Error:", error);
          if (sidepanelPort) {
            sidepanelPort.postMessage({
              action: "error",
              message: "An error occurred while summarizing",
            });
          }
          user.current[activeTab.id!].isSummarizing = false;
        });
    }
  });
}

async function summarizeText(text: string, tabId: number): Promise<string> {
  if (!openai) {
    throw new Error("API key not set");
  }

  if (!user.current[tabId]) return "Unable to fetch data";

  user.current[tabId].apiCalls++;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "you are a helpful assistant that summarizes text.",
      },
      {
        role: "user",
        content: `please summarize the following text:\n\n${text}`,
      },
    ],
    max_tokens: 150,
  });

  const summary =
    response.choices[0].message.content || "No summary generated.";

  user.current[tabId].history.push({
    originalText: text,
    summary: summary,
  });
  const newUserData = {
    history: user.current[tabId].history,
    apiCalls: user.current[tabId].apiCalls,
  };
  const storage = { ...user.old, [user.current[tabId].url]: newUserData };
  chrome.storage.sync.set({
    userHistory: storage,
  });
  user.old = storage;

  if (sidepanelPort) {
    sidepanelPort.postMessage({
      action: "updateTabData",
      tabData: user.current[tabId],
    });
  }

  return summary;
}
