#!/usr/bin/env node
/**
 * Bump semver in package.json.
 * Usage: node bump-version.mjs <patch|minor|major> [--package path/to/package.json]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const opts = { bump: "patch", packageJson: "package.json", repoRoot: null };
  const positional = [];
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--package" && argv[i + 1]) opts.packageJson = argv[++i];
    else if (arg === "--repo-root" && argv[i + 1]) opts.repoRoot = argv[++i];
    else positional.push(arg);
  }
  if (positional[0]) opts.bump = positional[0];
  return opts;
}

function bumpSemver(version, type) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-.+)?$/.exec(version);
  if (!match) throw new Error(`Invalid semver: ${version}`);
  let [major, minor, patch] = match.slice(1, 4).map(Number);
  if (type === "major") {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (type === "minor") {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }
  return `${major}.${minor}.${patch}`;
}

const opts = parseArgs(process.argv);
const repoRoot = path.resolve(process.env.REPO_ROOT || opts.repoRoot || path.join(__dirname, "..", ".."));
const pkgPath = path.resolve(repoRoot, opts.packageJson);
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const current = pkg.version || "0.0.0";
const next = bumpSemver(current, opts.bump);
pkg.version = next;
fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log(JSON.stringify({ previous: current, next, bump: opts.bump, packageJson: opts.packageJson }));
