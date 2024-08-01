import OpenAI from "openai";

let openai: OpenAI;
let sidepanelPort: chrome.runtime.Port | null = null;

chrome.storage.sync.get(["openaiApiKey"], (result) => {
  if (result.openaiApiKey) {
    console.log("OpenAI API key found in storage");
    openai = new OpenAI({ apiKey: result.openaiApiKey });
  }
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "readless") {
    sidepanelPort = port;
    port.onMessage.addListener(handleSidepanelMessage);
    port.onDisconnect.addListener(() => {
      sidepanelPort = null;
    });
  }
});

function handleSidepanelMessage(msg: any) {
  if (msg.action === "getSelectedText") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab.id) {
        chrome.tabs.sendMessage(activeTab.id, { action: "getSelectedText" });
      }
    });
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "textSelected" && sidepanelPort) {
    summarizeText(request.text)
      .then((summary) => {
        if (sidepanelPort) {
          sidepanelPort.postMessage({
            action: "displaySummary",
            summary: summary,
          });
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        if (sidepanelPort) {
          sidepanelPort.postMessage({
            action: "error",
            message: "An error occurred while summarizing",
          });
        }
      });
  }
  return true;
});

async function summarizeText(text: string): Promise<string> {
  if (!openai) {
    throw new Error("API key not set");
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4",
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

  return response.choices[0].message.content || "No summary generated.";
}
