const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const APP_CONFIG = {
  kinkoAddress: window.BABURU_CONFIG?.kinkoAddress || "",
  rpcUrl: window.BABURU_CONFIG?.rpcUrl || "https://bsc-dataseed.binance.org/",
  buyUrl: window.BABURU_CONFIG?.buyUrl || "#",
  nowTs: window.BABURU_CONFIG?.nowTs || "2026-04-08T12:00:00+08:00",
};

const translations = {
  zh: {
    pageTitle: "BABURU KINKO | 泡泡金库",
    pageDescription: "BABURU KINKO 前端界面，面向 BABURUSU 的链上借款、还款与借款管理。",
    navOverview: "概览",
    navBorrow: "借款",
    navLoans: "我的借款",
    navHelp: "帮助",
    connectWallet: "连接钱包",
    walletUnavailable: "未检测到钱包",
    heroBadge: "BABURU KINKO",
    heroTitle: "专属于 BABURUSU 的链上金库",
    heroDescription: "带上你的$BABURU，向 BABURU 金库借出专属于你的 BNB。",
    startEstimate: "预览借款",
    viewLoans: "查看我的借款",
    loanOpen: "BABURU 金库开启",
    bannerPrefix: "获取",
    bannerLinkText: "$BABURU",
    bannerSuffix: "开启专属于你的金库大门。",
    pausedBanner: "BABURU 金库维护中",
    overviewTitle: "金库状态",
    metricToyReserve: "BNB 库存",
    metricExposureNote: "活跃借款数",
    metricMarketNote: "BABURU 价格",
    metricSlippageNote: "单笔可借比例",
    borrowTitle: "借出 BNB",
    tabEstimate: "预览借款",
    tabApprove: "准备借款授权",
    tabConfirmLoan: "确认借款",
    stakeInputTitle: "带上你的 $BABURU",
    stakeAmount: "本次准备质押多少 $BABURU",
    walletAvailable: "钱包可用: 3,640,000",
    minBorrowRatio: "最小借出比例",
    ratioNote: "低于这个比例，本次借款不会成交",
    estimatedBorrow: "预计可借出的 BNB",
    refBorrowLabel: "预计借款",
    protectedFloor: "最小借款下限",
    borrowWindow: "借款时间窗口",
    windowBody: "3-6 天还款无需手续费",
    approveBaburu: "授权 BABURU",
    confirmBorrow: "确认借款",
    timelineTitle: "借款窗口",
    timelineSubtitle: "你会做出怎样的选择？",
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
    viewBreakdown: "查看借款明细",
    confirmRepayment: "确认还款",
    faqTitle: "金库手册",
    faqBlacklistQ: "金库黑名单",
    faqBlacklistA: "黑名单用于统计非活跃持仓，参与可借份额分母计算，例如 LP、交易所托管地址和 0x...dead。它的作用是避免这些份额与金库内活跃质押重复扣减，不是针对普通用户的钱包封禁。",
    blacklistLp: "LP: 0x6fe...c200",
    blacklistCustody: "CEX Custody: 0x194...a999",
    blacklistDead: "Dead: 0x000...dEaD",
    faq1Q: "BABURU 和 BABURU KINKO 是什么关系？",
    faq1A: "你可以向 BABURU KINO 质押 BABURU，无限次无息借出 BNB。",
    faqBaburuQ: "BABURU 是什么？",
    faqBaburuA: "BABURU 是 BABURU KINKO 的核心资产。持有 BABURU 后，你可以进入金库质押，并发起 BNB 借款。",
    faq2Q: "为什么试算和实际借款结果会不一样？",
    faq2A: "前端试算只反映当前链上快照。别人借款、黑名单持仓变动、金库 BNB 增减都会改变实时分母与可借额度，所以最终结果以链上执行时为准。",
    faqBorrowCapQ: "我单次能借到多少 BNB？",
    faqBorrowCapA: "单笔可借 BNB = 本次质押 BABURU / 可借份额分母 × (金库实时 BNB × ρ)。其中，可借份额分母 = 初始总量常量 − 黑名单地址持仓 − 金库内未结清质押；并且实际借出 BNB 不会超过借款执行前金库里的实时 BNB 余额。",
    faqFeeQ: "借款产生的手续费是什么？这些手续费去了哪里？",
    faqFeeA: "借款本身在正常时间窗口内可以 0 手续费归还；只有提前还款或宽限期还款时，才会按时间档位收取 BABURU 罚金。根据合约规则，收取到的罚金将立即链上销毁。",
    faq3Q: "最小可借比例有什么作用？",
    faq3A: "这是链上保护阈值。若实时借款结果低于你看到的参考值乘以该比例，这次借款就不会成功，避免实际成交金额明显少于预期。",
    faq4Q: "为什么超过 9 天后就不能还款？",
    faq4A: "根据合约规则，借款超期 9 天后会直接进入清算流程，不再支持普通还款。",
    mobileOrders: "借款",
    repaySummary: ({ count, totalBnb, returnedBaburu, formatNumber }) =>
      count > 0
        ? `已选中 ${count} 笔借款，归还 ${totalBnb.toFixed(3)} BNB，获得 ${formatNumber(returnedBaburu)} BABURU`
        : "还没有选中要还款的借款",
    repayPenalty: ({ count, totalFeeBaburu, formatNumber }) =>
      count > 0 ? `其中 BABURU 手续费合计 ${formatNumber(totalFeeBaburu)}。` : "选中后会在这里汇总可获得的 BABURU 与手续费",
  },
  en: {
    pageTitle: "BABURU KINKO | Bubble Vault",
    pageDescription: "BABURU KINKO interface for on-chain borrowing, repayment, and loan management for BABURUSU.",
    navOverview: "Overview",
    navBorrow: "Borrow",
    navLoans: "My Loans",
    navHelp: "Help",
    connectWallet: "Connect Wallet",
    walletUnavailable: "Wallet Not Found",
    heroBadge: "BABURU KINKO",
    heroTitle: "An on-chain vault made just for every BABURUSU.",
    heroDescription: "Bring your $BABURU and borrow your own BNB from BABURU KINKO.",
    startEstimate: "Preview Borrow",
    viewLoans: "View My Loans",
    loanOpen: "BABURU KINKO is open",
    bannerPrefix: "Get",
    bannerLinkText: "$BABURU",
    bannerSuffix: "to open the vault gate made for you.",
    pausedBanner: "BABURU KINKO is under maintenance",
    overviewTitle: "Vault Status",
    metricToyReserve: "BNB Reserve",
    metricExposureNote: "Active Loans",
    metricMarketNote: "BABURU Price",
    metricSlippageNote: "Single-Loan Ratio",
    borrowTitle: "Borrow BNB",
    tabEstimate: "Preview Borrow",
    tabApprove: "Approve Borrow",
    tabConfirmLoan: "Confirm Borrow",
    stakeInputTitle: "Bring Your $BABURU",
    stakeAmount: "How much $BABURU to bring",
    walletAvailable: "Wallet available: 3,640,000",
    minBorrowRatio: "Minimum Loan Ratio",
    ratioNote: "If it drops below this ratio, the borrow will not execute",
    estimatedBorrow: "Estimated BNB to Borrow",
    refBorrowLabel: "Estimated Borrow",
    protectedFloor: "Minimum Loan Floor",
    borrowWindow: "Borrow Window",
    windowBody: "Repay from day 3 to day 6 with no fee",
    approveBaburu: "Approve BABURU",
    confirmBorrow: "Confirm Borrow",
    timelineTitle: "Borrow Window",
    timelineSubtitle: "What kind of choice will you make?",
    timelineEarly6030: "Early Repayment Penalty",
    timelineEarlySteps: "90% → 60% → 30%",
    timelineNormal: "0% Fee Window",
    timelineNormalNote: "Best time to repay",
    timelineGrace: "Late Repayment Fee",
    timelineGraceSteps: "30% → 60% → 90%",
    timelineOverdue: "Loan Overdue",
    timelineOverdueNote: "Repayment unavailable, vault auto liquidation.",
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
    loanEarlyTitle: "Early",
    loanNormalTitle: "Normal",
    loanPenaltyZero: "0% Fee",
    loanPenaltyEarly90: "90% Early Repayment Penalty",
    loanPenaltyEarly60: "60% Early Repayment Penalty",
    loanPenaltyEarly30: "30% Early Repayment Penalty",
    loan1Stake: "Stake 1,200,000 BABURU",
    loan1Borrowed: "Borrowed 0.214 BNB",
    loan1StartTime: "Borrowed at: 2026-04-06 18:26",
    loanGraceTitle: "Grace",
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
    loanPublicLiquidationOnly: "Awaiting vault reclaim",
    viewBreakdown: "View Loan Details",
    confirmRepayment: "Confirm Repayment",
    faqTitle: "Vault Manual",
    faqBlacklistQ: "Vault Blacklist",
    faqBlacklistA: "The blacklist is used to count inactive balances in the borrow-share denominator, such as LP, exchange custody addresses, and 0x...dead. It prevents those balances from being deducted twice alongside active vault collateral, and it is not a ban on normal user wallets.",
    blacklistLp: "LP: 0x6fe...c200",
    blacklistCustody: "CEX Custody: 0x194...a999",
    blacklistDead: "Dead: 0x000...dEaD",
    faq1Q: "What is the relationship between BABURU and BABURU KINKO?",
    faq1A: "You can stake BABURU into BABURU KINO and borrow BNB interest-free with unlimited repeats.",
    faqBaburuQ: "What is BABURU?",
    faqBaburuA: "BABURU is the core asset of BABURU KINKO. Once you hold BABURU, you can stake it in the vault and start borrowing BNB.",
    faq2Q: "Why can the preview differ from the final borrow result?",
    faq2A: "The frontend preview is only a current snapshot. Other borrows, blacklist balance changes, and treasury BNB movement can change the live denominator and final borrowable amount before execution.",
    faqBorrowCapQ: "How much BNB can I borrow in one loan?",
    faqBorrowCapA: "Single-loan BNB = staked BABURU / borrow-share denominator × (live vault BNB × rho). Here, borrow-share denominator = initial total supply constant − blacklisted balances − unsettled vault collateral; and the actual borrowed BNB can never exceed the vault's live BNB balance right before execution.",
    faqFeeQ: "What fees can a loan generate, and where do they go?",
    faqFeeA: "A loan can be repaid with 0 fee during the normal time window. Fees only appear when repayment happens early or during the grace period, where BABURU penalties are charged by time tier. According to the contract rules, the collected penalties are immediately burned on-chain.",
    faq3Q: "What does the minimum borrow ratio do?",
    faq3A: "It is an on-chain protection threshold. If the live borrow result falls below your reference amount multiplied by this ratio, the transaction will not go through.",
    faq4Q: "Why can't I repay after 9 days?",
    faq4A: "According to the contract rules, once a loan is overdue for 9 days, it moves directly into the liquidation flow and no longer supports normal repayment.",
    mobileOrders: "Loans",
    repaySummary: ({ count, totalBnb, returnedBaburu, formatNumber }) =>
      count > 0
        ? `${count} loans selected, repay ${totalBnb.toFixed(3)} BNB to receive ${formatNumber(returnedBaburu)} BABURU`
        : "No loans selected for repayment",
    repayPenalty: ({ count, totalFeeBaburu, formatNumber }) =>
      count > 0 ? `Including ${formatNumber(totalFeeBaburu)} BABURU in total fees.` : "Select loans to see returned BABURU and total fees",
  },
};

