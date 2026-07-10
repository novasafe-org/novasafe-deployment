#!/usr/bin/env node
/**
 * Parse and merge dotenv-style files (later files override earlier keys).
 *
 * Usage:
 *   node merge-env-files.mjs out.env base.env [override.env ...]
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [, , outputPath, ...inputPaths] = process.argv;

if (!outputPath || inputPaths.length === 0) {
  console.error('Usage: merge-env-files.mjs <output> <input.env> [more.env ...]');
  process.exit(1);
}

const merged = new Map();

const parseEnvFile = (filePath) => {
  const text = readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const withoutExport = trimmed.startsWith('export ')
      ? trimmed.slice('export '.length).trim()
      : trimmed;

    const eq = withoutExport.indexOf('=');
    if (eq === -1) continue;

    const key = withoutExport.slice(0, eq).trim();
    let value = withoutExport.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    merged.set(key, value);
  }
};

for (const inputPath of inputPaths) {
  parseEnvFile(inputPath);
}

const body = [...merged.entries()]
  .map(([key, value]) => `${key}=${value}`)
  .join('\n')
  .concat('\n');

writeFileSync(outputPath, body, 'utf8');
console.log(`[env] merged ${inputPaths.length} file(s) → ${outputPath} (${merged.size} keys)`);
