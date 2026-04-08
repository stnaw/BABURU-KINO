#!/usr/bin/env python3
"""
简化模拟：税入 BNB、金库借贷（份额公式 + 总敞口 ≤ 0.7×金库总资产）、还款/违约。
非链上精确复现，用于数量级与情景对比。

假设：
- 金库总资产 T = vault_liquid + outstanding（BNB 在库内 + 借出未还）。
- 约束：outstanding ≤ 0.7 * T（与「可借池为总量 70%」一致）。
- 单笔理论可借 = stake/denom * T * 0.7，再与剩余额度、库内流动性取 min。
- denom = TOTAL_SUPPLY - burned - staked_before（文档公式）。
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Tuple

TOTAL_SUPPLY = 1_000_000_000


@dataclass
class Loan:
    principal_bnb: float
    stake_tokens: float
    day_opened: int
    repaid: bool = False
    defaulted: bool = False


@dataclass
class SimState:
    vault_liquid: float  # 库内闲置 BNB
    burned_tokens: float
    staked_tokens: float
    loans: List[Loan] = field(default_factory=list)
    day: int = 0

    def total_treasury_bnb(self) -> float:
        o = sum(l.principal_bnb for l in self.loans if not l.repaid and not l.defaulted)
        return self.vault_liquid + o

    def outstanding(self) -> float:
        return sum(l.principal_bnb for l in self.loans if not l.repaid and not l.defaulted)

    def lend_cap_remaining(self) -> float:
        t = self.total_treasury_bnb()
        return max(0.0, 0.7 * t - self.outstanding())


def try_borrow(
    s: SimState,
    stake_tokens: float,
    staked_before: float,
    day: int,
) -> Tuple[bool, float]:
    """尝试按公式借一笔；返回 (是否成功, 实际借出 BNB)。"""
    denom = TOTAL_SUPPLY - s.burned_tokens - staked_before
    if denom <= 0:
        return False, 0.0
    t = s.total_treasury_bnb()
    from_formula = (stake_tokens / denom) * t * 0.7
    cap_left = s.lend_cap_remaining()
    # 不能超过剩余授信，也不能超过库内现钱
    b = min(from_formula, cap_left, s.vault_liquid)
    if b <= 1e-12:
        return False, 0.0
    s.loans.append(Loan(principal_bnb=b, stake_tokens=stake_tokens, day_opened=day))
    s.vault_liquid -= b
    s.staked_tokens += stake_tokens
    return True, b


def repay_loan(s: SimState, loan: Loan) -> None:
    if loan.repaid or loan.defaulted:
        return
    s.vault_liquid += loan.principal_bnb
    s.staked_tokens -= loan.stake_tokens
    loan.repaid = True


def default_loan(s: SimState, loan: Loan) -> None:
    """超期：不还 BNB，销毁质押本币（计入 burned）。"""
    if loan.repaid or loan.defaulted:
        return
    s.burned_tokens += loan.stake_tokens
    s.staked_tokens -= loan.stake_tokens
    loan.defaulted = True


def scenario_stable() -> SimState:
    """温和：持续税入，分散借还小单。"""
    s = SimState(vault_liquid=500.0, burned_tokens=0.0, staked_tokens=0.0)
    for d in range(60):
        s.day = d
        s.vault_liquid += 20.0  # 每日税入 BNB（数量级）
        # 每 3 天来一个小借款人：质押 1e7 币
        if d % 3 == 0 and d < 45:
            st_before = s.staked_tokens
            stake = 10_000_000.0
            ok, b = try_borrow(s, stake, st_before, d)
        # 第 5 天起还 6 天前开的单（落在 [3,6) 无罚金窗口内简化处理）
        for loan in s.loans:
            if not loan.repaid and not loan.defaulted and d - loan.day_opened == 5:
                repay_loan(s, loan)
    return s


def scenario_borrow_rush() -> SimState:
    """第 0 天多人同时按最大公式抢借（顺序执行，观察先后差异）。"""
    s = SimState(vault_liquid=1000.0, burned_tokens=0.0, staked_tokens=0.0)
    s.day = 0
    stakes = [50_000_000.0] * 5  # 5 个地址各押 5e7
    for stake in stakes:
        st_before = s.staked_tokens
        try_borrow(s, stake, st_before, 0)
    return s


def scenario_mass_default() -> SimState:
    """借满后无人还款，第 10 天全部违约（>9 天）。"""
    s = SimState(vault_liquid=1000.0, burned_tokens=0.0, staked_tokens=0.0)
    s.day = 0
    # 一个大户尽量借
    for _ in range(20):
        st_before = s.staked_tokens
        try_borrow(s, 100_000_000.0, st_before, 0)
        if s.lend_cap_remaining() < 1e-6:
            break
    for d in range(1, 15):
        s.day = d
        s.vault_liquid += 5.0  # 税很弱
    s.day = 10
    for loan in list(s.loans):
        if not loan.repaid and not loan.defaulted and s.day - loan.day_opened >= 9:
            default_loan(s, loan)
    return s


def scenario_bull_then_dump() -> SimState:
    """前期税高+多借；后期税断、集中还款日卖压抽象为「部分违约」。"""
    s = SimState(vault_liquid=200.0, burned_tokens=0.0, staked_tokens=0.0)
    for d in range(15):
        s.day = d
        s.vault_liquid += 80.0
        if d < 8:
            st_before = s.staked_tokens
            try_borrow(s, 80_000_000.0, st_before, d)
    # 税断
    for d in range(15, 35):
        s.day = d
        s.vault_liquid += 0.0
    # 到期：一半还上一半违约
    open_loans = [l for l in s.loans if not l.repaid and not l.defaulted]
    for i, loan in enumerate(open_loans):
        if i % 2 == 0:
            repay_loan(s, loan)
        else:
            default_loan(s, loan)
    return s


def report(name: str, s: SimState) -> None:
    t = s.total_treasury_bnb()
    o = s.outstanding()
    print(f"\n=== {name} ===")
    print(f"  结束日: {s.day}")
    print(f"  库内闲置 BNB: {s.vault_liquid:.4f}")
    print(f"  未偿 BNB: {o:.4f}")
    print(f"  金库总资产 T (闲置+未偿): {t:.4f}")
    print(f"  未偿/总资产: {o/t*100:.2f}%" if t > 0 else "  N/A")
    print(f"  累计销毁本币(违约): {s.burned_tokens:,.0f}")
    print(f"  当前质押本币: {s.staked_tokens:,.0f}")
    print(f"  贷款笔数: {len(s.loans)}  已还 {sum(l.repaid for l in s.loans)}  违约 {sum(l.defaulted for l in s.loans)}")


def main() -> None:
    print("参数: TOTAL_SUPPLY =", TOTAL_SUPPLY)
    print("约束: outstanding <= 0.7 * (vault_liquid + outstanding)")

    scenarios = [
        ("温和（税+借还小单+第5天还）", scenario_stable()),
        ("第0天5户顺序抢借（各5e7质押）", scenario_borrow_rush()),
        ("尽量借满后第10天全体违约", scenario_mass_default()),
        ("牛段借入后税断+一半违约", scenario_bull_then_dump()),
    ]
    for name, st in scenarios:
        report(name, st)

    # 敏感性：初始库+税入 vs 最终可借出比例
    print("\n=== 敏感性：初始 1000 BNB、无税、单户无限次小额借，直到借不动 ===")
    s = SimState(vault_liquid=1000.0, burned_tokens=0.0, staked_tokens=0.0)
    s.day = 0
    count = 0
    while True:
        st_before = s.staked_tokens
        ok, b = try_borrow(s, 1_000_000.0, st_before, 0)
        if not ok:
            break
        count += 1
    report(f"连续借 1e6 质押/笔，共 {count} 笔后饱和", s)

    print("\n--- 结论（脚本层） ---")
    print("1) 在 O≤0.7T 约束下，金库总资产不变时「理论可借」有硬顶；先借者占用额度，后借者变少。")
    print("2) 违约不回流 BNB：未偿从会计上消失，vault_liquid 不增加 → 金库『净资产』下降，后续可借上限同步下降。")
    print("3) 税入是唯一可持续回补库内闲置 BNB 的来源（简化模型里）；税断则池子难以恢复。")
    print("4) 文档公式在多人顺序执行时，分母 staked_before 递增，同比例质押的后续借款人公式额度会变化。")


if __name__ == "__main__":
    main()
