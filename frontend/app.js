import Onboard from "@web3-onboard/core";
import injectedModule from "@web3-onboard/injected-wallets";
import { ethers } from "ethers";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const APP_CONFIG = {
  chainId: window.BABURU_CONFIG?.chainId || 31337,
  baburuTokenAddress: window.BABURU_CONFIG?.baburuTokenAddress || "",
  kinkoAddress: window.BABURU_CONFIG?.kinkoAddress || "",
  rpcUrl: window.BABURU_CONFIG?.rpcUrl || "https://bsc-dataseed.binance.org/",
  buyUrl: window.BABURU_CONFIG?.buyUrl || "#",
  nowTs: window.BABURU_CONFIG?.nowTs || "2026-04-08T12:00:00+08:00",
};
const LAST_WALLET_LABEL_KEY = "baburu-last-wallet-label";
const LAST_RATIO_BPS_KEY = "baburu-last-ratio-bps";
const BANNER_DISMISSED_KEY = "baburu-banner-dismissed";
const LOCAL_BORROWER_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const VAULT_REFRESH_INTERVAL_MS = 10000;

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
];

const KINKO_ABI = [
  "function borrowPaused() view returns (bool)",
  "function rhoBps() view returns (uint256)",
  "function activeOrderCount() view returns (uint256)",
  "function activeCollateral() view returns (uint256)",
  "function liquidatableSummary() view returns (uint256 count,uint256 collateral)",
  "function quoteBorrow(uint256 collateralAmount) view returns (uint256)",
  "function previewRepay(address borrower,uint256[] orderIds) view returns (uint256 totalBnbDue,uint256 totalPenalty,uint256 repayableCount,uint256 liquidatableCount)",
  "function getBorrowerOrderViews(address borrower) view returns ((uint256 orderId,address borrower,uint256 collateralAmount,uint256 borrowedBnb,uint256 borrowedAt,uint256 penaltyBpsValue,uint256 penaltyAmount,bool repayable,bool liquidatable)[])",
  "function borrow(uint256 collateralAmount,uint256 refBorrow,uint256 minBorrowBps) returns (uint256 orderId,uint256 borrowedBnb)",
  "function repay(uint256[] orderIds) payable returns (uint256 totalPenalty)",
  "function liquidate(uint256[] orderIds)",
  "function liquidateOverdue(uint256 maxCount) returns (uint256 processedCount,uint256 burnedCollateral)",
];

