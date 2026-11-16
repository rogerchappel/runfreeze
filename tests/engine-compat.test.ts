import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const packageJson = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8")) as {
  engines: { node: string };
};
const lockfile = JSON.parse(await readFile(new URL("../../package-lock.json", import.meta.url), "utf8")) as {
  packages: Record<string, { engines?: { node?: string } }>;
};

describe("Node engine compatibility", () => {
  it("keeps the declared minimum compatible with the locked Commander engine", () => {
    const declaredMinimum = packageJson.engines.node.match(/^>=([0-9]+)$/);
    const commanderMinimum = lockfile.packages["node_modules/commander"]?.engines?.node?.match(/^>=([0-9]+)$/);

    assert.ok(declaredMinimum, `Expected a simple minimum Node engine, got ${packageJson.engines.node}`);
    assert.ok(commanderMinimum, "Expected the locked Commander package to declare a minimum Node engine");
    assert.ok(
      Number(declaredMinimum[1]) >= Number(commanderMinimum[1]),
      `Package minimum Node ${declaredMinimum[1]} is below Commander minimum ${commanderMinimum[1]}`,
    );
    assert.ok(Number(declaredMinimum[1]) <= 20, "The supported Node 20 CI line must remain within the package engine");
    assert.ok(24 >= Number(declaredMinimum[1]), "The supported Node 24 CI line must remain within the package engine");
  });
});
