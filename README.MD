# Secure Code Assistant (VS Code Extension)
A lightweight VS Code extension that flags common insecure patterns with Semgrep, shows inline diagnostics, offers one‑click fixes, and targets fast feedback during development.

**Highlights**
Prompt Enricher panel to append a security checklist to prompts for safer code generation.

On‑open, on‑save, and debounced on‑change scanning for JS/TS/JSON.

**Focus detections:**

Hardcoded secrets (e.g., API keys in code).

Missing authorization checks on routes/controllers (e.g., Express routes without role validation).

Outdated/vulnerable dependencies via package.json (simulation supported).

**One‑click quick fixes:**

Replace hardcoded secret with process.env usage.

Inject role‑based middleware into Express routes.

Replace eval with a safe parsing placeholder.

Switch http to https in simple string cases.

Convert concatenated SQL to parameterized query skeleton.

Replace MongoDB $where with explicit field filters.

**Current Status and Known Gaps**
Prompt Enrichment: Implemented as a basic webview that appends a standard security checklist, but it is not fully robust; CSP hardening and UX polish are pending.

Rescan After Fix: Intended to auto‑rescan after applying a quick fix; currently attempted but may not consistently trigger or confirm resolution in all cases.

Language Coverage: Currently supports only JavaScript, TypeScript, and JSON; designed to be extensible to other languages in future updates.

**Requirements**
VS Code 1.70+

Node.js and npm

Semgrep CLI available on PATH

Semgrep rules (YAML) including:

Secrets detection

Missing authorization (Express routes)

Outdated/vulnerable dependency checks for package.json

**Setup**
Clone and install

git clone https://github.com/Rahul-bit-coder/CognitivetrustAssignment

cd CognitivetrustAssignment

npm install

Build

npm run compile

Configure rules

Place or reference a Semgrep rules YAML (e.g., hardcoded-secrets.yml).

In src/extension.ts, set the RULES_PATH to the absolute path for the rules file (temporary approach).

Launch the extension

Open the project in VS Code and press F5 to start the Extension Development Host.

Verify Semgrep

semgrep --version should work in a terminal that VS Code can use.

Usage
Scanning

Open a JS/TS/JSON file; scans run on open and save, and are debounced on edit for performance.

Findings appear inline and in the Problems panel; the “Secure Code Assistant” output channel shows the Semgrep command and logs.

**Quick fixes**

Use the lightbulb on diagnostics to apply suggested fixes; the extension aims to rescan after fix to validate resolution (see Current Status).

Prompt Enricher

Run command: “Secure Code Assistant: Enrich Prompt” to open the panel.

Paste a prompt and click Enrich to append the security checklist; copy the enriched prompt for use.

What’s Implemented (Assignment Mapping)
VS Code plugin basics: Activation on open/save/change, diagnostics surfaced in Problems, and an output channel.

Prompt enrichment: A webview that appends a secure‑coding checklist to prompts (basic implementation; see gaps).

Semgrep integration: Runs Semgrep with JSON output, parses findings, and maps to diagnostics.

Fix suggestions: Contextual quick fixes for secrets, missing auth, eval, http->https, SQL parameterization, and MongoDB $where.

Rescan after fix: Mechanism attempted to re‑run scan post‑fix, but may not always confirm resolution (see gaps).

Limitations
Prompt Enricher hardening: Uses inline script and lacks a strict CSP/nonce; needs refactor to external script, nonce, and CSP with webview.cspSource.

Rescan reliability: Post‑fix rescans are not guaranteed in all edge cases; needs more robust triggering and state handling.

Configurability: RULES_PATH is hardcoded; should be a workspace/user setting with file‑picker and workspace‑relative support.

Semgrep edge cases: Exit codes and stderr warnings should be handled so that valid JSON findings do not get discarded.

Language scope: Currently only JS/TS/JSON; extending to Python, Java, etc., will require language IDs, activation events, and rules.

Roadmap
Settings

secagent.rulesPath, secagent.semgrepPath, scanOnSave/open toggles, and changeDebounceMs.

Webview security

Strict CSP + nonce; move inline script to external file; add copy feedback and optional prompt history.

Scanning commands

“Scan workspace” and “Scan dependencies,” and auto‑recognize active package.json for dependency checks.

Diagnostics UX

Related info, rule links, consistent severity mapping, and a tree view to filter by severity/file/rule.

Language extensions

Add Python (requirements.txt), Java (pom/gradle), and framework‑specific rules with tailored fixes.

Tests

Integration tests for diagnostic mapping and code actions using mocked Semgrep JSON.

Scripts
Build: npm run compile

Watch: npm run watch

Prepublish: npm run vscode:prepublish

Contributing
Issues and PRs are welcome. Include sample code, the Semgrep rule or pattern, and exact steps to reproduce.

