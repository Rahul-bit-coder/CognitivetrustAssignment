"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
const RULES_PATH = "C:/Users/Rahul/Desktop/Aiagent/secagent/rules/hardcoded-secrets.yml"; // absolute path
const SUPPORTED = new Set(['javascript', 'javascriptreact', 'typescript', 'typescriptreact', 'json']);
let output;
function activate(context) {
    var _a;
    console.log('Secure Code Assistant active');
    output = vscode.window.createOutputChannel('Secure Code Assistant');
    context.subscriptions.push(output);
    const diagnosticsCollection = vscode.languages.createDiagnosticCollection("secureCode");
    context.subscriptions.push(diagnosticsCollection);
    const maybeScan = (doc) => {
        if (!SUPPORTED.has(doc.languageId))
            return;
        runSemgrepScan(doc, diagnosticsCollection);
    };
    // Scan on save
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(maybeScan));
    // Scan when a supported document opens
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(maybeScan));
    // Debounced scan on change for current doc
    let timer;
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(e => {
        if (!SUPPORTED.has(e.document.languageId))
            return;
        if (timer)
            clearTimeout(timer);
        timer = setTimeout(() => maybeScan(e.document), 600);
    }));
    // Initial scan for active editor on activation
    const active = (_a = vscode.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.document;
    if (active)
        maybeScan(active);
}
function runSemgrepScan(document, diagnosticsCollection) {
    const filePath = document.fileName;
    const cmd = `semgrep --json --config "${RULES_PATH}" "${filePath}"`;
    output.appendLine(`[semgrep] ${cmd}`);
    (0, child_process_1.exec)(cmd, { windowsHide: true }, (err, stdout, stderr) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        if (err) {
            output.appendLine(`[semgrep:err] ${stderr || err.message}`);
            vscode.window.setStatusBarMessage('Semgrep scan failed. See "Secure Code Assistant" output.', 5000);
            diagnosticsCollection.set(document.uri, []); // clear to avoid stale
            return;
        }
        const diagnostics = [];
        try {
            const results = JSON.parse(stdout);
            for (const res of results.results || []) {
                const startLine = ((_b = (_a = res.start) === null || _a === void 0 ? void 0 : _a.line) !== null && _b !== void 0 ? _b : 1) - 1;
                const startCol = ((_d = (_c = res.start) === null || _c === void 0 ? void 0 : _c.col) !== null && _d !== void 0 ? _d : 1) - 1;
                const endLine = ((_f = (_e = res.end) === null || _e === void 0 ? void 0 : _e.line) !== null && _f !== void 0 ? _f : startLine + 1) - 1;
                const endCol = ((_h = (_g = res.end) === null || _g === void 0 ? void 0 : _g.col) !== null && _h !== void 0 ? _h : 1);
                const severity = (((_j = res.extra) === null || _j === void 0 ? void 0 : _j.severity) === "ERROR")
                    ? vscode.DiagnosticSeverity.Error
                    : vscode.DiagnosticSeverity.Warning;
                const message = ((_k = res.extra) === null || _k === void 0 ? void 0 : _k.message) || ((_m = (_l = res.extra) === null || _l === void 0 ? void 0 : _l.metadata) === null || _m === void 0 ? void 0 : _m.message) || 'Security issue detected';
                const diagnostic = new vscode.Diagnostic(new vscode.Range(startLine, startCol, endLine, endCol), message, severity);
                diagnostic.code = res.check_id;
                diagnostics.push(diagnostic);
            }
        }
        catch (e) {
            output.appendLine(`[semgrep:parse] Failed to parse JSON: ${e === null || e === void 0 ? void 0 : e.message}`);
            vscode.window.showErrorMessage('Semgrep JSON parse error. See output for details.');
        }
        diagnosticsCollection.set(document.uri, diagnostics);
        vscode.window.setStatusBarMessage(`Semgrep found ${diagnostics.length} issue(s)`, 3000);
    });
}
function deactivate() { }
//# sourceMappingURL=extension.js.map