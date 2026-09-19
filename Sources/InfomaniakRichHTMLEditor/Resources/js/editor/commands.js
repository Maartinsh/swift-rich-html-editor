"use strict";

/**
 * Executes a command with document.execCommand().
 * If the command changes the selected text, the WKWebView will be notified.
 *
 * @param {string} command - The name of the command to execute
 * @param {string|null} argument - An optional argument for the command
 */
function execCommand(command, argument) {
    document.execCommand(command, false, argument);
    reportSelectedTextAttributesIfNecessary();
}


/**
 * Sets the HTML content of the editor.
 * The current content will be replaced by the new content.
 *
 * @param {string} content - The new HTML content of the editor
 */
function setContent(content) {
    const editor = getEditor();
    if (!editor) {
        throw new Error("editor root is missing");
    }
    window.__richHTMLProgrammaticMutationDepth = (window.__richHTMLProgrammaticMutationDepth || 0) + 1;
    editor.innerHTML = content;
    queueMicrotask(() => {
        window.__richHTMLProgrammaticMutationDepth = Math.max(0, (window.__richHTMLProgrammaticMutationDepth || 1) - 1);
    });
}

/**
 * Injects new CSS rules to the editor to change its style.
 *
 * @param {string} content - The new CSS rules to add to the editor
 */
function injectCSS(content, identifier) {
    let styleElement = document.getElementById(identifier);
    if (!styleElement) {
        styleElement = document.createElement("style");
        styleElement.id = identifier;
        document.head.appendChild(styleElement);
    }
    styleElement.textContent = content;
    styleElement.setAttribute("data-rich-html-editor-ready", "true");
}
