"""
Same simulator, but with a REALISM-ADJUSTED price path:
- Trim ElectraDrive R1 return from +744% to +170% (Tesla was +743% single-name in 2020,
  but the game is presenting these as clean-tech basket returns — trim to plausible sector avg)
- Trim SolarPeak from +572% to +160% (Enphase was +572% single-name; sector avg was ~+140%)
- Trim HydroGen from +971% to +200% (still high, still Plug-like)
- Titan R1 (-51.8%) is realistic (Exxon's COVID crash) — keep
- Everything else stays.

Compares against the same 12 strategies.
"""
import json, copy
with open('/tmp/assets.json') as f:
    ASSETS = {a['id']: copy.deepcopy(a) for a in json.load(f)}

# Recalibrate the R1 (=2020) leg of the three biggest outliers.
# roundPrices[0] is start (=2019), roundPrices[1] is start-of-R2 (=2021).
# We'll adjust roundPrices[1] and let subsequent moves scale so the overall path preserves late peaks.

def recalibrate(aid, new_r1_return):
    prices = ASSETS[aid]['prices']
    old_r1_return = prices[1]/prices[0] - 1
    scale = (1 + new_r1_return) / (1 + old_r1_return)
    # Scale down all subsequent prices proportionally so the shape stays the same past R1
    for i in range(1, len(prices)):
        prices[i] *= scale
    return old_r1_return, new_r1_return

for aid, new_r1 in [('electradrive', 1.70), ('solarpeak', 1.60), ('hydrogen', 2.00)]:
    old, new = recalibrate(aid, new_r1)
    print(f"Recalibrated {aid}: R1 return {old*100:+.1f}% -> {new*100:+.1f}%; new prices = {[round(p,1) for p in ASSETS[aid]['prices']]}")

STARTING_CASH = 100_000_000
MAX_POSITION = 0.40
N_ROUNDS = 5
LOCKED_START = {'offshorewind':2,'solarfarm':2,'brookfield':2,'naturalcapital':3,'dac':4}

GREEN = {'electradrive','solarpeak','nordicwind','hydrogen','nextgen','cleanenergy','esgindex',
         'greenbond','transitionbond','offshorewind','solarfarm','brookfield','eucarbon',
         'vcm-premium','vcm-standard','naturalcapital','plantprotein','dac'}
BROWN = {'titan','appcoal','autoemissions','wildfire'}
tradeable_green = [a for a in GREEN if a not in LOCKED_START]

def price(aid, r):
    return ASSETS[aid]['prices'][r]

def eq_weight(ids, w_total):
    return {i: w_total/len(ids) for i in ids} if ids else {}

def simulate(weights_by_round, name):
    portfolio = {}; cash = STARTING_CASH; rrs=[]; peak=STARTING_CASH; max_dd=0
    for r in range(N_ROUNDS):
        total = cash + sum(portfolio.values()); peak = max(peak,total)
        target = weights_by_round[r]
        s = sum(target.values())
        if s>1: target = {k:v/s for k,v in target.items()}
        target = {k:min(v,MAX_POSITION) for k,v in target.items()}
        new_pf = {aid: total*w for aid,w in target.items()}
        alloc = sum(new_pf.values())
        portfolio = new_pf; cash = total - alloc
        after = {}
        for aid,d in portfolio.items():
            p0=price(aid,r); p1=price(aid,r+1)
            after[aid] = d*(p1/p0) if p0>0 else 0
        portfolio = after
        end = cash + sum(portfolio.values())
        rrs.append((total,end,(end/total-1) if total>0 else 0))
        peak=max(peak,end); max_dd=min(max_dd,(end-peak)/peak if peak>0 else 0)
    final = cash + sum(portfolio.values())
    return {'name':name,'final':final,'return_pct':(final/STARTING_CASH-1)*100,
            'cagr':((final/STARTING_CASH)**(1/11)-1)*100,'max_dd':max_dd*100,'round_returns':rrs}

