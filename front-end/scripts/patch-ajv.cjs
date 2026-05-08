/**
 * Postinstall script to patch ESLint's ajv usage for ajv 8.x compatibility.
 *
 * ESLint (and @eslint/eslintrc) depend on ajv 6.x which has a moderate ReDoS
 * vulnerability (GHSA-2g4f-4pwh-qvx6). The fix is only in ajv >=8.18.0, but
 * ajv 8.x has a different API. This script patches the relevant files in
 * node_modules so ESLint works correctly with ajv 8.x.
 */
const fs = require("fs");
const path = require("path");

const nodeModules = path.join(__dirname, "..", "node_modules");

// ── Patch 1: eslint/lib/shared/ajv.js ──────────────────────────────────────
const eslintAjvPath = path.join(
  nodeModules,
  "eslint",
  "lib",
  "shared",
  "ajv.js"
);

if (fs.existsSync(eslintAjvPath)) {
  const patched = `/**
 * @fileoverview The instance of Ajv validator.
 * Patched for ajv 8.x compatibility (GHSA-2g4f-4pwh-qvx6).
 */
"use strict";

const Ajv = require("ajv");

module.exports = (additionalOptions = {}) => {
    // Strip options that only exist in ajv 6.x
    const { missingRefs, schemaId, meta, ...rest } = additionalOptions;
    const ajv = new Ajv({
        strict: false,
        validateFormats: false,
        useDefaults: true,
        validateSchema: false,
        ...rest,
    });
    return ajv;
};
`;
  fs.writeFileSync(eslintAjvPath, patched, "utf8");
  console.log("[patch-ajv] Patched eslint/lib/shared/ajv.js");
}

// ── Patch 2: @eslint/eslintrc bundled ajv usage ────────────────────────────
const eslintrcFiles = [
  path.join(nodeModules, "@eslint", "eslintrc", "dist", "eslintrc-universal.cjs"),
  path.join(nodeModules, "@eslint", "eslintrc", "dist", "eslintrc.cjs"),
];

const oldPattern =
  /var ajvOrig = \(additionalOptions = \{\}\) => \{[\s\S]*?return ajv;\n\};/;

const newFn = `var ajvOrig = (additionalOptions = {}) => {
    // Patched for ajv 8.x compatibility (GHSA-2g4f-4pwh-qvx6)
    const { missingRefs, schemaId, meta, ...rest } = additionalOptions;
    const ajv = new Ajv__default["default"]({
        strict: false,
        validateFormats: false,
        useDefaults: true,
        validateSchema: false,
        ...rest
    });
    return ajv;
};`;

for (const filePath of eslintrcFiles) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, "utf8");
    if (oldPattern.test(content)) {
      content = content.replace(oldPattern, newFn);
      fs.writeFileSync(filePath, content, "utf8");
      console.log(`[patch-ajv] Patched ${path.relative(nodeModules, filePath)}`);
    }
  }
}

console.log("[patch-ajv] Done.");
