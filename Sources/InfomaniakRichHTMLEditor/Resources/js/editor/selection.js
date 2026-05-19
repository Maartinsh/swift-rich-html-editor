"use strict";

let lastSelectionRange = null;
let lastFocusedSelectionGrabber = null;

// MARK: - Compute caret position

function computeAndReportCaretPosition() {
    const caretRect = computeCaretRect();
    if (caretRect == null) {
        return;
    }

    reportCaretPositionDidChange(caretRect);
}

function computeCaretRect() {
    const selection = window.getSelection();
    if (selection.rangeCount <= 0) {
        return null;
    }

    let caretRect = null;
    if (selection.isCollapsed) {
        caretRect = getCaretRect();
    } else {
        const selectionNodeToFocus = getSelectionNodeToTarget(selection);
        lastFocusedSelectionGrabber = selectionNodeToFocus;

        if (selectionNodeToFocus != null) {
            // Determine collapse direction from the grabber type, not node identity.
            // Node identity fails for single-text-node content (anchorNode === focusNode)
            // which is the common case for plain-text notes.
            const grabber = guessMostProbableMovingSelectionGrabber(selection.getRangeAt(0).cloneRange());
            let collapseToStart;
            if (grabber === SelectionGrabber.start) {
                collapseToStart = true;
            } else if (grabber === SelectionGrabber.end) {
                collapseToStart = false;
            } else {
                // unknown: fall back to node identity (works for multi-node selections)
                collapseToStart = selectionNodeToFocus !== selection.focusNode;
            }
            const r = selection.getRangeAt(0).cloneRange();
            r.collapse(collapseToStart);
            const rects = r.getClientRects();
            if (rects.length > 0) {
                caretRect = rects[rects.length - 1];
            } else {
                // getClientRects() is empty at document boundary positions. Use the overall
                // selection bounding rect and take the appropriate edge to avoid returning a
                // rect with full-document height (which causes wrong scroll jumps).
                const selRect = selection.getRangeAt(0).getBoundingClientRect();
                const y = collapseToStart ? selRect.top : selRect.bottom;
                caretRect = { x: selRect.left, y: y, width: Math.max(1, selRect.width), height: 1 };
            }
        }
    }
    lastSelectionRange = selection.getRangeAt(0).cloneRange();

    return caretRect;
}

// MARK: - Utils

const SelectionGrabber = {
    start: "Start",
    end: "End",
    unknown: "Unknown"
};

function getCaretRect(anchorNode) {
    const range = getRange()?.cloneRange();
    if (range == null) {
        return null;
    }

    if (anchorNode != undefined) {
        range.selectNodeContents(anchorNode);
    }

    const rangeRects = range.getClientRects();
    switch (rangeRects.length) {
        case 0:
            const node = anchorNode || window.getSelection().anchorNode;
            const closestParentElement = getClosestParentNodeElement(node);
            return closestParentElement.getBoundingClientRect();
        case 1:
            return rangeRects[0];
        default:
            return range.getBoundingClientRect();
    }
}

function getClosestParentNodeElement(node) {
    if (node == null) {
        return null;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
        return node;
    } else {
        return getClosestParentNodeElement(node.parentNode);
    }
}

function getSelectionNodeToTarget(selection) {
    const movingGrabber = guessMostProbableMovingSelectionGrabber(selection.getRangeAt(0).cloneRange());

    let selectionNodeToFocus = null;
    switch (movingGrabber) {
        case SelectionGrabber.start:
            selectionNodeToFocus = selection.anchorNode;
            break;
        case SelectionGrabber.end:
            selectionNodeToFocus = selection.focusNode;
            break;
        case SelectionGrabber.unknown:
            if (lastFocusedSelectionGrabber != null) {
                selectionNodeToFocus = lastFocusedSelectionGrabber;
            }
            break;
    }

    return selectionNodeToFocus;
}

function guessMostProbableMovingSelectionGrabber(selectionRange) {
    if (lastSelectionRange == null) {
        return SelectionGrabber.unknown;
    }

    if (lastSelectionRange.startContainer === selectionRange.startContainer && lastSelectionRange.endContainer === selectionRange.endContainer) {
        if (lastSelectionRange.startOffset === selectionRange.startOffset && lastSelectionRange.endOffset === selectionRange.endOffset) {
            return SelectionGrabber.unknown;
        } else {
            return (lastSelectionRange.endOffset !== selectionRange.endOffset) ? SelectionGrabber.end : SelectionGrabber.start;
        }
    } else {
        return (lastSelectionRange.endContainer !== selectionRange.endContainer) ? SelectionGrabber.end : SelectionGrabber.start;
    }
}
