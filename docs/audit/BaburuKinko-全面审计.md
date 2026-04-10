# BaburuKinko 合约全面审计报告

- **审计对象**：`contracts/BaburuKinko.sol`（553 行）
- **规则源**：`docs/tokenomics/税率分配.md`
- **审计日期**：2026-04-10
- **说明**：静态代码与文档对照审计；未替代第三方专业审计。

---

## 一、执行摘要

| 维度 | 结论 |
|------|------|
| 需求符合性 | **整体良好**；§1-§8 核心规则均已实现。§9 启动流程与链上实现有差异（P2），需文档对齐。 |
| 资金安全（BNB） | **未发现**任意地址可将金库 BNB 转出的隐藏路径。BNB 仅通过 `borrow` 借出、`receive` 入账。 |
| 逻辑完整度 | 状态机自洽，订单生命周期（创建→还款/清算→延迟清理）无矛盾。存在 2 个 P1 + 1 个 P3 逻辑层面值得关注的问题。 |
| 攻击面防护 | 已防护重入基本场景、重复 orderId、非标 ERC20、黑名单 DoS；仍有 2 个攻击面需关注。 |
| 优化空间 | 存在 gas 优化和可维护性提升机会。 |

---

## 二、需求实现完整度（对照 `税率分配.md` §1-§9）

### 2.1 已正确实现的条款

| 条款 | 文档要求 | 合约实现 | 状态 |
|------|----------|----------|------|
| §1 总量 | 10 亿枚，18 位小数 | `INITIAL_SUPPLY = 1_000_000_000 ether` | ✅ |
| §2 税金流向 | 税以 BNB 进入金库，被动接收 | `receive() external payable {}` | ✅ |
| §3 借款定义 | 质押本币 → 借出 BNB | `borrow()` 完整实现 | ✅ |
| §3 还款定义 | 归还等额 BNB，罚金从质押中扣 | `repay()` + `_closeOrder()` | ✅ |
| §4 时间边界（左闭右开） | 8 档时间区间 | `penaltyBps()` 使用 `<` 比较，满足左闭右开 | ✅ |
| §4 提前还款罚金 | [0,1)=60%, [1,2)=40%, [2,3)=20% | `6000 / 4000 / 2000` bps | ✅ |
| §4 正常期 | [3,6)=0% | `return 0` | ✅ |
| §4 宽限期 | [6,7)=30%, [7,8)=60%, [8,9)=90% | `3000 / 6000 / 9000` bps | ✅ |
| §4 超期 | ≥9 天不可还，100% 销毁 | `_isLiquidatable` + `penaltyBps` 返回 `BPS_DENOMINATOR` | ✅ |
| §4 销毁口径 | `transfer(0x…dead)`，不用 `burn()` | `_safeTransfer(DEAD_ADDRESS, …)` | ✅ |
| §5 可借公式 | 质押/分母 × (金库BNB × ρ) | `collateral * treasury * rhoBps / denominator / BPS_DENOMINATOR` | ✅ |
| §5 金库规模 | 本笔执行前 `address(this).balance` | `treasuryBefore` 在 `transferFrom` 之前读取 | ✅ |
| §5 分母 | 初始总量 - 黑名单持仓 - 活跃质押 | `borrowDenominator()` | ✅ |
| §5 分母≤0 | 整笔 revert | `InvalidDenominator` | ✅ |
| §5 ρ 默认 0.7 | 可调 | `rhoBps = 7000`；`setRhoBps` 可改，上下界 `(0, 10000]` | ✅ |
| §5 滑点保护 | `currBorrow*10000 >= refBorrow*minBorrowBps` | `SlippageExceeded` | ✅ |
| §5 minBorrowBps | `1 ≤ x ≤ 10000` | `minBorrowBps == 0 \|\| > BPS_DENOMINATOR` → revert | ✅ |
| §6 批量还款 | msg.value 须等于应还合计 | `InvalidMsgValue` 校验 | ✅ |
| §6 超期不阻塞 | 超期单自动清算，不计入应还 | 首循环 `_liquidate` + `continue` | ✅ |
| §6 未超期归属 | 仅借款人本人可还 | `NotOrderBorrower` | ✅ |
| §6 公共清算 | 任意地址可触发 | `liquidate()` 无权限限制 | ✅ |
| §6 便捷清算入口 | 无需传 ID，按数量上限 | `liquidateOverdue(maxCount)` | ✅ |
| §6 只读统计 | 待清算数量与质押总量 | `liquidatableSummary()` | ✅ |
| §6 订单记录保留 | 已完成不立即删除 | `getBorrowerOrderHistory` 保留全历史 | ✅ |
| §6 记录清理 | 借款人后续动作触发，仅清理自身 | `_cleanupFinishedOrders` 在 `borrow`/`repay` 时调用 + `cleanupFinishedOrders` 手动入口 | ✅ |
| §7.1 BNB 不可随意转出 | 无 withdraw/rescue | 确认无此类函数 | ✅ |
| §7.3 可调 ρ | onlyOwner | `setRhoBps` | ✅ |
| §7.3 增删黑名单 | onlyOwner | `setBlacklist` | ✅ |
| §7.3 暂停/恢复 | 仅影响新借款 | `setBorrowPaused`；`repay`/`liquidate` 不检查 `borrowPaused` | ✅ |
| §8 黑名单内容 | LP、交易所、dead 地址 | 运维层面由 owner 配置，合约支持增删 | ✅ |

