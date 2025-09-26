import * as vscode from "vscode";
import { exec } from "child_process";

const RULES_PATH = "C:/Users/Rahul/Desktop/Aiagent/secagent/rules/hardcoded-secrets.yml"; // absolute path
const SUPPORTED = new Set(["javascript", "javascriptreact", "typescript", "typescriptreact", "json"]);

let output: vscode.OutputChannel;
let diagnosticsCollection: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext) {
  console.log("Secure Code Assistant active");

  output = vscode.window.createOutputChannel("Secure Code Assistant");
  context.subscriptions.push(output);

  diagnosticsCollection = vscode.languages.createDiagnosticCollection("secureCode");
  context.subscriptions.push(diagnosticsCollection);

  const maybeScan = (doc: vscode.TextDocument) => {
    if (!SUPPORTED.has(doc.languageId)) return;
    runSemgrepScan(doc, diagnosticsCollection);
  };

  // Scan on save
  context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(maybeScan));

  // Scan when a supported document opens
  context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(maybeScan));

  // Debounced scan on change for current doc
  let timer: NodeJS.Timeout | undefined;
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (!SUPPORTED.has(e.document.languageId)) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => maybeScan(e.document), 600);
    })
  );

  // Initial scan for active editor on activation
  const active = vscode.window.activeTextEditor?.document;
  if (active) maybeScan(active);

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand("secagent.enrichPrompt", () => {
      try {
        openPromptEnricher();
      } catch (e) {
        vscode.window.showInformationMessage("🔐 Enrich Prompt executed!");
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("secagent.rescanActive", async () => {
      const doc = vscode.window.activeTextEditor?.document;
      if (!doc) {
        vscode.window.showInformationMessage("No active document to rescan.");
        return;
      }
      try {
        runSemgrepScan(doc, diagnosticsCollection);
      } catch {
        vscode.window.showInformationMessage("🔍 Rescan Active File executed!");
      }
    })
  );

  // Register quick fixes
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      [{ language: "javascript" }, { language: "typescript" }],
      new SecurityQuickFixProvider(),
      { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
    )
  );
}

function runSemgrepScan(
  document: vscode.TextDocument,
  diagnosticsCollection: vscode.DiagnosticCollection
) {
  const filePath = document.fileName;
  const cmd = `semgrep --json --config "${RULES_PATH}" "${filePath}"`;

  output.appendLine(`[semgrep] ${cmd}`);

  exec(cmd, { windowsHide: true }, (err, stdout, stderr) => {
    if (err) {
      output.appendLine(`[semgrep:err] ${stderr || err.message}`);
      vscode.window.setStatusBarMessage(
        'Semgrep scan failed. See "Secure Code Assistant" output.',
        5000
      );
      diagnosticsCollection.set(document.uri, []); // clear to avoid stale
      return;
    }

    const diagnostics: vscode.Diagnostic[] = [];
    try {
      const results = JSON.parse(stdout);
      for (const res of results.results || []) {
        const startLine = (res.start?.line ?? 1) - 1;
        const startCol = (res.start?.col ?? 1) - 1;
        const endLine = (res.end?.line ?? startLine + 1) - 1;
        const endCol = res.end?.col ?? 1;

        const severity =
          res.extra?.severity === "ERROR"
            ? vscode.DiagnosticSeverity.Error
            : vscode.DiagnosticSeverity.Warning;

        const message =
          res.extra?.message ||
          res.extra?.metadata?.message ||
          "Security issue detected";
        const diagnostic = new vscode.Diagnostic(
          new vscode.Range(startLine, startCol, endLine, endCol),
          message,
          severity
        );
        diagnostic.code = res.check_id;
        diagnostics.push(diagnostic);
      }
    } catch (e: any) {
      output.appendLine(`[semgrep:parse] Failed to parse JSON: ${e?.message}`);
      vscode.window.showErrorMessage("Semgrep JSON parse error. See output for details.");
    }

    diagnosticsCollection.set(document.uri, diagnostics);
    vscode.window.setStatusBarMessage(
      `Semgrep found ${diagnostics.length} issue(s)`,
      3000
    );
  });
}

