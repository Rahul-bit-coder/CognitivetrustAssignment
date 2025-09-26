Secure Code Assistant (VS Code Extension)
A VS Code extension that enriches prompts with a security checklist, scans code using Semgrep for insecure patterns, surfaces diagnostics with one‑click quick fixes, and rescans after fixes.

Features
Prompt Enricher (basic): Opens a webview panel to append a security checklist to any pasted prompt; needs CSP hardening and UX improvements as noted below.

On-save/open/change scanning: Scans supported files with Semgrep and shows diagnostics; debounced on change for performance.

Focus detections:

Hardcoded secrets (e.g., API keys in code).

Missing authorization checks on routes/controllers (e.g., Express without role validation).

Outdated/vulnerable dependencies via package.json rules (simulation supported).

One‑click quick fixes:

Replace hardcoded secret with process.env usage.

Inject authorization middleware into Express route definitions.

Replace eval with a safe parsing placeholder.

Switch insecure http usage to https.

Convert string‑concatenated SQL to a parameterized query skeleton.

Replace MongoDB $where with explicit field filters.

Auto rescan: After applying a fix, the active file is rescanned to confirm resolution.

Current limitations and planned improvements
Prompt Enricher limitations:

Uses an inline script and lacks a strict CSP/nonce; should be refactored to external script with CSP using webview.cspSource and a nonce.

Minimal UI; consider adding validation, copy feedback, and persisted history of enriched prompts.

Language coverage:

Currently supports JavaScript, TypeScript, and JSON; architecture allows adding more languages by expanding SUPPORTED and providing rules for other ecosystems (e.g., Python/requirements.txt, Java/pom.xml).

Configuration:

RULES_PATH is hardcoded; should be moved to a contributes.configuration setting (e.g., secagent.rulesPath) and support workspace‑relative paths and remote URLs.

Semgrep integration:

Exit code handling should prefer parsing JSON findings even when exitCode != 0 and treat stderr warnings non‑fatal.

Requirements
VS Code 1.70+ and Node.js/npm.

Semgrep CLI installed and on PATH.

A Semgrep rules YAML including:

Secrets detection.

Missing authorization checks (Express).

Dependency vulnerability/outdated checks (package.json).

Setup
Clone and install

git clone https://github.com/Rahul-bit-coder/CognitivetrustAssignment

cd CognitivetrustAssignment

npm install

Build

npm run compile

Configure rules

Place a rules YAML and set RULES_PATH in src/extension.ts to its absolute path for now.

Launch

Press F5 to start the Extension Development Host and load the extension.

Verify Semgrep

Run semgrep --version in a terminal accessible to VS Code.

Usage
Scanning

Open any JS/TS/JSON file to trigger a scan; saving or typing (debounced) will rescan.

See diagnostics inline and in the Problems panel; check the “Secure Code Assistant” output channel for command logs.

Quick fixes

Use the lightbulb menu to apply a fix; a rescan runs automatically afterward.

Prompt Enricher

Command: “Secure Code Assistant: Enrich Prompt” opens the panel.

Paste a prompt, click Enrich to append the security checklist; copy the enriched prompt for use.

What’s implemented vs assignment
Plugin basics: Activation on open/save/change with debounce and diagnostics surfaced.

Prompt enrichment: Webview that appends a secure‑coding checklist to any prompt.

Semgrep scanning: CLI integration with JSON parsing into diagnostics.

Auto‑rewrite/suggestions: Code actions provide safe replacements or skeletons for high‑risk patterns.

Inline/popup suggestions: Diagnostics with Quick Fix UI; optional info messages on error paths.

Rescan after fix: Post‑fix command to rescan the active file.

Extending to other languages
Add language IDs to SUPPORTED and contribute activation events for them.

Provide/reuse appropriate Semgrep rules (e.g., Python secrets, Flask auth checks, requirements.txt outdated packages).

Add language‑specific quick fixes where applicable (e.g., Python parameterized queries with DB‑API placeholders).

Roadmap (immediate next tasks)
Convert RULES_PATH into a user/workspace setting with file picker and workspace‑relative resolution.

Harden the webview: strict CSP with nonce, external script, and no inline event handlers; optionally add confirm/copy toasts.

Improve Semgrep robustness: treat JSON findings as source of truth even if non‑zero exit; surface stderr warnings in the output channel without clearing diagnostics.

Add “Scan workspace” and “Scan dependencies” commands, and recognize active package.json for dependency rules.

Scripts
Build: npm run compile

Watch: npm run watch

Prepublish: npm run vscode:prepublish



