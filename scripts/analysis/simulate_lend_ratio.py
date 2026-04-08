#!/usr/bin/env python3
"""
扫描「可借上限 = ρ × 金库总资产 T」中的 ρ（文档里当前 ρ=0.7）。

指标：
1. 理论满借时：库内闲置 / T = 1−ρ（流动性缓冲）。
2. 未偿中有比例为 f 的本金永久损失（违约不还 BNB）：T′/T = 1 − ρ×f（闭式，与笔数无关）。
3. 数值饱和：多笔小质押借到借不动，校验 O/T ≈ ρ。

「更优」无单标：在 效率(ρ) 与 抗违约(1−ρ×f) 之间权衡，脚本输出 Pareto 与若干约束下的 ρ 上界。
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
    vault_liquid: float
    burned_tokens: float
    staked_tokens: float
    rho: float  # 最大未偿 / T
    loans: List[Loan] = field(default_factory=list)
    day: int = 0

    def total_treasury_bnb(self) -> float:
        o = self.outstanding()
        return self.vault_liquid + o

    def outstanding(self) -> float:
        return sum(l.principal_bnb for l in self.loans if not l.repaid and not l.defaulted)

    def lend_cap_remaining(self) -> float:
        t = self.total_treasury_bnb()
        return max(0.0, self.rho * t - self.outstanding())


def try_borrow(
    s: SimState,
    stake_tokens: float,
    staked_before: float,
    day: int,
) -> Tuple[bool, float]:
    denom = TOTAL_SUPPLY - s.burned_tokens - staked_before
    if denom <= 0:
        return False, 0.0
    t = s.total_treasury_bnb()
    from_formula = (stake_tokens / denom) * t * s.rho
    cap_left = s.lend_cap_remaining()
    b = min(from_formula, cap_left, s.vault_liquid)
    if b <= 1e-12:
        return False, 0.0
    s.loans.append(Loan(principal_bnb=b, stake_tokens=stake_tokens, day_opened=day))
    s.vault_liquid -= b
    s.staked_tokens += stake_tokens
    return True, b


def saturate_borrow(initial_bnb: float, rho: float) -> SimState:
    """无税，反复小押借到饱和。"""
    s = SimState(vault_liquid=initial_bnb, burned_tokens=0.0, staked_tokens=0.0, rho=rho)
    while True:
        st_before = s.staked_tokens
        ok, _ = try_borrow(s, 1_000_000.0, st_before, 0)
        if not ok:
            break
    return s


def t_ratio_after_default_fraction(rho: float, f: float) -> float:
    """
    满借状态下 O = rho*T，其中比例为 f 的未偿本金变为坏账（BNB 不回库）。
    T' = vault + (1-f)*O = (1-rho)*T + (1-f)*rho*T = T * (1 - rho*f)
    """
    return 1.0 - rho * f


def main() -> None:
    initial = 1000.0
    print("=== 1. 理论：满借时缓冲 & 违约后金库规模（相对初始 T）===\n")
    print(f"{'ρ':>6} {'缓冲(1-ρ)':>12} {'f=30% T′/T':>12} {'f=50% T′/T':>12} {'f=100% T′/T':>12}")
    print("-" * 52)
    rhos = [round(x, 2) for x in _frange(0.50, 0.86, 0.05)]
    for rho in rhos:
        buf = 1 - rho
        print(
            f"{rho:6.2f} {buf*100:11.1f}% "
            f"{t_ratio_after_default_fraction(rho, 0.3)*100:11.1f}% "
            f"{t_ratio_after_default_fraction(rho, 0.5)*100:11.1f}% "
            f"{t_ratio_after_default_fraction(rho, 1.0)*100:11.1f}%"
        )

    print("\n=== 2. 数值校验：初始 1000 BNB，小押借满，O/T 应 ≈ ρ ===\n")
    print(f"{'ρ':>6} {'T_end':>10} {'O':>10} {'O/T':>8} {'vault/T':>10}")
    print("-" * 52)
    for rho in [0.5, 0.6, 0.7, 0.75, 0.8]:
        s = saturate_borrow(initial, rho)
        t = s.total_treasury_bnb()
        o = s.outstanding()
        print(
            f"{rho:6.2f} {t:10.4f} {o:10.4f} {o/t:8.4f} {s.vault_liquid/t:10.4f}"
        )

    print("\n=== 3. 约束反推：希望坏账情景下 T′/T ≥ 阈值 时，ρ 上限 ===\n")
    for f in (0.3, 0.5, 0.7):
        for floor in (0.55, 0.60, 0.65, 0.70):
            # 1 - rho*f >= floor -> rho <= (1-floor)/f
            rho_max = (1.0 - floor) / f
            ok = min(rho_max, 1.0)
            print(f"  若未偿中 {f*100:.0f}% 变坏账，且要求 T′/T ≥ {floor:.0%} → ρ ≤ {ok:.3f}")

    print("\n=== 4. 综合建议（脚本结论，非财务建议）===\n")
    print(
        "• ρ=0.70：资本效率高，但满借时仅剩 30% 闲置；若未偿一半成坏账，T′/T=65%。\n"
        "• ρ=0.60：闲置 40%；同样 50% 坏账，T′/T=70% —— 金库『缩表』更慢。\n"
        "• ρ=0.55～0.65：若你担心策略性违约或税入不稳，更稳；Meme 高博弈可接受略低 ρ。\n"
        "• ρ>0.75：缓冲 <25%，税换 BNB 或运营需现钱时边际更紧，仅建议在强监控/强税入假设下考虑。\n"
        "• 更优没有单点：在『可借规模 ∝ ρ』与『抗违约 T′/T = 1−ρf』之间选 Pareto；\n"
        "  若坏账率 f 心里假设约 30%，又要 T′/T≥65%，则 ρ≤(1−0.65)/0.3≈1.17（约束不紧）；\n"
        "  若 f=50% 且要 T′/T≥60%，则 ρ≤0.80；要 T′/T≥70% 则 ρ≤0.60。\n"
    )
    print("当前 70%：在 f≤40% 坏账时 T′/T 仍 ≥ 72%；若认为实际 f 可能更高，可试 ρ=0.60～0.65 作对照上线。")


def _frange(a: float, b: float, step: float):
    x = a
    while x < b + 1e-9:
        yield x
        x += step


if __name__ == "__main__":
    main()