const translations = {
  zh: {
    pageTitle: "BABURU KINKO",
    pageDescription: "BABURU KINKO 前端界面，面向 BABURUSU 的链上借款、还款与借款管理。",
    navOverview: "概览",
    navBorrow: "免息借款",
    navLoans: "我的借款",
    navHelp: "金库手册",
    connectWallet: "连接钱包",
    walletUnavailable: "未检测到钱包",
    heroBadge: "BABURU KINKO",
    heroTitle: "专属于 BABURUSU 的链上金库",
    heroDescription: "带上你的$BABURU，从 BABURU KINKO 获取专属于你的免息BNB。",
    startEstimate: "免息借出 BNB",
    viewLoans: "查看我的借款",
    loanOpen: "BABURU 金库开启",
    bannerPrefix: "获取",
    bannerLinkText: "$BABURU",
    bannerSuffix: "开启专属于你的金库大门。",
    pausedBanner: "BABURU 金库维护中",
    overviewTitle: "金库状态",
    metricToyReserve: "BNB 库存",
    metricActiveCollateral: "BABURU 已质押",
    metricPendingLiquidation: "BABURU 待清算",
    metricExposureNote: "活跃借款数",
    metricMarketNote: "BABURU",
    metricSlippageNote: "单笔可借比例",
    publicLiquidation: "整理金库",
    borrowTitle: "免息借出 BNB",
    tabEstimate: "免息借出 BNB",
    tabApprove: "钱包确认",
    tabConfirmLoan: "借款完成",
    stakeInputTitle: "带上你的 $BABURU",
    stakeAmount: "投入 $BABURU",
    walletAvailable: "钱包可用: 3,640,000",
    minBorrowRatio: "最小借出比例",
    ratioNote: "低于这个比例，本次借款不会成交",
    estimatedBorrow: "预计可借出的 BNB",
    refBorrowLabel: "预计借款",
    protectedFloor: "最小借款下限",
    borrowWindow: "借款时间窗口",
    windowBody: "3-6 天还款无需手续费",
    approveAndBorrow: "授权并借款",
    approveBaburu: "授权 BABURU",
    confirmBorrow: "确认借款",
    timelineTitle: "借款窗口",
    timelineSubtitle: "做出你认为正确的选择",
    timelineDayEarly: "1-3 天",
    timelineDayNormal: "3-6 天",
    timelineDayGrace: "6-9 天",
    timelineDayOverdue: "≥ 9 天",
    timelineEarly6030: "提前还款违约金",
    timelineEarlySteps: "90% → 60% → 30%",
    timelineNormal: "0% 手续费窗口",
    timelineNormalNote: "最佳还款时间",
    timelineGrace: "延后还款滞纳金",
    timelineGraceSteps: "30% → 60% → 90%",
    timelineOverdue: "借款已超期",
    timelineOverdueNote: "不可还款，金库自动清算。",
    loansTitle: "我的借款",
    filterAll: "全部",
    filterNormal: "正常期",
    filterGrace: "宽限期",
    filterPending: "已超期",
    filterEarly: "提前期",
    selectAllOrders: "全选借款",
    clearSelectedOrders: "取消全选",
    loanStatusLabel: "当前状态",
    loanFeeLabel: "手续费等级",
    loanEarlyTitle: "提前期",
    loanNormalTitle: "正常期",
    loanPenaltyZero: "0% 手续费",
    loanPenaltyEarly90: "90% 提前还款违约金",
    loanPenaltyEarly60: "60% 提前还款违约金",
    loanPenaltyEarly30: "30% 提前还款违约金",
    loan1Stake: "质押 1,200,000 BABURU",
    loan1Borrowed: "借出 0.214 BNB",
    loan1StartTime: "借款时间：2026-04-06 18:26",
    loanGraceTitle: "宽限期",
    loanPenaltyLate30: "30% 延后还款滞纳金",
    loanPenaltyLate60: "60% 延后还款滞纳金",
    loanPenaltyLate90: "90% 延后还款滞纳金",
    loanPenaltyBlocked: "不可还款",
    loan2Stake: "质押 900,000 BABURU",
    loan2Borrowed: "借出 0.382 BNB",
    loan2StartTime: "借款时间：2026-04-03 08:14",
    loan4Stake: "质押 1,560,000 BABURU",
    loan4Borrowed: "借出 0.338 BNB",
    loan4StartTime: "借款时间：2026-04-04 09:42",
    loan5Borrowed: "借出 0.296 BNB",
    loan5StartTime: "借款时间：2026-04-01 17:20",
    loan6Stake: "质押 640,000 BABURU",
    loan6Borrowed: "借出 0.168 BNB",
    loan6StartTime: "借款时间：2026-04-05 19:10",
    loan7Stake: "质押 1,880,000 BABURU",
    loan7Borrowed: "借出 0.427 BNB",
    loan7StartTime: "借款时间：2026-04-02 13:08",
    loan8Stake: "质押 1,020,000 BABURU",
    loan8Borrowed: "借出 0.241 BNB",
    loan8StartTime: "借款时间：2026-03-31 10:36",
    loan9Stake: "质押 520,000 BABURU",
    loan9Borrowed: "借出 0.122 BNB",
    loan9StartTime: "借款时间：2026-03-28 08:58",
    loanLiquidationTitle: "已超期",
    loanNotRepayable: "暂时不可还款",
    overdueToyTooltip: "这笔借款已经超过了还款时间，将由金库自动清算。",
    loan3Stake: "质押 780,000 BABURU",
    loan3Borrowed: "借出 0.196 BNB",
    loan3StartTime: "借款时间：2026-03-29 15:22",
    loanPublicLiquidationOnly: "等待自动回收",
    confirmRepayment: "确认还款",
    faqTitle: "金库手册",
    faqBlacklistQ: "金库黑名单",
    faqBlacklistA: "黑名单用于统计非活跃持仓，参与可借份额分母计算，例如 LP、交易所托管地址和 0x...dead。它的作用是避免这些份额与金库内活跃质押重复扣减，不是针对普通用户的钱包封禁。",
    blacklistLp: "LP: 0x6fe...c200",
    blacklistCustody: "CEX Custody: 0x194...a999",
    blacklistDead: "Dead: 0x000...dEaD",
    faq1Q: "BABURU 和 BABURU KINKO 是什么关系？",
    faq1A: "你可以向 BABURU KINKO 质押 BABURU，无限次无息借出 BNB。",
    faqBaburuQ: "BABURU 是什么？",
    faqBaburuA: "BABURU 是 BABURU KINKO 的核心资产。持有 BABURU 后，你可以进入金库质押，并发起 BNB 借款。",
    faqTaxQ: "BABURU 的买卖税是多少？税金去了哪里？",
    faqTaxA: "根据规则，BABURU 买入税率为 2%，卖出税率为 4%。税收会先以 BABURU 收取，再换成 BNB，换得的 BNB 会 100% 进入 BABURU KINKO。",
    faq2Q: "为什么试算和实际借款结果会不一样？",
    faq2A: "前端试算只反映当前链上快照。别人借款、黑名单持仓变动、金库 BNB 增减都会改变实时分母与可借额度，所以最终结果以链上执行时为准。",
    faqBorrowCapQ: "我单次能借到多少 BNB？",
    faqBorrowCapA: "单笔可借 BNB = 本次质押 BABURU / 可借份额分母 × (金库实时 BNB × ρ)。其中，可借份额分母 = 初始总量常量 − 黑名单地址持仓 − 金库内未结清质押；并且实际借出 BNB 不会超过借款执行前金库里的实时 BNB 余额。",
    faqFeeQ: "借款产生的手续费是什么？这些手续费去了哪里？",
    faqFeeA: "借款本身在正常时间窗口内可以 0 手续费归还；只有提前还款或宽限期还款时，才会按时间档位从该笔质押的 BABURU 中扣除罚金。根据合约规则，扣除的罚金将立即链上销毁。",
    faq3Q: "最小可借比例有什么作用？",
    faq3A: "这是链上保护阈值。若实时借款结果低于你看到的参考值乘以该比例，这次借款就不会成功，避免实际成交金额明显少于预期。",
    faqMultiLoanQ: "我可以同时发起多笔借款吗？",
    faqMultiLoanA: "可以。BABURU KINKO 支持多笔借款，你的未结清借款会按时间倒序展示，也可以在还款时勾选多笔借款一起处理。",
    faqPauseQ: "如果金库暂停新借款，还能还款吗？",
    faqPauseA: "可以。暂停只会影响新的借款，不会影响已有借款的还款与到期清算流程。",
    faq4Q: "为什么超过 9 天后就不能还款？",
    faq4A: "根据合约规则，借款超期 9 天后会直接进入清算流程，不再支持普通还款。",
    faqLiquidationQ: "什么是整理金库？谁可以发起？",
    faqLiquidationA: "整理金库会把已经超期 9 天的借款统一推进到链上结清状态。进入整理后，这些借款对应的代币将按规则进行销毁，任何人都可以发起这个动作。",
    borrowReadyHint: "连接钱包后即可开始借款。",
    borrowStatusWrongNetwork: "当前网络不正确，请切换到本地测试链后再继续。",
    borrowStatusApproving: "正在授权 BABURU，请在钱包中确认。",
    borrowStatusBorrowing: "正在提交借款，请在钱包中确认。",
    borrowStatusSuccess: "借款成功，借款列表已刷新。",
    borrowStatusFailed: "借款没有完成，请检查钱包状态后重试。",
    repayReadyHint: "勾选借款后，可一键完成还款。",
    repayStatusWrongNetwork: "当前网络不正确，请切换到本地测试链后再继续。",
    repayStatusNeedSelection: "请先勾选至少一笔可还款借款。",
    repayStatusRepaying: "正在提交还款，请在钱包中确认。",
    repayStatusSuccess: "还款成功，借款列表已刷新。",
    repayStatusFailed: "还款没有完成，请检查钱包状态后重试。",
    liquidationSubmitting: "正在提交整理金库，请在钱包中确认。",
    liquidationSuccess: "整理金库已提交，金库状态已刷新。",
    liquidationFailed: "整理金库没有完成，请检查钱包状态后重试。",
    liquidationNothingToProcess: "当前没有待清算的借款。",
    emptyLoansTitle: "还没有借款",
    emptyLoansBody: "完成一笔借款后，这里会自动展示你的链上借款记录。",
    walletLoansTitle: "连接钱包后查看借款",
    walletLoansBody: "连接成功后，这里只会展示你当前钱包地址对应的链上借款记录。",
    mobileOrders: "借款",
    repaySummary: ({ count, totalBnb, returnedBaburu, formatNumber, formatBnbValue }) =>
      count > 0
        ? `已选中 ${count} 笔借款，归还 ${formatBnbValue(totalBnb)} BNB，获得 ${formatNumber(returnedBaburu)} BABURU`
        : "还没有选中要还款的借款",
    repayPenalty: ({ count, totalFeeBaburu, formatNumber }) =>
      count > 0 ? `其中 BABURU 手续费合计 ${formatNumber(totalFeeBaburu)}。` : "",
  },
  en: {
    pageTitle: "BABURU KINKO",
    pageDescription: "BABURU KINKO interface for on-chain borrowing, repayment, and loan management for BABURUSU.",
    navOverview: "Overview",
    navBorrow: "Interest-Free Borrow",
    navLoans: "My Loans",
    navHelp: "Vault Manual",
    connectWallet: "Connect Wallet",
    walletUnavailable: "Wallet Not Found",
    heroBadge: "BABURU KINKO",
    heroTitle: "The on-chain vault built for every BABURUSU",
    heroDescription: "Bring your $BABURU and get your own interest-free BNB through BABURU KINKO.",
    startEstimate: "Borrow Interest-Free BNB",
    viewLoans: "View My Loans",
    loanOpen: "BABURU KINKO is open",
    bannerPrefix: "Get",
    bannerLinkText: "$BABURU",
    bannerSuffix: "to unlock your vault access.",
    pausedBanner: "BABURU KINKO is under maintenance",
    overviewTitle: "Vault Status",
    metricToyReserve: "BNB Reserve",
    metricActiveCollateral: "BABURU Staked",
    metricPendingLiquidation: "BABURU Pending Liquidation",
    metricExposureNote: "Active Loans",
    metricMarketNote: "BABURU",
    metricSlippageNote: "Single-Loan Ratio",
    publicLiquidation: "Vault Cleanup",
    borrowTitle: "Borrow Interest-Free BNB",
    tabEstimate: "Borrow Interest-Free BNB",
    tabApprove: "Confirm Wallet",
    tabConfirmLoan: "Complete Borrow",
    stakeInputTitle: "Bring Your $BABURU",
    stakeAmount: "Deposit $BABURU",
    walletAvailable: "Wallet available: 3,640,000",
    minBorrowRatio: "Minimum Loan Ratio",
    ratioNote: "If it drops below this ratio, the borrow will not execute",
    estimatedBorrow: "Estimated BNB to Borrow",
    refBorrowLabel: "Estimated Borrow",
    protectedFloor: "Minimum Loan Floor",
    borrowWindow: "Borrow Window",
    windowBody: "Repay from day 3 to day 6 with no fee",
    approveAndBorrow: "Approve & Borrow",
    approveBaburu: "Approve BABURU",
    confirmBorrow: "Confirm Borrow",
    timelineTitle: "Borrow Window",
    timelineSubtitle: "Make the choice you believe is right",
    timelineDayEarly: "Day 1-3",
    timelineDayNormal: "Day 3-6",
    timelineDayGrace: "Day 6-9",
    timelineDayOverdue: "9+ Days",
    timelineEarly6030: "Early Repayment Penalty",
    timelineEarlySteps: "90% → 60% → 30%",
    timelineNormal: "0% Fee Window",
    timelineNormalNote: "Best time to repay",
    timelineGrace: "Late Repayment Penalty",
    timelineGraceSteps: "30% → 60% → 90%",
    timelineOverdue: "Loan Overdue",
    timelineOverdueNote: "Repayment unavailable. The vault will liquidate it automatically.",
    loansTitle: "My Loans",
    filterAll: "All",
    filterNormal: "Normal Window",
    filterGrace: "Grace Window",
    filterPending: "Overdue",
    filterEarly: "Early Window",
    selectAllOrders: "Select All",
    clearSelectedOrders: "Clear All",
    loanStatusLabel: "Status",
    loanFeeLabel: "Fee Tier",
    loanEarlyTitle: "Early Window",
    loanNormalTitle: "Normal Window",
    loanPenaltyZero: "0% Fee",
    loanPenaltyEarly90: "90% Early Repayment Penalty",
    loanPenaltyEarly60: "60% Early Repayment Penalty",
    loanPenaltyEarly30: "30% Early Repayment Penalty",
    loan1Stake: "Stake 1,200,000 BABURU",
    loan1Borrowed: "Borrowed 0.214 BNB",
    loan1StartTime: "Borrowed at: 2026-04-06 18:26",
    loanGraceTitle: "Grace Period",
    loanPenaltyLate30: "30% Late Repayment Fee",
    loanPenaltyLate60: "60% Late Repayment Fee",
    loanPenaltyLate90: "90% Late Repayment Fee",
    loanPenaltyBlocked: "Repayment Unavailable",
    loan2Stake: "Stake 900,000 BABURU",
    loan2Borrowed: "Borrowed 0.382 BNB",
    loan2StartTime: "Borrowed at: 2026-04-03 08:14",
    loan4Stake: "Stake 1,560,000 BABURU",
    loan4Borrowed: "Borrowed 0.338 BNB",
    loan4StartTime: "Borrowed at: 2026-04-04 09:42",
    loan5Borrowed: "Borrowed 0.296 BNB",
    loan5StartTime: "Borrowed at: 2026-04-01 17:20",
    loan6Stake: "Stake 640,000 BABURU",
    loan6Borrowed: "Borrowed 0.168 BNB",
    loan6StartTime: "Borrowed at: 2026-04-05 19:10",
    loan7Stake: "Stake 1,880,000 BABURU",
    loan7Borrowed: "Borrowed 0.427 BNB",
    loan7StartTime: "Borrowed at: 2026-04-02 13:08",
    loan8Stake: "Stake 1,020,000 BABURU",
    loan8Borrowed: "Borrowed 0.241 BNB",
    loan8StartTime: "Borrowed at: 2026-03-31 10:36",
    loan9Stake: "Stake 520,000 BABURU",
    loan9Borrowed: "Borrowed 0.122 BNB",
    loan9StartTime: "Borrowed at: 2026-03-28 08:58",
    loanLiquidationTitle: "Overdue",
    loanNotRepayable: "Repayment Unavailable",
    overdueToyTooltip: "This loan has passed its repayment time and will be auto liquidated by the vault.",
    loan3Stake: "Stake 780,000 BABURU",
    loan3Borrowed: "Borrowed 0.196 BNB",
    loan3StartTime: "Borrowed at: 2026-03-29 15:22",
    loanPublicLiquidationOnly: "Awaiting auto cleanup",
    confirmRepayment: "Confirm Repayment",
    faqTitle: "Vault Manual",
    faqBlacklistQ: "Vault Blacklist",
    faqBlacklistA: "The blacklist is used to count inactive balances in the borrow-share denominator, such as LP, exchange custody addresses, and 0x...dead. It prevents those balances from being deducted twice alongside active vault collateral, and it is not a ban on normal user wallets.",
    blacklistLp: "LP: 0x6fe...c200",
    blacklistCustody: "CEX Custody: 0x194...a999",
    blacklistDead: "Dead: 0x000...dEaD",
    faq1Q: "What is the relationship between BABURU and BABURU KINKO?",
    faq1A: "You can stake BABURU in BABURU KINKO and borrow BNB interest-free as many times as you want.",
    faqBaburuQ: "What is BABURU?",
    faqBaburuA: "BABURU is the core asset of BABURU KINKO. Once you hold BABURU, you can stake it in the vault and start borrowing BNB.",
    faqTaxQ: "What are BABURU's buy and sell taxes, and where do they go?",
    faqTaxA: "According to the rules, BABURU charges 2% on buys and 4% on sells. The tax is first collected in BABURU, then swapped into BNB, and 100% of that BNB flows into BABURU KINKO.",
    faq2Q: "Why can the preview differ from the final borrowed amount?",
    faq2A: "The frontend preview is only a snapshot of the current on-chain state. Other borrows, blacklist balance changes, and vault BNB movement can all change the live denominator and final borrowable amount before execution.",
    faqBorrowCapQ: "How much BNB can I borrow in a single loan?",
    faqBorrowCapA: "Single-loan BNB = staked BABURU / borrow-share denominator × (live vault BNB × rho). Here, borrow-share denominator = initial total supply constant − blacklisted balances − unsettled vault collateral. The actual borrowed BNB can never exceed the vault's live BNB balance right before execution.",
    faqFeeQ: "What fees can a loan generate, and where do they go?",
    faqFeeA: "A loan can be repaid with 0 fee during the normal window. Fees only appear when repayment happens early or during the grace period, and those BABURU penalties are deducted directly from the loan collateral. According to the contract rules, the deducted penalties are burned on-chain immediately.",
    faq3Q: "What does the minimum borrow ratio do?",
    faq3A: "It is an on-chain protection threshold. If the live borrow result falls below your reference amount multiplied by this ratio, the transaction will not go through.",
    faqMultiLoanQ: "Can I open multiple loans at the same time?",
    faqMultiLoanA: "Yes. BABURU KINKO supports multiple loans. Your active loans are listed in reverse chronological order, and you can select several of them for repayment in one action.",
    faqPauseQ: "If the vault pauses new borrowing, can I still repay?",
    faqPauseA: "Yes. A pause only affects new borrowing. Existing loans can still be repaid, and overdue loans can still move through liquidation.",
    faq4Q: "Why can't I repay after 9 days?",
    faq4A: "According to the contract rules, once a loan is overdue for 9 days, it moves directly into the liquidation flow and no longer supports normal repayment.",
    faqLiquidationQ: "What is vault cleanup, and who can trigger it?",
    faqLiquidationA: "Vault cleanup pushes loans that are already overdue by 9 days into their on-chain settlement state. Once they enter cleanup, the tokens tied to those loans are burned according to the rules, and anyone can trigger this action.",
    borrowReadyHint: "Connect your wallet to start borrowing.",
    borrowStatusWrongNetwork: "You're on the wrong network. Switch to the local test chain to continue.",
    borrowStatusApproving: "Approving BABURU. Please confirm in your wallet.",
    borrowStatusBorrowing: "Submitting the borrow. Please confirm in your wallet.",
    borrowStatusSuccess: "Borrow successful. Your loan list has been refreshed.",
    borrowStatusFailed: "The borrow did not complete. Check your wallet and try again.",
    repayReadyHint: "Select loans to repay them in one flow.",
    repayStatusWrongNetwork: "You're on the wrong network. Switch to the local test chain to continue.",
    repayStatusNeedSelection: "Select at least one repayable loan first.",
    repayStatusRepaying: "Submitting the repayment. Please confirm in your wallet.",
    repayStatusSuccess: "Repayment successful. Your loan list has been refreshed.",
    repayStatusFailed: "The repayment did not complete. Check your wallet and try again.",
    liquidationSubmitting: "Submitting vault cleanup. Please confirm in your wallet.",
    liquidationSuccess: "Vault cleanup submitted. The vault state has been refreshed.",
    liquidationFailed: "Vault cleanup did not complete. Check your wallet and try again.",
    liquidationNothingToProcess: "There are no overdue loans to liquidate right now.",
    emptyLoansTitle: "No loans yet",
    emptyLoansBody: "Once you finish a borrow, your on-chain loans will appear here automatically.",
    walletLoansTitle: "Connect wallet to view loans",
    walletLoansBody: "After connecting, this area will only show the on-chain loans that belong to your current wallet address.",
    mobileOrders: "Loans",
    repaySummary: ({ count, totalBnb, returnedBaburu, formatNumber, formatBnbValue }) =>
      count > 0
        ? `${count} loans selected, repay ${formatBnbValue(totalBnb)} BNB to receive ${formatNumber(returnedBaburu)} BABURU`
        : "No loans selected for repayment",
    repayPenalty: ({ count, totalFeeBaburu, formatNumber }) =>
      count > 0 ? `Including ${formatNumber(totalFeeBaburu)} BABURU in total fees.` : "",
  },
};

