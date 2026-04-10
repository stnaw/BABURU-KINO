import { expect } from "chai";
import hre from "hardhat";

const { ethers, network } = hre;

const ONE_DAY = 24 * 60 * 60;
const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";

async function deployFixture() {
  const [owner, borrower, liquidator] = await ethers.getSigners();

  const MockBaburu = await ethers.getContractFactory("MockBaburu");
  const baburu = await MockBaburu.deploy(owner.address);
  await baburu.waitForDeployment();

  const BaburuKinko = await ethers.getContractFactory("BaburuKinko");
  const kinko = await BaburuKinko.deploy(await baburu.getAddress());
  await kinko.waitForDeployment();

  await owner.sendTransaction({
    to: await kinko.getAddress(),
    value: ethers.parseEther("500"),
  });

  await baburu.transfer(borrower.address, ethers.parseEther("5000000"));

  return { owner, borrower, liquidator, baburu, kinko };
}

async function deployRevertingBalanceFixture() {
  const [owner, borrower, liquidator, blocked] = await ethers.getSigners();

  const MockRevertingBaburu = await ethers.getContractFactory("MockRevertingBaburu");
  const baburu = await MockRevertingBaburu.deploy(owner.address);
  await baburu.waitForDeployment();

  const BaburuKinko = await ethers.getContractFactory("BaburuKinko");
  const kinko = await BaburuKinko.deploy(await baburu.getAddress());
  await kinko.waitForDeployment();

  await owner.sendTransaction({
    to: await kinko.getAddress(),
    value: ethers.parseEther("500"),
  });

  await baburu.transfer(borrower.address, ethers.parseEther("5000000"));
  await baburu.setRevertingAccount(blocked.address);

  return { owner, borrower, liquidator, blocked, baburu, kinko };
}

async function deployNoReturnFixture() {
  const [owner, borrower] = await ethers.getSigners();

  const MockNoReturnBaburu = await ethers.getContractFactory("MockNoReturnBaburu");
  const baburu = await MockNoReturnBaburu.deploy(owner.address);
  await baburu.waitForDeployment();

  const BaburuKinko = await ethers.getContractFactory("BaburuKinko");
  const kinko = await BaburuKinko.deploy(await baburu.getAddress());
  await kinko.waitForDeployment();

  await owner.sendTransaction({
    to: await kinko.getAddress(),
    value: ethers.parseEther("500"),
  });

  await baburu.transfer(borrower.address, ethers.parseEther("5000000"));

  return { owner, borrower, baburu, kinko };
}

async function deployFeeOnTransferFixture() {
  const [owner, borrower] = await ethers.getSigners();

  const MockFeeOnTransferBaburu = await ethers.getContractFactory("MockFeeOnTransferBaburu");
  const baburu = await MockFeeOnTransferBaburu.deploy(owner.address);
  await baburu.waitForDeployment();

  const BaburuKinko = await ethers.getContractFactory("BaburuKinko");
  const kinko = await BaburuKinko.deploy(await baburu.getAddress());
  await kinko.waitForDeployment();

  await owner.sendTransaction({
    to: await kinko.getAddress(),
    value: ethers.parseEther("500"),
  });

  await baburu.transfer(borrower.address, ethers.parseEther("5000000"));

  return { owner, borrower, baburu, kinko };
}

