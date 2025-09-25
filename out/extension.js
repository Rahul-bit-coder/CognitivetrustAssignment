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
function activate(context) {
    console.log('Secure Code Assistant active');
    const diagnosticsCollection = vscode.languages.createDiagnosticCollection("secureCode");
    context.subscriptions.push(diagnosticsCollection);
    vscode.workspace.onDidSaveTextDocument((document) => {
        runSemgrepScan(document, diagnosticsCollection);
    });
}
function runSemgrepScan(document, diagnosticsCollection) {
    const filePath = document.fileName;
    // Run semgrep with JSON output
    (0, child_process_1.exec)(`semgrep --json --config=rules/security-rules.yml ${filePath}`, (err, stdout, stderr) => {
        if (err) {
            console.error("Semgrep error:", stderr);
            return;
        }
        let diagnostics = [];
        try {
            const results = JSON.parse(stdout);
            for (const res of results.results) {
                const startLine = res.start["line"] - 1;
                const startCol = res.start["col"] - 1;
                const endLine = res.end["line"] - 1;
                const endCol = res.end["col"];
                const diagnostic = new vscode.Diagnostic(new vscode.Range(startLine, startCol, endLine, endCol), res.extra.message, res.extra.severity === "ERROR"
                    ? vscode.DiagnosticSeverity.Error
                    : vscode.DiagnosticSeverity.Warning);
                // Attach rule ID for Quick Fix if needed
                diagnostic.code = res.check_id;
                diagnostics.push(diagnostic);
            }
        }
        catch (e) {
            console.error("Failed to parse Semgrep JSON:", e);
        }
        diagnosticsCollection.set(document.uri, diagnostics);
    });
}
function deactivate() { }
//# sourceMappingURL=extension.js.map