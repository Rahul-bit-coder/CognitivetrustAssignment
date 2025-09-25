// ==============================
// Test File for Semgrep Rules
// ==============================

// 1. Hardcoded secret
const API_KEY = "12345";   // triggers hardcoded-secrets

// 2. Missing authorization in Express route
const express = require('express');
const app = express();

app.get("/admin", (req, res) => {  // triggers missing-authorization
    res.send("Admin page");
});

// 3. Outdated dependency example (simulated as a JSON object)
const packageJson = {
    "express": "4.16.0",     // triggers outdated-dependencies if Semgrep JSON rule is applied
    "lodash": "3.10.1"
};

// 4. Dangerous eval
eval("console.log('dangerous')");  // triggers dangerous-eval

// 5. NoSQL injection
const db = { users: [] };
db.users.find({ $where: "this.isAdmin == true" });  // triggers nosql-injection

// 6. SQL injection
db.query("SELECT * FROM users WHERE id=" + userId); // triggers sql-injection

// 7. Insecure HTTP request
const http = require('http');
http.get("http://example.com", (res) => {            // triggers insecure-http
    res.on('data', (chunk) => {});
});