### 2.2 偏差与缺口

#### P2：§9 启动流程与合约实现不一致

文档 §9 描述了 5 步启动流程（配置代币、税流入地址、销毁地址、黑名单、调用启动接口），合约仅有 `constructor(baburuToken)` 一步设置。

- 销毁地址**写死** `DEAD_ADDRESS`，无法治理配置（但业务上 `0x…dead` 是行业惯例，写死更安全）
- 无独立的「启动」状态机
- 税路由/swap 逻辑不在本合约

**建议**：在白皮书/部署文档中明确说明「税路由在链外，金库仅被动接收 BNB；销毁地址固定为安全惯例」，与 §9 文档对齐即可。

#### P3：§6 订单列表「时间倒序」

文档要求以时间倒序展示，`getBorrowerOrders` 按创建顺序返回。可由前端排序满足，需在集成文档中约定。

---

## 三、合约自身逻辑完整度与逻辑漏洞

### 3.1 状态机一致性 ✅

| 检查项 | 结论 |
|--------|------|
| `activeOrderCount` 与 `activeOrderIds.length` | 借款 +1，关单/清算各 -1，始终一致 |
| `activeCollateral` 增减 | 借款 `+=collateralAmount`，关单/清算 `-=order.collateralAmount`（均为 `uint256`，无截断） |
| 订单状态流转 | `NONE→ACTIVE→REPAID/LIQUIDATED`，单向不可逆 |
| `borrowerOrderIds` 生命周期 | 借款时 push（L144）；关单 `_closeOrder`（L439）和清算 `_liquidate`（L455）**不**从 `borrowerOrderIds` 中移除——仅从 `activeOrderIds` 移除并改状态。真正删除发生在 `_cleanupFinishedOrders`（L507）调用 `_removeBorrowerOrder`（L492）时，触发时机为借款人下一次 `borrow`/`repay` 或手动调用 `cleanupFinishedOrders`。这是 §6「已完成订单不立即删除，由借款人后续动作触发清理」的实现 |

### 3.2 P1 — `repay` 混合超期单与正常单时的 `msg.value` 计算

当 `orderIds` 同时包含超期单和正常单时：

```
首循环：超期单 → _liquidate → continue（不累加 totalBnbDue）
       正常单 → totalBnbDue += borrowedBnb
msg.value 校验：msg.value != totalBnbDue → revert
```

逻辑正确：超期单不计入应还额。但存在**边界场景**：

如果首循环中某笔订单**恰好在该交易被打包的 `block.timestamp` 从未超期变为超期**（交易提交时未超期，打包时刚好满 9 天），该订单会被 `_liquidate` 而非计入 `totalBnbDue`。此时用户发送的 `msg.value`（基于提交时的预计算）会多于实际 `totalBnbDue`，导致 `InvalidMsgValue` revert。

**影响**：用户资金不会损失（整笔 revert），但 UX 层面可能困惑。`previewRepay` 已有相同逻辑，前端应使用实时数据并提示边界风险。

