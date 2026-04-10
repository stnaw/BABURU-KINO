# BaburuKinko 合约全面审计报告

- **审计对象**：`contracts/BaburuKinko.sol`
- **规则源**：`docs/design/税率分配.md`（与 `docs/design/QA.md` 声明一致：冲突时以税则文档为准）
- **审计日期**：2026-04-10
- **复审**：2026-04-10（第 3 轮；`BaburuKinko.sol` 与上轮相比**无代码变更**）
- **说明**：静态代码与文档对照；未替代第三方专业审计。

---

## 1. 执行摘要

| 类别 | 结论 |
|------|------|
| 需求符合性 | **存在 P0 级规则偏差**（提前还款罚金档位与文档不一致）；§9 启动流程与链上实现部分不对齐。 |
| 资金安全（BNB） | **未发现**任意地址可将金库 BNB 转出的隐藏路径；BNB 仅通过 `borrow` 支付给借款人、`receive` 入账、`repay` 回流。 |
| 测试与文档 | **单元测试与 `税率分配.md` 在提前还款罚金上不一致**；当前测试与错误实现一致，无法拦截文档级错误。 |
| 建议 | 修正 `penaltyBps` 前三档；修复 `repay` 重复 `orderId` 导致多付 BNB；加固 `uint128`/ERC20 假设；更新测试用例对齐文档。 |

---

## 2. 需求追溯（对照 `税率分配.md`）

### 2.1 已对齐项

| 条款 | 文档要求 | 实现要点 |
|------|----------|----------|
| §1 总量 | 10^9 枚，18 位小数 | `INITIAL_SUPPLY = 1_000_000_000 ether` |
| §2 税金 | 税经外部进入金库 | `receive()` 被动收 BNB；swap/税逻辑不在本合约 |
| §4 时间边界 | 左闭右开区间；满 9 天不可还 | `_isLiquidatable`: `block.timestamp >= borrowedAt + LIQUIDATION_TIME`（9 天） |
| §4 销毁口径 | 向 dead 地址 transfer | `_safeTransfer(DEAD_ADDRESS, …)` |
| §5 可借公式 | 质押/分母 * (金库 BNB * rho) | `borrowedBnb = collateral * treasury * rhoBps / denominator / BPS_DENOMINATOR` |
| §5 金库规模 | 本笔执行前 `address(this).balance` | `treasuryBefore` 在 `transferFrom` 抵押之前读取 |
| §5 分母 | 初始总量 - 黑名单持仓 - 活跃质押 | `borrowDenominator()`；分母为 0 则 `InvalidDenominator` |
| §5 滑点 | currBorrow*10000 >= refBorrow*minBorrowBps | 不满足则 `SlippageExceeded` |
| §5 minBorrowBps | 1～10000 | 为 0 或大于 10000 则 revert |
| §6 批量还款 | 超期不计应还、可清算；msg.value 须等于应还合计 | 双循环 + `InvalidMsgValue` |
| §6 未超期归属 | 仅订单借款人可还 | `NotOrderBorrower` |
| §7.2 | 公共清算、整理金库、只读汇总 | `liquidate`、`liquidateOverdue`、`liquidatableSummary` |
| §7.3 | rho、黑名单、暂停新借 | `setRhoBps`、`setBlacklist`、`setBorrowPaused`；还款与清算不受暂停影响 |

### 2.2 偏差与缺口

#### P0：提前还款罚金档位错误（§4）

文档规定（自 T0）：

| 区间 | 罚金（占质押） |
|------|----------------|
| [0, 1) 天 | **60%** |
| [1, 2) 天 | **40%** |
| [2, 3) 天 | **20%** |

当前 `penaltyBps` 前三档为 **9000 / 6000 / 3000**（即 90% / 60% / 30%），与文档**完全不符**。  
自 `[3,6)` 起与宽限期、超期档位与文档一致。

**影响**：提前还款用户被多扣质押；与产品规则及对外披露冲突。

#### P1：§9 启动流程与合约能力

文档 §9 要求：配置本币、税流入地址、销毁地址、黑名单、`启动接口` 等。  
实现仅有 `constructor(baburuToken)` 绑定代币并设 `owner`，**无**独立「启动」状态机、**无**治理可配销毁地址（写死 `DEAD_ADDRESS`）。  
若业务要求与 §9 逐条上链一致，需补实现或在白皮书中明确「税路由/启动在链外，金库仅接收 BNB」。

