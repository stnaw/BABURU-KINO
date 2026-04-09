import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import hre from "hardhat";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, "..", "..");

const DEFAULT_SEED = Number(process.env.QA_SEED || 20260409);
const DEFAULT_PARTICIPANT_COUNT = Number(process.env.QA_LOAN_PARTICIPANTS || 10);
const DEFAULT_ROUNDS = Number(process.env.QA_LOAN_ROUNDS || 4);
const TIME_STEP_OPTIONS = String(process.env.QA_LOAN_TIME_STEP_OPTIONS || "21600,43200,64800,86400")
  .split(",")
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value) && value > 0);
const LOG_TIME = new Date().toISOString();
const runId = process.env.QA_RUN_ID || `qa-loans-${LOG_TIME.replace(/[:.]/g, "-")}`;
const logDir = process.env.QA_LOG_DIR || path.join(root, "artifacts", "qa-logs", runId);
const jsonlPath =
  process.env.QA_JSONL_PATH || path.join(logDir, `qa-key-log-${LOG_TIME.slice(0, 16).replace(/[-:T]/g, "")}.jsonl`);
const summaryPath = path.join(logDir, "loan-summary.json");

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

function pickCollateralWei(rng) {
  const buckets = ["10000", "25000", "50000", "100000", "250000", "500000", "1000000", "2500000"];
  const index = Math.min(buckets.length - 1, Math.floor(rng() * buckets.length));
  return hre.ethers.parseUnits(buckets[index], 18);
}

function pickTimeAdvanceSeconds(rng) {
  if (!TIME_STEP_OPTIONS.length) {
    return 12 * 60 * 60;
  }
  const index = Math.min(TIME_STEP_OPTIONS.length - 1, Math.floor(rng() * TIME_STEP_OPTIONS.length));
  return TIME_STEP_OPTIONS[index];
}

function formatEth(value) {
  return hre.ethers.formatEther(value);
}

function formatBaburu(value) {
  return hre.ethers.formatUnits(value, 18);
}

async function ensureTokenBalance(token, deployer, account, targetBalance) {
  const currentBalance = await token.balanceOf(account);
  if (currentBalance >= targetBalance) return;
  await (await token.connect(deployer).transfer(account, targetBalance - currentBalance)).wait();
}

async function getUserOrders(kinko, user) {
  return kinko.getBorrowerOrderViews(user.address);
}

async function ensureLiquidityForBorrow(kinko, actor, collateralAmount) {
  const treasury = await kinko.treasurySnapshot();
  const liveBalance = Array.isArray(treasury) ? treasury[0] : treasury.liveBalance;
  if (liveBalance > 0n) return;

  const seedQuote = await kinko.quoteBorrow(collateralAmount);
  if (seedQuote > 0n) return;

  const topUp = hre.ethers.parseEther("1.5");
  await (
    await actor.sendTransaction({
      to: await kinko.getAddress(),
      value: topUp,
    })
  ).wait();
}

