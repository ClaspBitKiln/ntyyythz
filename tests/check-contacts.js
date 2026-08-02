import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const APPROVED_EMAIL = 'm1@magicmet.ru';
const FORBIDDEN_EMAIL = ['m3', 'magicmet.ru'].join('@');
const TEXT_EXTENSIONS = new Set(['.css', '.html', '.js', '.json', '.md', '.mjs', '.txt', '.xml']);
const IGNORED_DIRS = new Set(['.git', 'node_modules', 'playwright-report', 'test-results']);
const PUBLIC_ROOT_FILES = new Set([
  'air.css',
  'app.js',
  'index.html',
  'netlify.toml',
  'privacy.html',
  'robots.txt',
  'site-config.js',
  'site-shell.js',
  'sitemap.xml',
  'styles.css'
]);
const PUBLIC_DIRS = ['catalog'];
const FORBIDDEN_PUBLIC_LOCATIONS = [
  ['Санкт', 'Петербург'].join('-'),
  ['Санкт', 'Петербург'].join(' '),
  ['СП', 'б'].join('')
];

async function collectTextFiles(dir = ROOT) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue;
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await collectTextFiles(target));
    else if (TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase()) || entry.name === 'netlify.toml') files.push(target);
  }

  return files;
}

function isPublicFile(file) {
  const relative = path.relative(ROOT, file).split(path.sep).join('/');
  return PUBLIC_ROOT_FILES.has(relative) || PUBLIC_DIRS.some((dir) => relative.startsWith(`${dir}/`));
}

const files = await collectTextFiles();
const violations = [];
let approvedEmailFound = false;

for (const file of files) {
  const relative = path.relative(ROOT, file);
  const text = await readFile(file, 'utf8');

  if (isPublicFile(file) && text.includes(APPROVED_EMAIL)) approvedEmailFound = true;
  if (text.includes(FORBIDDEN_EMAIL)) violations.push(`${relative} contains the retired contact address`);

  if (isPublicFile(file)) {
    const normalized = text.toLocaleLowerCase('ru-RU');
    for (const location of FORBIDDEN_PUBLIC_LOCATIONS) {
      if (normalized.includes(location.toLocaleLowerCase('ru-RU'))) {
        violations.push(`${relative} contains a forbidden public office location`);
      }
    }
  }
}

if (!approvedEmailFound) violations.push(`Approved address ${APPROVED_EMAIL} was not found in public files`);

if (violations.length) {
  console.error('\nPublic contact validation failed:\n- ' + violations.join('\n- '));
  process.exit(1);
}

console.log(`Public contact validation passed: ${APPROVED_EMAIL}; only the Chelyabinsk office is published.`);
