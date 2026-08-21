"""
Extract roundPrices from the actual gameData.ts and run the strategy simulator.
This is the ground truth: whatever players see is what this reads.
"""
import re
import json
from pathlib import Path

GAMEDATA = Path('/home/user/workspace/climate-capital/shared/gameData.ts').read_text()

# Extract each asset's id and roundPrices from gameData.ts.
# Assets are objects with `id: "..."` and `roundPrices: [n, n, n, n, n, n]`.
asset_blocks = re.split(r'^\s*\{\s*$', GAMEDATA, flags=re.MULTILINE)
prices = {}
for block in asset_blocks:
    id_match = re.search(r'id:\s*"([^"]+)"', block)
    rp_match = re.search(r'roundPrices:\s*\[([^\]]+)\]', block)
    if id_match and rp_match:
        aid = id_match.group(1)
        vals = [float(x.strip()) for x in rp_match.group(1).split(',') if x.strip()]
        if len(vals) == 6:
            prices[aid] = vals

print(f"Extracted {len(prices)} assets with roundPrices from gameData.ts")
for aid, p in sorted(prices.items()):
    print(f"  {aid:20s} {p}")

# ═══════════════════════════════════════════════════════════════════
# Strategy simulator
# ═══════════════════════════════════════════════════════════════════
# Assets are bought at PREVIOUS round's end price and marked at CURRENT round's end price.
# startPrice = 100 for all assets. roundPrices[0] = end of R1, roundPrices[5] = end of R6.
# So R1 return = roundPrices[0]/100 - 1, R2 return = roundPrices[1]/roundPrices[0] - 1, etc.

STARTING_CASH = 100_000_000
MAX_POSITION_PCT = 0.40
MIN_TRADE = 1_000_000

# For each round r (1..6), the return from holding an asset through that round.
def get_round_return(aid, r):
    """Return from END of round r-1 to END of round r. r starts at 1."""
    p = prices[aid]
    prev = 100.0 if r == 1 else p[r-2]
    curr = p[r-1]
    return curr / prev - 1.0

def simulate(name, allocations_per_round, cash_reserve_per_round):
    """
    allocations_per_round: list of 6 dicts {asset_id: portfolio_weight}
                          weights sum to (1 - cash_reserve).
    """
    cash = STARTING_CASH
    holdings = {}  # asset_id -> value
    log = []
    for r in range(1, 7):
        # Compute total portfolio value at start of round
        total_start = cash + sum(holdings.values())

        # Rebalance to target allocations at START of round r (using prev round-end prices)
        target = allocations_per_round[r-1]
        cash_target = total_start * cash_reserve_per_round[r-1]
        risk_target = total_start - cash_target

        new_holdings = {}
        for aid, wt in target.items():
            new_holdings[aid] = risk_target * wt

        # Apply return through the round
        for aid, val in new_holdings.items():
            ret = get_round_return(aid, r)
            new_holdings[aid] = val * (1 + ret)

        cash = cash_target
        holdings = new_holdings
        total_end = cash + sum(holdings.values())
        log.append((r, total_start, total_end))

    final = cash + sum(holdings.values())
    return name, final, log


# ═══════════════════════════════════════════════════════════════════
# Strategies
# ═══════════════════════════════════════════════════════════════════

def all_in(asset):
    return [{asset: 1.0}] * 6, [0.0] * 6

STRATEGIES = []

# 1. Always green (ICLN buy-and-hold)
STRATEGIES.append(("Always green (ICLN buy-hold)", *all_in("cleanenergy")))

# 2. Always green (rebalanced across pure-play clean each round)
green_alloc = {"electradrive": 0.20, "solarpeak": 0.15, "nordicwind": 0.15,
               "hydrogen": 0.10, "nextgen": 0.20, "cleanenergy": 0.20}
STRATEGIES.append(("Always green (rebalanced)", [green_alloc]*6, [0.0]*6))

# 3. Passive index (broad market)
STRATEGIES.append(("Passive broad market (SP500)", *all_in("sp500")))

# 4. Passive ESG
STRATEGIES.append(("Passive ESG index", *all_in("esgindex")))

# 5. Perfect hindsight (best asset each round)
best_by_round = []
for r in range(1, 7):
    best_asset = max(prices.keys(), key=lambda a: get_round_return(a, r))
    best_by_round.append({best_asset: 1.0})
