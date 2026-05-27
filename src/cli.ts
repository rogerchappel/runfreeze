#!/usr/bin/env node
import { Command } from "commander";
import { readFile, writeFile } from "node:fs/promises";
import { DEFAULT_CONFIG_PATH, DEFAULT_MARKDOWN_PATH, DEFAULT_OUTPUT_PATH } from "./defaults.js";
import { loadConfig } from "./config.js";
import { readReport, writeJson } from "./io.js";
import { renderMarkdown } from "./markdown.js";
import { record } from "./runner.js";
import { verifyReport } from "./verify.js";

const version = "0.1.0";

const program = new Command()
  .name("runfreeze")
  .description("Record local command smoke evidence with redaction.")
  .version(version);

program
  .command("init")
  .description("Write a starter runfreeze.yaml")
  .option("-o, --output <path>", "config path", DEFAULT_CONFIG_PATH)
  .action(async (options: { output: string }) => {
    await writeFile(options.output, starterConfig(), { encoding: "utf8", flag: "wx" });
    process.stdout.write(`Created ${options.output}\n`);
  });

program
  .command("record")
  .description("Run configured commands and write evidence JSON")
  .option("-c, --config <path>", "config path", DEFAULT_CONFIG_PATH)
  .option("-o, --output <path>", "output path", DEFAULT_OUTPUT_PATH)
  .action(async (options: { config: string; output: string }) => {
    const report = await record(await loadConfig(options.config), version);
    await writeJson(options.output, report);
    process.exitCode = report.summary.failed > 0 ? 2 : 0;
  });

program
  .command("summarize")
  .description("Render Markdown from runfreeze JSON")
  .argument("[report]", "report JSON", DEFAULT_OUTPUT_PATH)
  .option("-o, --output <path>", "Markdown output path", DEFAULT_MARKDOWN_PATH)
  .action(async (reportPath: string, options: { output: string }) => {
    const report = await readReport(reportPath);
    await writeFile(options.output, renderMarkdown(report), "utf8");
  });

program
  .command("verify")
  .description("Validate a runfreeze report and fail on failed commands")
  .argument("[report]", "report JSON", DEFAULT_OUTPUT_PATH)
  .action(async (reportPath: string) => {
    const raw = JSON.parse(await readFile(reportPath, "utf8"));
    const result = verifyReport(raw);
    if (result.ok) {
      process.stdout.write("runfreeze report verified\n");
      return;
    }
    for (const error of result.errors) {
      process.stderr.write(`${error}\n`);
    }
    process.exitCode = 2;
  });

await program.parseAsync();

function starterConfig(): string {
  return `root: .
allow:
  - node
  - npm
maxOutputBytes: 65536
timeoutMs: 120000
commands:
  - id: node-version
    run: node --version
`;
}
