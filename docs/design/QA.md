测试流程（对齐 `docs/design/税率分配.md`）
目标：模拟真实多人交易环境，验证税金入库、借款/还款/超期清算与前端交互全链路正确。
口径优先级：若与其他文档存在冲突，以 `docs/design/税率分配.md` 为唯一规则源；罚金统一按 `罚金 = 该订单质押本币数量 × 档位比例`，并从该订单已质押 BABURU 中扣除。

## 0. 执行入口
1. 合约回归：`npm run qa:contracts`
2. 税模拟窗口：`npm run qa:tax`
3. 前端 smoke：`npm run qa:ui`
4. 一键 QA 流程：`npm run qa:run`
4. 产物落盘：
 - 关键日志与汇总输出到 `artifacts/qa-logs/<runId>/`
 - 每轮至少产出 `summary.json`
5. 当前自动化覆盖范围：
 - 本地服务拉起与关闭
 - 本地固定价格税模拟与入库窗口日志
 - 合约编译与合约测试
 - 前端桌面与移动端基础 smoke
6. 当前保留为人工/后续补充：
 - 真实交易对/路由路径税模拟
 - 真实钱包授权/借款/还款联调
 - 长时段税金窗口与 testnet 等待窗口验证
7. 本地税模拟说明：
 - 当前仓库没有真实交易对、路由与 swap 路径，因此自动化使用固定 BABURU/BNB 价格的 deterministic harness。
 - 脚本会按固定随机种子生成多轮买卖交易量，计算 2%/4% 税额，并将等值 BNB 直接注入金库，验证日志、入库方向、一致性与单调性。
 - 真实 pair、滑点、路径损耗与 router 行为仍保留为 testnet/fork 或人工验证项。

## 1. 测试环境与数据准备
1. 网络：BSC 测试环境（本地 fork 或 testnet，二选一并固定）。
2. 角色：至少准备 8 个地址。
 - 5 个普通用户（借款/还款）
 - 1 个黑名单地址（用于分母波动）
 - 1 个公共清算地址
 - 1 个治理地址（配置 ρ、黑名单、暂停开关）
3. 初始资金：
 - 每个用户分配 BNB（含 gas）与 BABURU（用于质押与交易）
 - 金库初始 BNB 为 0（通过交易税自然入库）
4. 固定测试参数：
 - 默认 `rho = 0.7`
 - 默认 `minBorrowBps = 9500`
 - 时间边界按链上时间：`[0,1) [1,2) [2,3) [3,6) [6,7) [7,8) [8,9) >=9` 天
5. 金额精度与舍入口径（统一）：
 - BNB、BABURU 计算与断言均以最小单位（wei）进行，不用浮点比较。
 - 批量还款“应还 BNB 总额一致”按 wei 级严格相等。
 - 若业务展示需小数格式，仅用于 UI 显示，不参与链上断言。

## 2. 合约部署与初始化
1. 部署金库合约。
2. 部署带交易税 Mock 代币并创建 BABURU/BNB 交易对。
 - 买入税 2%，卖出税 4%
 - 税先收本币后换 BNB，并 100% 转入金库
3. 配置金库：
 - 销毁地址：`0x...dead`
 - 税币相关合约地址
 - BABURU 合约地址与初始总量常量
 - 黑名单地址列表（至少含 `0x...dead`、LP/托管地址样本）
4. 调用启动接口。
5. 初始化验收：
 - 配置读取值与预期一致
 - 未启动前限制生效、启动后借款路径开启

## 3. 多人交易税模拟（脚本）
1. 对交易对运行多人随机买卖脚本（固定随机种子，确保可复现）。
2. 建议每轮 >= 200 笔交易，至少 3 轮，覆盖买卖混合、不同金额档位。
3. 每轮记录：
 - 累计买入/卖出量
 - 预期税额（按 2%/4% 估算）
 - 实际入库 BNB 增量
4. 验收：
 - 金库 BNB 单调不减（未发生借款前）
 - 实际入库与预期税额方向一致，偏差在可接受范围（滑点/路径损耗需记录）

## 4. 借款主流程测试
1. 正常借款：输入质押量，获取 `refBorrow`，提交借款成功。
2. `allowance` 不足：先失败提示，再授权后成功。
3. `minBorrowBps` 保护：
 - 构造波动使 `currBorrow * 10000 < refBorrow * minBorrowBps`，应整笔回滚。
4. 分母边界：
 - 构造 `可借份额分母 <= 0`，借款必须回滚。
5. 暂停开关：
 - 暂停新借款后，借款失败；恢复后可成功。
6. 验收：
 - 成功借款后订单创建、T0 正确、金库 BNB 按借出额减少。
7. 权限负向：
 - 非治理地址尝试修改 `rho`、黑名单、启动/暂停状态，必须失败。
 - 任意地址不得通过非白名单路径转走金库 BNB。

## 5. 还款与批量处理测试
1. 单笔还款：覆盖 8 个时间档位，验证罚金比例与规则一致。
2. 批量还款：
 - 选择多笔未超期订单，校验应还 BNB 总额精确一致才可成功。
 - 故意传错 BNB 总额，必须回滚。
3. 订单归属校验：
 - 非本人订单（未超期）不可由他人还款。
4. 验收：
 - 罚金从订单质押 BABURU 中扣除并转 `0x...dead`
 - 剩余质押正确返还
 - 已完成订单不再保留