let currentLang = localStorage.getItem("baburu-lang") || "en";
let connectedAddress = "";
let bannerState = "open";
const helpHideTimers = new Map();
let browserProvider;
let rpcProvider;
let walletSigner;
let connectedWallet = null;
let latestBorrowQuoteWei = 0n;
let latestWalletBaburuBalance = 0n;
let vaultRefreshInFlight = false;
let vaultClockTimer = null;
let borrowPanelActive = false;
let nextVaultRefreshAt = Date.now() + VAULT_REFRESH_INTERVAL_MS;

const injected = injectedModule();
const onboard = Onboard({
  wallets: [injected],
  chains: [
    {
      id: "0x7A69",
      token: "ETH",
      label: "Hardhat Local",
      rpcUrl: APP_CONFIG.rpcUrl,
    },
  ],
  appMetadata: {
    name: "BABURU KINKO",
    icon: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><circle cx='32' cy='32' r='30' fill='#ffd9c9'/><text x='32' y='39' text-anchor='middle' font-size='24' fill='#5e3a54' font-family='Arial, sans-serif'>BK</text></svg>",
    description: "BABURU KINKO local vault interface",
  },
});

const sections = [...document.querySelectorAll(".reveal")];
const navButtons = [...document.querySelectorAll(".nav-pill")];
let i18nNodes = [];
const walletButton = document.getElementById("wallet-button");
const langToggle = document.getElementById("lang-toggle");
let helpPanels = [];
let helpToggles = [];
const bannerTitle = document.querySelector('.banner-copy [data-i18n="loanOpen"]');
const bannerText = document.getElementById("banner-line");
const bannerPrefix = document.querySelector('.banner-copy [data-i18n="bannerPrefix"]');
const bannerSuffix = document.querySelector('.banner-copy [data-i18n="bannerSuffix"]');
const bannerBuyLink = document.getElementById("banner-buy-link");
const topStatusBanner = document.querySelector(".top-status-banner");
const bannerCloseButton = document.getElementById("banner-close-button");
const borrowSection = document.getElementById("borrow");
const stakeInput = document.getElementById("stake-input");
const ratioInput = document.getElementById("ratio-input");
const maxStakeButton = document.getElementById("max-stake-button");
const storedRatioBps = Number(localStorage.getItem(LAST_RATIO_BPS_KEY));
if (ratioInput) {
  ratioInput.value = String(
    Number.isFinite(storedRatioBps) && storedRatioBps >= Number(ratioInput.min) && storedRatioBps <= Number(ratioInput.max)
      ? storedRatioBps
      : 9500
  );
}
const borrowActionButton = document.getElementById("borrow-action-button");
const confirmRepaymentButton = document.getElementById("confirm-repayment-button");
const stakeDisplay = document.getElementById("stake-display");
const ratioDisplay = document.getElementById("ratio-display");
const borrowEstimate = document.getElementById("borrow-estimate");
const refBorrow = document.getElementById("ref-borrow");
const minBorrow = document.getElementById("min-borrow");
const borrowRefreshMeta = document.getElementById("borrow-refresh-meta");
const borrowRefreshCopy = document.getElementById("borrow-refresh-copy");
const borrowStatus = document.getElementById("borrow-status");
const repaySummary = document.getElementById("repay-summary");
const repayPenalty = document.getElementById("repay-penalty");
const repayStatus = document.getElementById("repay-status");
const floatingToast = document.getElementById("floating-toast");
const floatingToastText = document.getElementById("floating-toast-text");
const debugStrip = document.getElementById("debug-strip");
const debugChain = document.getElementById("debug-chain");
const debugWallet = document.getElementById("debug-wallet");
const debugAccount = document.getElementById("debug-account");
const loanList = document.getElementById("loan-list");
const loanToolbar = document.querySelector(".loan-toolbar");
let checkboxes = [];
let loanCards = [];
const loanFilterButtons = [...document.querySelectorAll(".filter-chip[data-filter]")];
const selectAllOrdersButton = document.getElementById("select-all-orders");
const bubbleField = document.getElementById("bubble-field");
const pageDescription = document.getElementById("page-description");
const flowSteps = [...document.querySelectorAll(".flow-steps-panel .flow-step")];
const reserveMetric = document.getElementById("reserve-metric");
const activeCollateralMetric = document.getElementById("active-collateral-metric");
const liquidatableCollateralMetric = document.getElementById("liquidatable-collateral-metric");
const activeLoansMetric = document.getElementById("active-loans-metric");
const singleLoanRatioMetric = document.getElementById("single-loan-ratio-metric");
const publicLiquidationButton = document.getElementById("public-liquidation-button");
const metricAnimationState = new WeakMap();
let activeLoanFilter = "all";
let toastHideTimer = null;

function formatNumber(value, maximumFractionDigits = 0) {
  return new Intl.NumberFormat(currentLang === "zh" ? "zh-CN" : "en-US", {
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits,
  }).format(value);
}

function animateMetricNumber(node, nextValue, { maximumFractionDigits = 0, suffix = "" } = {}) {
  if (!node || !Number.isFinite(nextValue)) return;

  const previous = metricAnimationState.get(node) ?? nextValue;
  const startValue = Number(previous);
  const targetValue = Number(nextValue);
  const metricCard = node.closest(".metric-card");

  if (!Number.isFinite(startValue) || Math.abs(targetValue - startValue) < 0.000001 || prefersReducedMotion) {
    node.textContent = `${formatNumber(targetValue, maximumFractionDigits)}${suffix}`;
    metricAnimationState.set(node, targetValue);
    return;
  }

  metricCard?.classList.remove("is-updating");
  window.requestAnimationFrame(() => {
    metricCard?.classList.add("is-updating");
  });
  window.setTimeout(() => {
    metricCard?.classList.remove("is-updating");
  }, 460);

  const duration = 520;
  const startAt = performance.now();

  function frame(now) {
    const progress = Math.min((now - startAt) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 4);
    const currentValue = startValue + (targetValue - startValue) * eased;
    node.textContent = `${formatNumber(currentValue, maximumFractionDigits)}${suffix}`;

    if (progress < 1) {
      requestAnimationFrame(frame);
      return;
    }

    metricAnimationState.set(node, targetValue);
  }

  requestAnimationFrame(frame);
}

