import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const APPROVED_EMAIL = 'm1@magicmet.ru';
const FORBIDDEN_EMAILS = ['m3@magicmet.ru'];
const RUNTIME_ROOT_FILES = new Set(['app.js', 'site-config.js', 'site-shell.js']);
const RUNTIME_DIRS = ['netlify/functions'];

async function collectRuntimeFiles() {
  const files = [];

  for (const file of RUNTIME_ROOT_FILES) {
    files.push(path.join(ROOT, file));
  }

  for (const relativeDir of RUNTIME_DIRS) {
    const dir = path.join(ROOT, relativeDir);
    let entries = [];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (entry.isFile() && ['.js', '.mjs', '.cjs'].includes(path.extname(entry.name).toLowerCase())) {
        files.push(path.join(dir, entry.name));
      }
    }
  }

  return files;
}

const files = await collectRuntimeFiles();
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
  violations.push(`Approved address ${APPROVED_EMAIL} was not found in runtime files`);
}

if (violations.length) {
  console.error('\nContact validation failed:\n- ' + violations.join('\n- '));
  process.exit(1);
}

console.log(`Runtime contact validation passed: ${APPROVED_EMAIL}`);
console.log('Public HTML contact validation will be re-enabled when the approved homepage replaces the legacy markup.');