def simulate_buy_hold(w0,name):
    total=STARTING_CASH; s=sum(w0.values())
    w = {k:min(v/s,MAX_POSITION) for k,v in w0.items()}
    pf = {a:total*ww for a,ww in w.items()}
    cash = total - sum(pf.values())
    rrs=[]; peak=total; max_dd=0
    for r in range(N_ROUNDS):
        st = cash + sum(pf.values()); peak=max(peak,st)
        for aid in pf:
            p0=price(aid,r); p1=price(aid,r+1)
            pf[aid] = pf[aid]*(p1/p0) if p0>0 else 0
        end = cash + sum(pf.values())
        rrs.append((st,end,(end/st-1) if st>0 else 0))
        peak=max(peak,end); max_dd=min(max_dd,(end-peak)/peak if peak>0 else 0)
    final = cash + sum(pf.values())
    return {'name':name,'final':final,'return_pct':(final/STARTING_CASH-1)*100,
            'cagr':((final/STARTING_CASH)**(1/11)-1)*100,'max_dd':max_dd*100,'round_returns':rrs}

# Same strategies as before
tradeable_brown_r1 = [a for a in BROWN if ASSETS[a]['prices'][0]>0]
tradeable_brown_later = list(BROWN)
S_ALWAYS_GREEN = [eq_weight(tradeable_green,1.0) for _ in range(N_ROUNDS)]
S_ALWAYS_BROWN = [eq_weight(tradeable_brown_r1 if r==0 else tradeable_brown_later,1.0) for r in range(N_ROUNDS)]
S_NAIVE = [{'sp500':0.4,'esgindex':0.2,'cleanenergy':0.2,'greenbond':0.2} for _ in range(N_ROUNDS)]
S_CARBON = [{'eucarbon':0.35,'sp500':0.25,'cleanenergy':0.15,'greenbond':0.15,'vcm-premium':0.10} for _ in range(N_ROUNDS)]
S_NUANCED = [
    {'eucarbon':0.30,'esgindex':0.20,'sp500':0.20,'greenbond':0.15,'nextgen':0.10,'brookfield':0.05},
    {'eucarbon':0.20,'cleanenergy':0.25,'electradrive':0.15,'esgindex':0.15,'nextgen':0.10,'sp500':0.15},
    {'eucarbon':0.30,'sp500':0.25,'titan':0.15,'esgindex':0.15,'greenbond':0.15},
    {'titan':0.30,'eucarbon':0.30,'sp500':0.20,'appcoal':0.10,'cleanenergy':0.10},
    {'sp500':0.30,'eucarbon':0.20,'esgindex':0.15,'vcm-premium':0.10,'brookfield':0.15,'nextgen':0.10},
]
S_CONC = [{'electradrive':0.40,'eucarbon':0.40,'greenbond':0.20} for _ in range(N_ROUNDS)]

results = [
    simulate(S_ALWAYS_GREEN,'Always green (rebalanced)'),
    simulate(S_ALWAYS_BROWN,'Always brown (rebalanced)'),
    simulate(S_NAIVE,'Naive diversified 60/40'),
    simulate(S_CARBON,'Carbon-forward'),
    simulate(S_NUANCED,'Nuanced adaptive'),
    simulate(S_CONC,'Concentrated Tesla+EUA'),
    simulate_buy_hold(eq_weight(tradeable_green,1.0),'Always green BUY & HOLD'),
    simulate_buy_hold({'sp500':0.5,'esgindex':0.5},'Passive index 50/50'),
]
results.sort(key=lambda r:-r['final'])

print("\n" + "="*95)
print("RECALIBRATED (2020 clean-tech trimmed to index-level returns)")
print("="*95)
print(f"{'Rank':<5}{'Strategy':<40}{'Final ($M)':<14}{'Total ret':<12}{'CAGR':<10}{'Max DD':<8}")
print("-"*95)
for i,r in enumerate(results,1):
    print(f"{i:<5}{r['name']:<40}${r['final']/1e6:>10.1f}m  {r['return_pct']:>+8.1f}%  {r['cagr']:>+6.1f}%  {r['max_dd']:>6.1f}%")
