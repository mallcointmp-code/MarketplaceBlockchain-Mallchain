// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Mallpoints is ERC20, Ownable {
    uint256 public constant MONTHLY_RENEW_SUPPLY = 10_000_000_000_000 * 1e18; // 10 trillion
    uint256 public lastRenewTimestamp;

    constructor() ERC20("Mallpoints", "MLPTS") {
        lastRenewTimestamp = block.timestamp;
    }

    function renewMonthlySupply() external onlyOwner {
        require(block.timestamp >= lastRenewTimestamp + 30 days, "Already renewed this month");
        _mint(owner(), MONTHLY_RENEW_SUPPLY);
        lastRenewTimestamp = block.timestamp;
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
