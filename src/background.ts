import OpenAI from "openai";

let openai: OpenAI;
let sidepanelPort: chrome.runtime.Port | null = null;
let currentTabId: number | null = null;

export type SummaryItem = {
  summary: string;
  originalText: string;
  domPath: string;
  rangeInfo: {
    startContainerPath: number[];
    startOffset: number;
    endContainerPath: number[];
    endOffset: number;
  };
};

export type TabData = {
  url: string;
  history: SummaryItem[];
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
      const { text, domPath, rangeInfo } = msg;
      user.current[activeTab.id].isSummarizing = true;
      sidepanelPort.postMessage({ action: "summarizing" });
      summarizeText(text, activeTab.id!, domPath, rangeInfo)
        .then(() => {
          user.current[activeTab.id!].isSummarizing = false;
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

async function summarizeText(
  text: string,
  tabId: number,
  domPath: string,
  rangeInfo: any,
): Promise<string> {
  if (!openai) {
    throw new Error("API key not set");
  }

  if (!user.current[tabId]) return "Unable to fetch data";

  user.current[tabId].apiCalls++;

  const runner = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "you are a helpful assistant that summarizes text. maintain the core of the original text. generate a small, concise summary that does not exceed one paragraph.",
      },
      {
        role: "user",
        content: `please summarize the following text:\n\n${text}`,
      },
    ],
    max_tokens: 256,
    stream: true,
  });

  let summary = "";
  for await (const chunk of runner) {
    const content = chunk.choices[0]?.delta?.content || "";
    summary += content;
    if (sidepanelPort) {
      sidepanelPort.postMessage({
        action: "streamSummary",
        chunk: content,
      });
    }
  }

  user.current[tabId].history.push({
    originalText: text,
    summary: summary,
    domPath: domPath,
    rangeInfo: rangeInfo,
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
