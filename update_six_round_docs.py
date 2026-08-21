from pathlib import Path
import re
root = Path('/home/user/workspace/climate-capital')

replacements = {
    'server/dbStorage.ts': [('.values({ code, status: "lobby", currentRound: 1, maxRounds: 8 })', '.values({ code, status: "lobby", currentRound: 1, maxRounds: ROUND_BRIEFINGS.length })')],
    'server/storage.ts': [('maxRounds: 8,', 'maxRounds: ROUND_BRIEFINGS.length,')],
    'shared/dbSchema.ts': [('default(8)', 'default(6)')],
    'client/src/components/onboarding/HowToPlayContent.tsx': [('across all eight rounds.', 'across all six rounds.')],
    'client/src/components/onboarding/InvestmentUniverseContent.tsx': [('round 0 (start) through round 7.', 'round 0 (start) through round 6.')],
    'client/src/pages/home.tsx': [('through eight rounds of real-world climate events.', 'through six rounds of real-world climate events.')],
    'README.md': [('across 8 rounds', 'across 6 rounds'), ('**8 rounds**', '**6 rounds**')],
    'VIDEO_SETUP.md': [('end of round 8', 'end of round 6'), ('round-8 takeaways', 'round-6 takeaways'), ('reach round 8 again', 'reach round 6 again'), ('at most 8 videos', 'at most 6 videos')],
}
for rel, changes in replacements.items():
    path=root/rel
    text=path.read_text()
    for old,new in changes:
        if old not in text:
            raise RuntimeError(f'Missing {old!r} in {rel}')
        text=text.replace(old,new)
    path.write_text(text)

routes=root/'server/routes.ts'
t=routes.read_text()
t=t.replace('for (let round = 1; round <= 8; round++) {', 'for (let round = 1; round <= ROUND_BRIEFINGS.length; round++) {')
t=t.replace('if (!Number.isFinite(round) || round < 1 || round > 8) {', 'if (!Number.isFinite(round) || round < 1 || round > ROUND_BRIEFINGS.length) {')
routes.write_text(t)

assets = [
('ElectraDrive','Tesla (TSLA)',[174,1470,2202,770,2524,2000],'China competition and political exposure soften the end mark.'),
('SolarPeak Inverters','Enphase Energy (ENPH)',[744,4999,5212,7549,3765,3200],'Residential-solar softness and tariffs keep pressure on margins.'),
('Nordic Wind Power','Ørsted',[194,314,186,129,86,55],'2025 rights issue and project stress extend the offshore-wind drawdown.'),
('HydroGen Systems','Plug Power',[150,1607,1338,586,213,140],'Cash burn and dilution keep the commercial-hydrogen thesis constrained.'),
('NextGen Utilities','NextEra Energy',[235,270,336,318,231,285],'AI data-centre load supports utility-scale clean-power demand.'),
('Titan Petroleum','ExxonMobil',[85,41,70,135,126,135],'Moderate oil environment and buybacks provide a steady end mark.'),
('Appalachian Coal','Peabody Energy',[92,24,101,265,247,220],'Coal softens from crisis highs but energy security limits the decline.'),
('AutoEmissions AG','Volkswagen',[122,120,182,104,82,78],'China competition and a difficult EV transition continue to weigh.'),
('Global Clean Energy Index','iShares Global Clean Energy ETF (ICLN)',[119,287,215,202,158,175],'Recovery reflects power-demand growth despite policy risk.'),
('ESG Leaders Index','S&P 500 ESG Index',[186,237,312,257,320,385],'Broad equity and AI-led gains dominate the result.'),
('Broad Market Index','S&P 500',[158,184,233,188,288,355],'AI-led equity strength continues into the final mark.'),
('Global Green Bond Fund','Bloomberg Green Bond Index',[114,128,118,92,101,108],'Rates stabilise and allow a modest recovery.'),
('Transition-Linked Note','Enel sustainability-linked bond',[108,115,108,88,96,102],'Credit remains resilient as the issuer retains ESG-market access.'),
('North Sea Wind Fund','Hornsea-style offshore-wind project',[130,145,155,130,105,95],'Further cost pressure and cancelled capacity lower value.'),
('Sunbelt Solar Portfolio','US utility-scale solar portfolio',[142,160,172,158,150,148],'Tariffs offset otherwise stable operating cash flows.'),
('GreenBridge Infrastructure','Brookfield Renewable Partners',[234,422,361,265,266,310],'Large technology PPAs boost the renewable-infrastructure outlook.'),
('EU Carbon Allowances','EU ETS (EUA)',[364,408,655,1166,933,1050],'Allowance prices settle broadly in the €70–80 range.'),
('Premium Carbon Credits','Gold Standard / high-integrity VCM',[114,136,164,218,182,195],'Quality-flight demand supports independently validated credits.'),
('Standard Carbon Credits','Generic Verra REDD+ credits',[120,92,158,315,185,155],'Integrity concerns continue to pressure generic credits.'),
('Natural Capital Fund','Natural-capital private fund',[102,105,108,103,100,102],'Long-horizon assets remain near cost while value creation matures.'),
('PlantProtein Co','Beyond Meat',[100,165,86,16,12,8],'Falling revenue and continuing losses leave material going-concern risk.'),
('WildFire Utility','PG&E',[20,22,22,26,30,34],'Improved earnings and wildfire mitigation support a modest recovery.'),
('Frontier Carbon Removal','Climeworks direct-air-capture technology',[100,95,92,100,115,105],'Mammoth underperformance reinforces the cost and scale challenge.'),
]
asset_rows='\n'.join(f"| {n} | {b} | " + ' | '.join(f'${v:,}' for v in vals) + f" | {note} |" for n,b,vals,note in assets)