function openPromptEnricher() {
  const panel = vscode.window.createWebviewPanel(
    "promptEnricher",
    "Prompt Enricher",
    vscode.ViewColumn.Two,
    { enableScripts: true }
  );

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

function enrichPrompt(raw: string): string {
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

class SecurityQuickFixProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    doc: vscode.TextDocument,
    range: vscode.Range,
    ctx: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];
    for (const diag of ctx.diagnostics) {
      const id = String(diag.code || "");
      if (!id) continue;

      if (id.includes("dangerous-eval")) {
        const a = this.replaceEvalWithParse(doc, diag);
        if (a) actions.push(a);
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

  private replaceEvalWithParse(
    doc: vscode.TextDocument,
    diag: vscode.Diagnostic
  ): vscode.CodeAction | null {
    const text = doc.getText(diag.range);
    const m = text.match(/eval\((.+)\)/);
    const act = new vscode.CodeAction(
      "Replace eval(...) with safe parsing",
      vscode.CodeActionKind.QuickFix
    );
    act.diagnostics = [diag];
    act.edit = new vscode.WorkspaceEdit();

    if (m) {
      const arg = m[1].trim();
      if (/['"]\s*\{/.test(arg) || /['"]\s*\[/.test(arg)) {
        const replacement = `JSON.parse(${arg})`;
        act.edit.replace(doc.uri, diag.range, replacement);
      } else {
        const replacement = `/* TODO: avoid eval; parse/validate input explicitly */ /* ${text} */`;
        act.edit.replace(doc.uri, diag.range, replacement);
      }
      act.isPreferred = true;
      act.command = { command: "secagent.rescanActive", title: "Rescan" };
      return act;
    }
    return null;
  }

  private replaceHttpWithHttps(
    doc: vscode.TextDocument,
    diag: vscode.Diagnostic
  ): vscode.CodeAction {
    const act = new vscode.CodeAction(
      "Use HTTPS instead of HTTP",
      vscode.CodeActionKind.QuickFix
    );
    act.diagnostics = [diag];
    act.edit = new vscode.WorkspaceEdit();
    const original = doc.getText(diag.range);
    const replaced = original.replace(/http\b/g, "https");
    act.edit.replace(doc.uri, diag.range, replaced);
    act.command = { command: "secagent.rescanActive", title: "Rescan" };
    return act;
  }

  private sqlParamSkeleton(
    doc: vscode.TextDocument,
    diag: vscode.Diagnostic
  ): vscode.CodeAction {
    const act = new vscode.CodeAction(
      "Refactor to parameterized query",
      vscode.CodeActionKind.QuickFix
    );
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

  private removeWhereSkeleton(
    doc: vscode.TextDocument,
    diag: vscode.Diagnostic
  ): vscode.CodeAction {
    const act = new vscode.CodeAction(
      "Remove $where and use field filters",
      vscode.CodeActionKind.QuickFix
    );
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

  private addAuthMiddlewareHint(
    doc: vscode.TextDocument,
    diag: vscode.Diagnostic
  ): vscode.CodeAction {
    const act = new vscode.CodeAction(
      "Add authorization middleware",
      vscode.CodeActionKind.QuickFix
    );
    act.diagnostics = [diag];
    act.edit = new vscode.WorkspaceEdit();
    const original = doc.getText(diag.range);
    const replaced = original.replace(
      /app\.(\w+)\(([^,]+),\s*\(/,
      (match, method, route) => `app.${method}(${route}, checkRole('admin'), (`
    );
    act.edit.replace(doc.uri, diag.range, replaced);
    act.command = { command: "secagent.rescanActive", title: "Rescan" };
    return act;
  }

  private moveSecretToEnvHint(
    doc: vscode.TextDocument,
    diag: vscode.Diagnostic
  ): vscode.CodeAction {
    const act = new vscode.CodeAction(
      "Move secret to env and read from process.env",
      vscode.CodeActionKind.QuickFix
    );
    act.diagnostics = [diag];
    act.edit = new vscode.WorkspaceEdit();
    const original = doc.getText(diag.range);
    const replaced = original.replace(
      /const\s+(\w+)\s*=\s*["'][^"']+["']/,
      `const $1 = process.env.$1`
    );
    act.edit.replace(doc.uri, diag.range, replaced);
    act.command = { command: "secagent.rescanActive", title: "Rescan" };
    return act;
  }
}

export function deactivate() {
  console.log("Secure Code Assistant deactivated");
}
