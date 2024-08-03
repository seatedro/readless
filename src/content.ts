let lastSelectedText: string | null = null;
let isSelecting = false;

function checkSelection() {
  const selectedText = window.getSelection()?.toString().trim();
  if (
    selectedText &&
    selectedText !== lastSelectedText &&
    selectedText.length > 10
  ) {
    lastSelectedText = selectedText;
    chrome.runtime.sendMessage({
      action: "textSelected",
      text: selectedText,
    });
  }
}

// Start of selection
document.addEventListener("mousedown", () => {
  isSelecting = true;
});

// End of selection
document.addEventListener("mouseup", () => {
  if (isSelecting) {
    isSelecting = false;
    checkSelection();
  }
});

// For touch devices
document.addEventListener("touchstart", () => {
  isSelecting = true;
});

document.addEventListener("touchend", () => {
  if (isSelecting) {
    isSelecting = false;
    setTimeout(checkSelection, 100); // Small delay to ensure the selection is complete
  }
});