function t(key, params) {
  const dict = translations[currentLang];
  const value = dict[key];
  if (typeof value === "function") return value(params);
  return value ?? key;
}

function setActionStatus(node, key, tone = "idle") {
  if (node) {
    node.dataset.i18n = key;
    node.textContent = t(key);
    node.className = `action-status action-status-${tone}`;
  }

  if (tone === "idle") {
    hideFloatingToast();
    return;
  }

  showFloatingToast(t(key), tone);
}

function setActionMessage(node, message, tone = "idle") {
  if (node) {
    delete node.dataset.i18n;
    node.textContent = message;
    node.className = `action-status action-status-${tone}`;
  }

  if (tone === "idle") {
    hideFloatingToast();
    return;
  }

  showFloatingToast(message, tone);
}

function extractErrorText(error) {
  const candidates = [
    error?.shortMessage,
    error?.reason,
    error?.message,
    error?.data?.message,
    error?.error?.message,
    error?.info?.error?.message,
    error?.info?.payload?.error?.message,
  ].filter(Boolean);

  return candidates.find((value) => typeof value === "string") || "";
}

function humanizeContractError(error, context = "borrow") {
  const rawMessage = extractErrorText(error);
  const message = rawMessage.toLowerCase();

  if (!rawMessage) {
    return t(context === "borrow" ? "borrowStatusFailed" : "repayStatusFailed");
  }

  if (
    error?.code === 4001 ||
    error?.code === "ACTION_REJECTED" ||
    message.includes("user rejected") ||
    message.includes("user denied") ||
    message.includes("rejected the request")
  ) {
    return currentLang === "zh" ? "你已在钱包中取消本次操作。" : "You cancelled the request in your wallet.";
  }

  if (message.includes("insufficient funds")) {
    return currentLang === "zh"
      ? "钱包原生币余额不足，无法支付 gas。"
      : "Your wallet does not have enough native token to pay gas.";
  }

  if (message.includes("doesn't have enough funds to send tx") || message.includes("sender doesn't have enough funds")) {
    return currentLang === "zh"
      ? "当前钱包地址没有足够的本地链 ETH 来支付 gas。请切换到 Hardhat 测试账户后再试。"
      : "This wallet address does not have enough local-chain ETH to pay gas. Switch to a funded Hardhat test account and try again.";
  }

  if (message.includes("borrowpaused")) {
    return currentLang === "zh" ? "金库当前暂停借款，请稍后再试。" : "Borrowing is currently paused in the vault.";
  }

  if (message.includes("slippageexceeded")) {
    return currentLang === "zh"
      ? "实际借款低于你设置的最小借出比例，请调低比例后重试。"
      : "The live quote is below your minimum loan ratio. Lower the ratio and try again.";
  }

  if (message.includes("insufficienttreasury")) {
    return currentLang === "zh"
      ? "当前金库 BNB 不足，暂时无法完成借款。"
      : "The vault does not have enough BNB available right now.";
  }

  if (message.includes("invalidmsgvalue")) {
    return currentLang === "zh"
      ? "本次提交的 BNB 金额不正确，请刷新后重试。"
      : "The submitted BNB amount is incorrect. Refresh and try again.";
  }

  if (message.includes("notorderborrower")) {
    return currentLang === "zh"
      ? "只能操作当前钱包自己的借款。"
      : "You can only operate on loans owned by the connected wallet.";
  }

  if (message.includes("notrepayable")) {
    return currentLang === "zh"
      ? "这笔借款当前不支持普通还款。"
      : "This loan is not repayable through the normal flow right now.";
  }

  if (message.includes("ordermissing")) {
    return currentLang === "zh"
      ? "这笔借款不存在，或已经处理完成。"
      : "This loan no longer exists or has already been processed.";
  }

  if (
    message.includes("erc20insufficientbalance") ||
    message.includes("transfer amount exceeds balance") ||
    message.includes("exceeds balance")
  ) {
    return currentLang === "zh"
      ? "BABURU 余额不足，无法完成当前质押。"
      : "Your BABURU balance is too low for this collateral amount.";
  }

  if (
    message.includes("erc20insufficientallowance") ||
    message.includes("insufficient allowance")
  ) {
    return currentLang === "zh"
      ? "授权额度不足，请重新授权后再试。"
      : "The current BABURU allowance is too low. Please approve again.";
  }

  if (message.includes("invalidamount")) {
    return currentLang === "zh"
      ? context === "borrow"
        ? "请输入有效的质押数量，且预计借款不能为 0。"
        : "当前借款金额无效，请刷新后重试。"
      : context === "borrow"
        ? "Enter a valid collateral amount and make sure the estimated borrow is above 0."
        : "The current loan amount is invalid. Refresh and try again.";
  }

  if (message.includes("invaliddenominator")) {
    return currentLang === "zh"
      ? "当前金库分母不可用，暂时无法借款。"
      : "The current vault denominator is invalid, so borrowing is temporarily unavailable.";
  }

  if (message.includes("could not coalesce error") || message.includes("could not coalesce")) {
    return currentLang === "zh"
      ? "当前钱包返回了一个无法解析的本地链错误。请确认钱包已切到 31337、本地节点仍在运行，并使用 Hardhat 测试账户后重试。"
      : "Your wallet returned a local-chain error that could not be parsed. Make sure it is on chain 31337, the local node is still running, and you are using a Hardhat test account.";
  }

  return rawMessage.replace(/^execution reverted:\s*/i, "").trim() || t(context === "borrow" ? "borrowStatusFailed" : "repayStatusFailed");
}

function hideFloatingToast() {
  if (toastHideTimer) {
    window.clearTimeout(toastHideTimer);
    toastHideTimer = null;
  }
  if (!floatingToast || !floatingToastText) return;
  floatingToast.classList.remove("is-visible");
  floatingToast.classList.add("is-hiding");
  window.setTimeout(() => {
    if (!floatingToast || floatingToast.classList.contains("is-visible")) return;
    floatingToast.hidden = true;
    floatingToast.className = "floating-toast";
    floatingToastText.textContent = "";
  }, prefersReducedMotion ? 0 : 220);
}

function showFloatingToast(message, tone = "idle") {
  if (!floatingToast || !floatingToastText) return;

  if (toastHideTimer) {
    window.clearTimeout(toastHideTimer);
    toastHideTimer = null;
  }

  floatingToastText.textContent = message;
  floatingToast.hidden = false;
  floatingToast.className = `floating-toast floating-toast-${tone}`;
  floatingToast.classList.remove("is-hiding");
  window.requestAnimationFrame(() => {
    floatingToast?.classList.add("is-visible");
  });

  if (tone !== "busy") {
    toastHideTimer = window.setTimeout(() => {
      hideFloatingToast();
    }, 3200);
  }
}

function syncDomCollections() {
  i18nNodes = [...document.querySelectorAll("[data-i18n]")];
  helpPanels = [...document.querySelectorAll("[data-help-panel]")];
  helpToggles = [...document.querySelectorAll("[data-help-toggle]")];
  checkboxes = [...document.querySelectorAll(".loan-checkbox")];
  loanCards = [...document.querySelectorAll(".loan-card")];
  checkboxes.forEach((checkbox) => {
    checkbox.onchange = updateRepaySummary;
  });
  loanCards.forEach((card) => {
    card.onclick = (event) => {
      if (card.dataset.repayable === "false") return;
      if (event.target.closest(".loan-select, .loan-checkbox, .help-dot, .help-popover")) return;

      const checkbox = card.querySelector(".loan-checkbox");
      if (!checkbox || checkbox.disabled) return;

      checkbox.checked = !checkbox.checked;
      updateRepaySummary();
    };
  });
}

function getRpcProvider() {
  if (!APP_CONFIG.rpcUrl) return null;
  if (!rpcProvider) {
    rpcProvider = new ethers.JsonRpcProvider(APP_CONFIG.rpcUrl);
  }
  return rpcProvider;
}

async function getBrowserProvider() {
  if (!connectedWallet?.provider) return null;
  if (!browserProvider) {
    browserProvider = new ethers.BrowserProvider(connectedWallet.provider, "any");
  }
  return browserProvider;
}

async function getSigner() {
  const provider = await getBrowserProvider();
  if (!provider || !connectedAddress) return null;
  if (!walletSigner) {
    walletSigner = await provider.getSigner();
  }
  return walletSigner;
}

async function ensureSupportedNetwork() {
  if (!connectedWallet?.provider?.request) return false;

  const chainIdHex = await connectedWallet.provider.request({ method: "eth_chainId" });
  const currentChainId = Number.parseInt(chainIdHex, 16);
  if (currentChainId === APP_CONFIG.chainId) return true;

  if (APP_CONFIG.chainId === 31337) {
    try {
      await connectedWallet.provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x7a69" }],
      });
      return true;
    } catch (error) {
      if (error?.code === 4902) {
        await connectedWallet.provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x7a69",
              chainName: "Hardhat Local",
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              rpcUrls: [APP_CONFIG.rpcUrl],
            },
          ],
        });
        return true;
      }
    }
  }

  return false;
}

function getReadContracts() {
  const provider = getRpcProvider();
  if (!provider || !APP_CONFIG.kinkoAddress || !APP_CONFIG.baburuTokenAddress) return null;

  return {
    baburu: new ethers.Contract(APP_CONFIG.baburuTokenAddress, ERC20_ABI, provider),
    kinko: new ethers.Contract(APP_CONFIG.kinkoAddress, KINKO_ABI, provider),
  };
}

async function getWriteContracts() {
  const signer = await getSigner();
  if (!signer || !APP_CONFIG.kinkoAddress || !APP_CONFIG.baburuTokenAddress) return null;

  return {
    baburu: new ethers.Contract(APP_CONFIG.baburuTokenAddress, ERC20_ABI, signer),
    kinko: new ethers.Contract(APP_CONFIG.kinkoAddress, KINKO_ABI, signer),
  };
}

function applyTranslations() {
  document.documentElement.lang = currentLang === "zh" ? "zh-CN" : "en";
  document.title = t("pageTitle");
  if (pageDescription) pageDescription.setAttribute("content", t("pageDescription"));

  i18nNodes.forEach((node) => {
    if (node === walletButton && connectedAddress) return;
    if (node === bannerTitle || node === bannerText || node === bannerPrefix || node === bannerSuffix || node === bannerBuyLink) return;
    node.textContent = t(node.dataset.i18n);
  });
  helpPanels.forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  if (langToggle) langToggle.textContent = currentLang === "zh" ? "EN" : "中";
  renderBanner();
  renderLoanCards();
}

