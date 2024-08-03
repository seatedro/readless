import OpenAI from "openai";

let openai: OpenAI;
let sidepanelPort: chrome.runtime.Port | null = null;
let user: {
  history: { originalText: string; summary: string }[];
  isSummarizing: boolean;
} = {
  history: [],
  isSummarizing: false,
};

chrome.storage.sync.get(["openaiApiKey", "userHistory"], (result) => {
  if (result.openaiApiKey) {
    console.log("OpenAI API key found in storage");
    openai = new OpenAI({ apiKey: result.openaiApiKey });
  }
  if (result.userHistory) {
    user.history = result.userHistory;
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
  if (msg.action === "textSelected" && !user.isSummarizing && sidepanelPort) {
    user.isSummarizing = true;
    sidepanelPort.postMessage({ action: "summarizing" });
    summarizeText(msg.text)
      .then((summary) => {
        if (sidepanelPort) {
          sidepanelPort.postMessage({
            action: "displaySummary",
            summary: summary,
          });
          user.history.push({
            originalText: msg.text,
            summary: summary,
          });
          chrome.storage.sync.set({ userHistory: user.history });
        }
        user.isSummarizing = false;
        console.log("user history:", user.history);
      })
      .catch((error) => {
        console.error("Error:", error);
        if (sidepanelPort) {
          sidepanelPort.postMessage({
            action: "error",
            message: "An error occurred while summarizing",
          });
        }
        user.isSummarizing = false;
      });
  }
}

async function summarizeText(text: string): Promise<string> {
  if (!openai) {
    throw new Error("API key not set");
  }

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

  return response.choices[0].message.content || "No summary generated.";
}
