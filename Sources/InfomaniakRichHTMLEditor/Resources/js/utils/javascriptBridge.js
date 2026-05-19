"use strict";

function reportEditorDidLoad() {
    window.webkit.messageHandlers.editorDidLoad.postMessage(null);
}

function reportContentDidChange(content) {
    window.webkit.messageHandlers.contentDidChange.postMessage(content);
}

function reportContentHeightDidChange(height) {
    window.webkit.messageHandlers.contentHeightDidChange.postMessage(height);
}

function reportSelectedTextAttributesDidChange(textAttributes) {
    const json = JSON.stringify(textAttributes);
    window.webkit.messageHandlers.selectedTextAttributesDidChange.postMessage(json);
}

function reportCaretPositionDidChange(caretRect) {
    // getClientRects() returns viewport-relative coords. Adding window.scroll* converts to
    // document-relative coords, which is stable even when WKWebView's internal scroll is non-zero.
    window.webkit.messageHandlers.caretPositionDidChange.postMessage([caretRect.x + window.scrollX, caretRect.y + window.scrollY, caretRect.width, caretRect.height]);
}
