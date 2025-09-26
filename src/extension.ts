import * as vscode from 'vscode';
import { exec } from 'child_process';

const RULES_PATH = "C:/Users/Rahul/Desktop/Aiagent/secagent/rules/hardcoded-secrets.yml"; // absolute path
const SUPPORTED = new Set(['javascript','javascriptreact','typescript','typescriptreact','json']);

let output: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
  console.log('Secure Code Assistant active');

  output = vscode.window.createOutputChannel('Secure Code Assistant');
  context.subscriptions.push(output);

  const diagnosticsCollection = vscode.languages.createDiagnosticCollection("secureCode");
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
  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(e => {
    if (!SUPPORTED.has(e.document.languageId)) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => maybeScan(e.document), 600);
  }));

  // Initial scan for active editor on activation
  const active = vscode.window.activeTextEditor?.document;
  if (active) maybeScan(active);
}

function runSemgrepScan(document: vscode.TextDocument, diagnosticsCollection: vscode.DiagnosticCollection) {
  const filePath = document.fileName;
  const cmd = `semgrep --json --config "${RULES_PATH}" "${filePath}"`;

  output.appendLine(`[semgrep] ${cmd}`);

  exec(cmd, { windowsHide: true }, (err, stdout, stderr) => {
    if (err) {
      output.appendLine(`[semgrep:err] ${stderr || err.message}`);
      vscode.window.setStatusBarMessage('Semgrep scan failed. See "Secure Code Assistant" output.', 5000);
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
        const endCol = (res.end?.col ?? 1);

        const severity = (res.extra?.severity === "ERROR")
          ? vscode.DiagnosticSeverity.Error
          : vscode.DiagnosticSeverity.Warning;

        const message = res.extra?.message || res.extra?.metadata?.message || 'Security issue detected';
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
      vscode.window.showErrorMessage('Semgrep JSON parse error. See output for details.');
    }

    diagnosticsCollection.set(document.uri, diagnostics);
    vscode.window.setStatusBarMessage(`Semgrep found ${diagnostics.length} issue(s)`, 3000);
  });
}

export function deactivate() {}