### 3.3 P1 — `_cleanupFinishedOrders(type(uint256).max)` 导致个人级 liveness 风险

`borrow`（L119）和 `repay`（L158）入口第一行即调用 `_cleanupFinishedOrders(msg.sender, type(uint256).max)`，对该借款人的 `borrowerOrderIds` **全量遍历**，逐条检查并清理已完成订单。

```solidity
function borrow(...) external returns (...) {
    _cleanupFinishedOrders(msg.sender, type(uint256).max);  // L119
```

**问题不仅是「gas 贵」，而是个人级可用性风险**：

- `borrowerOrderIds` 仅在 `_cleanupFinishedOrders` 中收缩（非关单/清算时），若用户长期未手动清理且累积大量已完成订单，数组长度持续增长。
- `_cleanupFinishedOrders` 遍历该数组，对每条已完成订单执行 `_removeBorrowerOrder`（swap-pop + 2 次 SSTORE + 1 次 SLOAD）。当历史订单数达到数百甚至上千时，单次 `borrow`/`repay` 的 gas 开销可能接近甚至超过区块 gas 上限。
- 这会导致该借款人**无法执行新借款和还款**，形成自我 DoS（其他用户不受影响）。
- 虽然 `cleanupFinishedOrders(maxCount)` 允许分批清理，但用户必须**主动意识到**需要调用此函数，否则问题会在下一次 `borrow`/`repay` 时突然暴露。

**影响**：非资金安全问题，不影响其他用户，但对高频借款人构成**设计约束**——前端应监控用户历史订单数并在接近阈值时提示清理，或合约层将 `type(uint256).max` 改为合理上限值。

### 3.4 P3 — `penaltyBps` 对 `borrowedAt` 为 0 的订单

`penaltyBps(0)` 会计算 `elapsed = block.timestamp - 0 = block.timestamp`（极大值），返回 `BPS_DENOMINATOR`（100%）。在实际调用路径中，此函数仅对 `ORDER_STATUS_ACTIVE` 的订单调用，`borrowedAt` 不会为 0，故无风险。但作为 `public` 函数，外部调用时应注意。

### 3.5 逻辑完整性小结

| 模块 | 状态 |
|------|------|
| 借款公式与分母 | 自洽，两步除法略偏协议（最多 1 wei），可接受 |
| 订单 CRUD | swap-pop 模式正确，索引与数组同步 |
| 批量处理去重 | `_revertOnDuplicateOrderId` O(n²) 防护到位 |
| 超期处理 | 清算销毁路径完整，不阻塞正常还款 |
| 暂停控制 | 仅影响 `borrow`，不影响 `repay`/`liquidate` |

---

## 四、区块链常见攻击与漏洞防护

### 4.1 重入攻击（Reentrancy）

| 入口 | 外部调用 | 防护 | 风险评估 |
|------|----------|------|----------|
| `borrow` | ① `_safeTransferFrom` ② `payable.call{value}` | 状态在外部调用前已完整更新（`orders`、`activeCollateral`、`nextOrderId`） | **低** — 重入后面临更低余额和更高 `activeCollateral`，无法构成盗取 |
| `repay` | ① `_safeTransfer(DEAD)` ② `_safeTransfer(borrower)` | `orders[id].status` 已改为 `REPAID` → 重入读到非 ACTIVE 状态 | **低** |
| `liquidate` | `_safeTransfer(DEAD)` | `orders[id].status` 已改为 `LIQUIDATED` | **低** |

**建议**：虽然当前逻辑对标准 ERC20 安全，但若未来 BABURU 代币升级支持 hook/回调（如 ERC-777 兼容），建议加 `nonReentrant` 修饰器作为纵深防御。

### 4.2 闪电贷攻击

| 场景 | 可行性 | 分析 |
|------|--------|------|
| 闪贷 BABURU → borrow → repay | ❌ 不可盈利 | 同交易内还款处于 [0,1) 天区间，罚金 60%，净亏 |
| 闪贷 BABURU → 转 DEAD → borrow | ❌ 经济上亏损 | 转入 DEAD 的代币不可回收，等于烧币换杠杆 |
| 闪贷 BNB → 注入金库 → borrow | ❌ 无法执行 | `receive()` 不触发 borrow，需两笔交易 |

