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
    expect(orderView.penaltyBpsValue).to.equal(3000n);
    expect(deadAfter - deadBefore).to.equal(ethers.parseEther("300000"));
    expect(borrowerAfter - borrowerBefore).to.equal(ethers.parseEther("700000"));
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
  });
});
