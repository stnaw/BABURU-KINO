import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const timestamp = new Date().toISOString();
const runId = `qa-run-${timestamp.replace(/[:.]/g, "-")}`;
const logDir = path.join(root, "artifacts", "qa-logs", runId);
const jsonlPath = path.join(logDir, `qa-key-log-${timestamp.slice(0, 16).replace(/[-:T]/g, "")}.jsonl`);
const summaryPath = path.join(logDir, "summary.json");

const summary = {
  runId,
  startedAt: timestamp,
  sourceOfTruth: [
    "docs/design/税率分配.md",
    "docs/design/QA.md",
    "docs/design/前端展示.md",
  ],
  automatedCoverage: [
    "A. 环境与初始化（本地服务、配置、合约编译）",
    "B. 本地固定价格税模拟与入库窗口日志",
    "C/D/E. 合约主流程（借款/还款/超期清算）",
    "G. 前端基础 smoke（概览、借款区、借款列表、FAQ、移动端断点）",
  ],
  manualOrDeferredCoverage: [
    "B. 真实交易对/路由路径税模拟（当前自动化仅覆盖 fixed-price 本地 harness）",
    "F. 真权限/真实钱包安全回归",
    "G. 真钱包授权 -> 借款 -> 还款联调",
    "长时段 10~15 分钟税日志与 testnet 等待窗口验证",
  ],
  phases: [],
  status: "running",
};

async function ensureArtifacts() {
  await fs.mkdir(logDir, { recursive: true });
}

async function appendLog(entry) {
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    chainId: 31337,
    runId,
    ...entry,
  });
  await fs.appendFile(jsonlPath, `${payload}\n`, "utf8");
}

function runCommand(command, args, { env = {} } = {}) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });

  const phaseResult = {
    command: [command, ...args].join(" "),
    startedAt,
    finishedAt: new Date().toISOString(),
    status: result.status === 0 ? "passed" : "failed",
    exitCode: result.status ?? 1,
    stdout: result.stdout?.trim() || "",
    stderr: result.stderr?.trim() || "",
  };

  return phaseResult;
}

async function runPhase(name, command, args, options = {}) {
  await appendLog({ level: "INFO", phase: name, event: "started" });
  const phaseResult = runCommand(command, args, options);
  summary.phases.push({ name, ...phaseResult });
  await appendLog({
    level: phaseResult.status === "passed" ? "INFO" : "ERROR",
    phase: name,
    event: "finished",
    status: phaseResult.status,
    exitCode: phaseResult.exitCode,
  });

  if (phaseResult.status !== "passed") {
    throw new Error(`${name} failed`);
  }
}

try {
  await ensureArtifacts();
  await appendLog({ level: "INFO", event: "run_started", seed: 20260409 });

  await runPhase("local_up", "npm", ["run", "local:up"]);
  await runPhase("compile", "npm", ["run", "compile"]);
  await runPhase("tax_harness", "npm", ["run", "qa:tax"], {
    env: {
      QA_RUN_ID: runId,
      QA_LOG_DIR: logDir,
      QA_JSONL_PATH: jsonlPath,
      QA_SEED: "20260409",
    },
  });
  await runPhase("contracts", "npm", ["run", "qa:contracts"]);
  await runPhase(
    "ui_smoke",
    "npm",
    ["run", "qa:ui"],
    { env: { QA_BASE_URL: "http://127.0.0.1:4173" } }
  );

  summary.status = "passed";
  summary.finishedAt = new Date().toISOString();
  await appendLog({ level: "INFO", event: "run_finished", status: "passed" });
} catch (error) {
  summary.status = "failed";
  summary.finishedAt = new Date().toISOString();
  summary.failure = error instanceof Error ? error.message : String(error);
  await appendLog({ level: "ERROR", event: "run_finished", status: "failed", reason: summary.failure });
} finally {
  const shutdown = runCommand("npm", ["run", "local:down"]);
  summary.phases.push({ name: "local_down", ...shutdown });
  await fs.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
}