function shortenAddress(address = "") {
  if (!address || address.length < 10) return address || "--";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function renderWalletButton() {
  if (!walletButton) return;
  walletButton.textContent = connectedAddress ? shortenAddress(connectedAddress) : t("connectWallet");
}

function renderBanner() {
  if (!bannerTitle || !bannerText || !topStatusBanner) return;

  topStatusBanner.classList.remove("is-closing");
  topStatusBanner.hidden = localStorage.getItem(BANNER_DISMISSED_KEY) === "true";
  if (topStatusBanner.hidden) return;

  if (bannerState === "paused") {
    bannerTitle.textContent = t("pausedBanner");
    bannerText.hidden = true;
    return;
  }

  bannerTitle.textContent = t("loanOpen");
  if (bannerPrefix) bannerPrefix.textContent = t("bannerPrefix");
  if (bannerSuffix) bannerSuffix.textContent = t("bannerSuffix");
  if (bannerBuyLink) {
    bannerBuyLink.textContent = t("bannerLinkText");
    bannerBuyLink.href = APP_CONFIG.buyUrl;
    bannerBuyLink.setAttribute("aria-label", t("bannerLinkText"));
  }
  bannerText.hidden = false;
}

function createBubbles() {
  if (prefersReducedMotion) return;

  const bubbleCount = window.innerWidth < 720 ? 12 : 20;
  bubbleField.innerHTML = "";

  for (let i = 0; i < bubbleCount; i += 1) {
    const bubble = document.createElement("span");
    const size = 28 + Math.random() * 110;
    bubble.className = "bubble";
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.left = `${Math.random() * 100}%`;
    bubble.style.animationDuration = `${18 + Math.random() * 14}s`;
    bubble.style.animationDelay = `${Math.random() * 8}s`;
    bubbleField.appendChild(bubble);
  }
}

async function updateBorrowEstimate() {
  const stakeValue = normalizeTokenInput(stakeInput.value);
  const minRatioBps = Number(ratioInput.value);
  const collateralAmount = ethers.parseUnits(stakeValue, 18);

  if (!connectedAddress) {
    latestBorrowQuoteWei = 0n;
    stakeDisplay.textContent = "-- BABURU";
    ratioDisplay.textContent = `${(minRatioBps / 100).toFixed(2)}%`;
    borrowEstimate.textContent = "--";
    refBorrow.textContent = "-- BNB";
    minBorrow.textContent = "-- BNB";
    const walletAvailable = document.getElementById("wallet-available");
    if (walletAvailable) walletAvailable.textContent = t("connectWallet");
    await syncBorrowActionLabel();
    return;
  }

  let estimate = 0;

  if (APP_CONFIG.kinkoAddress && APP_CONFIG.baburuTokenAddress) {
    try {
      const contracts = getReadContracts();
      if (contracts) {
        latestBorrowQuoteWei = await contracts.kinko.quoteBorrow(collateralAmount);
        estimate = Number(ethers.formatEther(latestBorrowQuoteWei));
      }
    } catch {
      estimate = 0;
      latestBorrowQuoteWei = 0n;
    }
  } else {
    const treasuryBnb = 482.36;
    const rho = 0.7;
    const effectiveSupply = 998_000_000;
    estimate = (Number(stakeValue) / effectiveSupply) * (treasuryBnb * rho);
    latestBorrowQuoteWei = ethers.parseEther(estimate.toFixed(18));
  }

  const protectedAmountWei = (latestBorrowQuoteWei * BigInt(minRatioBps)) / 10000n;

  stakeDisplay.textContent = `${formatTokenInputValue(collateralAmount)} BABURU`;
  ratioDisplay.textContent = `${(minRatioBps / 100).toFixed(2)}%`;
  borrowEstimate.textContent = formatBnbAmountShort(latestBorrowQuoteWei);
  refBorrow.textContent = `${formatBnbAmountShort(latestBorrowQuoteWei)} BNB`;
  minBorrow.textContent = `${formatBnbAmountShort(protectedAmountWei)} BNB`;
  await syncBorrowActionLabel();
}

function setBorrowStep(stepIndex) {
  flowSteps.forEach((step, index) => {
    step.classList.toggle("active", index === stepIndex);
  });
}

function getCollateralAmountWei() {
  return ethers.parseUnits(normalizeTokenInput(stakeInput.value), 18);
}

async function syncBorrowActionLabel() {
  if (!borrowActionButton) return;

  let nextKey = "approveAndBorrow";
  let nextStep = 0;

  if (!connectedAddress) {
    borrowActionButton.disabled = true;
  } else {
    borrowActionButton.disabled = false;
    try {
      const contracts = getReadContracts();
      if (contracts) {
        const allowance = await contracts.baburu.allowance(connectedAddress, APP_CONFIG.kinkoAddress);
        const collateralAmount = getCollateralAmountWei();
        if (allowance >= collateralAmount) {
          nextKey = "confirmBorrow";
          nextStep = 1;
        }
      }
    } catch {
      nextKey = "approveAndBorrow";
      nextStep = 0;
    }
  }

  borrowActionButton.dataset.i18n = nextKey;
  borrowActionButton.textContent = t(nextKey);
  setBorrowStep(nextStep);
}

function getReferenceNow() {
  return new Date(APP_CONFIG.nowTs);
}

function getLoanTimingState(startAt) {
  const elapsedDays = (getReferenceNow().getTime() - startAt.getTime()) / (1000 * 60 * 60 * 24);

  if (elapsedDays < 1) return { stage: "early", rate: 0.9, feeKey: "loanPenaltyEarly90", statusKey: "loanEarlyTitle" };
  if (elapsedDays < 2) return { stage: "early", rate: 0.6, feeKey: "loanPenaltyEarly60", statusKey: "loanEarlyTitle" };
  if (elapsedDays < 3) return { stage: "early", rate: 0.3, feeKey: "loanPenaltyEarly30", statusKey: "loanEarlyTitle" };
  if (elapsedDays < 6) return { stage: "normal", rate: 0, feeKey: "loanPenaltyZero", statusKey: "loanNormalTitle" };
  if (elapsedDays < 7) return { stage: "grace", rate: 0.3, feeKey: "loanPenaltyLate30", statusKey: "loanGraceTitle" };
  if (elapsedDays < 8) return { stage: "grace", rate: 0.6, feeKey: "loanPenaltyLate60", statusKey: "loanGraceTitle" };
  if (elapsedDays < 9) return { stage: "grace", rate: 0.9, feeKey: "loanPenaltyLate90", statusKey: "loanGraceTitle" };
  return { stage: "pending", rate: 1, feeKey: "loanPenaltyBlocked", statusKey: "loanLiquidationTitle" };
}

function formatTokenAmount(rawValue) {
  return formatNumber(Number(ethers.formatUnits(rawValue, 18)));
}

function normalizeTokenInput(value) {
  const normalized = String(value ?? "").trim().replace(/,/g, "");
  if (!normalized || normalized === ".") return "0";
  if (!/^\d*(\.\d*)?$/.test(normalized)) return "0";
  return normalized;
}

function formatTokenInputValue(rawValue, maximumFractionDigits = 4) {
  return new Intl.NumberFormat(currentLang === "zh" ? "zh-CN" : "en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(Number(ethers.formatUnits(rawValue, 18)));
}

function formatWalletTokenAmount(rawValue) {
  return new Intl.NumberFormat(currentLang === "zh" ? "zh-CN" : "en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(Number(ethers.formatUnits(rawValue, 18)));
}

function formatBnbAmount(rawValue) {
  return formatBnbValue(Number(ethers.formatEther(rawValue)));
}

function formatBnbAmountShort(rawValue, maximumFractionDigits = 3) {
  const value = Number(ethers.formatEther(rawValue));
  return formatBnbValue(value, maximumFractionDigits);
}

function formatBnbValue(value, maximumFractionDigits = 3) {
  if (!Number.isFinite(value)) return "--";
  if (value === 0) {
    return new Intl.NumberFormat(currentLang === "zh" ? "zh-CN" : "en-US", {
      minimumFractionDigits: maximumFractionDigits,
      maximumFractionDigits,
    }).format(0);
  }

  const absValue = Math.abs(value);
  if (absValue >= 0.001) {
    return new Intl.NumberFormat(currentLang === "zh" ? "zh-CN" : "en-US", {
      minimumFractionDigits: maximumFractionDigits,
      maximumFractionDigits,
    }).format(value);
  }

  if (absValue >= 0.000001) {
    return new Intl.NumberFormat(currentLang === "zh" ? "zh-CN" : "en-US", {
      minimumFractionDigits: 6,
      maximumFractionDigits: 6,
    }).format(value);
  }

  if (absValue >= 0.00000001) {
    return new Intl.NumberFormat(currentLang === "zh" ? "zh-CN" : "en-US", {
      minimumFractionDigits: 8,
      maximumFractionDigits: 8,
    }).format(value);
  }

  return "<0.00000001";
}

function formatBorrowedAt(timestamp) {
  const date = new Date(Number(timestamp) * 1000);
  const locale = currentLang === "zh" ? "zh-CN" : "en-US";
  const formatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return formatter.format(date).replace(",", "");
}

async function updateDebugStrip() {
  if (!debugStrip || !debugChain || !debugWallet || !debugAccount) return;

  let activeChainLabel = "--";
  if (connectedWallet?.provider?.request) {
    try {
      const chainIdHex = await connectedWallet.provider.request({ method: "eth_chainId" });
      activeChainLabel = Number.parseInt(chainIdHex, 16).toString();
    } catch {
      activeChainLabel = "--";
    }
  }

  debugChain.textContent =
    currentLang === "zh" ? `链: ${activeChainLabel}` : `Chain: ${activeChainLabel}`;
  debugWallet.textContent =
    currentLang === "zh"
      ? `地址: ${connectedAddress ? shortenAddress(connectedAddress) : "--"}`
      : `Wallet: ${connectedAddress ? shortenAddress(connectedAddress) : "--"}`;

  const isLocalBorrower =
    connectedAddress && connectedAddress.toLowerCase() === LOCAL_BORROWER_ADDRESS.toLowerCase();
  debugAccount.textContent = currentLang === "zh"
    ? isLocalBorrower
      ? "测试账户: 已命中"
      : "测试账户: 未命中"
    : isLocalBorrower
      ? "Test Account: Matched"
      : "Test Account: Not Matched";

  debugChain.className = `debug-chip ${activeChainLabel === String(APP_CONFIG.chainId) ? "is-ok" : "is-warn"}`.trim();
  debugWallet.className = `debug-chip ${connectedAddress ? "is-ok" : "is-warn"}`.trim();
  debugAccount.className = `debug-chip ${isLocalBorrower ? "is-ok" : "is-warn"}`.trim();
  debugStrip.hidden = false;
}

function renderBorrowRefreshMeta() {
  if (!borrowRefreshMeta || !borrowRefreshCopy) return;

  if (!borrowPanelActive) {
    borrowRefreshMeta.hidden = true;
    return;
  }

  const remainingMs = Math.max(0, nextVaultRefreshAt - Date.now());
  const secondsLeft = Math.max(0, Math.ceil(remainingMs / 1000));
  const progress = 1 - Math.min(1, remainingMs / VAULT_REFRESH_INTERVAL_MS);
  borrowRefreshMeta.style.setProperty("--borrow-refresh-progress", `${progress}`);
  borrowRefreshCopy.innerHTML =
    currentLang === "zh"
      ? `<span class="borrow-refresh-number">${secondsLeft}</span><span class="borrow-refresh-unit">s</span><span>后刷新可借额度</span>`
      : `<span>Refreshing borrowable amount in</span><span class="borrow-refresh-number">${secondsLeft}</span><span class="borrow-refresh-unit">s</span>`;
  borrowRefreshMeta.hidden = false;
}

function setupBorrowRefreshMeta() {
  renderBorrowRefreshMeta();

  if (!borrowSection) return;

  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      borrowPanelActive = Boolean(entry?.isIntersecting);
      renderBorrowRefreshMeta();
    },
    { threshold: 0.28 }
  );

  observer.observe(borrowSection);
}

function stageFromBorrowedAt(borrowedAt) {
  return getLoanTimingState(new Date(Number(borrowedAt) * 1000)).stage;
}

function statusClassFromStage(stage) {
  if (stage === "early") return "status-early";
  if (stage === "normal") return "status-good";
  if (stage === "grace") return "status-warn";
  return "status-danger";
}

function feeKeyFromStageAndRate(stage, rate) {
  if (stage === "normal") return "loanPenaltyZero";
  if (stage === "pending") return "loanPenaltyBlocked";
  if (stage === "early") {
    if (rate >= 0.9) return "loanPenaltyEarly90";
    if (rate >= 0.6) return "loanPenaltyEarly60";
    return "loanPenaltyEarly30";
  }
  if (rate >= 0.9) return "loanPenaltyLate90";
  if (rate >= 0.6) return "loanPenaltyLate60";
  return "loanPenaltyLate30";
}

function renderLoanCardFromView(view) {
  const stage = stageFromBorrowedAt(view.borrowedAt);
  const feeRate = Number(view.penaltyBpsValue) / 10000;
  const rawBorrowedBnb = Number(ethers.formatEther(view.borrowedBnb));
  const rawStakeBaburu = Number(ethers.formatUnits(view.collateralAmount, 18));
  const statusKey = stage === "early" ? "loanEarlyTitle" : stage === "normal" ? "loanNormalTitle" : stage === "grace" ? "loanGraceTitle" : "loanLiquidationTitle";
  const feeKey = feeKeyFromStageAndRate(stage, feeRate);
  const helpMarkup =
    stage === "pending"
      ? `<div class="title-with-help loan-fee-with-help">
          <button
            class="help-dot"
            type="button"
            aria-expanded="false"
            aria-label="${currentLang === "zh" ? "查看为什么已经超时" : "Why is this overdue?"}"
            data-help-toggle="loan-${view.orderId}"
            onclick="window.toggleLoanHelp?.(this)"
          >?</button>
          <span class="loan-fee-chip">${t(feeKey)}</span>
          <span class="help-popover" hidden data-help-panel="loan-${view.orderId}">${t("overdueToyTooltip")}</span>
        </div>`
      : `<span class="loan-fee-chip">${t(feeKey)}</span>`;

  return `
    <article class="loan-card ${stage === "pending" ? "loan-card-disabled" : ""} tilt-card" data-order-id="${view.orderId}" data-stage="${stage}" data-repayable="${stage !== "pending"}" data-bnb="${rawBorrowedBnb}" data-stake="${rawStakeBaburu}" data-fee-rate="${feeRate}" data-start="${new Date(Number(view.borrowedAt) * 1000).toISOString()}">
      <label class="loan-select ${stage === "pending" ? "disabled" : ""}">
        <input class="loan-checkbox" type="checkbox" ${stage === "pending" ? "disabled" : ""} />
        <span></span>
      </label>
      <div class="loan-main">
        <div class="loan-corner-badges">
          <span class="status-pill ${statusClassFromStage(stage)}">${t(statusKey)}</span>
          ${helpMarkup}
        </div>
        <div class="loan-body">
          <div class="loan-meta">
            <span class="loan-line loan-line-stamp">${formatBorrowedAt(view.borrowedAt)}</span>
            <span class="loan-line loan-line-stake">${currentLang === "zh" ? "质押 " : "Stake "}${formatTokenAmount(view.collateralAmount)} BABURU</span>
            <span class="loan-line loan-line-borrowed">${currentLang === "zh" ? "借出 " : "Borrowed "}${formatBnbAmount(view.borrowedBnb)} BNB</span>
          </div>
        </div>
      </div>
    </article>
  `;
}

async function loadVaultMetrics() {
  try {
    const contracts = getReadContracts();
    if (!contracts) return;

    const [vaultBalance, activeLoans, rhoBps, activeCollateral, liquidatableSummary] = await Promise.all([
      getRpcProvider().getBalance(APP_CONFIG.kinkoAddress),
      contracts.kinko.activeOrderCount(),
      contracts.kinko.rhoBps(),
      contracts.kinko.activeCollateral(),
      contracts.kinko.liquidatableSummary(),
    ]);
    const liquidatableCollateral = Array.isArray(liquidatableSummary) ? liquidatableSummary[1] : liquidatableSummary.collateral;

    if (reserveMetric) animateMetricNumber(reserveMetric, Number(ethers.formatEther(vaultBalance)), { maximumFractionDigits: 2 });
    if (activeCollateralMetric) animateMetricNumber(activeCollateralMetric, Number(ethers.formatUnits(activeCollateral, 18)), { maximumFractionDigits: 0 });
    if (liquidatableCollateralMetric) animateMetricNumber(liquidatableCollateralMetric, Number(ethers.formatUnits(liquidatableCollateral, 18)), { maximumFractionDigits: 0 });
    if (activeLoansMetric) animateMetricNumber(activeLoansMetric, Number(activeLoans), { maximumFractionDigits: 0 });
    if (singleLoanRatioMetric) animateMetricNumber(singleLoanRatioMetric, Number(rhoBps) / 100, { maximumFractionDigits: 0, suffix: "%" });
  } catch {}
}

async function loadWalletBalances() {
  if (!connectedAddress || !APP_CONFIG.baburuTokenAddress) return;

  try {
    const contracts = getReadContracts();
    if (!contracts) return;
    latestWalletBaburuBalance = await contracts.baburu.balanceOf(connectedAddress);
    const walletAvailable = document.getElementById("wallet-available");
    if (walletAvailable) {
      walletAvailable.textContent = `${t("walletAvailable").split(":")[0]}: ${formatWalletTokenAmount(latestWalletBaburuBalance)}`;
    }
    if (stakeInput) {
      stakeInput.min = "0";
      stakeInput.step = "0.0001";
      stakeInput.max = ethers.formatUnits(latestWalletBaburuBalance, 18);
      if (getCollateralAmountWei() > latestWalletBaburuBalance && latestWalletBaburuBalance > 0n) {
        stakeInput.value = ethers.formatUnits(latestWalletBaburuBalance, 18);
      }
    }
  } catch {
    latestWalletBaburuBalance = 0n;
  }
}

function renderWalletLockedLoansState() {
  if (!loanList) return;
  loanList.innerHTML = `
    <article class="loan-empty-state">
      <strong data-i18n="walletLoansTitle">${t("walletLoansTitle")}</strong>
    </article>
  `;
  syncDomCollections();
  if (loanToolbar) loanToolbar.hidden = true;
  if (confirmRepaymentButton) confirmRepaymentButton.disabled = true;
  repaySummary.textContent = t("walletLoansTitle");
  repayPenalty.textContent = "";
  renderSelectAllButton();
}

async function loadBorrowerLoans() {
  if (!connectedAddress || !APP_CONFIG.kinkoAddress || !loanList) {
    renderWalletLockedLoansState();
    return;
  }

  try {
    const contracts = getReadContracts();
    if (!contracts) return;
    const views = await contracts.kinko.getBorrowerOrderViews(connectedAddress);

    if (!views.length) {
      loanList.innerHTML = `
        <article class="loan-empty-state">
          <strong data-i18n="emptyLoansTitle">${t("emptyLoansTitle")}</strong>
        </article>
      `;
      syncDomCollections();
      if (loanToolbar) loanToolbar.hidden = false;
      if (confirmRepaymentButton) confirmRepaymentButton.disabled = true;
      updateRepaySummary();
      renderSelectAllButton();
      return;
    }

    const sortedViews = [...views].sort((a, b) => Number(b.borrowedAt) - Number(a.borrowedAt));
    loanList.innerHTML = sortedViews.map(renderLoanCardFromView).join("");
    syncDomCollections();
    if (loanToolbar) loanToolbar.hidden = false;
    if (confirmRepaymentButton) confirmRepaymentButton.disabled = false;
    renderLoanCards();
    applyLoanFilter(activeLoanFilter);
  } catch {
    renderWalletLockedLoansState();
  }
}

function renderLoanCards() {
  loanCards.forEach((card) => {
    const startAt = new Date(card.dataset.start);
    if (Number.isNaN(startAt.getTime())) return;

    const timing = getLoanTimingState(startAt);
    const checkbox = card.querySelector(".loan-checkbox");
    const select = card.querySelector(".loan-select");
    const statusPill = card.querySelector(".status-pill");
    const feeChip = card.querySelector(".loan-fee-chip");

    card.dataset.stage = timing.stage;
    card.dataset.feeRate = String(timing.rate);
    card.dataset.feeBaburu = String(Math.round(Number(card.dataset.stake) * timing.rate));
    card.dataset.repayable = String(timing.stage !== "pending");

    if (statusPill) {
      statusPill.textContent = t(timing.statusKey);
      statusPill.dataset.i18n = timing.statusKey;
      statusPill.classList.toggle("status-early", timing.stage === "early");
      statusPill.classList.toggle("status-good", timing.stage === "normal");
      statusPill.classList.toggle("status-warn", timing.stage === "grace");
      statusPill.classList.toggle("status-danger", timing.stage === "pending");
    }

    if (feeChip) {
      feeChip.textContent = t(timing.feeKey);
      feeChip.dataset.i18n = timing.feeKey;
    }

    if (checkbox) {
      checkbox.disabled = timing.stage === "pending";
      if (timing.stage === "pending") checkbox.checked = false;
    }

    card.classList.toggle("loan-card-disabled", timing.stage === "pending");
    select?.classList.toggle("disabled", timing.stage === "pending");
  });
}

function updateRepaySummary() {
  let selectedCount = 0;
  let totalBnb = 0;
  let totalFeeBaburu = 0;
  let totalStakeBaburu = 0;

  checkboxes.forEach((checkbox) => {
    const card = checkbox.closest(".loan-card");
    card?.classList.toggle("is-selected", checkbox.checked && !checkbox.disabled && !card?.hidden);
    if (!checkbox.checked || checkbox.disabled) return;

    if (card?.hidden) return;
    const stakeBaburu = Number(card.dataset.stake);
    const feeRate = Number(card.dataset.feeRate || 0);

    totalBnb += Number(card.dataset.bnb);
    totalFeeBaburu += Math.round(stakeBaburu * feeRate);
    totalStakeBaburu += stakeBaburu;
    selectedCount += 1;
  });

  const returnedBaburu = Math.max(0, totalStakeBaburu - totalFeeBaburu);

  repaySummary.textContent = t("repaySummary", {
    count: selectedCount,
    totalBnb,
    returnedBaburu,
    formatNumber,
    formatBnbValue,
  });
  repayPenalty.textContent = t("repayPenalty", {
    count: selectedCount,
    totalFeeBaburu,
    formatNumber,
  });

  const shouldShowRepayBar = selectedCount > 0;
  const repayBar = document.getElementById("repay-bar");
  if (repayBar) {
    repayBar.classList.toggle("is-collapsed", !shouldShowRepayBar);
    repayBar.setAttribute("aria-hidden", String(!shouldShowRepayBar));
  }

  renderSelectAllButton();
}

function getVisibleRepayableCheckboxes() {
  return checkboxes.filter((checkbox) => {
    const card = checkbox.closest(".loan-card");
    return !checkbox.disabled && card && !card.hidden;
  });
}

function renderSelectAllButton() {
  if (!selectAllOrdersButton) return;
  const visibleCheckboxes = getVisibleRepayableCheckboxes();
  const allSelected = visibleCheckboxes.length > 0 && visibleCheckboxes.every((checkbox) => checkbox.checked);
  selectAllOrdersButton.textContent = t(allSelected ? "clearSelectedOrders" : "selectAllOrders");
  selectAllOrdersButton.disabled = visibleCheckboxes.length === 0;
}

function applyLoanFilter(filter) {
  activeLoanFilter = filter;

  loanFilterButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === filter);
  });

  loanCards.forEach((card) => {
    const matches = filter === "all" || card.dataset.stage === filter;
    card.hidden = !matches;
    if (!matches) {
      const checkbox = card.querySelector(".loan-checkbox");
      if (checkbox) checkbox.checked = false;
    }
  });

  updateRepaySummary();
}

