"""
Climate Capital strategy simulator.

Simulates 8 strategies over the 6-round game and reports each round's
return, max drawdown, terminal wealth, and CAGR (assuming ~11 years).

All prices come from shared/gameData.ts via /tmp/assets.json.
"""
import json
from statistics import mean

with open('/tmp/assets.json') as f:
    ASSETS = {a['id']: a for a in json.load(f)}

STARTING_CASH = 100_000_000
MAX_POSITION = 0.40  # 40% per-position cap enforced by server
N_ROUNDS = 5          # 6 start-of-round prices -> 5 return transitions

# Tag every asset as green / brown / neutral for strategy grouping.
GREEN = {
    'electradrive','solarpeak','nordicwind','hydrogen','nextgen',
    'cleanenergy','esgindex','greenbond','transitionbond','offshorewind',
    'solarfarm','brookfield','eucarbon','vcm-premium','vcm-standard',
    'naturalcapital','plantprotein','dac',
}
BROWN = {'titan','appcoal','autoemissions','wildfire'}
NEUTRAL = {'sp500'}

# Which assets are locked at game start (private funds — locked 2-3 rounds)
LOCKED_START = {'offshorewind':2, 'solarfarm':2, 'brookfield':2, 'naturalcapital':3, 'dac':4}


def price(asset_id, round_idx):
    """0-indexed round price: price[0] = start, price[N_ROUNDS] = end."""
    return ASSETS[asset_id]['prices'][round_idx]


def simulate(weights_by_round, name):
    """
    weights_by_round: list of dicts, one per round (0..N_ROUNDS-1),
    mapping asset_id -> target portfolio weight at start of that round.

    Runs a rebalance at start of each round to the specified weights.
    Cash residual just holds through the round (0% return).
    """
    portfolio = {}  # asset_id -> dollar value
    cash = STARTING_CASH
    round_returns = []
    drawdown_from_peak = 0.0
    peak = STARTING_CASH

    for r in range(N_ROUNDS):
        # Total value at start of round r using start-of-round prices
        total = cash + sum(v for v in portfolio.values())
        peak = max(peak, total)

        # Rebalance to target weights (cap each at 40%)
        target = weights_by_round[r]
        # Normalise weights to sum <= 1
        s = sum(target.values())
        if s > 1.0:
            target = {k: v/s for k,v in target.items()}
        # Enforce per-position cap
        target = {k: min(v, MAX_POSITION) for k,v in target.items()}

        new_pf = {}
        allocated = 0.0
        for aid, w in target.items():
            dollars = total * w
            new_pf[aid] = dollars
            allocated += dollars
        portfolio = new_pf
        cash = total - allocated

        # Apply price move for the round: value scales by price[r+1] / price[r]
        after = {}
        for aid, dollars in portfolio.items():
            p0 = price(aid, r)
            p1 = price(aid, r+1)
            if p0 == 0:
                # Asset was zero (e.g. coal in bankruptcy) - $0 in, but if allocated positive it means
                # we tried to buy something that had no price; treat as zero return.
                after[aid] = 0
            else:
                after[aid] = dollars * (p1 / p0)
        portfolio = after
        end_total = cash + sum(portfolio.values())
        round_returns.append((total, end_total, (end_total/total - 1) if total > 0 else 0))
        peak = max(peak, end_total)
        dd = (end_total - peak) / peak if peak > 0 else 0
        drawdown_from_peak = min(drawdown_from_peak, dd)

    final = cash + sum(portfolio.values())
    years = 11.0  # late-2015 to mid-2026
    cagr = (final / STARTING_CASH) ** (1/years) - 1
    return {
        'name': name,
        'final': final,
        'return_pct': (final/STARTING_CASH - 1) * 100,
        'cagr': cagr * 100,
        'max_dd': drawdown_from_peak * 100,
        'round_returns': round_returns,
    }


def eq_weight(ids, w_total):
    """Return an equal-weight dict summing to w_total across the given ids."""
    ids = list(ids)
    if not ids: return {}
    return {i: w_total/len(ids) for i in ids}


# ── Strategies ────────────────────────────────────────────────

# 1. Always-green, equal weight buy & hold (rebalances back to equal weight each round).
# Excludes locked private funds because those can't be bought at start.
tradeable_green = [a for a in GREEN if a not in LOCKED_START]
S_ALWAYS_GREEN = [eq_weight(tradeable_green, 1.0) for _ in range(N_ROUNDS)]

