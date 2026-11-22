import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '../../src/fixtures';

// Static checks that keep the two promises about the AI layer:
// 1. AI code never executes anything. 2. The core suite never depends on the AI layer.

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|cjs|mjs|js)$/.test(entry.name) ? [path] : [];
  });
}

const FORBIDDEN_IN_AI: readonly RegExp[] = [
  /\beval\s*\(/,
  /new\s+Function\b/,
  /child_process/,
  /\b(spawn|spawnSync|exec|execSync|execFile|fork)\s*\(/,
  /\bimport\s*\(/,
];

const CORE_DIRS = [
  'config',
  'src/a11y',
  'src/api',
  'src/components',
  'src/data',
  'src/fixtures',
  'src/pages',
  'src/reporting',
  'tests/api',
  'tests/ui',
];

test.describe('AI layer guards @unit', () => {
  test('AI code cannot run code or load modules dynamically', () => {
    const files = sourceFiles('src/ai');
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const pattern of FORBIDDEN_IN_AI) {
        expect(pattern.test(text), `${file} must not match ${String(pattern)}`).toBe(false);
      }
    }
  });

  test('the core suite does not import the AI layer', () => {
    const importsAi = /from\s+['"][^'"]*\/ai(\/|['"])/;

    for (const dir of CORE_DIRS) {
      for (const file of sourceFiles(dir)) {
        expect(importsAi.test(readFileSync(file, 'utf8')), `${file} must not import src/ai`).toBe(
          false,
        );
      }
    }
  });
});
