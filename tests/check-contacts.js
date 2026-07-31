import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const APPROVED_EMAIL = 'm1@magicmet.ru';
const FORBIDDEN_EMAILS = ['m3@magicmet.ru'];
const TEXT_EXTENSIONS = new Set(['.html', '.js', '.css', '.json', '.md', '.toml', '.yml', '.yaml']);
const SKIP_DIRS = new Set(['.git', 'node_modules', 'playwright-report', 'test-results']);

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const result = [];

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      result.push(...await collectFiles(fullPath));
    } else if (TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      result.push(fullPath);
    }
  }

  return result;
}

const files = await collectFiles(ROOT);
const violations = [];
let approvedEmailFound = false;

for (const file of files) {
  const text = await readFile(file, 'utf8');
  if (text.includes(APPROVED_EMAIL)) approvedEmailFound = true;

  for (const forbidden of FORBIDDEN_EMAILS) {
    if (text.includes(forbidden)) {
      violations.push(`${path.relative(ROOT, file)} contains forbidden address ${forbidden}`);
    }
  }
}

if (!approvedEmailFound) {
  violations.push(`Approved address ${APPROVED_EMAIL} was not found in project files`);
}

if (violations.length) {
  console.error('\nContact validation failed:\n- ' + violations.join('\n- '));
  process.exit(1);
}

console.log(`Contact validation passed: ${APPROVED_EMAIL}`);