function setupLoanFilters() {
  loanFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyLoanFilter(button.dataset.filter);
    });
  });

  selectAllOrdersButton?.addEventListener("click", () => {
    const visibleCheckboxes = getVisibleRepayableCheckboxes();
    const shouldSelect = !visibleCheckboxes.every((checkbox) => checkbox.checked);
    visibleCheckboxes.forEach((checkbox) => {
      checkbox.checked = shouldSelect;
    });
    updateRepaySummary();
  });

  renderSelectAllButton();
}

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("baburu-lang", lang);
  applyTranslations();
  renderWalletButton();
  void updateBorrowEstimate();
  updateRepaySummary();
  void updateDebugStrip();
  renderBorrowRefreshMeta();
}

async function hydrateWalletState() {
  const lastWalletLabel = localStorage.getItem(LAST_WALLET_LABEL_KEY);

  if (lastWalletLabel) {
    try {
      const wallets = await onboard.connectWallet({
        autoSelect: {
          label: lastWalletLabel,
          disableModals: true,
        },
      });
      connectedWallet = wallets?.[0] || null;
    } catch {
      localStorage.removeItem(LAST_WALLET_LABEL_KEY);
    }
  }

  try {
    const state = onboard.state.get();
    connectedWallet = state.wallets?.[0] || null;
    connectedAddress = connectedWallet?.accounts?.[0]?.address || "";
    browserProvider = connectedWallet ? new ethers.BrowserProvider(connectedWallet.provider, "any") : undefined;
    walletSigner = null;
  } catch {
    connectedAddress = "";
    connectedWallet = null;
    browserProvider = undefined;
  }

  renderWalletButton();
  if (connectedAddress) {
    await Promise.all([loadWalletBalances(), loadBorrowerLoans()]);
    setActionStatus(borrowStatus, "borrowReadyHint", "idle");
    setActionStatus(repayStatus, "repayReadyHint", "idle");
  }
  await updateDebugStrip();
  await syncBorrowActionLabel();
}

