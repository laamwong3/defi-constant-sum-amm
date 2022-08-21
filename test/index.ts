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
    const tokenASupply = 1000;
    const tokenBSupply = 1000;
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
});