**结论**：当前设计的罚金机制天然抵御了闪电贷攻击。

### 4.3 价格操纵 / Oracle

合约不依赖外部预言机，可借额度由链上状态（`address(this).balance`、`activeCollateral`、`blacklistBalance`）实时计算。

**风险点**：`blacklistBalance()` 依赖黑名单地址的实时持仓，理论上可被操纵（向黑名单地址转币压缩分母放大可借额）。但这需要牺牲自有代币，经济上通常不可行。

### 4.4 整数溢出/下溢

Solidity 0.8.24 默认 checked arithmetic，溢出自动 revert。

| 关注点 | 状态 |
|--------|------|
| `collateral * treasury * rhoBps` 乘法 | 三数相乘可能接近 `uint256` 上限（极端场景下 10^18 × 10^18 × 10^4 ≈ 10^40 < 2^256），安全 |
| `penaltyBps` 的 `block.timestamp - borrowedAt` | `borrowedAt = uint64(block.timestamp)` 写入时 `block.timestamp` 必然 ≤ 当前时间，无下溢 |
| `activeCollateral -=` | 仅在关单/清算时减去该订单的 `collateralAmount`，`activeCollateral` 总量不会为负 |

### 4.5 DoS 攻击

| 向量 | 防护 | 状态 |
|------|------|------|
| `blacklistBalance` 外部调用 revert | `try/catch` 跳过失败地址 | ✅ 已防护 |
| 金库自身被加入黑名单 | `setBlacklist` 拒绝 `address(this)` + `blacklistBalance` 跳过自身 | ✅ 已防护 |
| `borrowerOrderIds` 膨胀 | `_removeBorrowerOrder` + `_cleanupFinishedOrders` 收缩数组 | ✅ 已防护 |
| `activeOrderIds` 膨胀 | `_removeActiveOrder` swap-pop 收缩 | ✅ 已防护 |
| `blacklistAddresses` 膨胀 | ⚠️ 仅 owner 可添加，删除为 O(n)；极端长名单下治理操作 gas 升高 | **P3 — 运维面** |

### 4.6 前端/MEV 相关

| 场景 | 合约层防护 |
|------|-----------|
| 三明治攻击 borrow | `minBorrowBps` 滑点保护 ✅ |
| 三明治攻击 repay | `msg.value` 精确匹配，无滑点空间 ✅ |
| 时间边界抢跑清算 | 公共清算本身是设计意图，非攻击 ✅ |

### 4.7 权限与访问控制

| 检查项 | 状态 |
|--------|------|
| owner 无法转走 BNB | ✅ 无 withdraw/rescue/任意 call |
| owner 权限范围 | `setRhoBps`、`setBlacklist`、`setBorrowPaused`、`transferOwnership` — 均为有限操作 |
| 暂停不影响还款/清算 | ✅ `borrowPaused` 仅检查于 `borrow` |
| 两步转移 ownership | ❌ 单步转移（L433）。虽然 L434 已阻止转给 `address(0)`，但仍可转给**任意非零地址**（包括无人控制的合约地址或输错的地址）。一旦误操作，owner 权限**永久丧失**——`setRhoBps`、`setBlacklist`、`setBorrowPaused` 等治理能力全部不可用。这不影响已有订单的还款与清算，但协议**永久失去运维调整能力**（无法调 ρ、无法增删黑名单、无法暂停新借款）。建议改为 `proposeOwner` + `acceptOwnership` 两步模式 |

### 4.8 ERC20 兼容性

| 防护 | 状态 |
|------|------|
| 非标准 ERC20（无返回值） | `IERC20Minimal` 接口要求 `returns (bool)`，ABI 解码失败自动 revert ✅ |
| 扣费代币 | `_safeTransfer` / `_safeTransferFrom` 余额差校验 + `UnsupportedTokenBehavior` ✅ |
| Rebase 代币 | 余额差校验可拦截意外余额变动 ✅ |

---

## 五、优化建议

### 5.1 Gas 优化

#### O1（中）：`blacklistBalance()` 每次 borrow 都遍历全部黑名单地址

当前每次 `borrow` → `borrowDenominator()` → `blacklistBalance()` 对每个黑名单地址执行外部 `balanceOf` 调用。