STRATEGIES.append(("Perfect hindsight (best each round)", best_by_round, [0.0]*6))

# 6. Concentrated: EU carbon + EV heavy
eua_ev = {"eucarbon": 0.40, "electradrive": 0.40, "sp500": 0.20}
STRATEGIES.append(("Concentrated EUA + EV", [eua_ev]*6, [0.0]*6))

# 7. Nuanced adaptive analyst
#   R1: cautious — mostly index, small green tilt
#   R2: green euphoria — trim clean energy exposure at peak
#   R3: net-zero peak — heavy in EUA, take profits on hydrogen
#   R4: energy crisis — rotate to oil majors and EUA
#   R5: reality check — trim renewables, hold EUA, add utilities
#   R6: AI power — utilities, ICLN recovery, oil majors
nuanced = [
    {"sp500": 0.35, "cleanenergy": 0.15, "nextgen": 0.15, "esgindex": 0.15, "greenbond": 0.10, "eucarbon": 0.10},  # R1
    {"sp500": 0.30, "cleanenergy": 0.20, "nextgen": 0.15, "eucarbon": 0.20, "greenbond": 0.10, "vcm-premium": 0.05},  # R2
    {"eucarbon": 0.30, "sp500": 0.25, "nextgen": 0.15, "cleanenergy": 0.10, "titan": 0.10, "vcm-premium": 0.10},  # R3
    {"titan": 0.30, "eucarbon": 0.25, "sp500": 0.20, "nextgen": 0.10, "vcm-premium": 0.10, "greenbond": 0.05},  # R4
    {"sp500": 0.30, "titan": 0.20, "nextgen": 0.20, "eucarbon": 0.15, "esgindex": 0.10, "vcm-premium": 0.05},  # R5
    {"nextgen": 0.25, "sp500": 0.20, "cleanenergy": 0.15, "titan": 0.15, "esgindex": 0.15, "eucarbon": 0.10},  # R6
]
STRATEGIES.append(("Nuanced adaptive analyst", nuanced, [0.0]*6))

# 8. Carbon-forward: EUA + premium VCM + clean utilities
carbon_fwd = {"eucarbon": 0.35, "vcm-premium": 0.20, "nextgen": 0.20, "sp500": 0.15, "greenbond": 0.10}
STRATEGIES.append(("Carbon-forward tilt", [carbon_fwd]*6, [0.0]*6))

# 9. Fossil hedge: SP500 + oil majors (transition-skeptic)
fossil = {"sp500": 0.40, "titan": 0.30, "esgindex": 0.20, "greenbond": 0.10}
STRATEGIES.append(("Fossil hedge (SP500 + XLE)", [fossil]*6, [0.0]*6))

# 10. 60/40 with green tilt
sixty_forty = {"esgindex": 0.35, "sp500": 0.25, "greenbond": 0.20, "transitionbond": 0.10, "nextgen": 0.10}
STRATEGIES.append(("60/40 with green tilt", [sixty_forty]*6, [0.0]*6))

# ═══════════════════════════════════════════════════════════════════
# Run
# ═══════════════════════════════════════════════════════════════════
results = []
for name, alloc, cash_res in STRATEGIES:
    results.append(simulate(name, alloc, cash_res))

results.sort(key=lambda x: -x[1])

print("\n" + "=" * 80)
print("STRATEGY RESULTS (starting cash $100m)")
print("=" * 80)
print(f"{'Rank':<5} {'Strategy':<45} {'Final Value':>15} {'Return':>10}")
print("-" * 80)
for rank, (name, final, _) in enumerate(results, 1):
    ret = (final / STARTING_CASH - 1) * 100
    print(f"{rank:<5} {name:<45} ${final/1e6:>10,.1f}m {ret:>9.1f}%")

# Save summary
summary = {
    "starting_cash": STARTING_CASH,
    "rankings": [
        {"rank": i+1, "strategy": name, "final_value_m": round(final/1e6, 1),
         "total_return_pct": round((final/STARTING_CASH - 1)*100, 1)}
        for i, (name, final, _) in enumerate(results)
    ]
}
Path('/tmp/basket_strategy_results.json').write_text(json.dumps(summary, indent=2))
print("\nSaved to /tmp/basket_strategy_results.json")