let currentLang = localStorage.getItem("baburu-lang") || "en";
let connectedAddress = "";
let bannerState = "open";
const helpHideTimers = new Map();

const sections = [...document.querySelectorAll(".reveal")];
const navButtons = [...document.querySelectorAll(".nav-pill")];
const i18nNodes = [...document.querySelectorAll("[data-i18n]")];
const walletButton = document.getElementById("wallet-button");
const langToggle = document.getElementById("lang-toggle");
const helpPanels = [...document.querySelectorAll("[data-help-panel]")];
const helpToggles = [...document.querySelectorAll("[data-help-toggle]")];
const bannerTitle = document.querySelector('.banner-copy [data-i18n="loanOpen"]');
const bannerText = document.getElementById("banner-line");
const bannerPrefix = document.querySelector('.banner-copy [data-i18n="bannerPrefix"]');
const bannerSuffix = document.querySelector('.banner-copy [data-i18n="bannerSuffix"]');
const bannerBuyLink = document.getElementById("banner-buy-link");
const stakeInput = document.getElementById("stake-input");
const ratioInput = document.getElementById("ratio-input");
const maxStakeButton = document.getElementById("max-stake-button");
const approveBaburuButton = document.getElementById("approve-baburu-button");
const confirmBorrowButton = document.getElementById("confirm-borrow-button");
const viewBreakdownButton = document.getElementById("view-breakdown-button");
const confirmRepaymentButton = document.getElementById("confirm-repayment-button");
const stakeDisplay = document.getElementById("stake-display");
const ratioDisplay = document.getElementById("ratio-display");
const borrowEstimate = document.getElementById("borrow-estimate");
const refBorrow = document.getElementById("ref-borrow");
const minBorrow = document.getElementById("min-borrow");
const repaySummary = document.getElementById("repay-summary");
const repayPenalty = document.getElementById("repay-penalty");
const checkboxes = [...document.querySelectorAll(".loan-checkbox")];
const loanCards = [...document.querySelectorAll(".loan-card")];
const loanFilterButtons = [...document.querySelectorAll(".filter-chip[data-filter]")];
const selectAllOrdersButton = document.getElementById("select-all-orders");
const bubbleField = document.getElementById("bubble-field");
const pageDescription = document.getElementById("page-description");
const flowSteps = [...document.querySelectorAll(".flow-steps-panel .flow-step")];
let activeLoanFilter = "all";

