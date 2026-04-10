// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockFeeOnTransferBaburu is ERC20 {
    uint256 public constant FEE_BPS = 500;

    constructor(address initialHolder) ERC20("BABURU", "BABURU") {
        _mint(initialHolder, 1_000_000_000 ether);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from == address(0) || to == address(0) || value == 0) {
            super._update(from, to, value);
            return;
        }

        uint256 fee = (value * FEE_BPS) / 10_000;
        uint256 received = value - fee;

        super._update(from, DEAD_ADDRESS, fee);
        super._update(from, to, received);
    }

    address private constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;
}