```solidity
function blacklistBalance() public view returns (uint256 total) {
    for (uint256 i = 0; i < blacklistAddresses.length; i++) {
        // ... try balanceOf ...
    }
}
```

黑名单越长，`borrow` gas 越高。若黑名单达到 20+ 地址，单次 `borrow` 可能多消耗 50k+ gas。

**可选方案**：缓存 `blacklistBalance`，仅在 `setBlacklist` 时更新快照值（牺牲精度换 gas）。需权衡业务上是否接受非实时精度。

#### O2（低）：`_revertOnDuplicateOrderId` O(n²) 复杂度

```solidity
function _revertOnDuplicateOrderId(uint256[] calldata orderIds, uint256 currentIndex) internal pure {
    for (uint256 i = 0; i < currentIndex; i++) {
        if (orderIds[i] == orderIds[currentIndex]) revert DuplicateOrderId();
    }
}
```

对典型业务批量（<10 笔）无影响；若允许大批量（>50 笔），gas 增长明显。当前设计可接受。

#### O3（低）：`repay` 双循环可合并

`repay` 使用两趟循环（首趟累加 + 校验 `msg.value`，二趟执行关单）。这是为了**先验证总额再执行**的安全模式，设计合理。若追求 gas 极致优化，可考虑单循环 + 先收 BNB 再逐笔执行的模式，但会增加代码复杂度。

### 5.2 安全性加固

#### O4（高）：添加 `nonReentrant` 修饰器

虽然当前对标准 ERC20 安全，但作为纵深防御，建议为 `borrow`、`repay`、`liquidate`、`liquidateOverdue` 添加 OpenZeppelin 的 `ReentrancyGuard`。成本仅 ~2.5k gas/调用。

#### O5（高）：`transferOwnership` 改为两步转移

```solidity
function transferOwnership(address newOwner) external onlyOwner {
    if (newOwner == address(0)) revert InvalidAmount();  // L434: 仅阻止 address(0)
    emit OwnershipTransferred(owner, newOwner);
    owner = newOwner;
}
```

虽然已防止转给 `address(0)`，但仍可转给**任意非零地址**。一旦误转给无人控制的地址，后果为：

- `setRhoBps` — 无法调整可借比例 ρ
- `setBlacklist` — 无法增删黑名单地址
- `setBorrowPaused` — 无法暂停/恢复新借款
- `transferOwnership` — 无法再次转移，不可逆

**治理能力永久丧失**，且无链上恢复路径。建议改为 `proposeOwner` + `acceptOwnership` 两步模式，确保新 owner 地址确实可控。

#### O6（低）：`setBlacklist` 重复添加应 emit 或 revert

当前对已在名单中的地址重复 `setBlacklist(addr, true)` 为静默 no-op。建议 revert 或至少 emit 事件，便于链下索引追踪。

### 5.3 可维护性

#### O7（低）：`penaltyBps` 可抽象为映射表

当前硬编码 if-else 链虽然直观且 gas 低，但修改罚金档位需改代码并重新部署。如果业务上有调整罚金的诉求，可考虑链上可配置。但鉴于罚金规则是核心产品参数，**写死更安全**，建议保持现状。

#### O8（低）：事件字段丰富化

`Repaid` 事件已包含核心字段。可考虑增加 `penaltyBps` 值（当前仅有 `penaltyAmount`），便于链下分析罚金档位分布。

---

## 六、全量问题索引

| ID | 严重度 | 类型 | 简述 | 状态 |
|----|--------|------|------|------|
| R1 | **P1** | 逻辑/UX | `repay` 混合超期单时 `block.timestamp` 边界可致 revert | 风险可控 |
| R2 | **P2** | 需求 | §9 启动流程与 constructor-only 差异 | 需文档对齐 |
| R3 | **P1** | 设计约束/个人DoS | `_cleanupFinishedOrders(type(uint256).max)` 全量遍历可致高频借款人 borrow/repay 触及 gas 上限 | 需前端配合或合约改上限 |
| R4 | **P3** | 需求 | 订单列表链上无序，依赖前端排序 | 可接受 |
| R5 | **P3** | 运维 | `blacklistAddresses` 删除 O(n)，极端长名单 gas 升高 | 运维面 |
| R6 | **P3** | 集成 | `setBlacklist` 重复 add 静默无事件 | 建议改进 |