function formatNumber(value, maximumFractionDigits = 0) {
  return new Intl.NumberFormat(currentLang === "zh" ? "zh-CN" : "en-US", {
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits,
  }).format(value);
}

function t(key, params) {
  const dict = translations[currentLang];
  const value = dict[key];
  if (typeof value === "function") return value(params);
  return value ?? key;
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

function shortenAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function renderWalletButton() {
  if (!walletButton) return;
  walletButton.textContent = connectedAddress ? shortenAddress(connectedAddress) : t("connectWallet");
}

function renderBanner() {
  if (!bannerTitle || !bannerText) return;

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

function updateBorrowEstimate() {
  const stake = Number(stakeInput.value);
  const minRatioBps = Number(ratioInput.value);
  const treasuryBnb = 482.36;
  const rho = 0.7;
  const effectiveSupply = 998_000_000;
  const estimate = (stake / effectiveSupply) * (treasuryBnb * rho);
  const protectedAmount = estimate * (minRatioBps / 10000);

  stakeDisplay.textContent = `${formatNumber(stake)} BABURU`;
  ratioDisplay.textContent = `${(minRatioBps / 100).toFixed(2)}%`;
  borrowEstimate.textContent = estimate.toFixed(3);
  refBorrow.textContent = `${estimate.toFixed(3)} BNB`;
  minBorrow.textContent = `${protectedAmount.toFixed(3)} BNB`;
}

function setBorrowStep(stepIndex) {
  flowSteps.forEach((step, index) => {
    step.classList.toggle("active", index === stepIndex);
  });
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
    if (!checkbox.checked || checkbox.disabled) return;

    const card = checkbox.closest(".loan-card");
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
  });
  repayPenalty.textContent = t("repayPenalty", {
    count: selectedCount,
    totalFeeBaburu,
    formatNumber,
  });

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
  updateBorrowEstimate();
  updateRepaySummary();
}

