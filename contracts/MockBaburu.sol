// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockBaburu is ERC20 {
    uint256 public constant INITIAL_MINT = 1_000_000_000 ether;

    constructor(address initialHolder) ERC20("BABURU", "BABURU") {
        _mint(initialHolder, INITIAL_MINT);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
