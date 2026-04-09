import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import hre from "hardhat";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const [deployer, borrower] = await hre.ethers.getSigners();

  const MockBaburu = await hre.ethers.getContractFactory("MockBaburu");
  const baburu = await MockBaburu.deploy(deployer.address);
  await baburu.waitForDeployment();

  const BaburuKinko = await hre.ethers.getContractFactory("BaburuKinko");
  const kinko = await BaburuKinko.deploy(await baburu.getAddress());
  await kinko.waitForDeployment();

  await deployer.sendTransaction({
    to: await kinko.getAddress(),
    value: hre.ethers.parseEther("500"),
  });

  await baburu.transfer(borrower.address, hre.ethers.parseEther("5000000"));

  const configPath = path.join(__dirname, "..", "frontend", "config.js");
  const configSource = `window.BABURU_CONFIG = {
  chainId: 31337,
  rpcUrl: "http://127.0.0.1:8545",
  buyUrl: "#",
  baburuTokenAddress: "${await baburu.getAddress()}",
  kinkoAddress: "${await kinko.getAddress()}",
  nowTs: "${new Date().toISOString()}"
};
`;

  fs.writeFileSync(configPath, configSource);

  console.log("MockBABURU:", await baburu.getAddress());
  console.log("BABURU KINKO:", await kinko.getAddress());
  console.log("Borrower test account:", borrower.address);
  console.log(`Frontend config written to ${configPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