---

## 七、历史问题修复确认

对照 `docs/audit/BaburuKinko-全面审计.md` 历史审计（R1-R5轮）中发现的问题，确认当前 553 行版本的修复状态：

| 原 ID | 原严重度 | 简述 | 当前状态 |
|--------|----------|------|----------|
| A1 | P0 | `penaltyBps` 前三档与 §4 不符 | ✅ **已修复** — 6000/4000/2000 |
| L1/A3 | P0/P1 | `uint128` 截断与 `activeCollateral` 口径不一致 | ✅ **已修复** — `Order` 字段改为 `uint256` |
| A2/L2 | P1 | `repay` 重复 orderId 多付 BNB | ✅ **已修复** — `_revertOnDuplicateOrderId` |
| L4 | P2 | `liquidate` 重复 ID 行为不一致 | ✅ **已修复** — 同样加了去重检查 |
| A4 | P2 | ERC20 非标/扣费未防护 | ✅ **已修复** — 余额差校验 + `UnsupportedTokenBehavior` |
| L3 | P2 | `borrowerOrderIds` 只增不减 | ✅ **已修复** — `_removeBorrowerOrder` swap-pop |
| L6 | P1 | `blacklistBalance` 外部调用 DoS | ✅ **已修复** — `try/catch` |
| L7 | P2 | 金库自身被加入黑名单 → 分母双减 | ✅ **已修复** — 拒绝 `address(this)` + 跳过自身 |
| A5 | P2 | §9 启动与链上不一致 | ⚠️ 未改（本轮 R2） |
| A6 | P3 | 链上无序 | ⚠️ 未改（本轮 R4） |
| L5 | P3 | 黑名单重复 add 无事件 | ⚠️ 未改（本轮 R6） |

---

## 八、测试覆盖度评估

当前 `hardhat-tests/BaburuKinko.test.js` 包含 12 个测试用例：

| 测试 | 覆盖场景 |
|------|----------|
| 正常借款 + quoteBorrow | ✅ |
| 非标 ERC20（无返回值）拒绝 | ✅ |
| 扣费代币拒绝 | ✅ |
| 无罚金窗口还款 | ✅ |
| 提前还款罚金 | ✅（[2,3) 天，2000 bps） |
| 重复 orderId repay/preview | ✅ |
| 黑名单 DoS 防护 | ✅ |
| 金库自身黑名单拒绝 + 重复清算 ID | ✅ |
| 历史订单保留与清理 | ✅ |
| 公共清算（9 天后）| ✅ |
| 全局清算 liquidateOverdue | ✅ |
| repay 中超期单自动清算 | ✅ |

**建议补充的测试**：

| 缺失场景 | 优先级 |
|----------|--------|
| 全部 8 个罚金档位边界 | 高 |
| 暂停借款 → 还款/清算不受影响 | 高 |
| 非本人还款 revert | 高 |
| `borrowDenominator() == 0` 时借款 revert | 中 |
| `minBorrowBps` 边界（1 和 10000）| 中 |
| `setRhoBps` 边界（0 revert，10000 accept）| 中 |
| 多用户并发借款/还款 | 中 |
| `cleanupFinishedOrders` 分批清理 | 低 |
| `transferOwnership` + 新 owner 操作 | 低 |

---

## 九、审计结论

**当前合约（553 行）已修复全部历史 P0/P1 级安全与逻辑问题**，核心业务规则与 `税率分配.md` 高度对齐。BNB 资金安全面未发现隐藏转出路径。

**残留 P1 问题 2 个**（`repay` 时间边界 revert、`_cleanupFinishedOrders` 个人级 liveness 风险），均不涉及资金损失但需关注。**P2-P3 问题 4 个**，主要涉及文档对齐、运维边界和代码风格。

**建议下一步**：
1. 补充测试用例（尤其是 8 个罚金档位边界、暂停控制、权限负向测试）
2. 考虑添加 `ReentrancyGuard` 作为纵深防御
3. 考虑 `transferOwnership` 改为两步模式
4. 在白皮书/部署文档中与 §9 对齐
5. 上线前由专业第三方独立审计

---

*本报告随合约与需求文档变更需更新。*