async function hydrateWalletState() {
  if (!window.ethereum) {
    renderWalletButton();
    return;
  }

  try {
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    connectedAddress = accounts?.[0] || "";
  } catch {
    connectedAddress = "";
  }

  renderWalletButton();
}

async function readBorrowPaused() {
  if (!APP_CONFIG.kinkoAddress) {
    bannerState = "open";
    renderBanner();
    return;
  }

  try {
    if (!window.ethers) throw new Error("ethers unavailable");
    const calldata = window.ethers.id("borrowPaused()").slice(0, 10);

    let result;
    if (window.ethereum) {
      result = await window.ethereum.request({
        method: "eth_call",
        params: [{ to: APP_CONFIG.kinkoAddress, data: calldata }, "latest"],
      });
    } else {
      const response = await fetch(APP_CONFIG.rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_call",
          params: [{ to: APP_CONFIG.kinkoAddress, data: calldata }, "latest"],
        }),
      });
      const payload = await response.json();
      result = payload.result;
    }

    bannerState = result && BigInt(result) === 1n ? "paused" : "open";
  } catch {
    bannerState = "open";
  }

  renderBanner();
}

async function connectWallet() {
  if (!walletButton) return;

  if (!window.ethereum) {
    walletButton.textContent = t("walletUnavailable");
    return;
  }

  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    connectedAddress = accounts?.[0] || "";
  } catch {
    connectedAddress = "";
  }

  renderWalletButton();
}