#### P2：§6 订单列表「时间倒序」

文档要求前端以时间倒序展示；`getBorrowerOrders` 按**创建顺序**（数组追加顺序）返回，**未**链上排序。  
可由前端排序满足；需在集成层约定，避免误以为链上已排序。

---

## 3. 安全性审计

### 3.1 BNB 流出面

- **无** `withdraw` / `rescue` / 任意 `call` 转走 BNB 给 owner 的路径。
- BNB 流出仅：`borrow` 中 `payable(msg.sender).call{value: borrowedBnb}`，且 `borrowedBnb <= treasuryBefore` 校验在前。
- 与 §7.1「BNB 不可随意转出」一致。

### 3.2 质押代币（BABURU）

- 使用最小 `IERC20Minimal` + 手工 `transfer`/`transferFrom` 判返回值。
- **风险**：非标准 ERC20（无返回值、假 `true`、转账税导致到账小于声明值）可能使会计与假设不符；建议部署前锁定代币标准，或引入 `SafeERC20` 与余额差校验（若允许改代码）。

### 3.3 整数与存储

- `Order` 使用 `uint128` / `uint64` 存抵押、借出额与时间。`collateralAmount`、`borrowedBnb` 超过 `2^128-1` 时**静默截断**，可导致订单字段错误。**建议**：显式上限检查，或改用 `uint256` 存订单。

### 3.4 重入与 CEI

- `borrow`：`transferFrom` 后写状态再转 BNB。末尾外部调用理论上可重入 `borrow`；第二次调用面临更低余额与更高 `activeCollateral`，难以构成经典盗取，但行为更复杂。若质押币带回调，可考虑 `nonReentrant`。
- `repay`：先校 `msg.value` 再 `_closeOrder` 内 `transfer`。对标准 ERC20 通常可接受。

### 3.5 `repay` 重复 `orderId`（逻辑缺陷）

若 `orderIds` 中**同一订单 ID 出现多次**：

- 第一遍循环会对 `borrowedBnb` **累加多次**，要求 `msg.value` 等于加倍后的总额。
- 第二遍第一次迭代关闭订单并 `delete`；后续同名 ID 读到空订单，`borrower != msg.sender` 被 `continue`，**不会再次关闭**。

结果：用户多付 BNB，多余部分留在金库合约余额中（**无对应订单负债**），造成资金沉淀或用户损失。  
**建议**：对 `orderIds` 去重，或链上校验禁止重复并 `revert`。

### 3.6 `repay` / `previewRepay` 夹带他单超期 ID

- 第一遍对超期订单直接 `_liquidate`，**不校验**调用者是否为借款人；与公开 `liquidate` 能力等价，不直接盗取 BNB，但需在 UX/文档中说明（任何人可在批量还款交易中附带清算他人超期单）。

### 3.7 `liquidateOverdue`

- 自 `activeOrderIds` 尾部向前遍历，删除订单时用 swap-pop；与反向索引配合，为常见安全写法。
- `maxCount` 限制单次处理量，利于 gas 可控。

### 3.8 治理与运维

- 单地址 `owner`，可改 rho、黑名单、暂停；无链上 Timelock/多签强制。符合 §7「以实际实现披露」——需在对外材料中说明。
- `setBlacklist` 删除为 O(n)；黑名单过长时治理操作 gas 升高（运维面）。

### 3.9 其他

- `transferOwnership` 先 `emit` 再赋值；无两步移交，新 owner 误配置风险由运维控制。
- `previewBorrow` / `quoteBorrow` 为 view，不防 MEV；与文档「执行时以链上为准」一致。

---

## 4. 测试与文档一致性

- `hardhat-tests/BaburuKinko.test.js` 中 **「early repayment」** 用例在 **2 天 + 60 秒** 时期望 `penaltyBpsValue === 3000`（30%）。
- 按 `税率分配.md`，该时刻落在 **[2,3) 天**，应为 **20%（2000 bps）**。
- 结论：**测试与合约一致、与需求文档不一致**；修正合约后必须同步改测试与前端展示逻辑（若有硬编码预期）。

---

## 5. 问题汇总表

