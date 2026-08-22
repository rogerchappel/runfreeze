import type { RunfreezeReport } from "./types.js";

export function renderMarkdown(report: RunfreezeReport): string {
  const lines = [
    "# Runfreeze Evidence",
    "",
    `Created: ${report.createdAt}`,
    `Root: ${inlineCode(report.root)}`,
    "",
    `Summary: ${report.summary.passed}/${report.summary.total} passed, ${report.summary.failed} failed, ${report.summary.redactions} redaction(s), ${report.summary.truncated} truncated command(s).`,
    "",
    "| ID | Command | Exit | Duration | Redactions | Truncated |",
    "| --- | --- | ---: | ---: | ---: | --- |",
  ];

  for (const command of report.commands) {
    lines.push(
      `| ${escapeTableCell(command.id)} | ${escapeTableCell(inlineCode(command.command.join(" ")))} | ${command.exitCode ?? command.signal ?? "null"} | ${command.durationMs}ms | ${command.redactions.total} | ${command.stdout.truncated || command.stderr.truncated ? "yes" : "no"} |`,
    );
  }

  lines.push("");
  for (const command of report.commands) {
    lines.push(`## ${inlineCode(command.id)}`, "");
    lines.push(`- CWD: ${inlineCode(command.cwd)}`);
    lines.push(`- Allowed failure: ${command.allowedFailure ? "yes" : "no"}`);
    lines.push(`- Timed out: ${command.timedOut ? "yes" : "no"}`);
    if (command.stdout.text) {
      lines.push("", "### stdout", "", fencedText(command.stdout.text));
    }
    if (command.stderr.text) {
      lines.push("", "### stderr", "", fencedText(command.stderr.text));
    }
    lines.push("");
  }

  return `${lines.join("\n")}`;
}

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, "&#124;").replace(/\r?\n/g, " ");
}

function inlineCode(value: string): string {
  const normalized = value.replace(/\r?\n/g, " ");
  const longestRun = Math.max(0, ...Array.from(normalized.matchAll(/`+/g), (match) => match[0].length));
  const delimiter = "`".repeat(longestRun + 1);
  const padding = /^`|`$|^ | $/.test(normalized) ? " " : "";
  return `${delimiter}${padding}${normalized}${padding}${delimiter}`;
}

function fencedText(value: string): string {
  const longestRun = Math.max(0, ...Array.from(value.matchAll(/`+/g), (match) => match[0].length));
  const fence = "`".repeat(Math.max(3, longestRun + 1));
  return `${fence}text\n${value}${value.endsWith("\n") ? "" : "\n"}${fence}`;
}
