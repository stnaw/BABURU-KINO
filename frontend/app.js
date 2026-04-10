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
  localDevSignerAddress: window.BABURU_CONFIG?.localDevSignerAddress || "",
  localDevPrivateKey: window.BABURU_CONFIG?.localDevPrivateKey || "",
  nowTs: window.BABURU_CONFIG?.nowTs || "2026-04-08T12:00:00+08:00",
};
const LAST_WALLET_LABEL_KEY = "baburu-last-wallet-label";
const LAST_CONNECTED_ADDRESS_KEY = "baburu-last-connected-address";
const LAST_RATIO_BPS_KEY = "baburu-last-ratio-bps";
const BANNER_DISMISSED_KEY = "baburu-banner-dismissed";
const LOCAL_BORROWER_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const VAULT_REFRESH_INTERVAL_MS = 10000;
const MIN_FRONTEND_COLLATERAL_WEI = ethers.parseUnits("10000", 18);

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
];

const KINKO_ABI = [
  "function borrowPaused() view returns (bool)",
  "function owner() view returns (address)",
  "function rhoBps() view returns (uint256)",
  "function activeOrderCount() view returns (uint256)",
  "function activeCollateral() view returns (uint256)",
  "function liquidatableSummary() view returns (uint256 count,uint256 collateral)",
  "function treasurySnapshot() view returns (uint256 liveBalance,uint256 borrowedOutstanding,uint256 totalManaged)",
  "function quoteBorrow(uint256 collateralAmount) view returns (uint256)",
  "function previewRepay(address borrower,uint256[] orderIds) view returns (uint256 totalBnbDue,uint256 totalPenalty,uint256 repayableCount,uint256 liquidatableCount)",
  "function getBorrowerOrderViews(address borrower) view returns ((uint256 orderId,address borrower,uint256 collateralAmount,uint256 borrowedBnb,uint256 borrowedAt,uint256 penaltyBpsValue,uint256 penaltyAmount,bool repayable,bool liquidatable)[])",
  "function borrow(uint256 collateralAmount,uint256 refBorrow,uint256 minBorrowBps) returns (uint256 orderId,uint256 borrowedBnb)",
  "function repay(uint256[] orderIds) payable returns (uint256 totalPenalty)",
  "function liquidate(uint256[] orderIds)",
  "function liquidateOverdue(uint256 maxCount) returns (uint256 processedCount,uint256 burnedCollateral)",
  "function setBorrowPaused(bool paused)",
  "function setRhoBps(uint256 newRhoBps)",
  "function setBlacklist(address account,bool blacklisted)",
  "function transferOwnership(address newOwner)",
];