| ID | 严重度 | 类型 | 简述 |
|----|--------|------|------|
| A1 | **P0** | 需求 | 提前还款三档罚金与 §4 不符（90/60/30% vs 60/40/20%）。 |
| A2 | **P1** | 逻辑 | `repay` 允许重复 `orderId` 导致多付 BNB、订单只关一次。 |
| A3 | **P1** | 安全/健壮 | `uint128` 截断风险。 |
| A4 | **P2** | 集成 | ERC20 非标准/扣费币未防护。 |
| A5 | **P2** | 文档/产品 | §9 启动与链上配置范围不一致；销毁地址不可治理配置。 |
| A6 | **P3** | 产品 | 订单列表链上无序，依赖前端倒序。 |

---

## 6. 修复建议优先级

1. **立即**：修正 `penaltyBps` 前三个返回值分别为 **6000、4000、2000**（bps），并更新 `BaburuKinko.test.js` 及依赖罚金的脚本/前端。
2. **高**：`repay`（及可选 `previewRepay`）对 `orderIds` 做重复检测或文档化禁止重复并链上 `revert`。
3. **高**：对写入 `Order` 的数额做 `uint128` 上限检查。
4. **中**：评估 `SafeERC20` 或余额差校验；部署代币白名单。
5. **低**：披露 owner 模型；如需对齐 §9，补启动/可配置销毁地址或更新白皮书。

---

## 7. 审计范围外说明

- 未审计未入库的 BABURU 主合约、交易税/Router、LP 行为。
- 未做形式化验证与链上 fork 资金压力测试。
- 最终上线前建议由专业团队做独立审计与测试网演练。

---

## 8. 纯逻辑漏洞专项（不依赖需求文档是否写对）

以下仅看「状态机与会计是否自洽」，与 `税率分配.md` 罚金数值是否正确无关。

### 8.1 P0：`uint128` 截断与 `activeCollateral` 全程使用 `uint256` 不一致

`borrow` 中：

- `transferFrom` 与 `activeCollateral +=` 使用完整 `collateralAmount`（`uint256`）。
- 写入 `Order.collateralAmount` 使用 `uint128(collateralAmount)`，超大值会**静默截断**。

关单与清算时：

- `activeCollateral -= order.collateralAmount` 用的是**存储里已截断**的数额。

因此若 `collateralAmount > type(uint128).max`（现实中极端，但链上允许）：

1. 金库实际收到的 BABURU 与订单记账不符，还款/清算按**错误（更小）**质押处理，用户侧资金与罚金会计错误。
2. `activeCollateral` 在借款时加了「完整值」，还款/清算只减「截断值」，**差额永远留在 `activeCollateral` 中**，`borrowDenominator()` 被**持久压低**，可借额度与协议模型长期失真；多余代币可能锁在金库。

`borrowedBnb` 同理以 `uint128` 写入；若理论上超出 `uint128`（极难，受金库 BNB 量级限制），也会出现借出记账与事件、校验不一致。

**结论**：属于**纯会计逻辑缺陷**；修复应对抵押与借出额统一口径（上限检查或改用 `uint256` 存订单），且 `activeCollateral` 增减必须与订单字段一致。

### 8.2 P1：`repay` 中重复 `orderId`（见 A2）

第一遍累加 `borrowedBnb`，第二遍只对仍存在的订单关单一次；多付的 `msg.value` 留在金库且无对应负债。**纯逻辑/用户资金损失面**。

### 8.3 P2：`borrowerOrderIds` 只追加不压缩

订单删除后，`borrowerOrderIds[borrower]` 仍保留历史 `orderId`；`getBorrowerOrders` / `getBorrowerOrderViews` 需扫描全历史。借款人交易次数极大时，**只读与 gas 线性变差**（对自身查询的 DoS 风险，非盗币）。

### 8.4 P2：`liquidate` 重复同一 `orderId`

第二次 `_liquidate` 对已删订单会 `OrderMissing`，**整笔回滚**。与 `repay` 对重复 ID 的「静默多付」行为不一致；属 UX/可组合性差异，非盗币。

### 8.5 P3：`setBlacklist(addr, true)` 对已黑名单地址为 no-op

重复添加不 revert、不 emit，链下索引若依赖事件可能**漏记**；属运维/集成面。

### 8.6 已排除或风险较低项（记录备查）

- **同一笔 `repay` 内两趟循环**：`block.timestamp` 不变，罚金两次计算一致。
- **超期单在第一趟已清算**：第二趟读到空订单走 `continue`，不会双花抵押。
- **`liquidateOverdue` 反向遍历 + swap-pop**：与删元素语义一致，未见越界或漏清算的逻辑错误（仅 gas 与 `maxCount` 截断策略问题）。

