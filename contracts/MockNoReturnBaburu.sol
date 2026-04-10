// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockNoReturnBaburu {
    string public constant name = "BABURU";
    string public constant symbol = "BABURU";
    uint8 public constant decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor(address initialHolder) {
        _mint(initialHolder, 1_000_000_000 ether);
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        return true;
    }

    function transfer(address to, uint256 value) external {
        _transfer(msg.sender, to, value);
    }

    function transferFrom(address from, address to, uint256 value) external {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= value, "insufficient allowance");
        allowance[from][msg.sender] = allowed - value;
        _transfer(from, to, value);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function _transfer(address from, address to, uint256 value) internal {
        require(balanceOf[from] >= value, "insufficient balance");
        balanceOf[from] -= value;
        balanceOf[to] += value;
    }

    function _mint(address to, uint256 amount) internal {
        totalSupply += amount;
        balanceOf[to] += amount;
    }
}