describe("BaburuKinko", function () {
  it("quotes and creates a borrow order", async function () {
    const { borrower, baburu, kinko } = await deployFixture();
    const collateral = ethers.parseEther("1000000");
    const quote = await kinko.quoteBorrow(collateral);

    await baburu.connect(borrower).approve(await kinko.getAddress(), collateral);
    await expect(kinko.connect(borrower).borrow(collateral, quote, 9500))
      .to.emit(kinko, "Borrowed")
      .withArgs(1, borrower.address, collateral, quote, quote, 9500);

    const order = await kinko.orders(1);
    expect(order.borrower).to.equal(borrower.address);
    expect(order.collateralAmount).to.equal(collateral);
    expect(await kinko.activeOrderCount()).to.equal(1n);

    const [liveBalance, borrowedOutstanding, totalManaged] = await kinko.treasurySnapshot();
    expect(liveBalance).to.equal(ethers.parseEther("500") - quote);
    expect(borrowedOutstanding).to.equal(quote);
    expect(totalManaged).to.equal(ethers.parseEther("500"));
  });

  it("rejects BABURU tokens that do not follow the standard bool-returning ERC20 interface", async function () {
    const { borrower, baburu, kinko } = await deployNoReturnFixture();
    const collateral = ethers.parseEther("1000000");
    const quote = await kinko.quoteBorrow(collateral);

    await baburu.connect(borrower).approve(await kinko.getAddress(), collateral);
    await expect(kinko.connect(borrower).borrow(collateral, quote, 9500))
      .to.be.reverted;
  });

  it("rejects fee-on-transfer BABURU because it breaks vault accounting", async function () {
    const { borrower, baburu, kinko } = await deployFeeOnTransferFixture();
    const collateral = ethers.parseEther("1000000");
    const quote = await kinko.quoteBorrow(collateral);

    await baburu.connect(borrower).approve(await kinko.getAddress(), collateral);
    await expect(kinko.connect(borrower).borrow(collateral, quote, 9500))
      .to.be.revertedWithCustomError(kinko, "UnsupportedTokenBehavior");
  });

  it("repays during the no-fee window", async function () {
    const { borrower, baburu, kinko } = await deployFixture();
    const collateral = ethers.parseEther("1000000");
    const quote = await kinko.quoteBorrow(collateral);

    await baburu.connect(borrower).approve(await kinko.getAddress(), collateral);
    await kinko.connect(borrower).borrow(collateral, quote, 9500);

    await network.provider.send("evm_increaseTime", [4 * ONE_DAY]);
    await network.provider.send("evm_mine");

    const orderView = await kinko.orderView(1);
    expect(orderView.penaltyBpsValue).to.equal(0n);

    await expect(kinko.connect(borrower).repay([1], { value: quote }))
      .to.emit(kinko, "Repaid")
      .withArgs(1, borrower.address, collateral, quote, 0);

    const borrowerBalance = await baburu.balanceOf(borrower.address);
    expect(borrowerBalance).to.equal(ethers.parseEther("5000000"));
  });

  it("burns penalty tokens on early repayment", async function () {
    const { borrower, baburu, kinko } = await deployFixture();
    const collateral = ethers.parseEther("1000000");
    const quote = await kinko.quoteBorrow(collateral);

    await baburu.connect(borrower).approve(await kinko.getAddress(), collateral);
    await kinko.connect(borrower).borrow(collateral, quote, 9500);

    await network.provider.send("evm_increaseTime", [2 * ONE_DAY + 60]);
    await network.provider.send("evm_mine");

    const orderView = await kinko.orderView(1);
    const deadBefore = await baburu.balanceOf(DEAD_ADDRESS);
    const borrowerBefore = await baburu.balanceOf(borrower.address);

    await kinko.connect(borrower).repay([1], { value: quote });

    const deadAfter = await baburu.balanceOf(DEAD_ADDRESS);
    const borrowerAfter = await baburu.balanceOf(borrower.address);
    expect(orderView.penaltyBpsValue).to.equal(2000n);
    expect(deadAfter - deadBefore).to.equal(ethers.parseEther("200000"));
    expect(borrowerAfter - borrowerBefore).to.equal(ethers.parseEther("800000"));
  });

  it("rejects duplicate order ids during repay preview and execution", async function () {
    const { borrower, baburu, kinko } = await deployFixture();
    const collateral = ethers.parseEther("1000000");
    const quote = await kinko.quoteBorrow(collateral);

    await baburu.connect(borrower).approve(await kinko.getAddress(), collateral);
    await kinko.connect(borrower).borrow(collateral, quote, 9500);

    await expect(kinko.previewRepay(borrower.address, [1, 1]))
      .to.be.revertedWithCustomError(kinko, "DuplicateOrderId");

    await expect(kinko.connect(borrower).repay([1, 1], { value: quote * 2n }))
      .to.be.revertedWithCustomError(kinko, "DuplicateOrderId");

    const order = await kinko.orders(1);
    expect(order.borrower).to.equal(borrower.address);
    expect(await kinko.activeOrderCount()).to.equal(1n);
  });

  it("ignores reverting blacklist accounts and skips the vault itself in denominator math", async function () {
    const { owner, borrower, blocked, baburu, kinko } = await deployRevertingBalanceFixture();
    const collateral = ethers.parseEther("1000000");
    const quote = await kinko.quoteBorrow(collateral);

    await baburu.connect(borrower).approve(await kinko.getAddress(), collateral);
    await kinko.connect(borrower).borrow(collateral, quote, 9500);

    const denominatorBefore = await kinko.borrowDenominator();

    await kinko.connect(owner).setBlacklist(blocked.address, true);

    await expect(kinko.quoteBorrow(collateral)).to.not.be.reverted;
    expect(await kinko.blacklistBalance()).to.equal(0n);
    expect(await kinko.borrowDenominator()).to.equal(denominatorBefore);
  });

  it("rejects vault self-blacklisting and duplicate liquidation ids", async function () {
    const { owner, borrower, liquidator, baburu, kinko } = await deployFixture();
    const collateral = ethers.parseEther("1000000");
    const quote = await kinko.quoteBorrow(collateral);

    await expect(kinko.connect(owner).setBlacklist(await kinko.getAddress(), true))
      .to.be.revertedWithCustomError(kinko, "InvalidAmount");

    await baburu.connect(borrower).approve(await kinko.getAddress(), collateral);
    await kinko.connect(borrower).borrow(collateral, quote, 9500);

    await network.provider.send("evm_increaseTime", [9 * ONE_DAY + 60]);
    await network.provider.send("evm_mine");

    await expect(kinko.connect(liquidator).liquidate([1, 1]))
      .to.be.revertedWithCustomError(kinko, "DuplicateOrderId");
  });

  it("keeps completed orders in borrower history until the borrower cleans them up", async function () {
    const { borrower, baburu, kinko } = await deployFixture();
    const collateral = ethers.parseEther("1000000");
    const firstQuote = await kinko.quoteBorrow(collateral);

    await baburu.connect(borrower).approve(await kinko.getAddress(), collateral * 3n);
    await kinko.connect(borrower).borrow(collateral, firstQuote, 9500);

    const secondQuote = await kinko.quoteBorrow(collateral);
    await kinko.connect(borrower).borrow(collateral, secondQuote, 9500);

    expect(await kinko.getBorrowerOrders(borrower.address)).to.deep.equal([1n, 2n]);
    expect(await kinko.getBorrowerOrderHistory(borrower.address)).to.deep.equal([1n, 2n]);

    await network.provider.send("evm_increaseTime", [4 * ONE_DAY]);
    await network.provider.send("evm_mine");

    await kinko.connect(borrower).repay([1], { value: firstQuote });
    expect(await kinko.getBorrowerOrders(borrower.address)).to.deep.equal([2n]);
    expect(await kinko.getBorrowerOrderHistory(borrower.address)).to.deep.equal([1n, 2n]);

    await kinko.connect(borrower).cleanupFinishedOrders(10);
    expect(await kinko.getBorrowerOrderHistory(borrower.address)).to.deep.equal([2n]);

    await kinko.connect(borrower).repay([2], { value: secondQuote });
    expect(await kinko.getBorrowerOrders(borrower.address)).to.deep.equal([]);
    expect(await kinko.getBorrowerOrderHistory(borrower.address)).to.deep.equal([2n]);

    await kinko.connect(borrower).borrow(collateral, await kinko.quoteBorrow(collateral), 9500);
    expect(await kinko.getBorrowerOrders(borrower.address)).to.deep.equal([3n]);
    expect(await kinko.getBorrowerOrderHistory(borrower.address)).to.deep.equal([3n]);
  });

  it("allows public liquidation after 9 days", async function () {
    const { borrower, liquidator, baburu, kinko } = await deployFixture();
    const collateral = ethers.parseEther("1000000");
    const quote = await kinko.quoteBorrow(collateral);

    await baburu.connect(borrower).approve(await kinko.getAddress(), collateral);
    await kinko.connect(borrower).borrow(collateral, quote, 9500);

    await network.provider.send("evm_increaseTime", [9 * ONE_DAY + 60]);
    await network.provider.send("evm_mine");

    await expect(kinko.connect(liquidator).liquidate([1]))
      .to.emit(kinko, "Liquidated")
      .withArgs(1, liquidator.address, collateral);

    const deadBalance = await baburu.balanceOf(DEAD_ADDRESS);
    expect(deadBalance).to.equal(collateral);
    expect(await kinko.activeOrderCount()).to.equal(0n);
    expect(await kinko.getBorrowerOrders(borrower.address)).to.deep.equal([]);
    expect(await kinko.getBorrowerOrderHistory(borrower.address)).to.deep.equal([1n]);
    expect(await kinko.getActiveOrderIds()).to.deep.equal([]);

    const orderView = await kinko.orderView(1);
    expect(orderView.repayable).to.equal(false);
    expect(orderView.liquidatable).to.equal(false);
  });

  it("supports global public liquidation without explicit order ids", async function () {
    const { borrower, liquidator, baburu, kinko } = await deployFixture();
    const collateral = ethers.parseEther("1000000");
    const quote = await kinko.quoteBorrow(collateral);

    await baburu.connect(borrower).approve(await kinko.getAddress(), collateral * 2n);
    await kinko.connect(borrower).borrow(collateral, quote, 9500);
    await kinko.connect(borrower).borrow(collateral, quote, 9500);

    await network.provider.send("evm_increaseTime", [9 * ONE_DAY + 60]);
    await network.provider.send("evm_mine");

    const [count, totalCollateral] = await kinko.liquidatableSummary();
    expect(count).to.equal(2n);
    expect(totalCollateral).to.equal(collateral * 2n);

    await expect(kinko.connect(liquidator).liquidateOverdue(10))
      .to.emit(kinko, "Liquidated")
      .withArgs(2, liquidator.address, collateral);

    const deadBalance = await baburu.balanceOf(DEAD_ADDRESS);
    expect(deadBalance).to.equal(collateral * 2n);
    expect(await kinko.activeOrderCount()).to.equal(0n);
    expect(await kinko.activeCollateral()).to.equal(0n);
    expect(await kinko.getBorrowerOrders(borrower.address)).to.deep.equal([]);
    expect(await kinko.getBorrowerOrderHistory(borrower.address)).to.deep.equal([1n, 2n]);
    expect(await kinko.getActiveOrderIds()).to.deep.equal([]);
  });

  it("processes overdue ids during repay without immediately cleaning borrower history", async function () {
    const { borrower, baburu, kinko } = await deployFixture();
    const collateral = ethers.parseEther("1000000");
    const firstQuote = await kinko.quoteBorrow(collateral);

    await baburu.connect(borrower).approve(await kinko.getAddress(), collateral * 2n);
    await kinko.connect(borrower).borrow(collateral, firstQuote, 9500);

    const secondQuote = await kinko.quoteBorrow(collateral);
    await kinko.connect(borrower).borrow(collateral, secondQuote, 9500);

    await network.provider.send("evm_increaseTime", [9 * ONE_DAY + 60]);
    await network.provider.send("evm_mine");

    await expect(kinko.connect(borrower).repay([1, 2], { value: 0 }))
      .to.emit(kinko, "Liquidated")
      .withArgs(1, borrower.address, collateral);

    expect(await kinko.getBorrowerOrders(borrower.address)).to.deep.equal([]);
    expect(await kinko.getBorrowerOrderHistory(borrower.address)).to.deep.equal([1n, 2n]);
    expect(await kinko.getActiveOrderIds()).to.deep.equal([]);

    const [countAfter, collateralAfter] = await kinko.liquidatableSummary();
    expect(countAfter).to.equal(0n);
    expect(collateralAfter).to.equal(0n);
  });
});