---

## 9. 问题汇总表（增补逻辑专项 ID）

| ID | 严重度 | 类型 | 简述 |
|----|--------|------|------|
| L1 | **P0** | 纯逻辑 | `uint128` 订单字段与 `activeCollateral` uint256 不同口径，可致永久分母漂移与用户/协议会计错误。 |
| L2 | **P1** | 纯逻辑 | `repay` 重复 `orderId` 多付 BNB（同 A2）。 |
| L3 | **P2** | DoS/运维 | `borrowerOrderIds` 只增不减，视图函数随历史膨胀。 |
| L4 | **P2** | 一致性 | `liquidate` 重复 ID 全单 revert，与 `repay` 重复 ID 行为不同。 |
| L5 | **P3** | 集成 | 黑名单重复添加无事件。 |

---

## 10. 复审摘要（第 3 轮）

**结论**：本轮再次通读 `contracts/BaburuKinko.sol`（461 行），**未新增**独立于既有条目的盗币路径或状态机矛盾；**§2–§9所列问题仍全部成立**，合约尚未体现修复（`penaltyBps` 前三档仍为 9000/6000/3000；`uint128`/`activeCollateral` 口径未统一；`repay` 仍允许重复 `orderId`）。

**本轮额外核对（加深验证）**：

| 项 | 结论 |
|----|------|
| `orderView.liquidatable`（`penaltyBps == 10000`）与 `_isLiquidatable`（`now >= borrowedAt + 9 days`） | **等价**：未满 9 天 `penaltyBps` 最大为 9000；满 9 天走末支返回 `BPS_DENOMINATOR`。 |
| `borrow` 中 `collateral * treasury * rho` 等乘法 | Solidity 0.8 **溢出自动 revert**，不会静默绕过硬约束。 |
| `activeOrderCount` 与 `activeOrderIds.length` | 借款 +1，`_closeOrder`/`_liquidate` 各 -1，**应始终保持一致**（未发现第三路径改其一不改其二）。 |
| `repay` 首循环 `totalBnbDue` | `borrowedBnb` 自 `uint128` 扩为 `uint256` 累加，**无**本轮可构造的 `uint256` 溢出场景（业务上订单数量与单额受限）。 |

**仍建议**：优先落地 §6 与 §8.1–8.2 的修复；修复后应重跑 `hardhat-tests/BaburuKinko.test.js` 并同步前端试算。

---

## 11. 复审摘要（第 4 轮 — 深度逻辑与攻击面）

本轮**逐行、逐函数**排查攻击路径与状态一致性，合约代码仍无变更。**已有问题全部仍然成立**。以下为**本轮新增发现**（前三轮未覆盖）：

### 11.1 P1-new：`blacklistBalance()` 外部调用 DoS 风险

`borrowDenominator()` → `blacklistBalance()` 对每个黑名单地址调用 `baburuToken.balanceOf()`。  
若 owner 将一个**合约地址**加入黑名单且该合约的 `balanceOf` **revert 或消耗异常 gas**，则：

- `borrow()` 被 **永久阻塞**（`borrowDenominator` revert）。
- `quoteBorrow()`、`previewBorrow()` 等只读函数同样不可用。
- `repay()` 和 `liquidate()` **不受影响**（不调 `borrowDenominator`）。

**影响**：owner 误操作可导致借款入口 DoS；恶意 owner 可以此「软暂停」借款。  
**建议**：`blacklistBalance` 内对 `balanceOf` 做 `try/catch`，失败时跳过该地址或回退为 0。

### 11.2 P2-new：金库自身被加入黑名单 → 分母双减

`borrowDenominator = INITIAL_SUPPLY - blacklistBalance() - activeCollateral`

金库合约持有的 BABURU **恰好就是** `activeCollateral`（用户质押进来的代币）。  
若 owner 将金库地址加入黑名单：

- `blacklistBalance` 包含金库持仓（≈ `activeCollateral`）
- `activeCollateral` 再被减一次
- **分母被多减一次 `activeCollateral`**，变得更小
- 用户可借额度**被异常放大**

这与 `税率分配.md` §5 的口径约束「非活跃本币量统计时不包含金库内活跃质押部分，避免重复扣减」**直接矛盾**。  
**建议**：`setBlacklist` 中禁止 `account == address(this)`，或在 `blacklistBalance` 中跳过自身。

