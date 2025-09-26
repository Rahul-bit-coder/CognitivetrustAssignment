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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
const RULES_PATH = "C:/Users/Rahul/Desktop/Aiagent/secagent/rules/hardcoded-secrets.yml"; // absolute path
const SUPPORTED = new Set(["javascript", "javascriptreact", "typescript", "typescriptreact", "json"]);
let output;
let diagnosticsCollection;
function activate(context) {
    var _a;
    console.log("Secure Code Assistant active");
    output = vscode.window.createOutputChannel("Secure Code Assistant");
    context.subscriptions.push(output);
    diagnosticsCollection = vscode.languages.createDiagnosticCollection("secureCode");
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
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((e) => {
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
    // Commands
    context.subscriptions.push(vscode.commands.registerCommand("secagent.enrichPrompt", () => {
        try {
            openPromptEnricher();
        }
        catch (e) {
            vscode.window.showInformationMessage("🔐 Enrich Prompt executed!");
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("secagent.rescanActive", () => __awaiter(this, void 0, void 0, function* () {
        var _a;
        const doc = (_a = vscode.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.document;
        if (!doc) {
            vscode.window.showInformationMessage("No active document to rescan.");
            return;
        }
        try {
            runSemgrepScan(doc, diagnosticsCollection);
        }
        catch (_b) {
            vscode.window.showInformationMessage("🔍 Rescan Active File executed!");
        }
    })));
    // Register quick fixes
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider([{ language: "javascript" }, { language: "typescript" }], new SecurityQuickFixProvider(), { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }));
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
                const endCol = (_h = (_g = res.end) === null || _g === void 0 ? void 0 : _g.col) !== null && _h !== void 0 ? _h : 1;
                const severity = ((_j = res.extra) === null || _j === void 0 ? void 0 : _j.severity) === "ERROR"
                    ? vscode.DiagnosticSeverity.Error
                    : vscode.DiagnosticSeverity.Warning;
                const message = ((_k = res.extra) === null || _k === void 0 ? void 0 : _k.message) ||
                    ((_m = (_l = res.extra) === null || _l === void 0 ? void 0 : _l.metadata) === null || _m === void 0 ? void 0 : _m.message) ||
                    "Security issue detected";
                const diagnostic = new vscode.Diagnostic(new vscode.Range(startLine, startCol, endLine, endCol), message, severity);
                diagnostic.code = res.check_id;
                diagnostics.push(diagnostic);
            }
        }
        catch (e) {
            output.appendLine(`[semgrep:parse] Failed to parse JSON: ${e === null || e === void 0 ? void 0 : e.message}`);
            vscode.window.showErrorMessage("Semgrep JSON parse error. See output for details.");
        }
        diagnosticsCollection.set(document.uri, diagnostics);
        vscode.window.setStatusBarMessage(`Semgrep found ${diagnostics.length} issue(s)`, 3000);
    });
}
function openPromptEnricher() {
    const panel = vscode.window.createWebviewPanel("promptEnricher", "Prompt Enricher", vscode.ViewColumn.Two, { enableScripts: true });
    panel.webview.onDidReceiveMessage((msg) => {
        if (msg.type === "enrich") {
            const enriched = enrichPrompt(msg.text);
            panel.webview.postMessage({ type: "enriched", text: enriched });
        }
    });
    panel.webview.html = `
  <!doctype html>
  <html>
  <body style="font-family: sans-serif; padding:12px;">
    <h3>Prompt Enricher</h3>
    <textarea id="in" rows="8" style="width:100%;"></textarea>
    <div style="margin-top:8px;">
      <button id="go">Enrich</button>
    </div>
    <h4>Enriched Prompt</h4>
    <textarea id="out" rows="10" style="width:100%;"></textarea>
    <div style="margin-top:8px;">
      <button id="copy">Copy</button>
    </div>
    <script>
      const vscode = acquireVsCodeApi();
      document.getElementById('go').onclick = () => {
        vscode.postMessage({ type: 'enrich', text: document.getElementById('in').value });
      };
      window.addEventListener('message', event => {
        if (event.data?.type === 'enriched') {
          document.getElementById('out').value = event.data.text;
        }
      });
      document.getElementById('copy').onclick = async () => {
        await navigator.clipboard.writeText(document.getElementById('out').value);
      };
    </script>
  </body>
  </html>`;
}
function enrichPrompt(raw) {
    const bullets = [
        "Enforce input validation and output encoding.",
        "Use parameterized SQL queries and avoid string concatenation.",
        "Avoid eval and dynamic Function constructors.",
        "Use HTTPS for all network calls; verify certificates.",
        "Do not hardcode secrets; load from env or secret manager.",
        "Perform authentication and authorization on all routes.",
        "Follow secure defaults (e.g., Helmet for Express).",
        "Add logging for security-relevant events without leaking secrets.",
        "Include unit tests that cover security edge cases.",
    ];
    return `${raw.trim()}

Ensure the implementation satisfies:
- ${bullets.join("\n- ")}`;
}
class SecurityQuickFixProvider {
    provideCodeActions(doc, range, ctx) {
        const actions = [];
        for (const diag of ctx.diagnostics) {
            const id = String(diag.code || "");
            if (!id)
                continue;
            if (id.includes("dangerous-eval")) {
                const a = this.replaceEvalWithParse(doc, diag);
                if (a)
                    actions.push(a);
            }
            if (id.includes("insecure-http")) {
                actions.push(this.replaceHttpWithHttps(doc, diag));
            }
            if (id.includes("sql-injection")) {
                actions.push(this.sqlParamSkeleton(doc, diag));
            }
            if (id.includes("nosql-injection")) {
                actions.push(this.removeWhereSkeleton(doc, diag));
            }
            if (id.includes("missing-authorization")) {
                actions.push(this.addAuthMiddlewareHint(doc, diag));
            }
            if (id.includes("hardcoded-secrets")) {
                actions.push(this.moveSecretToEnvHint(doc, diag));
            }
        }
        return actions;
    }
    replaceEvalWithParse(doc, diag) {
        const text = doc.getText(diag.range);
        const m = text.match(/eval\((.+)\)/);
        const act = new vscode.CodeAction("Replace eval(...) with safe parsing", vscode.CodeActionKind.QuickFix);
        act.diagnostics = [diag];
        act.edit = new vscode.WorkspaceEdit();
        if (m) {
            const arg = m[1].trim();
            if (/['"]\s*\{/.test(arg) || /['"]\s*\[/.test(arg)) {
                const replacement = `JSON.parse(${arg})`;
                act.edit.replace(doc.uri, diag.range, replacement);
            }
            else {
                const replacement = `/* TODO: avoid eval; parse/validate input explicitly */ /* ${text} */`;
                act.edit.replace(doc.uri, diag.range, replacement);
            }
            act.isPreferred = true;
            act.command = { command: "secagent.rescanActive", title: "Rescan" };
            return act;
        }
        return null;
    }
    replaceHttpWithHttps(doc, diag) {
        const act = new vscode.CodeAction("Use HTTPS instead of HTTP", vscode.CodeActionKind.QuickFix);
        act.diagnostics = [diag];
        act.edit = new vscode.WorkspaceEdit();
        const original = doc.getText(diag.range);
        const replaced = original.replace(/http\b/g, "https");
        act.edit.replace(doc.uri, diag.range, replaced);
        act.command = { command: "secagent.rescanActive", title: "Rescan" };
        return act;
    }
    sqlParamSkeleton(doc, diag) {
        const act = new vscode.CodeAction("Refactor to parameterized query", vscode.CodeActionKind.QuickFix);
        act.diagnostics = [diag];
        act.edit = new vscode.WorkspaceEdit();
        const original = doc.getText(diag.range);
        const skeleton = `// TODO: Parameterize query
// ${original}
const sql = "SELECT * FROM users WHERE id = ?";
db.query(sql, [id]);`;
        act.edit.replace(doc.uri, diag.range, skeleton);
        act.command = { command: "secagent.rescanActive", title: "Rescan" };
        return act;
    }
    removeWhereSkeleton(doc, diag) {
        const act = new vscode.CodeAction("Remove $where and use field filters", vscode.CodeActionKind.QuickFix);
        act.diagnostics = [diag];
        act.edit = new vscode.WorkspaceEdit();
        const original = doc.getText(diag.range);
        const skeleton = `// Avoid $where; use explicit filters
// ${original}
db.users.find({ age: { $gt: 18 } });`;
        act.edit.replace(doc.uri, diag.range, skeleton);
        act.command = { command: "secagent.rescanActive", title: "Rescan" };
        return act;
    }
    addAuthMiddlewareHint(doc, diag) {
        const act = new vscode.CodeAction("Add authorization middleware", vscode.CodeActionKind.QuickFix);
        act.diagnostics = [diag];
        act.edit = new vscode.WorkspaceEdit();
        const original = doc.getText(diag.range);
        const replaced = original.replace(/app\.(\w+)\(([^,]+),\s*\(/, (match, method, route) => `app.${method}(${route}, checkRole('admin'), (`);
        act.edit.replace(doc.uri, diag.range, replaced);
        act.command = { command: "secagent.rescanActive", title: "Rescan" };
        return act;
    }
    moveSecretToEnvHint(doc, diag) {
        const act = new vscode.CodeAction("Move secret to env and read from process.env", vscode.CodeActionKind.QuickFix);
        act.diagnostics = [diag];
        act.edit = new vscode.WorkspaceEdit();
        const original = doc.getText(diag.range);
        const replaced = original.replace(/const\s+(\w+)\s*=\s*["'][^"']+["']/, `const $1 = process.env.$1`);
        act.edit.replace(doc.uri, diag.range, replaced);
        act.command = { command: "secagent.rescanActive", title: "Rescan" };
        return act;
    }
}
function deactivate() {
    console.log("Secure Code Assistant deactivated");
}
//# sourceMappingURL=extension.js.map