async function readBorrowPaused() {
  if (!APP_CONFIG.kinkoAddress) {
    bannerState = "open";
    renderBanner();
    return;
  }

  try {
    const contracts = getReadContracts();
    if (!contracts) throw new Error("contracts unavailable");
    bannerState = (await contracts.kinko.borrowPaused()) ? "paused" : "open";
  } catch {
    bannerState = "open";
  }

  renderBanner();
}

async function connectWallet() {
  if (!walletButton) return;

  if (connectedWallet?.label) {
    await onboard.disconnectWallet({ label: connectedWallet.label });
    localStorage.removeItem(LAST_WALLET_LABEL_KEY);
    connectedWallet = null;
    connectedAddress = "";
    browserProvider = undefined;
    walletSigner = null;
    renderWalletButton();
    await loadBorrowerLoans();
    setActionStatus(borrowStatus, "borrowReadyHint", "idle");
    setActionStatus(repayStatus, "repayReadyHint", "idle");
    await updateDebugStrip();
    await syncBorrowActionLabel();
    return;
  }

  try {
    const wallets = await onboard.connectWallet();
    connectedWallet = wallets?.[0] || null;
    connectedAddress = connectedWallet?.accounts?.[0]?.address || "";
    browserProvider = connectedWallet ? new ethers.BrowserProvider(connectedWallet.provider, "any") : undefined;
    walletSigner = null;
    if (connectedWallet?.label) {
      localStorage.setItem(LAST_WALLET_LABEL_KEY, connectedWallet.label);
    }
  } catch {
    connectedAddress = "";
    connectedWallet = null;
    browserProvider = undefined;
  }

  renderWalletButton();
  if (connectedAddress) {
    await Promise.all([loadWalletBalances(), loadBorrowerLoans(), updateBorrowEstimate()]);
    setActionStatus(borrowStatus, "borrowReadyHint", "idle");
    setActionStatus(repayStatus, "repayReadyHint", "idle");
  } else {
    await syncBorrowActionLabel();
  }
  await updateDebugStrip();
}

function setupReveal() {
  if (prefersReducedMotion) {
    sections.forEach((section) => section.classList.add("is-visible"));
    return;
  }

  sections.forEach((section, index) => {
    section.style.setProperty("--reveal-delay", `${Math.min(index * 70, 280)}ms`);
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("is-visible");
      });
    },
    { threshold: 0.16 }
  );

  sections.forEach((section) => observer.observe(section));
}

function setupNav() {
  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = document.querySelector(button.dataset.target);
      if (!target) return;

      navButtons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
    });
  });
}