const translations = {
  zh: {
    pageTitle: "BABURU KINKO",
    pageDescription: "BABURU KINKO 前端界面，面向 BABURUSU 的链上借款、还款与借款管理。",
    navAriaLabel: "页面导航",
    bannerCloseAriaLabel: "关闭提示",
    borrowFlowAriaLabel: "借款流程",
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
    metricToyReserve: "可用 BNB",
    metricReserveLive: "实时余额",
    metricReserveTotal: "BNB 总量",
    metricActiveCollateral: "BABURU 已质押",
    metricPendingLiquidation: "BABURU 待清算",
    metricExposureNote: "活跃借款数",
    metricMarketNote: "BABURU",
    metricSlippageNote: "单笔可借比例",
    publicLiquidation: "整理金库",
    developerPanelLabel: "开发者面板",
    developerPanelTitle: "金库开发者入口",
    developerOwnerChip: ({ owner }) => `Owner ${owner}`,
    developerRhoChip: ({ rho }) => `ρ ${rho}`,
    developerBorrowLabel: "借款开关",
    developerBorrowOpen: "当前开放借款",
    developerBorrowPaused: "当前暂停借款",
    developerPauseBorrow: "暂停借款",
    developerResumeBorrow: "恢复借款",
    developerRhoLabel: "借款比例",
    developerRhoInputLabel: "新的 ρ（%）",
    developerUpdateRho: "更新 ρ",
    developerBlacklistLabel: "黑名单管理",
    developerBlacklistTitle: "增减黑名单地址",
    developerAddressLabel: "钱包地址",
    developerBlacklistAdd: "加入黑名单",
    developerBlacklistRemove: "移出黑名单",
    developerOwnerLabel: "Owner 管理",
    developerOwnerTitle: "转移合约 Owner",
    developerNewOwnerLabel: "新的 Owner 地址",
    developerTransferOwner: "转移 Owner",
    developerOwnerOnlyHint: "当前连接钱包不是合约 Owner",
    developerActionBusy: "正在提交开发者操作，请在钱包中确认。",
    developerPauseBorrowSuccess: "借款开关已更新",
    developerRhoSuccess: "ρ 已更新",
    developerBlacklistAddSuccess: "地址已加入黑名单",
    developerBlacklistRemoveSuccess: "地址已移出黑名单",
    developerTransferOwnerSuccess: "Owner 已转移",
    borrowTitle: "免息借出 BNB",
    tabEstimate: "免息借出 BNB",
    tabApprove: "钱包确认",
    tabConfirmLoan: "借款完成",
    stakeInputTitle: "带上你的 $BABURU",
    stakeAmount: "投入 $BABURU",
    stakeMinimumHint: "前端限制：单笔至少质押 10,000 BABURU",
    walletAvailable: "钱包可用: 3,640,000",
    minBorrowRatio: "最小借出比例",
    ratioNote: "低于这个比例，本次借款不会成交",
    estimatedBorrow: "预计可借出的 BNB",
    refBorrowLabel: "预计获得",
    protectedFloor: "最小获得",
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
    timelineOverdueNote: "不可还款，金库自动清算",
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
    borrowMinimumStake: "前端当前要求单笔质押不少于 10,000 BABURU。",
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
    navAriaLabel: "Page navigation",
    bannerCloseAriaLabel: "Dismiss notice",
    borrowFlowAriaLabel: "Borrow flow",
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
    metricToyReserve: "Available BNB",
    metricReserveLive: "Live Balance",
    metricReserveTotal: "Total BNB",
    metricActiveCollateral: "BABURU Staked",
    metricPendingLiquidation: "BABURU Pending Liquidation",
    metricExposureNote: "Active Loans",
    metricMarketNote: "BABURU",
    metricSlippageNote: "Single-Loan Ratio",
    publicLiquidation: "Vault Cleanup",
    developerPanelLabel: "Developer Panel",
    developerPanelTitle: "Vault Owner Controls",
    developerOwnerChip: ({ owner }) => `Owner ${owner}`,
    developerRhoChip: ({ rho }) => `ρ ${rho}`,
    developerBorrowLabel: "Borrow Toggle",
    developerBorrowOpen: "Borrowing is open",
    developerBorrowPaused: "Borrowing is paused",
    developerPauseBorrow: "Pause Borrow",
    developerResumeBorrow: "Resume Borrow",
    developerRhoLabel: "Borrow Ratio",
    developerRhoInputLabel: "New ρ (%)",
    developerUpdateRho: "Update ρ",
    developerBlacklistLabel: "Blacklist Control",
    developerBlacklistTitle: "Add or remove blacklist addresses",
    developerAddressLabel: "Wallet address",
    developerBlacklistAdd: "Add to Blacklist",
    developerBlacklistRemove: "Remove from Blacklist",
    developerOwnerLabel: "Owner Control",
    developerOwnerTitle: "Transfer contract ownership",
    developerNewOwnerLabel: "New owner address",
    developerTransferOwner: "Transfer Owner",
    developerOwnerOnlyHint: "The connected wallet is not the contract owner",
    developerActionBusy: "Submitting owner action. Please confirm in your wallet.",
    developerPauseBorrowSuccess: "Borrow toggle updated",
    developerRhoSuccess: "ρ updated",
    developerBlacklistAddSuccess: "Address added to blacklist",
    developerBlacklistRemoveSuccess: "Address removed from blacklist",
    developerTransferOwnerSuccess: "Owner transferred",
    borrowTitle: "Borrow Interest-Free BNB",
    tabEstimate: "Borrow Interest-Free BNB",
    tabApprove: "Confirm Wallet",
    tabConfirmLoan: "Complete Borrow",
    stakeInputTitle: "Bring Your $BABURU",
    stakeAmount: "Deposit $BABURU",
    stakeMinimumHint: "Frontend limit: at least 10,000 BABURU per borrow",
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
    timelineOverdueNote: "Repayment unavailable. The vault will liquidate it automatically",
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
    borrowMinimumStake: "The frontend currently requires at least 10,000 BABURU per borrow.",
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
let forceBannerForLowBaburu = false;
let bannerWasVisible = false;
let pageReadyForBanner = document.readyState === "complete";
const helpHideTimers = new Map();
let browserProvider;
let rpcProvider;
let walletSigner;
let connectedWallet = null;
let latestBorrowQuoteWei = 0n;
let latestWalletBaburuBalance = 0n;
let exactStakeWeiOverride = null;
let vaultRefreshInFlight = false;
let vaultClockTimer = null;
let borrowPanelActive = false;
let nextVaultRefreshAt = Date.now() + VAULT_REFRESH_INTERVAL_MS;
let borrowerLoansRequestId = 0;
let vaultOwnerAddress = "";
let isVaultOwner = false;
let developerPanelOpen = false;

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
const reserveTotalMetric = document.getElementById("reserve-total-metric");
const activeCollateralMetric = document.getElementById("active-collateral-metric");
const liquidatableCollateralMetric = document.getElementById("liquidatable-collateral-metric");
const activeLoansMetric = document.getElementById("active-loans-metric");
const singleLoanRatioMetric = document.getElementById("single-loan-ratio-metric");
const publicLiquidationButton = document.getElementById("public-liquidation-button");
const developerPanelToggle = document.getElementById("developer-panel-toggle");
const developerPanel = document.getElementById("developer-panel");
const developerOwnerChip = document.getElementById("developer-owner-chip");
const developerRhoChip = document.getElementById("developer-rho-chip");
const developerBorrowState = document.getElementById("developer-borrow-state");
const developerBorrowToggle = document.getElementById("developer-borrow-toggle");
const developerRhoDisplay = document.getElementById("developer-rho-display");
const developerRhoInput = document.getElementById("developer-rho-input");
const developerRhoSubmit = document.getElementById("developer-rho-submit");
const developerBlacklistAddress = document.getElementById("developer-blacklist-address");
const developerBlacklistAdd = document.getElementById("developer-blacklist-add");
const developerBlacklistRemove = document.getElementById("developer-blacklist-remove");
const developerOwnerAddress = document.getElementById("developer-owner-address");
const developerOwnerSubmit = document.getElementById("developer-owner-submit");
const metricAnimationState = new WeakMap();
const borrowEstimateAnimationState = new WeakMap();
let activeLoanFilter = "all";
let toastHideTimer = null;
const SUBSCRIPT_DIGITS = { 0: "₀", 1: "₁", 2: "₂", 3: "₃", 4: "₄", 5: "₅", 6: "₆", 7: "₇", 8: "₈", 9: "₉" };

function toSubscriptDigits(value) {
  return String(Math.max(0, Number(value) || 0))
    .split("")
    .map((digit) => SUBSCRIPT_DIGITS[digit] || digit)
    .join("");
}

function formatWithTinySubscript(value, {
  minimumFractionDigits = 0,
  maximumFractionDigits = 0,
  tinyThreshold = 0,
  tinySignificantDigits = 4,
  tinyFixedDigits = 18,
} = {}) {
  if (!Number.isFinite(value)) return "--";

  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (tinyThreshold > 0 && absValue > 0 && absValue < tinyThreshold) {
    const fixed = absValue.toFixed(tinyFixedDigits);
    const [, fraction = ""] = fixed.split(".");
    const trimmedFraction = fraction.replace(/0+$/, "");
    const zeroCount = trimmedFraction.search(/[1-9]/);

    if (zeroCount >= 0) {
      const significant = trimmedFraction.slice(zeroCount, zeroCount + tinySignificantDigits) || "0";
      return `${sign}0.${toSubscriptDigits(zeroCount)}${significant}`;
    }
  }

  return new Intl.NumberFormat(currentLang === "zh" ? "zh-CN" : "en-US", {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}

function formatNumber(value, maximumFractionDigits = 0) {
  return formatWithTinySubscript(value, {
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits,
    tinyThreshold: maximumFractionDigits > 0 ? 1 / (10 ** maximumFractionDigits) : 0,
  });
}

function formatMetricDisplay(value, { maximumFractionDigits = 0, suffix = "" } = {}) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return {
      plainText: `--${suffix}`,
      markup: `--${suffix}`,
      isTiny: false,
    };
  }

  const plainText = `${formatNumber(numericValue, maximumFractionDigits)}${suffix}`;
  return {
    plainText,
    markup: plainText,
    isTiny: plainText.includes("₀") || plainText.includes("₁") || plainText.includes("₂") || plainText.includes("₃") || plainText.includes("₄") || plainText.includes("₅") || plainText.includes("₆") || plainText.includes("₇") || plainText.includes("₈") || plainText.includes("₉"),
  };
}

function renderMetricDisplay(node, value, options = {}) {
  const { plainText, markup, isTiny } = formatMetricDisplay(value, options);
  node.textContent = markup;
  node.setAttribute("aria-label", plainText);
  node.setAttribute("title", plainText);
  node.classList.toggle("metric-value-tiny", isTiny);
}

function animateMetricNumber(node, nextValue, { maximumFractionDigits = 0, suffix = "" } = {}) {
  if (!node || !Number.isFinite(nextValue)) return;

  const previous = metricAnimationState.get(node) ?? nextValue;
  const startValue = Number(previous);
  const targetValue = Number(nextValue);
  const metricCard = node.closest(".metric-card");
  const formatOptions = { maximumFractionDigits, suffix };

  if (!Number.isFinite(startValue) || Math.abs(targetValue - startValue) < 0.000001 || prefersReducedMotion) {
    renderMetricDisplay(node, targetValue, formatOptions);
    metricAnimationState.set(node, targetValue);
    return;
  }

  metricCard?.classList.remove("is-updating");
  window.requestAnimationFrame(() => {
    metricCard?.classList.add("is-updating");
  });
  window.setTimeout(() => {
    metricCard?.classList.remove("is-updating");
  }, 760);

  const duration = 860;
  const startAt = performance.now();

  function frame(now) {
    const progress = Math.min((now - startAt) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 5);
    const currentValue = startValue + (targetValue - startValue) * eased;
    renderMetricDisplay(node, currentValue, formatOptions);

    if (progress < 1) {
      requestAnimationFrame(frame);
      return;
    }

    metricAnimationState.set(node, targetValue);
  }

  requestAnimationFrame(frame);
}

function renderBorrowEstimateDisplay(node, value, { suffix = "" } = {}) {
  if (!node) return;
  const plainText = Number.isFinite(value) ? `${formatBnbValue(value)}${suffix}` : `--${suffix}`;
  node.textContent = plainText;
  node.setAttribute("aria-label", plainText);
  node.setAttribute("title", plainText);
}

function animateBorrowEstimateNumber(node, nextValue, { suffix = "" } = {}) {
  if (!node || !Number.isFinite(nextValue)) return;

  const previous = borrowEstimateAnimationState.get(node) ?? nextValue;
  const startValue = Number(previous);
  const targetValue = Number(nextValue);

  if (!Number.isFinite(startValue) || Math.abs(targetValue - startValue) < 0.000001 || prefersReducedMotion) {
    renderBorrowEstimateDisplay(node, targetValue, { suffix });
    borrowEstimateAnimationState.set(node, targetValue);
    return;
  }

  const duration = 860;
  const startAt = performance.now();

  function frame(now) {
    const progress = Math.min((now - startAt) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 5);
    const currentValue = startValue + (targetValue - startValue) * eased;
    renderBorrowEstimateDisplay(node, currentValue, { suffix });

    if (progress < 1) {
      requestAnimationFrame(frame);
      return;
    }

    borrowEstimateAnimationState.set(node, targetValue);
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

function setBorrowEstimateStatus(message = "", tone = "idle") {
  if (!borrowStatus) return;

  if (!message || tone === "idle") {
    borrowStatus.hidden = true;
    borrowStatus.textContent = "";
    borrowStatus.dataset.tone = "idle";
    return;
  }

  borrowStatus.hidden = false;
  borrowStatus.textContent = message;
  borrowStatus.dataset.tone = tone;
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

function canUseLocalDevSigner() {
  const isLocalHost = ["127.0.0.1", "localhost"].includes(window.location.hostname);
  const hasLocalKey = Boolean(APP_CONFIG.localDevPrivateKey && APP_CONFIG.localDevSignerAddress);
  const matchesConnected =
    connectedAddress &&
    APP_CONFIG.localDevSignerAddress &&
    connectedAddress.toLowerCase() === APP_CONFIG.localDevSignerAddress.toLowerCase();

  return isLocalHost && APP_CONFIG.chainId === 31337 && hasLocalKey && matchesConnected;
}

async function getBrowserProvider() {
  if (!connectedWallet?.provider) return null;
  if (!browserProvider) {
    browserProvider = new ethers.BrowserProvider(connectedWallet.provider, "any");
  }
  return browserProvider;
}

async function getSigner() {
  if (canUseLocalDevSigner()) {
    const provider = getRpcProvider();
    if (!provider) return null;
    return new ethers.Wallet(APP_CONFIG.localDevPrivateKey, provider);
  }

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

async function diagnoseLocalChainIssue() {
  if (!connectedAddress) {
    return currentLang === "zh" ? "请先连接钱包后再继续。" : "Connect your wallet before continuing.";
  }

  let rpcReachable = true;
  try {
    const provider = getRpcProvider();
    if (!provider) throw new Error("rpc unavailable");
    await provider.getBlockNumber();
  } catch {
    rpcReachable = false;
  }

  if (!rpcReachable) {
    return currentLang === "zh"
      ? "本地链节点当前不可用，请先启动本地服务后再试。"
      : "The local chain is not reachable right now. Start the local services and try again.";
  }

  let activeChainId = null;
  try {
    const chainIdHex = await connectedWallet?.provider?.request?.({ method: "eth_chainId" });
    activeChainId = chainIdHex ? Number.parseInt(chainIdHex, 16) : null;
  } catch {}

  if (activeChainId !== APP_CONFIG.chainId) {
    return currentLang === "zh"
      ? `当前钱包仍未切到 ${APP_CONFIG.chainId}，请切换网络后再试。`
      : `Your wallet is still not on chain ${APP_CONFIG.chainId}. Switch networks and try again.`;
  }

  try {
    const provider = await getBrowserProvider();
    const nativeBalance = provider ? await provider.getBalance(connectedAddress) : 0n;
    if (nativeBalance <= 0n) {
      return currentLang === "zh"
        ? "当前钱包地址没有本地链 ETH 支付 gas，请切换到有余额的测试账户。"
        : "This wallet address has no local-chain ETH for gas. Switch to a funded test account.";
    }
  } catch {}

  if (connectedAddress.toLowerCase() !== LOCAL_BORROWER_ADDRESS.toLowerCase()) {
    return currentLang === "zh"
      ? "当前连接的不是推荐的 Hardhat 测试账户，建议切换到测试账户后重试。"
      : "The connected wallet is not the recommended Hardhat test account. Switch to the test account and try again.";
  }

  return currentLang === "zh"
    ? "本地链连接异常，请断开钱包后重新连接本地测试链。"
    : "The local-chain session looks out of sync. Disconnect the wallet and reconnect to the local test chain.";
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
  document.querySelector(".nav-pills")?.setAttribute("aria-label", t("navAriaLabel"));
  document.getElementById("banner-close-button")?.setAttribute("aria-label", t("bannerCloseAriaLabel"));
  document.querySelector(".flow-steps-panel")?.setAttribute("aria-label", t("borrowFlowAriaLabel"));

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
  renderDeveloperPanelCopy();
  renderLoanCards();
}

function shortenAddress(address = "") {
  if (!address || address.length < 10) return address || "--";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatOwnerChipAddress(address = "") {
  return address ? shortenAddress(address) : "--";
}

function renderWalletButton() {
  if (!walletButton) return;
  walletButton.textContent = connectedAddress ? shortenAddress(connectedAddress) : t("connectWallet");
}

function canRestoreLocalDevSession(address) {
  if (!address || !APP_CONFIG.localDevSignerAddress) return false;
  const host = window.location.hostname;
  const isLocalHost = host === "127.0.0.1" || host === "localhost";
  return isLocalHost && address.toLowerCase() === APP_CONFIG.localDevSignerAddress.toLowerCase();
}

function renderBanner() {
  if (!bannerTitle || !bannerText || !topStatusBanner) return;

  if (!pageReadyForBanner) {
    topStatusBanner.hidden = true;
    return;
  }

  const wasHidden = topStatusBanner.hidden;
  topStatusBanner.classList.remove("is-closing");
  const shouldForceBanner = !connectedAddress || forceBannerForLowBaburu;
  const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY) === "true";
  topStatusBanner.hidden = shouldForceBanner ? false : dismissed;
  if (bannerCloseButton) bannerCloseButton.hidden = shouldForceBanner;
  if (topStatusBanner.hidden) {
    topStatusBanner.classList.remove("is-entering");
    bannerWasVisible = false;
    return;
  }

  if ((wasHidden || !bannerWasVisible) && !prefersReducedMotion) {
    topStatusBanner.classList.remove("is-entering");
    void topStatusBanner.offsetWidth;
    topStatusBanner.classList.add("is-entering");
    window.clearTimeout(topStatusBanner._enterTimer);
    topStatusBanner._enterTimer = window.setTimeout(() => {
      topStatusBanner.classList.remove("is-entering");
    }, 460);
  }

  bannerWasVisible = true;

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

function renderDeveloperPanel() {
  if (!developerPanelToggle || !developerPanel) return;

  developerPanelToggle.hidden = !isVaultOwner;
  developerPanelToggle.setAttribute("aria-expanded", String(isVaultOwner && developerPanelOpen));

  if (!isVaultOwner) {
    developerPanel.hidden = true;
    developerPanel.classList.remove("is-open");
    developerPanelOpen = false;
    return;
  }

  developerPanel.hidden = !developerPanelOpen;
  developerPanel.classList.toggle("is-open", developerPanelOpen);
}

function renderDeveloperPanelCopy() {
  if (developerOwnerChip) {
    developerOwnerChip.textContent = t("developerOwnerChip", {
      owner: formatOwnerChipAddress(vaultOwnerAddress),
    });
  }

  if (developerRhoChip) {
    developerRhoChip.textContent = t("developerRhoChip", {
      rho: developerRhoDisplay?.textContent || "--",
    });
  }

  if (developerBorrowState) {
    developerBorrowState.textContent = t(bannerState === "paused" ? "developerBorrowPaused" : "developerBorrowOpen");
  }

  if (developerBorrowToggle) {
    developerBorrowToggle.textContent = t(bannerState === "paused" ? "developerResumeBorrow" : "developerPauseBorrow");
  }
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

async function updateBorrowEstimate({ animateOnRefresh = false } = {}) {
  const stakeValue = normalizeTokenInput(stakeInput.value);
  const minRatioBps = Number(ratioInput.value);
  syncExactStakeOverride();
  const collateralAmount = exactStakeWeiOverride ?? ethers.parseUnits(stakeValue, 18);

  if (!connectedAddress) {
    latestBorrowQuoteWei = 0n;
    stakeDisplay.textContent = "-- BABURU";
    ratioDisplay.textContent = `${(minRatioBps / 100).toFixed(2)}%`;
    borrowEstimate.textContent = "--";
    refBorrow.textContent = "-- BNB";
    minBorrow.textContent = "-- BNB";
    borrowEstimateAnimationState.set(borrowEstimate, null);
    borrowEstimateAnimationState.set(refBorrow, null);
    borrowEstimateAnimationState.set(minBorrow, null);
    const walletAvailable = document.getElementById("wallet-available");
    if (walletAvailable) walletAvailable.textContent = "";
    setBorrowEstimateStatus();
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
        setBorrowEstimateStatus();
      }
    } catch (error) {
      estimate = 0;
      latestBorrowQuoteWei = 0n;
      const fallbackMessage = humanizeContractError(error, "borrow");
      const localHint = /could not coalesce/i.test(extractErrorText(error))
        ? await diagnoseLocalChainIssue()
        : null;
      setBorrowEstimateStatus(localHint || fallbackMessage, "warn");
    }
  } else {
    const treasuryBnb = 482.36;
    const rho = 0.7;
    const effectiveSupply = 998_000_000;
    estimate = (Number(stakeValue) / effectiveSupply) * (treasuryBnb * rho);
    latestBorrowQuoteWei = ethers.parseEther(estimate.toFixed(18));
    setBorrowEstimateStatus();
  }

  const protectedAmountWei = (latestBorrowQuoteWei * BigInt(minRatioBps)) / 10000n;

  stakeDisplay.textContent = `${formatTokenInputValue(collateralAmount)} BABURU`;
  ratioDisplay.textContent = `${(minRatioBps / 100).toFixed(2)}%`;
  const estimateValue = Number(ethers.formatEther(latestBorrowQuoteWei));
  const protectedValue = Number(ethers.formatEther(protectedAmountWei));
  if (animateOnRefresh) {
    animateBorrowEstimateNumber(borrowEstimate, estimateValue);
    animateBorrowEstimateNumber(refBorrow, estimateValue, { suffix: " BNB" });
    animateBorrowEstimateNumber(minBorrow, protectedValue, { suffix: " BNB" });
  } else {
    renderBorrowEstimateDisplay(borrowEstimate, estimateValue);
    renderBorrowEstimateDisplay(refBorrow, estimateValue, { suffix: " BNB" });
    renderBorrowEstimateDisplay(minBorrow, protectedValue, { suffix: " BNB" });
    borrowEstimateAnimationState.set(borrowEstimate, estimateValue);
    borrowEstimateAnimationState.set(refBorrow, estimateValue);
    borrowEstimateAnimationState.set(minBorrow, protectedValue);
  }
  await syncBorrowActionLabel();
}

function setBorrowStep(stepIndex) {
  flowSteps.forEach((step, index) => {
    step.classList.toggle("active", index === stepIndex);
  });
}

function getCollateralAmountWei() {
  syncExactStakeOverride();
  return exactStakeWeiOverride ?? ethers.parseUnits(normalizeTokenInput(stakeInput.value), 18);
}

async function syncBorrowActionLabel() {
  if (!borrowActionButton) return;

  let nextKey = "approveAndBorrow";
  let nextStep = 0;
  const collateralAmount = getCollateralAmountWei();

  if (!connectedAddress) {
    borrowActionButton.disabled = true;
  } else if (collateralAmount < MIN_FRONTEND_COLLATERAL_WEI) {
    borrowActionButton.disabled = true;
  } else {
    borrowActionButton.disabled = false;
    try {
      const contracts = getReadContracts();
      if (contracts) {
        const allowance = await contracts.baburu.allowance(connectedAddress, APP_CONFIG.kinkoAddress);
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
  return formatWithTinySubscript(Number(ethers.formatUnits(rawValue, 18)), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
    tinyThreshold: 0.0001,
  });
}

function normalizeTokenInput(value) {
  const normalized = String(value ?? "").trim().replace(/,/g, "");
  if (!normalized || normalized === ".") return "0";
  if (!/^\d*(\.\d*)?$/.test(normalized)) return "0";
  return normalized;
}

function syncExactStakeOverride() {
  if (!stakeInput) {
    exactStakeWeiOverride = null;
    return;
  }

  const normalizedValue = normalizeTokenInput(stakeInput.value);
  const normalizedMax = normalizeTokenInput(getMaxStakeValue());

  if (latestWalletBaburuBalance > 0n && normalizedValue === normalizedMax) {
    exactStakeWeiOverride = latestWalletBaburuBalance;
    return;
  }

  exactStakeWeiOverride = null;
}

function formatTokenInputValue(rawValue, maximumFractionDigits = 4) {
  return formatWithTinySubscript(Number(ethers.formatUnits(rawValue, 18)), {
    minimumFractionDigits: 0,
    maximumFractionDigits,
    tinyThreshold: 1 / (10 ** maximumFractionDigits),
  });
}

function formatWalletTokenAmount(rawValue) {
  return formatWithTinySubscript(Number(ethers.formatUnits(rawValue, 18)), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
    tinyThreshold: 0.0001,
  });
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

  if (absValue >= 0.000000000001) {
    return formatWithTinySubscript(value, {
      minimumFractionDigits: 8,
      maximumFractionDigits: 8,
      tinyThreshold: 0.00000001,
      tinySignificantDigits: 4,
      tinyFixedDigits: 20,
    });
  }

  return "<0.₁₁1";
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
      ? `<span class="borrow-refresh-number">${secondsLeft}</span><span class="borrow-refresh-unit">s</span><span>后刷新预估额度</span>`
      : `<span>Refreshing estimate in</span><span class="borrow-refresh-number">${secondsLeft}</span><span class="borrow-refresh-unit">s</span>`;
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

    const [treasurySnapshot, activeLoans, rhoBps, activeCollateral, liquidatableSummary] = await Promise.all([
      contracts.kinko.treasurySnapshot(),
      contracts.kinko.activeOrderCount(),
      contracts.kinko.rhoBps(),
      contracts.kinko.activeCollateral(),
      contracts.kinko.liquidatableSummary(),
    ]);
    const liveBalance = Array.isArray(treasurySnapshot) ? treasurySnapshot[0] : treasurySnapshot.liveBalance;
    const totalManaged = Array.isArray(treasurySnapshot) ? treasurySnapshot[2] : treasurySnapshot.totalManaged;
    const liquidatableCollateral = Array.isArray(liquidatableSummary) ? liquidatableSummary[1] : liquidatableSummary.collateral;

    if (reserveMetric) animateMetricNumber(reserveMetric, Number(ethers.formatEther(liveBalance)), { maximumFractionDigits: 2 });
    if (reserveTotalMetric) animateMetricNumber(reserveTotalMetric, Number(ethers.formatEther(totalManaged)), { maximumFractionDigits: 2 });
    if (activeCollateralMetric) animateMetricNumber(activeCollateralMetric, Number(ethers.formatUnits(activeCollateral, 18)), { maximumFractionDigits: 0 });
    if (liquidatableCollateralMetric) animateMetricNumber(liquidatableCollateralMetric, Number(ethers.formatUnits(liquidatableCollateral, 18)), { maximumFractionDigits: 0 });
    if (activeLoansMetric) animateMetricNumber(activeLoansMetric, Number(activeLoans), { maximumFractionDigits: 0 });
    if (singleLoanRatioMetric) animateMetricNumber(singleLoanRatioMetric, Number(rhoBps) / 100, { maximumFractionDigits: 0, suffix: "%" });
  } catch {}
}

async function refreshOwnerState() {
  const contracts = getReadContracts();
  if (!contracts || !APP_CONFIG.kinkoAddress) {
    vaultOwnerAddress = "";
    isVaultOwner = false;
    renderDeveloperPanelCopy();
    renderDeveloperPanel();
    return;
  }

  try {
    const [ownerAddress, rhoBpsValue] = await Promise.all([contracts.kinko.owner(), contracts.kinko.rhoBps()]);
    vaultOwnerAddress = ownerAddress;
    isVaultOwner = Boolean(
      connectedWallet &&
      connectedAddress &&
      ownerAddress &&
      connectedAddress.toLowerCase() === ownerAddress.toLowerCase()
    );

    if (developerRhoDisplay) {
      developerRhoDisplay.textContent = `${formatNumber(Number(rhoBpsValue) / 100, 0)}%`;
    }
    if (developerRhoInput && document.activeElement !== developerRhoInput) {
      developerRhoInput.value = (Number(rhoBpsValue) / 100).toString();
    }
  } catch {
    vaultOwnerAddress = "";
    isVaultOwner = false;
  }

  renderDeveloperPanelCopy();
  renderDeveloperPanel();
}

async function loadWalletBalances() {
  if (!connectedAddress || !APP_CONFIG.baburuTokenAddress) {
    latestWalletBaburuBalance = 0n;
    forceBannerForLowBaburu = true;
    renderBanner();
    return;
  }

  try {
    const contracts = getReadContracts();
    if (!contracts) return;
    latestWalletBaburuBalance = await contracts.baburu.balanceOf(connectedAddress);
    forceBannerForLowBaburu = latestWalletBaburuBalance <= ethers.parseUnits("1", 18);
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
    forceBannerForLowBaburu = true;
  }

  renderBanner();
}

function getMaxStakeValue() {
  if (latestWalletBaburuBalance > 0n) {
    return ethers.formatUnits(latestWalletBaburuBalance, 18);
  }

  if (stakeInput) {
    const fallbackMax = normalizeTokenInput(stakeInput.max);
    if (Number(fallbackMax) > 0) return fallbackMax;
  }

  return "0";
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
  const requestId = ++borrowerLoansRequestId;
  if (!connectedAddress || !APP_CONFIG.kinkoAddress || !loanList) {
    renderWalletLockedLoansState();
    return;
  }

  try {
    const contracts = getReadContracts();
    if (!contracts) return;
    const views = await contracts.kinko.getBorrowerOrderViews(connectedAddress);
    if (requestId !== borrowerLoansRequestId) return;

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
  } catch (error) {
    if (requestId !== borrowerLoansRequestId) return;
    if (!connectedAddress) {
      renderWalletLockedLoansState();
      return;
    }
    console.warn("loadBorrowerLoans failed, preserving current rendered loans:", error);
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
  const lastConnectedAddress = localStorage.getItem(LAST_CONNECTED_ADDRESS_KEY);

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

  if (!connectedAddress && canRestoreLocalDevSession(lastConnectedAddress)) {
    connectedAddress = lastConnectedAddress;
    connectedWallet = null;
    browserProvider = undefined;
  }

  renderWalletButton();
  if (connectedAddress) {
    localStorage.setItem(LAST_CONNECTED_ADDRESS_KEY, connectedAddress);
    await Promise.all([loadWalletBalances(), loadBorrowerLoans(), refreshOwnerState()]);
    setActionStatus(borrowStatus, "borrowReadyHint", "idle");
    setActionStatus(repayStatus, "repayReadyHint", "idle");
  } else {
    await refreshOwnerState();
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
    localStorage.removeItem(LAST_CONNECTED_ADDRESS_KEY);
    connectedWallet = null;
    connectedAddress = "";
    browserProvider = undefined;
    walletSigner = null;
    renderWalletButton();
    await loadBorrowerLoans();
    await refreshOwnerState();
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
    if (connectedAddress) {
      localStorage.setItem(LAST_CONNECTED_ADDRESS_KEY, connectedAddress);
    }
  } catch {
    connectedAddress = "";
    connectedWallet = null;
    browserProvider = undefined;
  }

  renderWalletButton();
  if (connectedAddress) {
    await Promise.all([loadWalletBalances(), loadBorrowerLoans(), updateBorrowEstimate(), refreshOwnerState()]);
    setActionStatus(borrowStatus, "borrowReadyHint", "idle");
    setActionStatus(repayStatus, "repayReadyHint", "idle");
  } else {
    await refreshOwnerState();
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
    const duration = prefersReducedMotion ? 0 : 1800;
    const start = performance.now();

    function frame(now) {
      if (duration === 0) {
        counter.textContent = formatNumber(endValue, decimals);
        return;
      }

      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 5);
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
    const tasks = [loadVaultMetrics(), readBorrowPaused(), refreshOwnerState()];

    if (connectedAddress) {
      tasks.push(loadWalletBalances());
    }

    await Promise.all(tasks);
    await updateBorrowEstimate({ animateOnRefresh: true });
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
    stakeInput.value = getMaxStakeValue();
    exactStakeWeiOverride = latestWalletBaburuBalance > 0n ? latestWalletBaburuBalance : null;
    stakeInput.dispatchEvent(new Event("input", { bubbles: true }));
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

    if (collateralAmount < MIN_FRONTEND_COLLATERAL_WEI) {
      setActionStatus(borrowStatus, "borrowMinimumStake", "warn");
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
      const fallbackMessage = humanizeContractError(error, "borrow");
      const localHint = /could not coalesce/i.test(extractErrorText(error))
        ? await diagnoseLocalChainIssue()
        : null;
      setActionMessage(borrowStatus, localHint || fallbackMessage, "error");
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
      const fallbackMessage = humanizeContractError(error, "repay");
      const localHint = /could not coalesce/i.test(extractErrorText(error))
        ? await diagnoseLocalChainIssue()
        : null;
      setActionMessage(repayStatus, localHint || fallbackMessage, "error");
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
      const fallbackMessage = humanizeContractError(error, "repay") || t("liquidationFailed");
      const localHint = /could not coalesce/i.test(extractErrorText(error))
        ? await diagnoseLocalChainIssue()
        : null;
      setActionMessage(repayStatus, localHint || fallbackMessage, "error");
    } finally {
      publicLiquidationButton.disabled = false;
    }
  });
}

function requireOwnerAccess() {
  if (isVaultOwner) return true;
  showFloatingToast(t("developerOwnerOnlyHint"), "warn");
  return false;
}

function parseRhoInputToBps() {
  const numeric = Number(developerRhoInput?.value);
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 100) return null;
  return BigInt(Math.round(numeric * 100));
}

async function runDeveloperAction(action, successKey) {
  if (!requireOwnerAccess()) return;

  const onRightNetwork = await ensureSupportedNetwork().catch(() => false);
  if (!onRightNetwork) {
    showFloatingToast(t("borrowStatusWrongNetwork"), "warn");
    return;
  }

  const contracts = await getWriteContracts();
  if (!contracts) return;

  try {
    showFloatingToast(t("developerActionBusy"), "busy");
    const tx = await action(contracts.kinko);
    await tx.wait();
    await Promise.all([refreshVaultReadOnlyData(), loadBorrowerLoans(), loadWalletBalances(), updateBorrowEstimate()]);
    showFloatingToast(t(successKey), "success");
  } catch (error) {
    const fallbackMessage = humanizeContractError(error, "borrow");
    const localHint = /could not coalesce/i.test(extractErrorText(error))
      ? await diagnoseLocalChainIssue()
      : null;
    showFloatingToast(localHint || fallbackMessage, "error");
  }
}

function setupDeveloperPanel() {
  developerPanelToggle?.addEventListener("click", () => {
    if (!isVaultOwner) return;
    developerPanelOpen = !developerPanelOpen;
    renderDeveloperPanel();
  });

  developerBorrowToggle?.addEventListener("click", async () => {
    const nextPaused = bannerState !== "paused";
    await runDeveloperAction((kinko) => kinko.setBorrowPaused(nextPaused), "developerPauseBorrowSuccess");
  });

  developerRhoSubmit?.addEventListener("click", async () => {
    const nextRhoBps = parseRhoInputToBps();
    if (nextRhoBps === null) {
      showFloatingToast(
        currentLang === "zh" ? "请输入 0-100 之间的有效 ρ 百分比" : "Enter a valid ρ percentage between 0 and 100",
        "warn"
      );
      return;
    }

    await runDeveloperAction((kinko) => kinko.setRhoBps(nextRhoBps), "developerRhoSuccess");
  });

  developerBlacklistAdd?.addEventListener("click", async () => {
    const address = developerBlacklistAddress?.value?.trim() || "";
    if (!ethers.isAddress(address)) {
      showFloatingToast(currentLang === "zh" ? "请输入有效的钱包地址" : "Enter a valid wallet address", "warn");
      return;
    }

    await runDeveloperAction((kinko) => kinko.setBlacklist(address, true), "developerBlacklistAddSuccess");
  });

  developerBlacklistRemove?.addEventListener("click", async () => {
    const address = developerBlacklistAddress?.value?.trim() || "";
    if (!ethers.isAddress(address)) {
      showFloatingToast(currentLang === "zh" ? "请输入有效的钱包地址" : "Enter a valid wallet address", "warn");
      return;
    }

    await runDeveloperAction((kinko) => kinko.setBlacklist(address, false), "developerBlacklistRemoveSuccess");
  });

  developerOwnerSubmit?.addEventListener("click", async () => {
    const address = developerOwnerAddress?.value?.trim() || "";
    if (!ethers.isAddress(address)) {
      showFloatingToast(currentLang === "zh" ? "请输入有效的新 Owner 地址" : "Enter a valid new owner address", "warn");
      return;
    }

    await runDeveloperAction((kinko) => kinko.transferOwnership(address), "developerTransferOwnerSuccess");
  });
}

function setupWalletButton() {
  walletButton?.addEventListener("click", connectWallet);

  onboard.state.select("wallets").subscribe(async (wallets) => {
    const nextWallet = wallets?.[0] || null;
    const nextAddress = nextWallet?.accounts?.[0]?.address || "";
    const persistedAddress = localStorage.getItem(LAST_CONNECTED_ADDRESS_KEY);

    connectedWallet = nextWallet;
    connectedAddress = nextAddress;
    browserProvider = connectedWallet ? new ethers.BrowserProvider(connectedWallet.provider, "any") : undefined;
    walletSigner = null;

    if (!connectedAddress && canRestoreLocalDevSession(persistedAddress)) {
      connectedWallet = null;
      connectedAddress = persistedAddress;
      browserProvider = undefined;
    }

    if (connectedWallet?.label) {
      localStorage.setItem(LAST_WALLET_LABEL_KEY, connectedWallet.label);
      if (connectedAddress) {
        localStorage.setItem(LAST_CONNECTED_ADDRESS_KEY, connectedAddress);
      }
    } else {
      localStorage.removeItem(LAST_WALLET_LABEL_KEY);
      if (!canRestoreLocalDevSession(localStorage.getItem(LAST_CONNECTED_ADDRESS_KEY))) {
        localStorage.removeItem(LAST_CONNECTED_ADDRESS_KEY);
      }
    }
    renderWalletButton();
    await Promise.all([loadWalletBalances(), loadBorrowerLoans(), updateBorrowEstimate(), refreshOwnerState()]);
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
window.addEventListener("load", () => {
  pageReadyForBanner = true;
  renderBanner();
});

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
setupDeveloperPanel();
setupWalletButton();
setupLoanFilters();
setupBorrowRefreshMeta();
setupVaultAutoRefresh();
hydrateWalletState();
