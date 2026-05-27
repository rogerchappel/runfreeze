import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RunfreezeReport } from "./types.js";

export async function writeJson(filePath: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(path.resolve(filePath)), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function readReport(filePath: string): Promise<RunfreezeReport> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as RunfreezeReport;
}