5. 时间推进与边界复现：
 - 本地/fork 环境统一使用 `evm_increaseTime` + `evm_mine` 推进时间。
 - testnet 环境记录真实等待窗口与区块时间，判定以链上 `block.timestamp` 为准。
 - 每个边界点（`1/2/3/6/7/8/9` 天）至少验证“边界前一笔、边界后一笔”各 1 次。

## 6. 超期与公共清算测试
1. 将订单推进到 `>= 9` 天：
 - 普通还款路径不可用
 - 订单走 100% 质押销毁路径
2. 公共清算：
 - 任意地址可对超期订单发起清算
 - 公共清算仅触发销毁，不立即删除该条逾期订单记录
 - 超期订单不应阻塞同批次其他未超期订单处理
3. 验收：
 - 超期订单不计入应还 BNB
 - 销毁口径为 `transfer(0x...dead)`，不依赖 `burn()`
 - 仅借款人本人可清理自己的已完成订单记录；他人不可清理
 - 借款人下一次业务动作会触发其自身已完成订单记录清理

## 7. 前端回归测试（按 `Design/前端展示.md`）
1. 概览区：
 - 金库 BNB、活动敞口、试算锚点展示正确
 - 暂停新借款横幅文案正确（还款/清算不受影响）
2. 借款页：
 - 输入校验、MAX、滑杆 `0.01%~100%`、授权->借款状态机正确
3. 我的借款：
 - 默认时间倒序、阶段标签正确
 - `>= 9` 天订单不可勾选
 - 底部汇总条与确认弹窗合计准确
4. 错误映射：
 - revert 原因可读化（可借不足/分母无效/BNB 总额不符/非本人订单/暂停借款）
5. 移动端最小回归（必测）：
 - 断点：`375x812`、`390x844`、`768x1024`。
 - 核心路径：连接钱包 -> 授权 -> 借款 -> 多选还款 -> 清算入口可达。
 - 可用性：主 CTA 可点击、底部汇总条不遮挡关键信息、`>=9` 天不可勾选规则保持一致。

## 8. 通过标准（上线前）
1. P0 用例全部通过：借款、还款、超期清算、BNB 总额一致性、分母边界。
2. P1 用例通过率 >= 95%：多人税模拟、前端状态机、错误映射。
3. 无资金安全类异常：金库 BNB 不存在任意转出路径。
4. 全部关键步骤可复现：脚本参数、随机种子、交易哈希、区块号均有记录。

## 9. 定时关键日志输出规范
1. 输出频率：每 10~15 分钟或每累计 100 笔交易输出一次（先到先触发）。
2. 输出格式：统一 JSON 行日志（便于机器聚合与回放），每条带唯一 `runId`。
3. 必含字段：
 - 基础上下文：`timestamp`、`chainId`、`blockNumber`、`runId`、`seed`
 - 税模拟窗口：`buyCount`、`sellCount`、`buyVol`、`sellVol`、`expectedTaxBnb`、`actualVaultBnbDelta`、`deltaPct`
 - 金库状态：`vaultBnb`、`activeOrderCount`、`activePledgeBaburu`、`rho`、`pausedNewBorrow`
 - 借款结果：`borrowSuccess`、`borrowFail`、`failReasons`（如 `minBorrowBps`、`denominator<=0`、`allowance`）
 - 还款与清算：`repaySuccess`、`repayFail`、`earlyRepaySuccess`、`normalRepaySuccess`、`lateRepaySuccess`、`liquidationCount`、`overdueCount`
 - 一致性断言：`bnbTotalMatchPassRate`、`anomalies`（异常订单 ID 列表）
4. 输出示例：
```json
{
  "timestamp": "2026-04-09T12:30:00Z",
  "runId": "qa-run-001",
  "seed": 20260409,
  "chainId": 56,
  "blockNumber": 45678901,
  "window": {
    "minutes": 15,
    "txCount": 124
  },
  "tax": {
    "buyCount": 70,
    "sellCount": 54,
    "buyVol": "1234567.89",
    "sellVol": "998877.66",
    "expectedTaxBnb": "1.2384",
    "actualVaultBnbDelta": "1.2211",
    "deltaPct": "-1.40%"
  },
  "vault": {
    "vaultBnb": "128.4421",
    "activeOrderCount": 37,
    "activePledgeBaburu": "18200000",
    "rho": "0.7",
    "pausedNewBorrow": false
  },
  "borrow": {
    "borrowSuccess": 18,
    "borrowFail": 3,
    "failReasons": {
      "minBorrowBps": 1,
      "denominator<=0": 2
    }
  },
  "repay": {
    "repaySuccess": 9,
    "repayFail": 1,
    "earlyRepaySuccess": 2,
    "normalRepaySuccess": 5,
    "lateRepaySuccess": 2
  },
  "liquidation": {
    "liquidationCount": 4,
    "overdueCount": 11
  },
  "assertions": {
    "bnbTotalMatchPassRate": "100%",
    "anomalies": []
  }
}
```
5. 告警建议：
 - 当 `deltaPct` 超阈值（如绝对值 > 5%）时立即输出 WARN。
 - 当出现 `bnbTotalMatchPassRate < 100%` 或 `anomalies` 非空时立即输出 ERROR 并中止本轮。
6. 落盘与保留规范：
 - 日志目录：`artifacts/qa-logs/<runId>/`。
 - 文件命名：`qa-key-log-YYYYMMDD-HHMM.jsonl`（追加写入）。
 - 每轮结束产出 `summary.json`（通过率、失败用例、关键交易哈希）。
 - 保留策略：原始日志至少保留 30 天，`summary.json` 与失败轮日志长期保留。
