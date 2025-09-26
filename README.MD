Secure Code Assistant (VS Code Extension)
A lightweight VS Code extension that enriches prompts with a security checklist, scans code for insecure patterns using Semgrep, provides inline diagnostics with one‑click fixes, and automatically rescans after applying fixes.

Highlights
Prompt Enricher webview to append a security checklist to developer prompts.

Scans on open, save, and debounced edits for JS/TS/JSON files.

Focus detections: hardcoded secrets, missing authorization checks, and outdated dependencies in package.json.

Quick fixes for common issues (env secrets, auth middleware, eval removal, HTTPS, parameterized SQL, MongoDB filters).

Automatic rescan after fixes to confirm resolution.

Requirements
VS Code 1.70+

Node.js and npm

Semgrep CLI installed and available on PATH

Semgrep rules YAML for:

Secrets detection

Missing authorization in Express routes

Outdated/vulnerable dependencies (package.json)

Setup
Clone and install

git clone https://github.com/Rahul-bit-coder/CognitivetrustAssignment

cd CognitivetrustAssignment

npm install

Build

npm run compile

Configure rules

Place or reference a Semgrep rules YAML (e.g., hardcoded-secrets.yml).

In src/extension.ts, set RULES_PATH to its absolute path (temporary; will be user-configurable later).

Launch the extension

Press F5 in VS Code to open the Extension Development Host.

Verify Semgrep

semgrep --version should work in a terminal used by VS Code.

Usage
Scanning

Open a JS/TS/JSON file and save or type; scans run on open/save and debounced on change.

Diagnostics appear inline and in the Problems panel; check the “Secure Code Assistant” output channel for commands/logs.

Quick fixes

Use the lightbulb menu for suggested fixes; after applying, the extension rescans the file automatically.

Prompt Enricher

Command: “Secure Code Assistant: Enrich Prompt” opens the webview.

Paste a prompt and click Enrich to append the security checklist, then copy the enriched prompt.

Implemented Features (mapping to assignment)
VS Code plugin basics: Activation on open/save/change, diagnostics, output channel.

Prompt enrichment: Webview adds a curated secure-coding checklist to any prompt.

Semgrep integration: Runs semgrep --json and maps findings to diagnostics.

Auto-rewrite/suggestions: One‑click code actions for insecure patterns.

Inline/popup suggestions: Diagnostics UI plus messages on errors.

Rescan after fix: Triggers a rescan to verify the issue is resolved.

Current Limitations
Prompt Enricher is basic; needs CSP hardening (nonce + webview.cspSource) and moving inline scripts to an external file.

Rules path is hardcoded; should be exposed as a user/workspace setting (secagent.rulesPath) with file picker and workspace‑relative support.

Semgrep exit codes and stderr warnings should be handled more robustly (parse JSON even if exitCode != 0).

The scanner focuses on JS/TS/JSON today; can be extended to Python, Java, etc., by adding language IDs and rules.

Roadmap
Settings: rules path, semgrep path, scan on save/open toggles, debounce ms.

“Scan workspace” and “Scan dependencies” commands; recognize active package.json automatically.

Webview security: strict CSP, nonce, external script, and improved UX (copy toast, history).

Findings view: a tree view to filter by file/severity/rule and jump to locations.

Language extensions: add Python (requirements.txt), Java (pom.xml/gradle), and framework‑specific rules and fixes.

Tests: integration tests for diagnostic mapping and code actions using vscode-test with mocked Semgrep JSON.

Scripts
Build: npm run compile

Watch: npm run watch

Prepublish: npm run vscode:prepublish

Contributing
Issues and PRs are welcome. Please include steps to reproduce, sample code, and the Semgrep rule if applicable.




