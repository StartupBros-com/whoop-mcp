import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    compare: { type: "string" },
    output: { type: "string", default: ".smoke/after.json" },
  },
});

// Run only the MCP handshake and discovery; never invoke a WHOOP tool.
const entry = resolve("dist/stdio.js");
const cwd = await mkdtemp(join(tmpdir(), "whoop-stdio-smoke-"));
const chunks = [];
const invalidLines = [];
const errors = [];
let pending = Buffer.alloc(0);
let tools;
let stopping = false;
let killTimer;
const child = spawn(process.execPath, [entry], {
  cwd,
  env: {},
  stdio: ["pipe", "pipe", "pipe"],
});

function stop() {
  if (stopping) return;
  stopping = true;
  child.kill("SIGTERM");
  killTimer = setTimeout(() => child.kill("SIGKILL"), 1_000);
}

function send(message) {
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", ...message })}\n`);
}

function isJsonRpc(message) {
  if (
    !message ||
    typeof message !== "object" ||
    Array.isArray(message) ||
    message.jsonrpc !== "2.0"
  )
    return false;
  if ("method" in message) {
    return (
      typeof message.method === "string" &&
      !("result" in message) &&
      !("error" in message) &&
      (!("params" in message) ||
        (message.params !== null && typeof message.params === "object")) &&
      (!("id" in message) ||
        message.id === null ||
        typeof message.id === "string" ||
        typeof message.id === "number")
    );
  }
  return (
    "id" in message &&
    (message.id === null ||
      typeof message.id === "string" ||
      typeof message.id === "number") &&
    "result" in message !== "error" in message &&
    (!("error" in message) ||
      (Number.isInteger(message.error?.code) &&
        typeof message.error?.message === "string"))
  );
}

function receive(line) {
  let message;
  try {
    message = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(line),
    );
    assert.ok(isJsonRpc(message));
  } catch {
    invalidLines.push(line.toString("base64"));
    return;
  }
  if (message.id === 1) {
    if (message.error || !message.result) {
      errors.push("initialize failed");
      stop();
      return;
    }
    send({ method: "notifications/initialized" });
    send({ id: 2, method: "tools/list", params: {} });
  }
  if (message.id === 2) {
    if (!Array.isArray(message.result?.tools)) {
      errors.push("tools/list failed");
    } else {
      tools = message.result.tools.map(
        ({ name, description, inputSchema }) => ({
          name,
          description,
          inputSchema,
        }),
      );
    }
    stop();
  }
}

child.stdout.on("data", (chunk) => {
  chunks.push(chunk);
  pending = Buffer.concat([pending, chunk]);
  let newline;
  while ((newline = pending.indexOf(10)) !== -1) {
    receive(pending.subarray(0, newline));
    pending = pending.subarray(newline + 1);
  }
});
// Drain stderr without including framework diagnostics or machine details in artifacts.
child.stderr.resume();
child.stdin.on("error", () => {
  errors.push("server closed stdin before discovery completed");
  stop();
});
child.on("error", (error) => {
  errors.push(`server could not start (${error.code})`);
});
const timeout = setTimeout(() => {
  errors.push("tools/list did not arrive within 20 seconds");
  stop();
}, 20_000);

send({
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "smoke", version: "0" },
  },
});

const termination = await new Promise((resolveClose) => {
  child.on("close", (code, signal) => resolveClose({ code, signal }));
});
clearTimeout(timeout);
clearTimeout(killTimer);
if (pending.length) receive(pending);
await rm(cwd, { recursive: true, force: true });

if (!tools) errors.push("no tools/list response received");
if (invalidLines.length)
  errors.push(`${invalidLines.length} non-JSON-RPC stdout line(s)`);

function contract(list) {
  return list
    .map(({ name, description, inputSchema }) => ({
      name,
      description,
      parameters: Object.keys(inputSchema.properties ?? {}).sort(),
      required: [...(inputSchema.required ?? [])].sort(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

if (values.compare && tools) {
  try {
    const before = JSON.parse(await readFile(values.compare, "utf8"));
    assert.deepEqual(contract(tools), contract(before.tools));
  } catch (error) {
    errors.push(`tool contract comparison failed: ${error.message}`);
  }
}

const stdout = Buffer.concat(chunks);
const result = {
  stdoutBase64: stdout.toString("base64"),
  stdout: stdout.toString("utf8"),
  nonJsonRpcLinesBase64: invalidLines,
  tools: tools ?? [],
  termination,
  errors,
  exitCode: errors.length ? 1 : 0,
};
await mkdir(dirname(values.output), { recursive: true });
await writeFile(values.output, `${JSON.stringify(result, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      tools: result.tools.map(({ name }) => name),
      nonJsonRpcLines: invalidLines.length,
      compared: Boolean(values.compare),
      exitCode: result.exitCode,
      errors,
    },
    null,
    2,
  ),
);
process.exitCode = result.exitCode;
