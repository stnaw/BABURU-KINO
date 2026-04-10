// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockRevertingBaburu is ERC20 {
    address public revertingAccount;

    constructor(address initialHolder) ERC20("BABURU", "BABURU") {
        _mint(initialHolder, 1_000_000_000 ether);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function setRevertingAccount(address account) external {
        revertingAccount = account;
    }

    function balanceOf(address account) public view override returns (uint256) {
        if (account == revertingAccount) {
            revert("mock balanceOf revert");
        }
        return super.balanceOf(account);
    }
}
