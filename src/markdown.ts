import type { RunfreezeReport } from "./types.js";

export function renderMarkdown(report: RunfreezeReport): string {
  const lines = [
    "# Runfreeze Evidence",
    "",
    `Created: ${report.createdAt}`,
    `Root: \`${report.root}\``,
    "",
    `Summary: ${report.summary.passed}/${report.summary.total} passed, ${report.summary.failed} failed, ${report.summary.redactions} redaction(s), ${report.summary.truncated} truncated command(s).`,
    "",
    "| ID | Command | Exit | Duration | Redactions | Truncated |",
    "| --- | --- | ---: | ---: | ---: | --- |",
  ];

  for (const command of report.commands) {
    lines.push(
      `| ${escapePipes(command.id)} | \`${escapePipes(command.command.join(" "))}\` | ${command.exitCode ?? command.signal ?? "null"} | ${command.durationMs}ms | ${command.redactions.total} | ${command.stdout.truncated || command.stderr.truncated ? "yes" : "no"} |`,
    );
  }

  lines.push("");
  for (const command of report.commands) {
    lines.push(`## ${command.id}`, "");
    lines.push(`- CWD: \`${command.cwd}\``);
    lines.push(`- Allowed failure: ${command.allowedFailure ? "yes" : "no"}`);
    lines.push(`- Timed out: ${command.timedOut ? "yes" : "no"}`);
    if (command.stdout.text) {
      lines.push("", "### stdout", "", "```text", command.stdout.text, "```");
    }
    if (command.stderr.text) {
      lines.push("", "### stderr", "", "```text", command.stderr.text, "```");
    }
    lines.push("");
  }

  return `${lines.join("\n")}`;
}

function escapePipes(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}
