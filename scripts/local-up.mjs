import fs from "node:fs";
import fsp from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, "..");
const stateDir = path.join(root, ".local", "dev");
const qaLogRoot = path.join(root, "artifacts", "qa-logs");

const paths = {
  hardhatPid: path.join(stateDir, "hardhat.pid"),
  vitePid: path.join(stateDir, "vite.pid"),
  taxPid: path.join(stateDir, "tax-sim.pid"),
  loanPid: path.join(stateDir, "loan-sim.pid"),
  hardhatLog: path.join(stateDir, "hardhat.log"),
  deployLog: path.join(stateDir, "deploy.log"),
  viteLog: path.join(stateDir, "vite.log"),
  taxLog: path.join(stateDir, "tax-sim.log"),
  loanLog: path.join(stateDir, "loan-sim.log"),
};

function processAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function cleanupStalePid(pidFile) {
  if (!fs.existsSync(pidFile)) return;
  const pid = Number((await fsp.readFile(pidFile, "utf8")).trim());
  if (Number.isFinite(pid) && processAlive(pid)) {
    throw new Error(`Process already running with PID ${pid}. Use npm run local:down first if you want a clean restart.`);
  }
  await fsp.rm(pidFile, { force: true });
}

async function resetLogFiles(logFiles) {
  await Promise.all(
    logFiles.map(async (logFile) => {
      await fsp.rm(logFile, { force: true });
    })
  );
  await fsp.rm(qaLogRoot, { recursive: true, force: true });
}

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(300);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    const done = () => {
      socket.destroy();
      resolve(false);
    };
    socket.once("error", done);
    socket.once("timeout", done);
    socket.connect(port, "127.0.0.1");
  });
}

async function waitForPort(port, name, retries = 80) {
  for (let i = 0; i < retries; i += 1) {
    if (await isPortOpen(port)) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Failed to start ${name} on port ${port}.`);
}

function spawnDetached(command, args, logPath, extra = {}) {
  const out = fs.openSync(logPath, "a");
  const child = spawn(command, args, {
    cwd: root,
    detached: true,
    stdio: ["ignore", out, out],
    ...extra,
  });
  child.unref();
  return child;
}

async function runForeground(command, args, logPath) {
  const out = fs.openSync(logPath, "w");
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: ["ignore", out, out],
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

async function readDeployField(prefix) {
  const content = await fsp.readFile(paths.deployLog, "utf8");
  const line = content
    .split("\n")
    .find((entry) => entry.startsWith(prefix));
  return line ? line.slice(prefix.length).trim() : "";
}

async function main() {
  await fsp.mkdir(stateDir, { recursive: true });

  await cleanupStalePid(paths.hardhatPid);
  await cleanupStalePid(paths.vitePid);
  await cleanupStalePid(paths.taxPid);
  await cleanupStalePid(paths.loanPid);
  await resetLogFiles([paths.hardhatLog, paths.deployLog, paths.viteLog, paths.taxLog, paths.loanLog]);

  if (await isPortOpen(8545)) {
    throw new Error("Port 8545 is already in use. Stop the existing local chain before starting a new one.");
  }
  if (await isPortOpen(4173)) {
    throw new Error("Port 4173 is already in use. Stop the existing frontend dev server before starting a new one.");
  }

  const hardhat = spawnDetached(path.join(root, "node_modules", ".bin", "hardhat"), ["node", "--hostname", "127.0.0.1"], paths.hardhatLog);
  await fsp.writeFile(paths.hardhatPid, `${hardhat.pid}\n`, "utf8");
  await waitForPort(8545, "Hardhat node");

  await runForeground("npm", ["run", "deploy:local"], paths.deployLog);

  const vite = spawnDetached(path.join(root, "node_modules", ".bin", "vite"), ["--host", "127.0.0.1", "--port", "4173"], paths.viteLog);
  await fsp.writeFile(paths.vitePid, `${vite.pid}\n`, "utf8");
  await waitForPort(4173, "Vite dev server");

  const tax = spawnDetached("bash", ["scripts/qa/tax-daemon.sh"], paths.taxLog);
  await fsp.writeFile(paths.taxPid, `${tax.pid}\n`, "utf8");

  const loan = spawnDetached("bash", ["scripts/qa/loan-daemon.sh"], paths.loanLog);
  await fsp.writeFile(paths.loanPid, `${loan.pid}\n`, "utf8");

  const mockAddress = await readDeployField("MockBABURU:");
  const kinkoAddress = await readDeployField("BABURU KINKO:");
  const borrowerAddress = await readDeployField("Borrower test account:");

  process.stdout.write(`Local services started.

Frontend:
  http://127.0.0.1:4173/

Local chain:
  http://127.0.0.1:8545/

Contracts:
  MockBABURU: ${mockAddress}
  BABURU KINKO: ${kinkoAddress}

Borrower test account:
  Address: ${borrowerAddress}
  Private key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

Logs:
  Hardhat: ${paths.hardhatLog}
  Deploy:  ${paths.deployLog}
  Vite:    ${paths.viteLog}
  Tax sim: ${paths.taxLog}
  Loan sim:${paths.loanLog}
`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
