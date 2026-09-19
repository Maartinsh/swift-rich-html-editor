//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing,
//  software distributed under the License is distributed on an
//  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
//  KIND, either express or implied.  See the License for the
//  specific language governing permissions and limitations
//  under the License.

import WebKit

@MainActor
protocol JavaScriptManagerDelegate: AnyObject {
    func javascriptFunctionDidFail(error: any Error, function: String)
}

@MainActor
final class JavaScriptManager {
    private enum DocumentState: Equatable {
        case unavailable
        case preparing
        case ready
    }

    var isDOMContentLoaded: Bool {
        documentState == .ready
    }

    weak var delegate: JavaScriptManagerDelegate?

    private weak var webView: WKWebView?
    private var functionsWaitingForDOM = [JavaScriptFunction]()
    private var documentState = DocumentState.unavailable
    private var documentVersion = 0

    init(webView: WKWebView) {
        self.webView = webView
    }

    func invalidateDocument() {
        documentVersion += 1
        documentState = .unavailable
        functionsWaitingForDOM.removeAll()
    }

    @discardableResult
    func prepareDocument(
        styles: [(identifier: String, css: String)],
        content: String,
        completion: @escaping (Result<Void, Error>) -> Void
    ) -> Bool {
        guard documentState == .unavailable else { return false }
        documentState = .preparing
        let version = documentVersion
        var functions = styles.map {
            JavaScriptFunction.injectCSS(content: $0.css, identifier: $0.identifier)
        }
        functions.append(contentsOf: functionsWaitingForDOM)
        functions.append(.setContent(content: content))
        functionsWaitingForDOM.removeAll()

        let source = functions.map { $0.call() }.joined(separator: "\n")
        guard let webView else {
            documentState = .unavailable
            completion(.failure(JavaScriptManagerError.webViewUnavailable))
            return true
        }
        webView.evaluateJavaScript(source) { [weak self] _, error in
            guard let self, version == self.documentVersion else { return }
            if let error {
                self.documentState = .unavailable
                self.delegate?.javascriptFunctionDidFail(error: error, function: "prepareDocument")
                completion(.failure(error))
            } else {
                self.documentState = .ready
                self.evaluateWaitingFunctions()
                completion(.success(()))
            }
        }
        return true
    }

    func setHTMLContent(_ content: String) {
        let setContent = JavaScriptFunction.setContent(content: content)
        evaluateWhenDOMIsReady(function: setContent)
    }

    func injectCSS(_ content: String, identifier: String) {
        let injectCSS = JavaScriptFunction.injectCSS(content: content, identifier: identifier)
        evaluateWhenDOMIsReady(function: injectCSS)
    }

    func execCommand(_ command: ExecCommand, argument: Sendable? = nil) {
        let execCommand = JavaScriptFunction.execCommand(command: command.rawValue, argument: argument)
        evaluate(function: execCommand)
    }

    func addLink(text: String?, path: String) {
        let createLink = JavaScriptFunction.createLink(url: path, text: text)
        evaluate(function: createLink)
    }

    func unlink() {
        evaluate(function: .unlink)
    }

    func focus() {
        evaluate(function: .focus)
    }

    func blur() {
        evaluate(function: .blur)
    }

    func setCaretAtBeginningOfDocument() {
        evaluate(function: .setCaretAtEndOfDocument)
    }

    func setCaretAtEndOfDocument() {
        evaluate(function: .setCaretAtEndOfDocument)
    }

    func setCaretAtSelector(selector: String) {
        evaluate(function: .setCaretAtSelector(selector: selector))
    }

    private func evaluateWaitingFunctions() {
        let functions = functionsWaitingForDOM
        functionsWaitingForDOM.removeAll()
        for function in functions {
            evaluate(function: function)
        }
    }

    private func evaluateWhenDOMIsReady(function: JavaScriptFunction) {
        guard isDOMContentLoaded else {
            functionsWaitingForDOM.append(function)
            return
        }
        evaluate(function: function)
    }

    private func evaluate(function: JavaScriptFunction) {
        webView?.evaluateJavaScript(function.call()) { [weak self] _, error in
            if let error {
                self?.delegate?.javascriptFunctionDidFail(error: error, function: function.identifier)
            }
        }
    }
}

private enum JavaScriptManagerError: Error {
    case webViewUnavailable
}
