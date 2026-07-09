#!/usr/bin/env node
/**
 * Generate index.html for TanStack Start client bundles deployed to S3/CloudFront.
 *
 * Node SSR builds emit dist/client/assets/* but no HTML shell. CloudFront SPA
 * fallback requires /index.html in the bucket.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const clientDir = resolve(process.argv[2] ?? 'dist/client');
const pageTitle = process.env.PAGE_TITLE ?? 'NovaSafe';
const assetsDir = join(clientDir, 'assets');

const styles = readdirSync(assetsDir).find(
  (file) => file.startsWith('styles-') && file.endsWith('.css'),
);

const entry = readdirSync(assetsDir)
  .filter((file) => file.startsWith('index-') && file.endsWith('.js'))
  .find((file) => readFileSync(join(assetsDir, file), 'utf8').includes('hydrateRoot'));

if (!styles || !entry) {
  console.error(`[aws-static] Could not resolve styles or client entry in ${assetsDir}`);
  process.exit(1);
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${pageTitle}</title>
  <link rel="stylesheet" href="/assets/${styles}" />
  <script src="/runtime-config.js"></script>
</head>
<body>
  <script type="module" src="/assets/${entry}"></script>
</body>
</html>
`;

const target = join(clientDir, 'index.html');
writeFileSync(target, html);
console.log(`[aws-static] wrote ${target} (entry=${entry}, styles=${styles})`);
