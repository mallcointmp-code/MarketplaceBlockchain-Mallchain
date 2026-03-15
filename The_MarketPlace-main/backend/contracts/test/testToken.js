// contracts/test/testTokens.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Mallcoin and Mallpoints Tokens", function () {
  let mallcoin, mallpoints, owner, addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    const Mallcoin = await ethers.getContractFactory("Mallcoin");
    mallcoin = await Mallcoin.deploy();
    await mallcoin.waitForDeployment();

    const Mallpoints = await ethers.getContractFactory("Mallpoints");
    mallpoints = await Mallpoints.deploy();
    await mallpoints.waitForDeployment();
  });

  it("should mint Mallcoins correctly", async function () {
    await mallcoin.addMinter(owner.address);
    await mallcoin.mint(addr1.address, ethers.parseEther("1000"));
    const balance = await mallcoin.balanceOf(addr1.address);
    expect(balance).to.equal(ethers.parseEther("1000"));
  });

  it("should renew Mallpoints monthly supply", async function () {
    const tx = await mallpoints.renewMonthlySupply();
    await tx.wait();
    const total = await mallpoints.totalSupply();
    expect(total).to.be.gt(0);
  });
});