function setupReveal() {
  if (prefersReducedMotion) {
    sections.forEach((section) => section.classList.add("is-visible"));
    return;
  }

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

function setupBorrowActions() {
  maxStakeButton?.addEventListener("click", () => {
    if (!stakeInput) return;
    stakeInput.value = stakeInput.max;
    updateBorrowEstimate();
    setBorrowStep(0);
  });

  approveBaburuButton?.addEventListener("click", () => {
    setBorrowStep(1);
  });

  confirmBorrowButton?.addEventListener("click", () => {
    setBorrowStep(2);
    document.querySelector("#loans")?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
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
  viewBreakdownButton?.addEventListener("click", () => {
    document.querySelector("#loan-list")?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "nearest",
    });
  });

  confirmRepaymentButton?.addEventListener("click", () => {
    document.querySelector("#repay-bar")?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "nearest",
    });
    updateRepaySummary();
  });
}

function setupWalletButton() {
  walletButton?.addEventListener("click", connectWallet);

  if (window.ethereum?.on) {
    window.ethereum.on("accountsChanged", (accounts) => {
      connectedAddress = accounts?.[0] || "";
      renderWalletButton();
    });
  }
}

stakeInput?.addEventListener("input", updateBorrowEstimate);
ratioInput?.addEventListener("input", updateBorrowEstimate);
checkboxes.forEach((checkbox) => checkbox.addEventListener("change", updateRepaySummary));
window.addEventListener("resize", createBubbles);

applyTranslations();
createBubbles();
updateBorrowEstimate();
updateRepaySummary();
renderWalletButton();
renderBanner();
setupReveal();
setupNav();
animateCounters();
setupTilt();
setupPointerGlow();
setupLanguageSwitch();
setupBorrowActions();
setupHelpToggles();
setupRepayActions();
setupWalletButton();
setupLoanFilters();
hydrateWalletState();
readBorrowPaused();
