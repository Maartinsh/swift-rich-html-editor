"use strict";

// MARK: - Observation methods

function observeContentMutation(target, contentContainer) {
    const mutationObserver = new MutationObserver(() => {
        if ((window.__richHTMLProgrammaticMutationDepth || 0) > 0) {
            return;
        }
        reportContentDidChange(contentContainer.innerHTML);
    });
    mutationObserver.observe(target, { subtree: true, childList: true, characterData: true });
}

function observeResize(target) {
    const sizeObserver = new ResizeObserver(() => {
        let newContentHeight = document.documentElement.offsetHeight;
        reportContentHeightDidChange(newContentHeight);
    });
    sizeObserver.observe(target);
}

let caretPositionTimeout = null;

function observeSelectionChange(target) {
    target.addEventListener("selectionchange", () => {
        // Skip spurious events where the text selection didn't actually change
        // (e.g. fired by WKWebView internal scroll resets). Without this, the handle
        // guesser sees no diff, falls back to lastFocusedSelectionGrabber, and reports
        // the wrong endpoint.
        if (lastSelectionRange != null) {
            const s = window.getSelection();
            if (s.rangeCount > 0) {
                const r = s.getRangeAt(0);
                if (r.startContainer === lastSelectionRange.startContainer &&
                    r.startOffset   === lastSelectionRange.startOffset &&
                    r.endContainer  === lastSelectionRange.endContainer &&
                    r.endOffset     === lastSelectionRange.endOffset) {
                    return;
                }
            }
        }
        clearTimeout(caretPositionTimeout);
        caretPositionTimeout = setTimeout(computeAndReportCaretPosition, 30);
        reportSelectedTextAttributesIfNecessary();
    });
}