async function main() {
  await ensureDir(logDir);

  const config = await readFrontendConfig();
  const signers = await hre.ethers.getSigners();
  const [deployer, ...restSigners] = signers;
  const reservedBorrowerAddress = String(config.localDevSignerAddress || "").toLowerCase();
  const eligibleSigners = restSigners.filter(
    (signer) => !reservedBorrowerAddress || signer.address.toLowerCase() !== reservedBorrowerAddress
  );
  const participantCount = Math.min(DEFAULT_PARTICIPANT_COUNT, Math.max(1, eligibleSigners.length - 2));
  const users = eligibleSigners.slice(0, participantCount);
  const blacklist = eligibleSigners[participantCount];
  const liquidator = eligibleSigners[participantCount + 1];
  if (!blacklist || !liquidator) {
    throw new Error("Not enough signers available for blacklist and liquidator roles.");
  }
  const baburu = await hre.ethers.getContractAt("MockBaburu", config.baburuTokenAddress);
  const kinko = await hre.ethers.getContractAt("BaburuKinko", config.kinkoAddress);
  const provider = hre.ethers.provider;
  const rng = createRng(DEFAULT_SEED);

  await kinko.connect(deployer).setBlacklist(blacklist.address, true);

  for (const user of users) {
    const targetBalance = hre.ethers.parseUnits("5000000", 18);
    await ensureTokenBalance(baburu, deployer, user.address, targetBalance);

    const allowance = await baburu.allowance(user.address, config.kinkoAddress);
    if (allowance < hre.ethers.MaxUint256 / 2n) {
      await (await baburu.connect(user).approve(config.kinkoAddress, hre.ethers.MaxUint256)).wait();
    }
  }

  let borrowSuccess = 0;
  let borrowFail = 0;
  let repaySuccess = 0;
  let repayFail = 0;
  let liquidationCount = 0;
  const failReasons = {};
  const roundSnapshots = [];
  let totalTimeAdvancedSeconds = 0;

  for (let round = 1; round <= DEFAULT_ROUNDS; round += 1) {
    for (const user of users) {
      const existingOrders = await getUserOrders(kinko, user);
      const openOrderCount = existingOrders.filter((order) => order.open).length;
      const borrowAttempts = openOrderCount >= 3 ? (rng() < 0.3 ? 1 : 0) : rng() < 0.35 ? 2 : 1;

      for (let attempt = 0; attempt < borrowAttempts; attempt += 1) {
        const shouldBorrow = openOrderCount === 0 || rng() < 0.72;
        if (!shouldBorrow) {
          continue;
        }

        const collateralAmount = pickCollateralWei(rng);
        try {
          await ensureLiquidityForBorrow(kinko, deployer, collateralAmount);
          const refBorrow = await kinko.quoteBorrow(collateralAmount);

          if (refBorrow > 0n) {
            const minBorrowBps = rng() < 0.25 ? 9800 : rng() < 0.5 ? 9700 : 9500;
            await (await kinko.connect(user).borrow(collateralAmount, refBorrow, minBorrowBps)).wait();
            borrowSuccess += 1;
          } else {
            borrowFail += 1;
            failReasons.zeroQuote = (failReasons.zeroQuote || 0) + 1;
          }
        } catch (error) {
          borrowFail += 1;
          const reason = error?.shortMessage || error?.reason || error?.message || "borrow_failed";
          failReasons[reason] = (failReasons[reason] || 0) + 1;
        }
      }
    }

    const timeStepSeconds = pickTimeAdvanceSeconds(rng);
    totalTimeAdvancedSeconds += timeStepSeconds;
    await provider.send("evm_increaseTime", [timeStepSeconds]);
    await provider.send("evm_mine", []);

    for (const user of users) {
      const orders = await getUserOrders(kinko, user);
      const repayableIds = orders.filter((order) => order.repayable).map((order) => order.orderId);
      if (!repayableIds.length) {
        continue;
      }

      if (rng() < 0.66) {
        const shuffledIds = [...repayableIds].sort(() => rng() - 0.5);
        const repayCount = Math.min(
          shuffledIds.length,
          Math.max(1, Math.ceil(shuffledIds.length * (0.25 + rng() * 0.75)))
        );
        const chosenIds = shuffledIds.slice(0, repayCount);
        try {
          const preview = await kinko.previewRepay(user.address, chosenIds);
          const totalBnbDue = Array.isArray(preview) ? preview[0] : preview.totalBnbDue;
          if (totalBnbDue > 0n) {
            await (await kinko.connect(user).repay(chosenIds, { value: totalBnbDue })).wait();
            repaySuccess += 1;
          }
        } catch (error) {
          repayFail += 1;
          const reason = error?.shortMessage || error?.reason || error?.message || "repay_failed";
          failReasons[reason] = (failReasons[reason] || 0) + 1;
        }
      }
    }

    const liquidatableSummary = await kinko.liquidatableSummary();
    const overdueCount = Number(Array.isArray(liquidatableSummary) ? liquidatableSummary[0] : liquidatableSummary.count);
    let liquidatedThisRound = 0;
    if (overdueCount > 0 && (rng() < 0.8 || round === DEFAULT_ROUNDS)) {
      try {
        const batchSize = Math.max(1, Math.min(overdueCount, Math.ceil(overdueCount * (0.4 + rng() * 0.6))));
        const tx = await kinko.connect(liquidator).liquidateOverdue(batchSize);
        await tx.wait();
        liquidationCount += batchSize;
        liquidatedThisRound = batchSize;
      } catch (error) {
        const reason = error?.shortMessage || error?.reason || error?.message || "liquidation_failed";
        failReasons[reason] = (failReasons[reason] || 0) + 1;
      }
    }

    roundSnapshots.push({
      round,
      timeAdvanceSeconds: timeStepSeconds,
      overdueCount,
      liquidatedThisRound,
    });
  }

  const liquidatableSummary = await kinko.liquidatableSummary();
  const overdueCount = Number(Array.isArray(liquidatableSummary) ? liquidatableSummary[0] : liquidatableSummary.count);

  const treasury = await kinko.treasurySnapshot();
  const activeCollateral = await kinko.activeCollateral();
  const activeOrderCount = await kinko.activeOrderCount();
  const liveBalance = Array.isArray(treasury) ? treasury[0] : treasury.liveBalance;
  const borrowedOutstanding = Array.isArray(treasury) ? treasury[1] : treasury.borrowedOutstanding;
  const totalManaged = Array.isArray(treasury) ? treasury[2] : treasury.totalManaged;

  const payload = {
    timestamp: new Date().toISOString(),
    chainId: Number(config.chainId || 31337),
    blockNumber: Number(await provider.getBlockNumber()),
    runId,
    seed: DEFAULT_SEED,
    loanWindow: {
      rounds: DEFAULT_ROUNDS,
      timeAdvanceSecondsTotal: totalTimeAdvancedSeconds,
      roundSnapshots,
      participants: users.length,
    },
    vault: {
      vaultBnb: formatEth(liveBalance),
      borrowedOutstanding: formatEth(borrowedOutstanding),
      totalManaged: formatEth(totalManaged),
      activeOrderCount: Number(activeOrderCount),
      activePledgeBaburu: formatBaburu(activeCollateral),
      rho: Number(await kinko.rhoBps()) / 10_000,
      pausedNewBorrow: await kinko.borrowPaused(),
    },
    borrow: {
      borrowSuccess,
      borrowFail,
      failReasons,
    },
    repay: {
      repaySuccess,
      repayFail,
    },
    liquidation: {
      liquidationCount,
      overdueCount,
    },
  };

  await appendJsonl(payload);
  await fs.writeFile(
    summaryPath,
    `${JSON.stringify(
      {
        runId,
        mode: "multi-user-loan-cycle",
        seed: DEFAULT_SEED,
        users: users.map((user) => user.address),
        payload,
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  console.log(`QA loan simulation complete. Summary: ${summaryPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
