// contracts/test/Mallcoin.test.js
const { expect } = require('chai');
const { ethers } = require('hardhat');

describe("Mallcoin", function () {
  let Mallcoin, mallcoin, owner, addr1, addr2;
  const initialSupplyStr = "1000000"; // 1,000,000 for test
  const decimals = 18;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    Mallcoin = await ethers.getContractFactory("Mallcoin");
    const init = ethers.parseUnits(initialSupplyStr, decimals);
    const cap = ethers.parseUnits("2000000", decimals);
    mallcoin = await Mallcoin.deploy(init, cap);
    await mallcoin.waitForDeployment();
  });

  it("has correct name and symbol", async function () {
    expect(await mallcoin.name()).to.equal("Mallcoin");
    expect(await mallcoin.symbol()).to.equal("MLCNS");
  });

  it("initial supply assigned to deployer", async function () {
    const balance = await mallcoin.balanceOf(owner.address);
    expect(balance).to.equal(ethers.parseUnits(initialSupplyStr, decimals));
  });

  it("prevents minting above cap", async function () {
    const cap = await mallcoin.CAP();
    const current = await mallcoin.totalSupply();
    const toMint = cap - current + 1n; // one wei above cap
    await expect(mallcoin.mint(owner.address, toMint)).to.be.revertedWith("cap exceeded");
  });

  it("allows transfers", async function () {
    await mallcoin.transfer(addr1.address, ethers.parseUnits("100", decimals));
    expect(await mallcoin.balanceOf(addr1.address)).to.equal(ethers.parseUnits("100", decimals));
  });
});

module.exports = { initialSupplyStr, decimals, init, cap, balance, cap, current, toMint };