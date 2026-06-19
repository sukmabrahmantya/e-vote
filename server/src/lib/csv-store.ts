import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

const dataDir = path.resolve(process.cwd(), "server/data");

let writeQueue = Promise.resolve();

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

export function dataPath(filename: string) {
  return path.join(dataDir, filename);
}

export async function readCsv<T extends Record<string, string>>(filename: string): Promise<T[]> {
  await ensureDataDir();

  const filePath = dataPath(filename);
  const content = await readFile(filePath, "utf8").catch(() => "");

  if (!content.trim()) {
    return [];
  }

  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  }) as T[];
}

export async function writeCsv<T extends Record<string, string>>(filename: string, rows: T[], columns: string[]) {
  await ensureDataDir();

  const filePath = dataPath(filename);
  const content = stringify(rows, {
    header: true,
    columns
  });

  await writeFile(filePath, content, "utf8");
}

export async function appendCsv<T extends Record<string, string>>(filename: string, row: T, columns: string[]) {
  const rows = await readCsv<T>(filename);
  rows.push(row);
  await writeCsv(filename, rows, columns);
}

/**
 * Queue semua operasi write supaya tidak ada dua request menulis CSV bersamaan.
 * Ini cukup untuk aplikasi kecil yang berjalan di 1 proses Node.js.
 */
export async function withWriteLock<T>(operation: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(operation, operation);
  writeQueue = run.then(() => undefined, () => undefined);
  return run;
}
