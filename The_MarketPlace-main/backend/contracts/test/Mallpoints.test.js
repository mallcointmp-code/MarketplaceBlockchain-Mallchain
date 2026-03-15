// contracts/test/Mallpoints.test.js
const { expect } = require('chai');
const { ethers } = require('hardhat');

describe("Mallpoints", function () {
  let Mallpoints, mallpoints, owner, addr1;
  const decimals = 18;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    Mallpoints = await ethers.getContractFactory("Mallpoints");
    mallpoints = await Mallpoints.deploy();
    await mallpoints.waitForDeployment();
  });

  it("owner has minter role initially", async function () {
    const MINTER_ROLE = await mallpoints.MINTER_ROLE();
    expect(await mallpoints.hasRole(MINTER_ROLE, owner.address)).to.be.true;
  });

  it("minter can mint tokens", async function () {
    await mallpoints.mint(addr1.address, ethers.parseUnits("1000", decimals));
    expect(await mallpoints.balanceOf(addr1.address)).to.equal(ethers.parseUnits("1000", decimals));
  });

  it("non-minter cannot mint", async function () {
    await expect(
      mallpoints.connect(addr1).mint(addr1.address, ethers.parseUnits("10", decimals))
    ).to.be.revertedWith("Caller not minter");
  });
});

module.exports = { decimals, MINTER_ROLE };