function animateCounters() {
  const counters = [...document.querySelectorAll(".counter")];

  counters.forEach((counter) => {
    const endValue = Number(counter.dataset.value);
    if (!Number.isFinite(endValue)) return;
    const decimals = endValue % 1 === 0 ? 0 : 2;
    const duration = prefersReducedMotion ? 0 : 1400;
    const start = performance.now();

    function frame(now) {
      if (duration === 0) {
        counter.textContent = formatNumber(endValue, decimals);
        return;
      }

      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = endValue * eased;
      counter.textContent = formatNumber(current, decimals);

      if (progress < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  });
}

async function refreshVaultReadOnlyData() {
  if (vaultRefreshInFlight) return;
  vaultRefreshInFlight = true;
  try {
    const tasks = [loadVaultMetrics(), readBorrowPaused()];

    if (connectedAddress) {
      tasks.push(loadWalletBalances());
    }

    await Promise.all(tasks);
    await updateBorrowEstimate();
    nextVaultRefreshAt = Date.now() + VAULT_REFRESH_INTERVAL_MS;
    renderBorrowRefreshMeta();
  } finally {
    vaultRefreshInFlight = false;
  }
}

function setupVaultAutoRefresh() {
  if (vaultClockTimer) {
    window.clearInterval(vaultClockTimer);
  }

  nextVaultRefreshAt = Date.now() + VAULT_REFRESH_INTERVAL_MS;
  renderBorrowRefreshMeta();

  vaultClockTimer = window.setInterval(() => {
    renderBorrowRefreshMeta();
    if (document.visibilityState !== "visible") return;
    if (Date.now() < nextVaultRefreshAt) return;
    void refreshVaultReadOnlyData();
  }, 250);

  document.addEventListener("visibilitychange", () => {
    renderBorrowRefreshMeta();
  });

  window.addEventListener("focus", () => {
    renderBorrowRefreshMeta();
  });
}

function setupTilt() {
  if (prefersReducedMotion || window.innerWidth < 960) return;

  const cards = [...document.querySelectorAll(".tilt-card")];
  cards.forEach((card) => {
    card.addEventListener("mousemove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      card.style.setProperty("--tilt-y", `${(x - 0.5) * 6}deg`);
      card.style.setProperty("--tilt-x", `${(0.5 - y) * 6}deg`);
    });

    card.addEventListener("mouseleave", () => {
      card.style.setProperty("--tilt-y", "0deg");
      card.style.setProperty("--tilt-x", "0deg");
    });
  });
}

function setupPointerGlow() {
  if (prefersReducedMotion) return;

  window.addEventListener("pointermove", (event) => {
    const x = (event.clientX / window.innerWidth) * 100;
    const y = (event.clientY / window.innerHeight) * 100;
    document.body.style.setProperty("--pointer-x", `${x}%`);
    document.body.style.setProperty("--pointer-y", `${y}%`);
  });
}

function setupLanguageSwitch() {
  langToggle?.addEventListener("click", () => {
    setLanguage(currentLang === "zh" ? "en" : "zh");
  });
}

function setupBannerClose() {
  window.dismissTopBanner = () => {
    localStorage.setItem(BANNER_DISMISSED_KEY, "true");
    if (!topStatusBanner) return;
    if (prefersReducedMotion) {
      topStatusBanner.hidden = true;
      return;
    }
    topStatusBanner.classList.add("is-closing");
    window.setTimeout(() => {
      if (localStorage.getItem(BANNER_DISMISSED_KEY) === "true") {
        topStatusBanner.hidden = true;
      }
    }, 220);
  };

  bannerCloseButton?.addEventListener("click", () => {
    window.dismissTopBanner?.();
  });
}

function setupBorrowActions() {
  maxStakeButton?.addEventListener("click", () => {
    if (!stakeInput) return;
    if (latestWalletBaburuBalance > 0n) {
      stakeInput.value = ethers.formatUnits(latestWalletBaburuBalance, 18);
    } else {
      stakeInput.value = "0";
    }
    updateBorrowEstimate();
    setBorrowStep(0);
  });

  borrowActionButton?.addEventListener("click", async () => {
    const onRightNetwork = await ensureSupportedNetwork().catch(() => false);
    if (!onRightNetwork) {
      setActionStatus(borrowStatus, "borrowStatusWrongNetwork", "warn");
      return;
    }

    const contracts = await getWriteContracts();
    if (!contracts) return;

    const collateralAmount = getCollateralAmountWei();
    const minBorrowBps = BigInt(ratioInput.value);
    const refBorrowWei = latestBorrowQuoteWei;

    if (collateralAmount <= 0n) {
      setActionMessage(
        borrowStatus,
        currentLang === "zh" ? "请先输入有效的质押数量。" : "Enter a valid collateral amount first.",
        "warn"
      );
      return;
    }

    if (latestWalletBaburuBalance < collateralAmount) {
      setActionMessage(
        borrowStatus,
        currentLang === "zh" ? "当前质押数量已超过你的 BABURU 余额。" : "The selected collateral exceeds your BABURU balance.",
        "warn"
      );
      return;
    }

    if (refBorrowWei <= 0n) {
      setActionMessage(
        borrowStatus,
        currentLang === "zh" ? "当前预计借款为 0，请调整质押数量后再试。" : "The current borrow quote is 0. Increase the collateral and try again.",
        "warn"
      );
      return;
    }

    borrowActionButton.disabled = true;
    try {
      const currentAllowance = await contracts.baburu.allowance(connectedAddress, APP_CONFIG.kinkoAddress);
      if (currentAllowance < collateralAmount) {
        setActionStatus(borrowStatus, "borrowStatusApproving", "busy");
        const approveTx = await contracts.baburu.approve(APP_CONFIG.kinkoAddress, collateralAmount);
        await approveTx.wait();
        setBorrowStep(1);
      }

      setBorrowStep(2);
      setActionStatus(borrowStatus, "borrowStatusBorrowing", "busy");
      const tx = await contracts.kinko.borrow(collateralAmount, refBorrowWei, minBorrowBps);
      await tx.wait();
      await Promise.all([loadVaultMetrics(), loadWalletBalances(), loadBorrowerLoans(), updateBorrowEstimate()]);
      setActionStatus(borrowStatus, "borrowStatusSuccess", "success");
      document.querySelector("#loans")?.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
    } catch (error) {
      console.error("Borrow flow failed:", error);
      setActionMessage(borrowStatus, humanizeContractError(error, "borrow"), "error");
    } finally {
      borrowActionButton.disabled = false;
      await syncBorrowActionLabel();
    }
  });
}

function toggleLoanHelp(toggle) {
  const key = toggle?.dataset.helpToggle;
  if (!key) return;

  const card = toggle.closest(".loan-card");
  const wrapper = toggle.closest(".title-with-help");
  const panel = wrapper?.querySelector(`[data-help-panel="${key}"]`);
  if (!panel) return;

  const nextExpanded = toggle.getAttribute("aria-expanded") !== "true";
  toggle.setAttribute("aria-expanded", String(nextExpanded));
  panel.hidden = !nextExpanded;
  if (card) card.style.zIndex = nextExpanded ? "120" : "0";

  const existingTimer = helpHideTimers.get(key);
  if (existingTimer) {
    window.clearTimeout(existingTimer);
    helpHideTimers.delete(key);
  }

  if (nextExpanded) {
    const timer = window.setTimeout(() => {
      toggle.setAttribute("aria-expanded", "false");
      panel.hidden = true;
      if (card) card.style.zIndex = "0";
      helpHideTimers.delete(key);
    }, 3200);
    helpHideTimers.set(key, timer);
  }
}

function setupHelpToggles() {
  window.toggleLoanHelp = toggleLoanHelp;
}

function setupRepayActions() {
  confirmRepaymentButton?.addEventListener("click", async () => {
    const onRightNetwork = await ensureSupportedNetwork().catch(() => false);
    if (!onRightNetwork) {
      setActionStatus(repayStatus, "repayStatusWrongNetwork", "warn");
      return;
    }

    const contracts = await getWriteContracts();
    if (!contracts || !connectedAddress) return;

    const selectedOrderIds = checkboxes
      .filter((checkbox) => checkbox.checked && !checkbox.disabled)
      .map((checkbox) => checkbox.closest(".loan-card")?.dataset.orderId)
      .filter(Boolean)
      .map((id) => BigInt(id));

    if (!selectedOrderIds.length) {
      updateRepaySummary();
      setActionStatus(repayStatus, "repayStatusNeedSelection", "warn");
      return;
    }

    confirmRepaymentButton.disabled = true;
    try {
      const [totalBnbDue] = await contracts.kinko.previewRepay(connectedAddress, selectedOrderIds);

      setActionStatus(repayStatus, "repayStatusRepaying", "busy");
      const tx = await contracts.kinko.repay(selectedOrderIds, { value: totalBnbDue });
      await tx.wait();
      await Promise.all([loadVaultMetrics(), loadWalletBalances(), loadBorrowerLoans(), updateBorrowEstimate()]);
      setActionStatus(repayStatus, "repayStatusSuccess", "success");
      document.querySelector("#repay-bar")?.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "nearest",
      });
    } catch (error) {
      console.error("Repay flow failed:", error);
      setActionMessage(repayStatus, humanizeContractError(error, "repay"), "error");
    } finally {
      confirmRepaymentButton.disabled = false;
    }
  });
}

function setupPublicLiquidation() {
  publicLiquidationButton?.addEventListener("click", async () => {
    const onRightNetwork = await ensureSupportedNetwork().catch(() => false);
    if (!onRightNetwork) {
      setActionStatus(repayStatus, "repayStatusWrongNetwork", "warn");
      return;
    }

    const contracts = await getWriteContracts();
    if (!contracts) return;

    const readContracts = getReadContracts();
    const summary = readContracts ? await readContracts.kinko.liquidatableSummary() : null;
    const liquidatableCount = summary ? (Array.isArray(summary) ? summary[0] : summary.count) : 0n;
    if (!liquidatableCount || liquidatableCount === 0n) {
      setActionMessage(repayStatus, t("liquidationNothingToProcess"), "warn");
      return;
    }

    publicLiquidationButton.disabled = true;
    try {
      setActionMessage(repayStatus, t("liquidationSubmitting"), "busy");
      const tx = await contracts.kinko.liquidateOverdue(liquidatableCount);
      await tx.wait();
      await Promise.all([loadVaultMetrics(), loadWalletBalances(), loadBorrowerLoans(), updateBorrowEstimate()]);
      setActionMessage(repayStatus, t("liquidationSuccess"), "success");
    } catch (error) {
      console.error("Public liquidation failed:", error);
      setActionMessage(repayStatus, humanizeContractError(error, "repay") || t("liquidationFailed"), "error");
    } finally {
      publicLiquidationButton.disabled = false;
    }
  });
}

function setupWalletButton() {
  walletButton?.addEventListener("click", connectWallet);

  onboard.state.select("wallets").subscribe(async (wallets) => {
    connectedWallet = wallets?.[0] || null;
    connectedAddress = connectedWallet?.accounts?.[0]?.address || "";
    browserProvider = connectedWallet ? new ethers.BrowserProvider(connectedWallet.provider, "any") : undefined;
    walletSigner = null;
    if (connectedWallet?.label) {
      localStorage.setItem(LAST_WALLET_LABEL_KEY, connectedWallet.label);
    } else {
      localStorage.removeItem(LAST_WALLET_LABEL_KEY);
    }
    renderWalletButton();
    await Promise.all([loadWalletBalances(), loadBorrowerLoans(), updateBorrowEstimate()]);
    setActionStatus(borrowStatus, "borrowReadyHint", "idle");
    setActionStatus(repayStatus, "repayReadyHint", "idle");
    await updateDebugStrip();
    await syncBorrowActionLabel();
  });
}

syncDomCollections();

stakeInput?.addEventListener("input", updateBorrowEstimate);
ratioInput?.addEventListener("input", () => {
  localStorage.setItem(LAST_RATIO_BPS_KEY, ratioInput.value);
  void updateBorrowEstimate();
});
window.addEventListener("resize", createBubbles);

applyTranslations();
createBubbles();
updateBorrowEstimate();
updateRepaySummary();
renderWalletButton();
renderBanner();
refreshVaultReadOnlyData();
setupReveal();
setupNav();
animateCounters();
setupTilt();
setupPointerGlow();
setupLanguageSwitch();
setupBannerClose();
setupBorrowActions();
setupHelpToggles();
setupRepayActions();
setupPublicLiquidation();
setupWalletButton();
setupLoanFilters();
setupBorrowRefreshMeta();
setupVaultAutoRefresh();
hydrateWalletState();
