import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { extname } from 'node:path';

const output = 'FULL-UPDATED-CODE.md';
const rows = execFileSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], { encoding: 'utf8' })
  .split('\0').filter(Boolean);
const paths = [...new Set(rows.map(row => row.slice(3)).filter(path => path !== output))].sort();
const deleted = paths.filter(path => !existsSync(path));
const textFiles = paths.filter(path => existsSync(path) && !['.png', '.jpg', '.jpeg', '.webp', '.mp4', '.pdf', '.zip'].includes(extname(path).toLowerCase()));
const parts = [
  '# Full updated source · FaZe Clan',
  '',
  'Generated from the working tree. Each block contains the **entire current file** for direct copying. Files are listed alphabetically. Deleted paths are listed after the code blocks. The repository remains the authoritative source.',
  ''
];
for (const path of textFiles) {
  const body = readFileSync(path, 'utf8');
  if (body.includes('\0')) continue;
  parts.push(`## ${path}`, '', '````text', body.replace(/\r?\n$/, ''), '````', '');
}
parts.push('## Deleted paths', '', deleted.length ? `${deleted.length} superseded launcher and page files were removed; inspect Git status for their prior path names.` : 'None.', '');
writeFileSync(output, parts.join('\n'));
console.log(`${output}: ${textFiles.length} complete text files; ${deleted.length} deleted paths.`);
