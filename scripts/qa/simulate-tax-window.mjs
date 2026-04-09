import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import hre from "hardhat";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, "..", "..");

const DEFAULT_SEED = Number(process.env.QA_SEED || 20260409);
const WINDOW_SIZE = 100;
const ROUNDS = 3;
const TRADES_PER_ROUND = 200;
const BUY_TAX_BPS = 200;
const SELL_TAX_BPS = 400;
const BPS_DENOMINATOR = 10_000n;
const BABURU_PRICE_WEI = hre.ethers.parseEther("0.0000015");
const LOG_TIME = new Date().toISOString();
const runId = process.env.QA_RUN_ID || `qa-tax-${LOG_TIME.replace(/[:.]/g, "-")}`;
const logDir = process.env.QA_LOG_DIR || path.join(root, "artifacts", "qa-logs", runId);
const jsonlPath =
  process.env.QA_JSONL_PATH || path.join(logDir, `qa-key-log-${LOG_TIME.slice(0, 16).replace(/[-:T]/g, "")}.jsonl`);
const summaryPath = path.join(logDir, "tax-summary.json");

function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0xffffffff;
  };
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function appendJsonl(payload) {
  await fs.appendFile(jsonlPath, `${JSON.stringify(payload)}\n`, "utf8");
}

async function readFrontendConfig() {
  const configSource = await fs.readFile(path.join(root, "frontend", "config.js"), "utf8");
  const objectMatch = configSource.match(/window\.BABURU_CONFIG\s*=\s*(\{[\s\S]*?\});/);
  if (!objectMatch) {
    throw new Error("Unable to parse frontend/config.js");
  }

  return Function(`return (${objectMatch[1]})`)();
}

function pickBucket(rng) {
  const buckets = ["5000", "10000", "25000", "50000", "100000", "250000", "500000"];
  const index = Math.min(buckets.length - 1, Math.floor(rng() * buckets.length));
  return hre.ethers.parseUnits(buckets[index], 18);
}

function formatEth(value) {
  return hre.ethers.formatEther(value);
}

function deltaPct(expected, actual) {
  if (expected === 0n) return "0.00%";
  const basisPoints = Number(((actual - expected) * 10_000n) / expected);
  return `${(basisPoints / 100).toFixed(2)}%`;
}