### 11.3 信息级：可借公式两步除法精度

```
borrowedBnb = (collateral * treasury * rhoBps) / denominator / BPS_DENOMINATOR
```

两步 `floor` 除法（先除 denominator 再除 10000）比数学意义上的一步除法（除 denominator×10000）**多截断至多 1 wei**，始终**偏向协议**（用户到手更少）。对正常业务量级可忽略，但与 `quoteBorrow`/`previewBorrow` 使用相同分步法，链上一致。

### 11.4 信息级：`repay([])` + `msg.value=0` 为无害 no-op

空数组调用不 revert、不改状态，仅消耗少量 gas。非安全问题。

### 11.5 信息级：闪电贷攻击面评估

- **闪贷 BABURU → borrow → repay**：单笔交易内可完成，但提前还款会被扣 60%～90% 罚金，攻击者净亏，**不可盈利**。
- **闪贷 BABURU → 转入 DEAD → borrow**：通过拉高 `blacklistBalance` 压缩分母，放大可借额度。但转入 DEAD 的代币不可回收，经济上等于烧币换杠杆——除非代币价格极端偏离 BNB、且攻击者打算不还款，否则仍为**亏损操作**。属协议经济模型层面风险，非代码逻辑漏洞。

### 11.6 本轮逐函数核查清单

| 函数 | 已核查项 | 结论 |
|------|----------|------|
| `borrow` | CEI 顺序、BNB 转出后重入（state 已更新）、slippage 乘法溢出（refBorrow 极大时 0.8 revert 安全失败） | 无新盗币路径 |
| `repay` 第一循环 | 超期单 `_liquidate` 后 `delete` → 第二循环读到 zero borrower → `continue` | 不会双关或双花 |
| `repay` 第二循环 | `_closeOrder` 内 `delete orders` 在 token transfer 之前 → 重入读零 | 不会双关 |
| `liquidateOverdue` | 反向遍历 + swap-pop：被处理元素总是最后一个或被替换为已检查过的更高索引元素 → 不遗漏、不越界 | 正确 |
| `_removeActiveOrder` | `activeOrderIndex[orderId]` 默认 0；但仅从 `_closeOrder`/`_liquidate` 调用，二者均先验证订单存在 → 不会误删 index 0 | 安全（依赖调用上下文） |
| `penaltyBps` | `block.timestamp >= borrowedAt` 恒成立（`borrowedAt = block.timestamp` 写入时） → 无下溢 | 正确 |
| `_isLiquidatable` | `borrowedAt + LIQUIDATION_TIME`：uint64 + uint256 → uint256，无溢出 | 正确 |
| `setBlacklist` 删除 | swap-pop O(n)；重复 add 为 no-op 不 revert | 无状态损坏（已知 L5） |
| `transferOwnership` | 先 emit 再赋值，单步移交 | 无异常（已知运维风险） |

---

## 12. 全量问题索引（截至第 4 轮）

| ID | 严重度 | 轮次 | 简述 |
|----|--------|------|------|
| A1 | **P0** | R1 | `penaltyBps` 前三档与 §4 不符（90/60/30% vs 60/40/20%） |
| L1 | **P0** | R2 | `uint128` 截断与 `activeCollateral` uint256 口径不一致 → 分母永久漂移 |
| A2/L2 | **P1** | R1 | `repay` 重复 `orderId` 多付 BNB |
| **L6** | **P1** | **R4** | `blacklistBalance` 外部调用 revert → `borrow` DoS |
| A3 | **P1** | R1 | `uint128` 截断（含 `borrowedBnb`）|
| **L7** | **P2** | **R4** | 金库自身被加入黑名单 → 分母双减、可借额异常放大 |
| A4 | **P2** | R1 | ERC20 非标准/扣费币未防护 |
| A5 | **P2** | R1 | §9 启动与链上配置不一致 |
| L3 | **P2** | R2 | `borrowerOrderIds` 只增不减 |
| L4 | **P2** | R2 | `liquidate` 重复 ID 全单 revert（与 `repay` 行为不一致） |
| A6 | **P3** | R1 | 订单列表链上无序 |
| L5 | **P3** | R2 | 黑名单重复 add 无事件 |

---

*本报告随合约与 `税率分配.md` 变更需更新。*
