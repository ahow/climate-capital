"""
Strategy simulator running against the NEW basket-based price paths.
"""
import json

with open('/tmp/new_basket_prices.json') as f:
    NEW_PRICES = json.load(f)

# Merge with private funds (unchanged) from /tmp/assets.json
with open('/tmp/assets.json') as f:
    ORIG = {a['id']: a for a in json.load(f)}

# Build price dict: use new basket prices where we have them, keep old for private funds.
PRICES = {}
for aid, a in ORIG.items():
    if aid in NEW_PRICES:
        # New prices are 6 round-end values, starting from 100.
        # Old format has 6 values (start + 5 round ends) — wait, let me recheck
        # Actually old format is roundPrices which is 6 values = end of each round
        # New format: 6 round-end values starting from startPrice=100
        # So we prepend startPrice(=100) then use the 6 round-end values
        PRICES[aid] = [100] + NEW_PRICES[aid]  # 7 values: start + 6 round-ends
    else:
        # Private funds - keep original 6 values (roundPrices only, no explicit startPrice)
        # But we need 7 values to compute 6 return periods
        # The old game convention is that prices[0] is end of round 1. Assume start = prices[0]/(1+r1)
        # For simplicity, just prepend a reasonable start estimate = prices[0] with slight discount
        PRICES[aid] = [a['prices'][0]] + a['prices']  # start = R1 end (no R1 return for these)

# Now we have 7 prices per asset -> 6 return periods
N_ROUNDS = 6
STARTING_CASH = 100_000_000
MAX_POSITION = 0.40

GREEN = {'electradrive','solarpeak','nordicwind','hydrogen','nextgen',
         'cleanenergy','esgindex','greenbond','transitionbond','offshorewind',
         'solarfarm','brookfield','eucarbon','vcm-premium','vcm-standard',
         'naturalcapital','plantprotein','dac'}
BROWN = {'titan','appcoal','autoemissions','wildfire'}
LOCKED_START = {'offshorewind':2,'solarfarm':2,'brookfield':2,'naturalcapital':3,'dac':4}

def price(aid, r):
    return PRICES[aid][r]

def eq_weight(ids, w_total):
    return {i: w_total/len(ids) for i in ids} if ids else {}

def simulate(weights_by_round, name):
    portfolio = {}; cash = STARTING_CASH; rrs=[]; peak=STARTING_CASH; max_dd=0
    for r in range(N_ROUNDS):
        total = cash + sum(portfolio.values()); peak = max(peak,total)
        target = weights_by_round[r] if r < len(weights_by_round) else weights_by_round[-1]
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

tradeable_green = [a for a in GREEN if a not in LOCKED_START]
tradeable_brown_r1 = [a for a in BROWN if PRICES[a][0]>0]
tradeable_brown_later = list(BROWN)

# Strategies
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
    {'brookfield':0.25,'nextgen':0.20,'sp500':0.25,'eucarbon':0.15,'esgindex':0.15},
]
S_CONC = [{'electradrive':0.40,'eucarbon':0.40,'greenbond':0.20} for _ in range(N_ROUNDS)]

def contrarian_weights():
    w=[]
    for r in range(N_ROUNDS):
        if r==0: w.append({'sp500':0.5,'greenbond':0.5})
        else:
            perfs=[(aid, PRICES[aid][r]/PRICES[aid][r-1]-1) for aid in PRICES if PRICES[aid][r-1]>0 and aid not in LOCKED_START]
            perfs.sort(key=lambda x:x[1])
            w.append(eq_weight([p[0] for p in perfs[:5]], 1.0))
    return w
def momentum_weights():
    w=[]
    for r in range(N_ROUNDS):
        if r==0: w.append({'sp500':0.5,'esgindex':0.5})
        else:
            perfs=[(aid, PRICES[aid][r]/PRICES[aid][r-1]-1) for aid in PRICES if PRICES[aid][r-1]>0 and aid not in LOCKED_START]
            perfs.sort(key=lambda x:-x[1])
            w.append(eq_weight([p[0] for p in perfs[:5]], 1.0))
    return w
def hindsight_weights():
    w=[]
    for r in range(N_ROUNDS):
        perfs=[(aid, PRICES[aid][r+1]/PRICES[aid][r]-1) for aid in PRICES if PRICES[aid][r]>0 and aid not in LOCKED_START]
        perfs.sort(key=lambda x:-x[1])
        w.append(eq_weight([p[0] for p in perfs[:5]], 1.0))
    return w

results = [
    simulate(S_ALWAYS_GREEN,'Always green (rebalanced)'),
    simulate(S_ALWAYS_BROWN,'Always brown (rebalanced)'),
    simulate(S_NAIVE,'Naive diversified 60/40'),
    simulate(S_CARBON,'Carbon-forward'),
    simulate(S_NUANCED,'Nuanced adaptive'),
    simulate(S_CONC,'Concentrated EV+EUA'),
    simulate(contrarian_weights(),'Contrarian'),
    simulate(momentum_weights(),'Momentum'),
    simulate(hindsight_weights(),'Perfect hindsight'),
    simulate_buy_hold(eq_weight(tradeable_green,1.0),'Always green BUY & HOLD'),
    simulate_buy_hold({'sp500':0.5,'esgindex':0.5},'Passive index 50/50'),
]
results.sort(key=lambda r:-r['final'])

print("\n" + "="*100)
print("STRATEGY SIMULATION — BASKET-BASED PRICES")
print("="*100)
print(f"{'Rank':<5}{'Strategy':<40}{'Final ($M)':<14}{'Total ret':<12}{'CAGR':<10}{'Max DD':<10}")
print("-"*100)
for i,r in enumerate(results,1):
    print(f"{i:<5}{r['name']:<40}${r['final']/1e6:>10.1f}m  {r['return_pct']:>+8.1f}%  {r['cagr']:>+6.1f}%  {r['max_dd']:>6.1f}%")

print("\nPer-round returns (percentage):")
print(f"{'Strategy':<40}{'R1':>10}{'R2':>10}{'R3':>10}{'R4':>10}{'R5':>10}{'R6':>10}")
for r in results:
    parts = [f"{ret*100:>+9.1f}%" for _,_,ret in r['round_returns']]
    print(f"{r['name']:<40}{''.join(parts)}")