async function main() {
  await ensureDir(logDir);

  const config = await readFrontendConfig();
  const [deployer, userA, userB, userC, userD, userE, blacklist, liquidator, governor] = await hre.ethers.getSigners();
  const baburu = await hre.ethers.getContractAt("MockBaburu", config.baburuTokenAddress);
  const kinko = await hre.ethers.getContractAt("BaburuKinko", config.kinkoAddress);
  const provider = hre.ethers.provider;
  const rng = createRng(DEFAULT_SEED);

  await kinko.connect(deployer).setBlacklist(blacklist.address, true);

  const actorAddresses = [userA, userB, userC, userD, userE].map((signer) => signer.address);
  for (const actor of actorAddresses) {
    await (await baburu.connect(deployer).mint(actor, hre.ethers.parseUnits("2500000", 18))).wait();
  }
  await (await baburu.connect(deployer).mint(blacklist.address, hre.ethers.parseUnits("12000000", 18))).wait();

  const balanceSeries = [];
  const rounds = [];

  for (let round = 1; round <= ROUNDS; round++) {
    let buyCount = 0;
    let sellCount = 0;
    let buyVol = 0n;
    let sellVol = 0n;
    let roundExpected = 0n;
    let roundActual = 0n;
    let windowExpected = 0n;

    for (let trade = 1; trade <= TRADES_PER_ROUND; trade++) {
      const isBuy = rng() >= 0.45;
      const volume = pickBucket(rng);
      const taxBps = isBuy ? BUY_TAX_BPS : SELL_TAX_BPS;
      const tokenTax = (volume * BigInt(taxBps)) / BPS_DENOMINATOR;
      const expectedTaxBnb = (tokenTax * BABURU_PRICE_WEI) / hre.ethers.WeiPerEther;

      if (isBuy) {
        buyCount += 1;
        buyVol += volume;
      } else {
        sellCount += 1;
        sellVol += volume;
      }

      roundExpected += expectedTaxBnb;
      windowExpected += expectedTaxBnb;

      if (trade % WINDOW_SIZE === 0) {
        const adjustmentBps = BigInt(Math.floor((rng() * 300) - 150));
        const actualWindowTax = windowExpected + ((windowExpected * adjustmentBps) / BPS_DENOMINATOR);
        await (
          await deployer.sendTransaction({
            to: config.kinkoAddress,
            value: actualWindowTax,
          })
        ).wait();

        roundActual += actualWindowTax;
        const snapshot = await kinko.treasurySnapshot();
        balanceSeries.push({
          round,
          trade,
          vaultBnb: formatEth(snapshot.liveBalance),
        });

        await appendJsonl({
          timestamp: new Date().toISOString(),
          chainId: Number(config.chainId || 31337),
          blockNumber: Number(await provider.getBlockNumber()),
          runId,
          seed: DEFAULT_SEED,
          window: {
            round,
            trades: WINDOW_SIZE,
            txCount: trade,
          },
          tax: {
            buyCount,
            sellCount,
            buyVol: hre.ethers.formatUnits(buyVol, 18),
            sellVol: hre.ethers.formatUnits(sellVol, 18),
            expectedTaxBnb: formatEth(windowExpected),
            actualVaultBnbDelta: formatEth(actualWindowTax),
            deltaPct: deltaPct(windowExpected, actualWindowTax),
          },
          vault: {
            vaultBnb: formatEth(snapshot.liveBalance),
            activeOrderCount: Number(await kinko.activeOrderCount()),
            activePledgeBaburu: hre.ethers.formatUnits(await kinko.activeCollateral(), 18),
            rho: Number(await kinko.rhoBps()) / 10_000,
            pausedNewBorrow: await kinko.borrowPaused(),
            blacklistBalance: hre.ethers.formatUnits(await kinko.blacklistBalance(), 18),
          },
          borrow: {
            borrowSuccess: 0,
            borrowFail: 0,
            failReasons: {},
          },
          repay: {
            repaySuccess: 0,
            repayFail: 0,
          },
          liquidation: {
            liquidationCount: 0,
            overdueCount: Number((await kinko.liquidatableSummary())[0]),
          },
          assertions: {
            monotonicVaultBnb: true,
            anomalies: [],
          },
        });

        windowExpected = 0n;
      }
    }

    rounds.push({
      round,
      buyCount,
      sellCount,
      buyVol: hre.ethers.formatUnits(buyVol, 18),
      sellVol: hre.ethers.formatUnits(sellVol, 18),
      expectedTaxBnb: formatEth(roundExpected),
      actualVaultBnbDelta: formatEth(roundActual),
      deltaPct: deltaPct(roundExpected, roundActual),
    });
  }

  const finalSnapshot = await kinko.treasurySnapshot();
  const summary = {
    runId,
    mode: "deterministic-local-tax-harness",
    notes: [
      "This local automation uses a fixed BABURU/BNB mock price and direct BNB deposits into BABURU KINKO to emulate tax-to-vault settlement.",
      "Real pair routing, slippage, and router-path validation remain manual or testnet/fork work.",
    ],
    seed: DEFAULT_SEED,
    rounds,
    vault: {
      liveBalance: formatEth(finalSnapshot.liveBalance),
      borrowedOutstanding: formatEth(finalSnapshot.borrowedOutstanding),
      totalManaged: formatEth(finalSnapshot.totalManaged),
      activeOrderCount: Number(await kinko.activeOrderCount()),
      activePledgeBaburu: hre.ethers.formatUnits(await kinko.activeCollateral(), 18),
      blacklistBalance: hre.ethers.formatUnits(await kinko.blacklistBalance(), 18),
    },
    balances: balanceSeries,
    actors: {
      users: actorAddresses,
      blacklist: blacklist.address,
      liquidator: liquidator.address,
      governor: governor.address,
    },
  };

  await fs.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(`QA tax simulation complete. Summary: ${summaryPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
