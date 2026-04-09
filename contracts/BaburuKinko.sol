// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20Minimal {
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

contract BaburuKinko {
    struct Order {
        address borrower;
        uint128 collateralAmount;
        uint128 borrowedBnb;
        uint64 borrowedAt;
    }

    struct OrderView {
        uint256 orderId;
        address borrower;
        uint256 collateralAmount;
        uint256 borrowedBnb;
        uint256 borrowedAt;
        uint256 penaltyBpsValue;
        uint256 penaltyAmount;
        bool repayable;
        bool liquidatable;
    }

    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 ether;
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant EARLY_STAGE_ONE = 1 days;
    uint256 public constant EARLY_STAGE_TWO = 2 days;
    uint256 public constant EARLY_STAGE_THREE = 3 days;
    uint256 public constant NORMAL_STAGE_END = 6 days;
    uint256 public constant GRACE_STAGE_ONE = 7 days;
    uint256 public constant GRACE_STAGE_TWO = 8 days;
    uint256 public constant LIQUIDATION_TIME = 9 days;
    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    IERC20Minimal public immutable baburuToken;
    address public owner;
    uint256 public rhoBps = 7000;
    uint256 public activeCollateral;
    uint256 public activeOrderCount;
    uint256 public nextOrderId = 1;
    bool public borrowPaused;

    mapping(uint256 => Order) public orders;
    mapping(address => uint256[]) private borrowerOrderIds;
    uint256[] private activeOrderIds;
    mapping(uint256 => uint256) private activeOrderIndex;
    mapping(address => bool) public isBlacklist;
    address[] public blacklistAddresses;

    event Borrowed(
        uint256 indexed orderId,
        address indexed borrower,
        uint256 collateralAmount,
        uint256 borrowedBnb,
        uint256 refBorrow,
        uint256 minBorrowBps
    );
    event Repaid(
        uint256 indexed orderId,
        address indexed borrower,
        uint256 returnedCollateral,
        uint256 repaidBnb,
        uint256 penaltyAmount
    );
    event Liquidated(uint256 indexed orderId, address indexed operator, uint256 burnedCollateral);
    event BorrowPauseUpdated(bool paused);
    event RhoUpdated(uint256 rhoBps);
    event BlacklistUpdated(address indexed account, bool blacklisted);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotOwner();
    error BorrowPaused();
    error InvalidAmount();
    error InvalidMinBorrowBps();
    error InvalidDenominator();
    error SlippageExceeded();
    error InsufficientTreasury();
    error NotOrderBorrower();
    error NotRepayable();
    error InvalidMsgValue();
    error TransferFailed();
    error OrderMissing();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address baburuTokenAddress) {
        if (baburuTokenAddress == address(0)) revert InvalidAmount();
        baburuToken = IERC20Minimal(baburuTokenAddress);
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    receive() external payable {}

    function borrow(
        uint256 collateralAmount,
        uint256 refBorrow,
        uint256 minBorrowBps
    ) external returns (uint256 orderId, uint256 borrowedBnb) {
        if (borrowPaused) revert BorrowPaused();
        if (collateralAmount == 0 || refBorrow == 0) revert InvalidAmount();
        if (minBorrowBps == 0 || minBorrowBps > BPS_DENOMINATOR) revert InvalidMinBorrowBps();

        uint256 treasuryBefore = address(this).balance;
        uint256 denominator = borrowDenominator();
        if (denominator == 0) revert InvalidDenominator();

        borrowedBnb = (collateralAmount * treasuryBefore * rhoBps) / denominator / BPS_DENOMINATOR;
        if (borrowedBnb == 0) revert InvalidAmount();
        if (borrowedBnb > treasuryBefore) revert InsufficientTreasury();
        if (borrowedBnb * BPS_DENOMINATOR < refBorrow * minBorrowBps) revert SlippageExceeded();

        _safeTransferFrom(msg.sender, address(this), collateralAmount);

        orderId = nextOrderId++;
        orders[orderId] = Order({
            borrower: msg.sender,
            collateralAmount: uint128(collateralAmount),
            borrowedBnb: uint128(borrowedBnb),
            borrowedAt: uint64(block.timestamp)
        });
        borrowerOrderIds[msg.sender].push(orderId);
        activeOrderIndex[orderId] = activeOrderIds.length;
        activeOrderIds.push(orderId);
        activeCollateral += collateralAmount;
        activeOrderCount += 1;

        (bool sent, ) = payable(msg.sender).call{value: borrowedBnb}("");
        if (!sent) revert TransferFailed();

        emit Borrowed(orderId, msg.sender, collateralAmount, borrowedBnb, refBorrow, minBorrowBps);
    }

    function repay(uint256[] calldata orderIds) external payable returns (uint256 totalPenalty) {
        uint256 totalBnbDue;

        for (uint256 i = 0; i < orderIds.length; i++) {
            Order memory order = orders[orderIds[i]];
            if (order.borrower == address(0)) revert OrderMissing();

            if (_isLiquidatable(order.borrowedAt)) {
                _liquidate(orderIds[i], msg.sender);
                continue;
            }

            if (order.borrower != msg.sender) revert NotOrderBorrower();
            totalBnbDue += order.borrowedBnb;
            totalPenalty += _penaltyAmount(order.collateralAmount, order.borrowedAt);
        }

        if (msg.value != totalBnbDue) revert InvalidMsgValue();

        for (uint256 i = 0; i < orderIds.length; i++) {
            Order memory order = orders[orderIds[i]];
            if (order.borrower != msg.sender) {
                continue;
            }
            if (_isLiquidatable(order.borrowedAt)) {
                continue;
            }
            _closeOrder(orderIds[i], order, _penaltyAmount(order.collateralAmount, order.borrowedAt));
        }
    }

    function liquidate(uint256[] calldata orderIds) external {
        for (uint256 i = 0; i < orderIds.length; i++) {
            _liquidate(orderIds[i], msg.sender);
        }
    }

    function liquidateOverdue(uint256 maxCount) external returns (uint256 processedCount, uint256 burnedCollateral) {
        if (maxCount == 0) revert InvalidAmount();

        for (uint256 i = activeOrderIds.length; i > 0 && processedCount < maxCount; ) {
            unchecked {
                i--;
            }

            uint256 orderId = activeOrderIds[i];
            Order memory order = orders[orderId];
            if (order.borrower == address(0) || !_isLiquidatable(order.borrowedAt)) {
                continue;
            }

            burnedCollateral += order.collateralAmount;
            _liquidate(orderId, msg.sender);
            processedCount += 1;
        }
    }

    function quoteBorrow(uint256 collateralAmount) external view returns (uint256) {
        uint256 denominator = borrowDenominator();
        if (denominator == 0) return 0;
        return (collateralAmount * address(this).balance * rhoBps) / denominator / BPS_DENOMINATOR;
    }

    function previewBorrow(
        uint256 collateralAmount,
        uint256 refBorrow,
        uint256 minBorrowBps
    ) external view returns (uint256 borrowedBnb, bool passesSlippage, uint256 denominator, uint256 treasuryBnb) {
        if (minBorrowBps == 0 || minBorrowBps > BPS_DENOMINATOR) {
            return (0, false, 0, address(this).balance);
        }

        treasuryBnb = address(this).balance;
        denominator = borrowDenominator();
        if (denominator == 0 || collateralAmount == 0) {
            return (0, false, denominator, treasuryBnb);
        }

        borrowedBnb = (collateralAmount * treasuryBnb * rhoBps) / denominator / BPS_DENOMINATOR;
        passesSlippage = borrowedBnb > 0 && borrowedBnb * BPS_DENOMINATOR >= refBorrow * minBorrowBps;
    }

    function borrowDenominator() public view returns (uint256) {
        uint256 inactive = blacklistBalance();
        if (INITIAL_SUPPLY <= inactive + activeCollateral) {
          return 0;
        }
        return INITIAL_SUPPLY - inactive - activeCollateral;
    }

    function penaltyBps(uint256 borrowedAt) public view returns (uint256) {
        uint256 elapsed = block.timestamp - borrowedAt;
        if (elapsed < EARLY_STAGE_ONE) return 9000;
        if (elapsed < EARLY_STAGE_TWO) return 6000;
        if (elapsed < EARLY_STAGE_THREE) return 3000;
        if (elapsed < NORMAL_STAGE_END) return 0;
        if (elapsed < GRACE_STAGE_ONE) return 3000;
        if (elapsed < GRACE_STAGE_TWO) return 6000;
        if (elapsed < LIQUIDATION_TIME) return 9000;
        return BPS_DENOMINATOR;
    }

    function getBorrowerOrders(address borrower) external view returns (uint256[] memory borrowerActiveOrderIds) {
        uint256[] memory storedOrderIds = borrowerOrderIds[borrower];
        uint256 count;

        for (uint256 i = 0; i < storedOrderIds.length; i++) {
            if (orders[storedOrderIds[i]].borrower != address(0)) {
                count++;
            }
        }

        borrowerActiveOrderIds = new uint256[](count);
        uint256 writeIndex;
        for (uint256 i = 0; i < storedOrderIds.length; i++) {
            if (orders[storedOrderIds[i]].borrower != address(0)) {
                borrowerActiveOrderIds[writeIndex] = storedOrderIds[i];
                writeIndex++;
            }
        }
    }

    function getActiveOrderIds() external view returns (uint256[] memory ids) {
        ids = activeOrderIds;
    }

    function liquidatableSummary() external view returns (uint256 count, uint256 collateral) {
        for (uint256 i = 0; i < activeOrderIds.length; i++) {
            uint256 orderId = activeOrderIds[i];
            Order memory order = orders[orderId];
            if (order.borrower == address(0) || !_isLiquidatable(order.borrowedAt)) {
                continue;
            }
            count += 1;
            collateral += order.collateralAmount;
        }
    }

    function getBorrowerOrderViews(address borrower) external view returns (OrderView[] memory activeOrders) {
        uint256[] memory borrowerActiveOrderIds = this.getBorrowerOrders(borrower);
        activeOrders = new OrderView[](borrowerActiveOrderIds.length);

        for (uint256 i = 0; i < borrowerActiveOrderIds.length; i++) {
            activeOrders[i] = orderView(borrowerActiveOrderIds[i]);
        }
    }

    function orderView(uint256 orderId) public view returns (OrderView memory viewData) {
        Order memory order = orders[orderId];
        if (order.borrower == address(0)) revert OrderMissing();

        uint256 currentPenaltyBps = penaltyBps(order.borrowedAt);
        bool liquidatable = currentPenaltyBps == BPS_DENOMINATOR;
        bool repayable = !liquidatable;

        viewData = OrderView({
            orderId: orderId,
            borrower: order.borrower,
            collateralAmount: order.collateralAmount,
            borrowedBnb: order.borrowedBnb,
            borrowedAt: order.borrowedAt,
            penaltyBpsValue: currentPenaltyBps,
            penaltyAmount: _penaltyAmount(order.collateralAmount, order.borrowedAt),
            repayable: repayable,
            liquidatable: liquidatable
        });
    }

    function previewRepay(address borrower, uint256[] calldata orderIds)
        external
        view
        returns (uint256 totalBnbDue, uint256 totalPenalty, uint256 repayableCount, uint256 liquidatableCount)
    {
        for (uint256 i = 0; i < orderIds.length; i++) {
            Order memory order = orders[orderIds[i]];
            if (order.borrower == address(0)) revert OrderMissing();

            if (_isLiquidatable(order.borrowedAt)) {
                liquidatableCount += 1;
                continue;
            }

            if (order.borrower != borrower) revert NotOrderBorrower();

            totalBnbDue += order.borrowedBnb;
            totalPenalty += _penaltyAmount(order.collateralAmount, order.borrowedAt);
            repayableCount += 1;
        }
    }

    function blacklistBalance() public view returns (uint256 total) {
        for (uint256 i = 0; i < blacklistAddresses.length; i++) {
            total += baburuToken.balanceOf(blacklistAddresses[i]);
        }
    }

    function blacklistCount() external view returns (uint256) {
        return blacklistAddresses.length;
    }

    function setBorrowPaused(bool paused) external onlyOwner {
        borrowPaused = paused;
        emit BorrowPauseUpdated(paused);
    }

    function setRhoBps(uint256 newRhoBps) external onlyOwner {
        if (newRhoBps == 0 || newRhoBps > BPS_DENOMINATOR) revert InvalidAmount();
        rhoBps = newRhoBps;
        emit RhoUpdated(newRhoBps);
    }

    function setBlacklist(address account, bool blacklisted) external onlyOwner {
        if (account == address(0)) revert InvalidAmount();

        if (blacklisted && !isBlacklist[account]) {
            isBlacklist[account] = true;
            blacklistAddresses.push(account);
            emit BlacklistUpdated(account, true);
            return;
        }

        if (!blacklisted && isBlacklist[account]) {
            isBlacklist[account] = false;
            for (uint256 i = 0; i < blacklistAddresses.length; i++) {
                if (blacklistAddresses[i] == account) {
                    blacklistAddresses[i] = blacklistAddresses[blacklistAddresses.length - 1];
                    blacklistAddresses.pop();
                    break;
                }
            }
            emit BlacklistUpdated(account, false);
        }
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAmount();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function _closeOrder(uint256 orderId, Order memory order, uint256 penaltyAmount) internal {
        _removeActiveOrder(orderId);
        activeCollateral -= order.collateralAmount;
        activeOrderCount -= 1;
        delete orders[orderId];

        uint256 returnedCollateral = order.collateralAmount;
        if (penaltyAmount > 0) {
            _safeTransfer(DEAD_ADDRESS, penaltyAmount);
            returnedCollateral -= penaltyAmount;
        }
        _safeTransfer(msg.sender, returnedCollateral);

        emit Repaid(orderId, msg.sender, returnedCollateral, order.borrowedBnb, penaltyAmount);
    }

    function _liquidate(uint256 orderId, address operator) internal {
        Order memory order = orders[orderId];
        if (order.borrower == address(0)) revert OrderMissing();
        if (!_isLiquidatable(order.borrowedAt)) revert NotRepayable();

        _removeActiveOrder(orderId);
        activeCollateral -= order.collateralAmount;
        activeOrderCount -= 1;
        delete orders[orderId];
        _safeTransfer(DEAD_ADDRESS, order.collateralAmount);

        emit Liquidated(orderId, operator, order.collateralAmount);
    }

    function _penaltyAmount(uint256 collateralAmount, uint256 borrowedAt) internal view returns (uint256) {
        return (collateralAmount * penaltyBps(borrowedAt)) / BPS_DENOMINATOR;
    }

    function _isLiquidatable(uint256 borrowedAt) internal view returns (bool) {
        return block.timestamp >= borrowedAt + LIQUIDATION_TIME;
    }

    function _removeActiveOrder(uint256 orderId) internal {
        uint256 index = activeOrderIndex[orderId];
        uint256 lastIndex = activeOrderIds.length - 1;

        if (index != lastIndex) {
            uint256 lastOrderId = activeOrderIds[lastIndex];
            activeOrderIds[index] = lastOrderId;
            activeOrderIndex[lastOrderId] = index;
        }

        activeOrderIds.pop();
        delete activeOrderIndex[orderId];
    }

    function _safeTransfer(address to, uint256 value) internal {
        bool ok = baburuToken.transfer(to, value);
        if (!ok) revert TransferFailed();
    }

    function _safeTransferFrom(address from, address to, uint256 value) internal {
        bool ok = baburuToken.transferFrom(from, to, value);
        if (!ok) revert TransferFailed();
    }
}