# 2. Always-brown, equal weight buy & hold. Coal has zero price at start so drop it out of R1.
tradeable_brown_r1 = [a for a in BROWN if ASSETS[a]['prices'][0] > 0]
tradeable_brown_later = list(BROWN)
S_ALWAYS_BROWN = [
    eq_weight(tradeable_brown_r1 if r==0 else tradeable_brown_later, 1.0)
    for r in range(N_ROUNDS)
]

# 3. Naive diversified: 60% broad market index, 40% Global Clean Energy Index (equal-weighted core).
S_NAIVE_DIVERSIFIED = [{'sp500': 0.4, 'esgindex': 0.2, 'cleanenergy': 0.2, 'greenbond': 0.2} for _ in range(N_ROUNDS)]

# 4. Carbon-forward: heavy EU carbon allocation with a diversified equity sleeve.
S_CARBON_FORWARD = [{'eucarbon': 0.35, 'sp500': 0.25, 'cleanenergy': 0.15, 'greenbond': 0.15, 'vcm-premium': 0.1} for _ in range(N_ROUNDS)]

# 5. Nuanced adaptive: what a Schroders analyst reading the briefings should have done.
#    - R1 (Paris signal, 2015-2019): overweight EUAs (still cheap), core diversified, avoid coal
#    - R2 (COVID 2020): rotate toward clean-energy names + Tesla-analog, keep some brown
#    - R3 (Peak euphoria 2021): TAKE PROFITS from clean-tech, rotate into value + EUAs
#    - R4 (Energy crisis 2022): heavy oil majors + EUAs + selective clean-energy at cheaper prices
#    - R5 (Reality check 2023-24): reduce ESG index exposure, keep quality carbon, avoid Verra REDD+
#    - R6 (Trump 2 + AI power 2024-26): pivot toward AI-power renewables (Brookfield, NextGen) + carbon
S_NUANCED = [
    # R1
    {'eucarbon': 0.30, 'esgindex': 0.20, 'sp500': 0.20, 'greenbond': 0.15, 'nextgen': 0.10, 'brookfield': 0.05},
    # R2 - COVID, rotate to clean-tech; still respect 40% cap
    {'eucarbon': 0.20, 'cleanenergy': 0.25, 'electradrive': 0.15, 'esgindex': 0.15, 'nextgen': 0.10, 'sp500': 0.15},
    # R3 - Peak euphoria: take profits, rotate to value + EUAs
    {'eucarbon': 0.30, 'sp500': 0.25, 'titan': 0.15, 'esgindex': 0.15, 'greenbond': 0.15},
    # R4 - Energy crisis: overweight oil + EUAs
    {'titan': 0.30, 'eucarbon': 0.30, 'sp500': 0.20, 'appcoal': 0.10, 'cleanenergy': 0.10},
    # R5 - Reality check: quality tilt, avoid Verra
    {'sp500': 0.30, 'eucarbon': 0.20, 'esgindex': 0.15, 'vcm-premium': 0.10, 'brookfield': 0.15, 'nextgen': 0.10},
]

# 6. Buy-the-dip contrarian: buy whatever fell the most in the previous round.
def contrarian_weights():
    weights = []
    prev_total = None
    for r in range(N_ROUNDS):
        if r == 0:
            # Start with diversified base
            weights.append({'sp500': 0.5, 'greenbond': 0.5})
        else:
            # Rank assets by prior-round return; buy the 5 worst-performing tradeable ones
            perfs = []
            for aid, a in ASSETS.items():
                if a['prices'][r-1] > 0 and aid not in LOCKED_START:
                    perfs.append((aid, a['prices'][r]/a['prices'][r-1] - 1))
            perfs.sort(key=lambda x: x[1])  # worst first
            picks = [p[0] for p in perfs[:5]]
            weights.append(eq_weight(picks, 1.0))
    return weights
S_CONTRARIAN = contrarian_weights()

# 7. Momentum: buy whatever RALLIED the most in the previous round.
def momentum_weights():
    weights = []
    for r in range(N_ROUNDS):
        if r == 0:
            weights.append({'sp500': 0.5, 'esgindex': 0.5})
        else:
            perfs = []
            for aid, a in ASSETS.items():
                if a['prices'][r-1] > 0 and aid not in LOCKED_START:
                    perfs.append((aid, a['prices'][r]/a['prices'][r-1] - 1))
            perfs.sort(key=lambda x: -x[1])  # best first
            picks = [p[0] for p in perfs[:5]]
            weights.append(eq_weight(picks, 1.0))
    return weights
S_MOMENTUM = momentum_weights()

