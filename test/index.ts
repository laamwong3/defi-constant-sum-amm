import { expect } from "chai";
import { ethers } from "hardhat";
import { before } from "mocha";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  ConstantSumAMM,
  ConstantSumAMM__factory,
  MockToken,
  MockToken__factory,
} from "../typechain-types";

/**
 * todos -> test the swap function
 * todos -> test the addliquidity()
 * todos -> test the removeLiquidity()
 */

describe("ConstantSumAMM.sol", () => {
  let TokenA: MockToken__factory;
  let tokenA: MockToken;
  let TokenB: MockToken__factory;
  let tokenB: MockToken;
  let owner: SignerWithAddress;
  let users: SignerWithAddress[];
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let ConstantSumAMM: ConstantSumAMM__factory;
  let constantSumAMM: ConstantSumAMM;
  const mintAmount = 1000;
  const tokenASupply = 1000;
  const tokenBSupply = 1000;

  before(async () => {
    // deploy all contracts
    [owner, ...users] = await ethers.getSigners();

    TokenA = await ethers.getContractFactory("MockToken");
    tokenA = await TokenA.deploy();

    TokenB = await ethers.getContractFactory("MockToken");
    tokenB = await TokenB.deploy();

    ConstantSumAMM = await ethers.getContractFactory("ConstantSumAMM");
    constantSumAMM = await ConstantSumAMM.deploy(
      tokenA.address,
      tokenB.address
    );

    user1 = users[0];
    user2 = users[1];

    // mint some tokens for user1 and user2 for testing
    await tokenA.mint(user1.address, mintAmount);
    await tokenA.mint(user2.address, mintAmount);
    await tokenB.mint(user1.address, mintAmount);
    await tokenB.mint(user2.address, mintAmount);

    //approve the AMM contract to spend
    await tokenA.connect(user1).approve(constantSumAMM.address, mintAmount);
    await tokenB.connect(user1).approve(constantSumAMM.address, mintAmount);
    await tokenA.connect(user2).approve(constantSumAMM.address, mintAmount);
    await tokenB.connect(user2).approve(constantSumAMM.address, mintAmount);
  });

  it("Should add liquidity", async () => {
    // user1 will provide liquidity to the pool

    await constantSumAMM
      .connect(user1)
      .addLiquidity(tokenASupply, tokenBSupply);

    expect(await constantSumAMM.balanceOf(user1.address)).to.equal(
      tokenASupply + tokenBSupply
    );
    expect(await constantSumAMM.totalSupply()).to.equal(
      tokenASupply + tokenBSupply
    );
    expect(await constantSumAMM.reserveA()).to.equal(tokenASupply);
    expect(await constantSumAMM.reserveB()).to.equal(tokenBSupply);
    expect(await constantSumAMM.tokenA()).to.equal(tokenA.address);
    expect(await constantSumAMM.tokenB()).to.equal(tokenB.address);
  });

  it("Should swap token from token A to token B", async () => {
    //user2 will swap tokenA -> tokenB
    const swapAmount = 1000;
    const reserveABefore = await constantSumAMM.reserveA();
    const reserveBBefore = await constantSumAMM.reserveB();
    const user2BalanceBefore = await tokenB
      .connect(user2)
      .balanceOf(user2.address);
    await constantSumAMM.connect(user2).swap(tokenA.address, swapAmount);

    const reserveAAfter = await constantSumAMM.reserveA();
    const reserveBAfter = await constantSumAMM.reserveB();
    expect(reserveAAfter).equal(Number(reserveABefore) + swapAmount);
    // 0.3% fees
    expect(reserveBAfter).equal(
      Number(reserveBBefore) - (Number(swapAmount) * 997) / 1000
    );
    // user2's token B should receive money included fees
    const user2BalanceAfter = await tokenB
      .connect(user2)
      .balanceOf(user2.address);
    const user2ReceiveAmount = (swapAmount * 997) / 1000;
    expect(user2BalanceAfter).equal(
      user2ReceiveAmount + Number(user2BalanceBefore)
    );
  });
  it("Should swap token from token B to token A", async () => {
    //user2 will swap tokenB -> tokenA
    const swapAmount = 1000;
    const reserveABefore = await constantSumAMM.reserveA();
    const reserveBBefore = await constantSumAMM.reserveB();
    // console.log(reserveABefore, reserveBBefore);
    const user2BalanceBefore = await tokenA
      .connect(user2)
      .balanceOf(user2.address);
    await constantSumAMM.connect(user2).swap(tokenB.address, swapAmount);

    const reserveAAfter = await constantSumAMM.reserveA();
    const reserveBAfter = await constantSumAMM.reserveB();
    // console.log(reserveAAfter, reserveBAfter);
    expect(reserveBAfter).equal(Number(reserveBBefore) + swapAmount);
    // 0.3 % fees;
    expect(reserveAAfter).equal(
      Number(reserveABefore) - (Number(swapAmount) * 997) / 1000
    );
    // user2's token A should receive money included fees
    const user2BalanceAfter = await tokenA
      .connect(user2)
      .balanceOf(user2.address);
    const user2ReceiveAmount = (swapAmount * 997) / 1000;
    expect(user2BalanceAfter).equal(
      user2ReceiveAmount + Number(user2BalanceBefore)
    );
  });
  it("Should remove liquidity", async () => {
    // only user1 add liquidity, so user1 will have 100% shares
    // assume platform has no charge
    const removeLiquidityShares = tokenASupply + tokenBSupply;
    const reserveABefore = await constantSumAMM.reserveA();
    const reserveBBefore = await constantSumAMM.reserveB();
    await constantSumAMM.connect(user1).removeLiquidity(removeLiquidityShares);

    expect(await constantSumAMM.reserveA()).equal(0);
    expect(await constantSumAMM.reserveB()).equal(0);

    expect(await tokenA.balanceOf(user1.address)).equal(reserveABefore);
    expect(await tokenB.balanceOf(user1.address)).equal(reserveBBefore);
  });
});
