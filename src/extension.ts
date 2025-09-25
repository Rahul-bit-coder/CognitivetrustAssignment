import * as vscode from 'vscode';
import { exec } from 'child_process';

export function activate(context: vscode.ExtensionContext) {
    console.log('Secure Code Assistant active');

    const diagnosticsCollection = vscode.languages.createDiagnosticCollection("secureCode");
    context.subscriptions.push(diagnosticsCollection);

    vscode.workspace.onDidSaveTextDocument((document) => {
        runSemgrepScan(document, diagnosticsCollection);
    });
}

function runSemgrepScan(document: vscode.TextDocument, diagnosticsCollection: vscode.DiagnosticCollection) {
    const filePath = document.fileName;

    // Run semgrep with JSON output
    exec(`semgrep --json --config=rules/security-rules.yml ${filePath}`, (err, stdout, stderr) => {
        if (err) {
            console.error("Semgrep error:", stderr);
            return;
        }

        let diagnostics: vscode.Diagnostic[] = [];

        try {
            const results = JSON.parse(stdout);
            for (const res of results.results) {
                const startLine = res.start["line"] - 1;
                const startCol = res.start["col"] - 1;
                const endLine = res.end["line"] - 1;
                const endCol = res.end["col"];

                const diagnostic = new vscode.Diagnostic(
                    new vscode.Range(startLine, startCol, endLine, endCol),
                    res.extra.message,
                    res.extra.severity === "ERROR" 
                        ? vscode.DiagnosticSeverity.Error 
                        : vscode.DiagnosticSeverity.Warning
                );

                // Attach rule ID for Quick Fix if needed
                diagnostic.code = res.check_id;
                diagnostics.push(diagnostic);
            }
        } catch (e) {
            console.error("Failed to parse Semgrep JSON:", e);
        }

        diagnosticsCollection.set(document.uri, diagnostics);
    });
}

export function deactivate() {}
