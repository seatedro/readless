let isSelecting = false;
let highlight: Highlight | null;
let selectionStartTime: number;
const SELECTION_THRESHOLD = 300; // milliseconds

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "highlightText") {
    highlightAndScrollToText(request.text, request.rangeInfo, request.domPath);
  }

  return true;
});

function removeHighlight() {
  if (highlight) {
    // this exists lmao typescript
    // @ts-ignore
    highlight.clear();
    highlight = null;
    // this exists lmao typescript
    // @ts-ignore
    CSS.highlights.clear();
  }
}

function highlightAndScrollToText(
  text: string,
  rangeInfo: any,
  domPath: string,
) {
  // Remove previous highlight if it exists
  removeHighlight();

  // Fall back to range approach
  if (rangeInfo) {
    try {
      const range = recreateRange(rangeInfo);
      highlight = new Highlight(range);
      // this exists lmao typescript
      // @ts-ignore
      CSS.highlights.set("highlight", highlight);
      const el = document.querySelector(domPath);
      if (el) {
        scrollToElement(el as HTMLElement);
        // Fade out the highlight
        setTimeout(() => {
          if (highlight) {
            // Remove the highlight after a short delay
            setTimeout(() => {
              removeHighlight();
            }, 1000);
          }
        }, 2000);
        return;
      }
    } catch (error) {
      console.error(
        "Failed to use range info, falling back to text search",
        error,
      );
    }
  }

  // Fall back to text search as last resort
  const found = findTextInPage(text);
  if (found) {
    highlight = new Highlight(found.range);
    // this exists lmao typescript
    // @ts-ignore
    CSS.highlights.set("highlight", highlight);
    scrollToRange(found.range);
    setTimeout(() => {
      if (highlight) {
        // Remove the highlight after a short delay
        setTimeout(() => {
          removeHighlight();
        }, 1000);
      }
    }, 2000);
    return;
  }
}

function recreateRange(rangeInfo: any): Range {
  const range = document.createRange();
  const startContainer = getElementByPath(rangeInfo.startContainerPath);
  const endContainer = getElementByPath(rangeInfo.endContainerPath);
  range.setStart(startContainer, rangeInfo.startOffset);
  range.setEnd(endContainer, rangeInfo.endOffset);
  return range;
}

function getElementByPath(path: number[]): Node {
  let element: Node = document.body;
  for (const index of path) {
    element = element.childNodes[index];
  }
  return element;
}

function scrollToElement(element: HTMLElement) {
  element.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

function scrollToRange(range: Range) {
  range.startContainer.parentElement?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

function findTextInPage(text: string): { range: Range } | null {
  const textNodes = [];
  const treeWalker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
  );

  let node;
  while ((node = treeWalker.nextNode())) {
    textNodes.push(node);
  }

  for (const node of textNodes) {
    const index = node.textContent?.indexOf(text);
    if (index !== -1 && index !== undefined) {
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + text.length);
      return { range };
    }
  }

  return null;
}

function getSelectedElement(range: Range): Element {
  let node: Node | null = range.startContainer;

  // If it's a text node, move up until we find an element
  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentElement;
  }

  // If it's still not an element, move up until we find an element
  while (node && node.nodeType !== Node.ELEMENT_NODE) {
    node = node.parentNode;
  }

  return (node as Element) || document.body;
}

// Function to get DOM path when text is selected
function getDomPath(el: Element): string {
  const path: string[] = [];
  let currentElement: Element | null = el;

  while (currentElement && currentElement !== document.body) {
    let selector: string;

    if (currentElement.id) {
      selector = `#${currentElement.id}`;
      path.unshift(selector);
      break; // If we have an ID, no need to go further up the tree
    } else {
      let tagName = currentElement.tagName.toLowerCase();

      if (currentElement.className) {
        const classes = currentElement.className.split(" ").join(".");
        selector = `${tagName}.${classes}`;
      } else {
        const sameTagSiblings = Array.from(
          currentElement.parentElement?.children || [],
        ).filter((sibling) => sibling.tagName === currentElement!.tagName);

        if (sameTagSiblings.length === 1) {
          selector = tagName;
        } else {
          const index = sameTagSiblings.indexOf(currentElement) + 1;
          selector = `${tagName}:nth-of-type(${index})`;
        }
      }
    }

    path.unshift(selector);
    currentElement = currentElement.parentElement;
  }

  return path.join(" > ");
}

function getNodePath(node: Node): number[] {
  const path = [];
  while (node !== document.body) {
    if (!node.parentNode) break;
    // @ts-ignore
    path.unshift(Array.from(node.parentNode.childNodes).indexOf(node));
    node = node.parentNode;
  }
  return path;
}

// Start of selection
document.addEventListener("mousedown", (event) => {
  if (event.button == 0) {
    isSelecting = true;
    selectionStartTime = Date.now();
  }
});

// End of selection
document.addEventListener("mouseup", (event) => {
  if ((event.button == 0, isSelecting)) {
    const selectionDuration = Date.now() - selectionStartTime;
    if (selectionDuration > SELECTION_THRESHOLD) {
      handleSelection();
    }
    isSelecting = false;
  }
});

function handleSelection() {
  isSelecting = false;
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const selectedText = range.toString().trim();
    if (selectedText.length > 10) {
      const selectedElement = getSelectedElement(range);
      const domPath = getDomPath(selectedElement);
      const rangeInfo = {
        startContainerPath: getNodePath(range.startContainer),
        startOffset: range.startOffset,
        endContainerPath: getNodePath(range.endContainer),
        endOffset: range.endOffset,
      };
      chrome.runtime.sendMessage({
        action: "textSelected",
        text: selectedText,
        domPath: domPath,
        rangeInfo: rangeInfo,
      });
    }
  }
}