# 8. Perfect hindsight: hold the top-5 best-performing assets each round.
def hindsight_weights():
    weights = []
    for r in range(N_ROUNDS):
        perfs = []
        for aid, a in ASSETS.items():
            if a['prices'][r] > 0 and aid not in LOCKED_START:
                perfs.append((aid, a['prices'][r+1]/a['prices'][r] - 1))
        perfs.sort(key=lambda x: -x[1])
        picks = [p[0] for p in perfs[:5]]
        weights.append(eq_weight(picks, 1.0))
    return weights
S_HINDSIGHT = hindsight_weights()

# 9. Concentrated bet: 40% ElectraDrive (Tesla-analog), 40% EU carbon, 20% cash equivalent.
S_CONCENTRATED = [{'electradrive': 0.40, 'eucarbon': 0.40, 'greenbond': 0.20} for _ in range(N_ROUNDS)]


def simulate_buy_hold(initial_weights, name):
    """Buy once at start of R1, never rebalance. Positions drift with prices."""
    total = STARTING_CASH
    s = sum(initial_weights.values())
    weights = {k: min(v/s if s>0 else 0, MAX_POSITION) for k,v in initial_weights.items()}
    portfolio = {aid: total * w for aid, w in weights.items()}
    cash = total - sum(portfolio.values())
    round_returns = []
    peak = total
    max_dd = 0.0
    for r in range(N_ROUNDS):
        start_total = cash + sum(portfolio.values())
        peak = max(peak, start_total)
        for aid in portfolio:
            p0 = price(aid, r); p1 = price(aid, r+1)
            portfolio[aid] = portfolio[aid] * (p1/p0) if p0 > 0 else 0
        end_total = cash + sum(portfolio.values())
        rr = (end_total/start_total - 1) if start_total > 0 else 0
        round_returns.append((start_total, end_total, rr))
        peak = max(peak, end_total)
        max_dd = min(max_dd, (end_total - peak)/peak if peak>0 else 0)
    final = cash + sum(portfolio.values())
    cagr = (final/STARTING_CASH) ** (1/11.0) - 1
    return {'name': name, 'final': final, 'return_pct': (final/STARTING_CASH-1)*100,
            'cagr': cagr*100, 'max_dd': max_dd*100, 'round_returns': round_returns}


# ── Run all ──────────────────────────────────────────────────
results = [
    simulate(S_ALWAYS_GREEN, 'Always green (equal weight, rebalanced)'),
    simulate(S_ALWAYS_BROWN, 'Always brown (equal weight, rebalanced)'),
    simulate(S_NAIVE_DIVERSIFIED, 'Naive diversified 60/40 broad+ICLN'),
    simulate(S_CARBON_FORWARD, 'Carbon-forward (35% EUA + diversified)'),
    simulate(S_NUANCED, 'Nuanced adaptive (reads briefings, takes profits)'),
    simulate(S_CONTRARIAN, 'Contrarian (buy last round\'s losers)'),
    simulate(S_MOMENTUM, 'Momentum (buy last round\'s winners)'),
    simulate(S_HINDSIGHT, 'Perfect hindsight (upper bound)'),
    simulate(S_CONCENTRATED, 'Concentrated bet (40% ElectraDrive + 40% EUA)'),
    simulate_buy_hold(eq_weight(tradeable_green, 1.0), 'Always green BUY & HOLD (no rebalance)'),
    simulate_buy_hold(eq_weight(tradeable_brown_r1, 1.0), 'Always brown BUY & HOLD (no rebalance)'),
    simulate_buy_hold({'sp500': 0.5, 'esgindex': 0.5}, 'Passive 50/50 SP500+ESG index (no rebalance)'),
]

results.sort(key=lambda r: -r['final'])

print("\n" + "="*100)
print(f"{'Rank':<5}{'Strategy':<50}{'Final ($M)':<14}{'Total ret':<12}{'CAGR':<10}{'Max DD':<10}")
print("="*100)
for i, r in enumerate(results, 1):
    print(f"{i:<5}{r['name']:<50}${r['final']/1e6:>10.1f}m  {r['return_pct']:>+8.1f}%  {r['cagr']:>+6.1f}%  {r['max_dd']:>6.1f}%")
print("="*100)

# Per-round breakdown
print("\nPer-round returns (percentage):")
print(f"{'Strategy':<50}{'R1':>10}{'R2':>10}{'R3':>10}{'R4':>10}{'R5':>10}")
for r in results:
    parts = [f"{ret*100:>+9.1f}%" for _,_,ret in r['round_returns']]
    print(f"{r['name']:<50}{''.join(parts)}")

# Save for later inspection
with open('/tmp/sim_results.json','w') as f:
    json.dump([{k:v for k,v in r.items() if k!='round_returns'} | {'round_returns':[(a,b,c) for a,b,c in r['round_returns']]} for r in results], f, indent=2)