brief = f'''# Climate Capital — Historical Basis of the Game

*Confidential facilitator brief. NOT to be shown to players — it contains the real-world identities deliberately anonymised in the simulation.*

This brief maps the six-round Climate Capital simulation to its underlying companies, indices, instruments, and historical events. Values are stylised, indexed prices used for play rather than investable quotations. The final value is a plausible mid-2026 end mark informed by the public developments cited below.

## 1. The six periods

| Round | In-game title | Period | Old coverage merged |
|---|---|---|---|
| 1 | The Paris Signal | Late 2015 – 2019 | Old rounds 1–3: Paris, first Trump term, and Green Wave |
| 2 | Pandemic and Green Euphoria | 2020 | Old round 4 |
| 3 | Peak Euphoria and Net Zero Pledges | 2021 | Old round 5 |
| 4 | The Energy Crisis | 2022 | Old round 6 |
| 5 | Reality Check — ESG Backlash and Integrity Crisis | 2023 – 2024 | Old round 7 |
| 6 | The Second Trump Era and AI Power Demand | Late 2024 – Mid-2026 | Old round 8, extended to mid-2026 |

### Pricing convention

The game uses one `roundPrices` entry per round. `startPrice` is the value immediately before Round 1; `roundPrices[0]` is the end-of-Round-1 / start-of-Round-2 price; and `roundPrices[5]` is the mid-2026 end-of-Round-6 settlement price. This matches the client and server helpers: a player buying in Round *n* pays the prior round's end price, and the portfolio is marked at `roundPrices[n - 1]` after the round. The six entries therefore preserve each meaningful period-end move and add a realisable final mid-2026 mark.

## 2. Asset price paths

| In-game asset | Real-world basis | R1 end 2019 | R2 end 2020 | R3 end 2021 | R4 end 2022 | R5 end 2024 | R6 end mid-2026 | Final-period rationale |
|---|---|---:|---:|---:|---:|---:|---:|---|
{asset_rows}

## 3. Round-by-round narrative and factual basis

### Round 1 — The Paris Signal *(Late 2015 – 2019)*

Paris set the political direction in December 2015, but asset markets initially reflected continued fossil dominance. The April 2016 Peabody bankruptcy demonstrated stranded-asset risk, while the first Trump administration's announced Paris withdrawal hit renewable sentiment. The more durable change was institutional: the EU Sustainable Finance Action Plan, TCFD disclosure framework, China ETS, and ultimately the European Green Deal created the rulebook through which capital would later flow. In 2019, the climate strikes, record sustainable-fund inflows, and the PG&E bankruptcy connected social pressure, financial flows, and physical climate risk.

### Round 2 — Pandemic and Green Euphoria *(2020)*

COVID produced the fastest modern market crash and briefly negative WTI prices, followed by enormous monetary and fiscal support. The EU's NextGenerationEU recovery programme applied a 37% climate-spending floor. Clean-energy and EV valuations became extreme: ICLN returned 142% in 2020 while Tesla's December broad-index inclusion triggered an estimated $154 billion rebalancing event ([S&P Dow Jones Indices](https://www.spglobal.com/spdji/en/documents/index-news-and-announcements/20201116-500-tsla.pdf)). The round is designed to separate a legitimate transition tailwind from the price paid for it.

### Round 3 — Peak Euphoria and Net Zero Pledges *(2021)*

COP26 yielded net-zero pledges spanning about 90% of global GDP, EU carbon crossed €50 per tonne, and voluntary-credit volumes surged. Valuations, special-purpose listings, and low rates made climate exposure appear one-directional. Inflation and rising yields were already the warning: long-duration clean-energy assets and offshore-wind projects were particularly exposed to a repricing of capital costs.

### Round 4 — The Energy Crisis *(2022)*

Russia's invasion of Ukraine drove European gas prices sharply higher, renewed energy-security priorities, and made conventional energy the market leader. ExxonMobil reported $55.7 billion of 2022 profit ([ExxonMobil](https://corporate.exxonmobil.com/news/newsroom/news-releases/2023/0131_exxon-mobil-announces-fourth-quarter-2022-results)). Yet policy reinforced the long run: the US enacted the Inflation Reduction Act and Europe launched REPowerEU. EUA prices also reached their historic peak around €105 per tonne.

### Round 5 — Reality Check — ESG Backlash and Integrity Crisis *(2023 – 2024)*

High rates and supply-chain inflation undermined offshore-wind economics; Ørsted's 2023 impairment illustrated the scale of the problem ([Ørsted](https://orsted.com/en/company-announcement-list/2023/10/1793546)). US anti-ESG politics and the REDD+ integrity investigation added reputational and capital-flow pressure. The key lesson is asset-specific diligence: premium credits, generic credits, clean-energy equipment, and contracted infrastructure did not behave as a single 'green' trade.

### Round 6 — The Second Trump Era and AI Power Demand *(Late 2024 – Mid-2026)*

The final period juxtaposes a policy headwind with a new demand driver. The FY2025 reconciliation law shortened or changed several IRA-era tax-credit pathways ([Congressional Research Service](https://www.congress.gov/crs-product/IN12624)), while 2025 tariff determinations raised costs for solar cells from Southeast Asia ([Reuters](https://www.reuters.com/sustainability/climate-energy/us-commerce-dept-finalizes-tariff-rates-solar-goods-southeast-asia-2025-04-21/)). Offshore wind remained stressed: Ørsted completed a DKK 59.56 billion rights issue in 2025 ([Ørsted](https://orsted.com/en/company-announcement-list/2025/11/completion-of-rights-issue-and-strong-execution-of-146586841)).

At the same time, AI data-centre expansion made firm, long-duration power contracts strategically valuable. Brookfield's 3 GW US hydropower framework with Google provides a concrete example ([Brookfield](https://bep.brookfield.com/press-releases/bep/brookfield-and-google-sign-hydro-framework-agreement-deliver-3000-mw-homegrown)). Nuclear restart, PPA, and small-reactor announcements multiplied after the Microsoft–Constellation deal, although announced commitments still exceed immediately deliverable supply ([Carnegie Endowment](https://carnegieendowment.org/research/2026/06/beyond-the-hype-assessing-hyperscaler-nuclear-commitments-against-us-energy-realities)). EU ETS averaged €73.43 per tonne at auction in 2025 ([ICAP](https://icapcarbonaction.com/en/ets/eu-emissions-trading-system-eu-ets)), while the voluntary market continued shifting toward integrity standards such as the Core Carbon Principles ([ICVCM](https://icvcm.org/engagement-impact/ccp-impact-report-2025/)).

## 4. Final-period price calibration notes

- Ørsted's final mark is reduced to $55 to reflect its 2025 equity raise and continuing offshore-wind stress rather than treating the 2024 price as final.
- GreenBridge's $310 and NextGen's $285 marks recognise the incremental value of large technology power contracts; the Google–Brookfield hydro framework is one public anchor.
- EU carbon is marked at $1,050, consistent with an EUA level around €70–80 per tonne and ICAP's €73.43 2025 auction average.
- Frontier Carbon Removal is marked down to $105: reporting showed the Mammoth plant had captured only 105 tonnes since June 2024 by mid-2025, far below nameplate capacity ([Chemical & Engineering News](https://cen.acs.org/environment/greenhouse-gases/Climeworks-raises-162-million-boost/103/web/2025/07)).
- PlantProtein is marked at $8 after declining 2025 revenue and heavy operating losses ([Beyond Meat](https://investors.beyondmeat.com/news-releases/news-release-details/beyond-meatr-reports-fourth-quarter-and-full-year-2025-financial/)).

## 5. Design notes and caveats

- Prices are teaching instruments, normalised for gameplay, not recommendations or records of an executable portfolio.
- Real company names belong only in this facilitator brief and the `realBasis` data field; player-facing descriptions, news, briefings, and takeaways remain anonymised.
- The final marks aim to retain the earlier game's relative ranking and volatility while making the player's Round 6 settlement a plausible mid-2026 outcome.
'''
(root/'CLIMATE_CAPITAL_HISTORICAL_BASIS.md').write_text(brief)
