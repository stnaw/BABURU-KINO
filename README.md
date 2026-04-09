# BABURU KINKO

`BABURU KINKO` 是一个面向 `BABURU` 持有者的链上金库原型仓库，当前包含前端界面、合约草案、设计文档和规则分析脚本。

## 目录结构

- `frontend/`
  静态前端页面，包含中英切换、钱包连接、借款试算、借款列表和金库手册。
- `contracts/`
  Solidity 合约草案。
- `docs/design/`
  产品与规则需求文档。
- `docs/notes/`
  设计与规则补充思考。
- `scripts/analysis/`
  金库参数和借款规则的本地分析脚本。
- `tests/`
  Playwright 测试目录。

## 本地查看前端

这是一个无需打包的静态页面：

1. 打开 [frontend/index.html](/Users/stnaw/Projects/tax/frontend/index.html)
2. 或使用任意静态文件服务在仓库根目录启动预览

前端主文件：

- [frontend/index.html](/Users/stnaw/Projects/tax/frontend/index.html)
- [frontend/styles.css](/Users/stnaw/Projects/tax/frontend/styles.css)
- [frontend/app.js](/Users/stnaw/Projects/tax/frontend/app.js)

页面当前支持：

- 中英切换与语言状态记忆
- 浏览器钱包连接
- 借款试算与最小借出保护
- 借款筛选、全选和批量还款汇总
- 基于时间窗口的手续费展示
- 本地 Hardhat 合约部署后的真实授权、借款、还款联调

## 本地合约联调

当前仓库已经接好一套本地联调流程：

1. 启动本地链
```bash
npm run node
```

2. 另开一个终端部署本地合约并写入前端配置
```bash
npm run deploy:local
```

3. 编译与测试
```bash
npm run compile
npm run test:contracts
```

4. 打开前端页面
直接访问 [frontend/index.html](/Users/stnaw/Projects/tax/frontend/index.html) 即可。

部署脚本会自动更新：

- [frontend/config.js](/Users/stnaw/Projects/tax/frontend/config.js)

当前前端会读取：

- `baburuTokenAddress`
- `kinkoAddress`
- `rpcUrl`
- `chainId`

如果你要在 MetaMask 里联调，需要把网络切到本地链 `31337`，并导入 Hardhat 测试账户。

## 文档

需求与规则文档位于：

- [docs/design/前端展示.md](/Users/stnaw/Projects/tax/docs/design/前端展示.md)
- [docs/design/税率分配.md](/Users/stnaw/Projects/tax/docs/design/税率分配.md)
- [docs/notes/税率分配思考.md](/Users/stnaw/Projects/tax/docs/notes/税率分配思考.md)

## 分析脚本

分析脚本位于：

- [scripts/analysis/simulate_lend_ratio.py](/Users/stnaw/Projects/tax/scripts/analysis/simulate_lend_ratio.py)
- [scripts/analysis/simulate_treasury.py](/Users/stnaw/Projects/tax/scripts/analysis/simulate_treasury.py)

## 测试

仓库已包含 Playwright 依赖与配置：

- [playwright.config.ts](/Users/stnaw/Projects/tax/playwright.config.ts)
- [tests/example.spec.ts](/Users/stnaw/Projects/tax/tests/example.spec.ts)

如果要继续完善，下一步更适合补一组针对 `frontend/index.html` 的真实页面 smoke tests，而不是保留默认示例测试。
