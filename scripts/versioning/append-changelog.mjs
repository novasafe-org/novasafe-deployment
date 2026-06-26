#!/usr/bin/env node
/**
 * Prepend a release section to CHANGELOG.md.
 * Usage:
 *   node append-changelog.mjs --version 1.2.0 --section "Added" --message "Users list" --file CHANGELOG.md
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const opts = { version: "", section: "Changed", message: "", file: "CHANGELOG.md", repoRoot: null };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--version" && argv[i + 1]) opts.version = argv[++i];
    else if (arg === "--section" && argv[i + 1]) opts.section = argv[++i];
    else if (arg === "--message" && argv[i + 1]) opts.message = argv[++i];
    else if (arg === "--file" && argv[i + 1]) opts.file = argv[++i];
    else if (arg === "--repo-root" && argv[i + 1]) opts.repoRoot = argv[++i];
  }
  return opts;
}

const opts = parseArgs(process.argv);
const repoRoot = path.resolve(process.env.REPO_ROOT || opts.repoRoot || path.join(__dirname, "..", ".."));
const changelogPath = path.resolve(repoRoot, opts.file);
const header = `# Changelog\n\n`;
const block = `## v${opts.version}\n\n### ${opts.section}\n\n${opts.message}\n\n`;
let content = fs.existsSync(changelogPath) ? fs.readFileSync(changelogPath, "utf8") : header;
if (!content.startsWith("#")) content = header + content;
const withoutDup = content.replace(new RegExp(`## v${opts.version.replace(/\./g, "\\.")}\\b[\\s\\S]*?(?=## v|$)`), "");
const body = withoutDup.replace(/^# Changelog\s*\n*/i, "");
fs.writeFileSync(changelogPath, `${header}${block}${body}`);
console.log(`[changelog] updated ${changelogPath} for v${opts.version}`);
