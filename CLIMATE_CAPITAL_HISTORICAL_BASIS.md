# Climate Capital — Historical Basis of the Game

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

## 2. Basket construction and asset price paths

### Why baskets rather than single names

An earlier version of this simulation used one representative single company for each listed-equity asset (for example Tesla for the EV proxy, Enphase for the solar equipment proxy). Single names produced idiosyncratic extremes — most notably a fifteen-fold Tesla path — that risked teaching the wrong lesson: that broad thematic conviction was rewarded when in fact one or two constituents did most of the work. Listed-equity assets have therefore been reformulated as diversified sector baskets. Private funds (offshore wind project, utility-scale solar portfolio, renewable-infrastructure fund, natural-capital fund, direct-air-capture technology) remain single-vehicle exposures because they are already portfolio structures at source.

Each basket is proxied by a specific ETF or a peer average where no clean ETF exists over the full 2015 – mid-2026 window. Round-end index levels compound the underlying ETF or peer annual total returns from base 100 at the start of Round 1.

### 2a. Basket compositions and proxies

| In-game asset | Basket / proxy | Representative constituents |
|---|---|---|
| Global EV Leaders | KraneShares Electric Vehicles ETF (KARS) plus peer approximation pre-2019 | Tesla, BYD, Li Auto, NIO, XPeng, Rivian, Lucid |
| Solar Equipment Leaders | Invesco Solar ETF (TAN) | Enphase, SolarEdge, First Solar, Sunrun, Array Technologies, Nextracker |
| Global Wind Energy Basket | First Trust Global Wind Energy ETF (FAN) | Ørsted, Vestas, Siemens Energy, RWE, Iberdrola, EDP Renováveis |
| Hydrogen Economy Basket | Peer basket pre-2021 / Global X Hydrogen ETF (HYDR) post-2021 | Plug Power, Ballard, Bloom Energy, Nel, ITM Power, Linde |
| Clean Utility Leaders | S&P 500 Utilities Sector Index proxy | NextEra, AES, Xcel, Southern, Consolidated Edison, Duke |
| Integrated Oil Majors | Energy Select Sector SPDR (XLE) | ExxonMobil, Chevron, Shell, TotalEnergies, BP, Equinor |
| Coal Producers Basket | VanEck Coal ETF (KOL, closed Dec 2020) plus peer average | Peabody, Arch Resources, Consol Energy, Alliance Resource Partners, Warrior Met Coal |
| Legacy Auto Basket | Peer average of listed legacy auto | Volkswagen, Ford, GM, Stellantis, Toyota, Honda, Hyundai |
| Global Clean Energy Index | iShares Global Clean Energy ETF (ICLN) | Approximately 100 global clean-energy names |
| ESG Leaders Index | S&P 500 ESG Index | Approximately 300 US large-cap ESG-screened names |
| Broad Market Index | S&P 500 (total return) | 500 US large caps |
| Global Green Bond Fund | Bloomberg Green Bond Index | Approximately 900 global labelled green bonds |
| Transition-Linked Note | Enel-style sustainability-linked bond | Coupon steps up on missed emissions targets |
| Alternative Protein Basket | Peer basket of listed alt-protein / plant-based food | Beyond Meat, Oatly, Vital Farms, and other listed alt-protein names |
| Wildfire-Exposed Utilities | Peer basket of Western US utilities | PG&E, Edison International, Sempra, Hawaiian Electric |

Private funds (North Sea Wind Fund, Sunbelt Solar Portfolio, GreenBridge Infrastructure, Natural Capital Fund, Frontier Carbon Removal) are single-vehicle exposures and are unchanged.

### 2b. Round-end price paths (base 100 at start of Round 1)

| In-game asset | R1 end 2019 | R2 end 2020 | R3 end 2021 | R4 end 2022 | R5 end 2024 | R6 end mid-2026 | Final-period rationale |
|---|---:|---:|---:|---:|---:|---:|---|
| Global EV Leaders | $148 | $253 | $315 | $191 | $145 | $229 | Global EV cycle recovers on lower rates and China stimulus. |
| Solar Equipment Leaders | $108 | $362 | $271 | $257 | $117 | $197 | 2025 rebound after two years of policy and tariff pain. |
| Global Wind Energy Basket | $121 | $194 | $172 | $149 | $132 | $176 | European wind auction reset and easing rates lift the basket. |
| Hydrogen Economy Basket | $120 | $478 | $239 | $108 | $26 | $27 | Cash burn and dilution keep the whole basket depressed. |
| Clean Utility Leaders | $168 | $167 | $196 | $199 | $227 | $289 | AI data-centre load supports utility-scale clean-power demand. |
| Integrated Oil Majors | $116 | $78 | $120 | $197 | $207 | $290 | Buybacks and disciplined capex keep energy majors well bid. |
| Coal Producers Basket | $113 | $79 | $205 | $574 | $342 | $325 | Coal softens from crisis highs but energy security limits the decline. |
| Legacy Auto Basket | $113 | $107 | $150 | $105 | $71 | $67 | China competition and difficult EV transitions continue to weigh. |
| Global Clean Energy Index | $133 | $321 | $245 | $232 | $137 | $227 | Recovery reflects power-demand growth despite policy risk. |
| ESG Leaders Index | $175 | $223 | $292 | $242 | $360 | $458 | Broad equity and AI-led gains dominate the result. |
| Broad Market Index | $172 | $204 | $262 | $215 | $339 | $451 | AI-led equity strength continues into the final mark. |
| Global Green Bond Fund | $114 | $124 | $118 | $85 | $89 | $97 | Rates stabilise and allow a modest recovery. |
| Transition-Linked Note | $112 | $120 | $118 | $100 | $109 | $115 | Credit remains resilient as the issuer retains ESG-market access. |
| North Sea Wind Fund | $130 | $145 | $155 | $130 | $105 | $95 | Further cost pressure and cancelled capacity lower value. |
| Sunbelt Solar Portfolio | $142 | $160 | $172 | $158 | $150 | $148 | Tariffs offset otherwise stable operating cash flows. |
| GreenBridge Infrastructure | $234 | $422 | $361 | $265 | $266 | $310 | Large technology PPAs boost the renewable-infrastructure outlook. |
| EU Carbon Allowances | $248 | $298 | $745 | $708 | $482 | $556 | Allowance prices settle broadly in the €70–80 range after the 2023 – 24 reset. |
| Premium Carbon Credits | $123 | $141 | $183 | $211 | $199 | $219 | Quality-flight demand supports independently validated credits. |
| Standard Carbon Credits | $122 | $115 | $185 | $259 | $149 | $121 | Integrity concerns continue to pressure generic credits. |
| Natural Capital Fund | $102 | $105 | $108 | $103 | $100 | $102 | Long-horizon assets remain near cost while value creation matures. |
| Alternative Protein Basket | $130 | $214 | $139 | $21 | $10 | $6 | Falling revenue and continuing losses across the basket. |
| Wildfire-Exposed Utilities | $57 | $62 | $69 | $76 | $100 | $115 | PG&E recovery lifts the basket from the 2018 – 19 lows. |
| Frontier Carbon Removal | $100 | $95 | $92 | $100 | $115 | $105 | Mammoth underperformance reinforces the cost and scale challenge. |

### 2c. Basket sources

- KraneShares Electric Vehicles ETF ([KARS](https://kraneshares.com/etf/kars/))
- Invesco Solar ETF ([TAN](https://portfolioslab.com/symbol/TAN))
- First Trust Global Wind Energy ETF ([FAN](https://portfolioslab.com/symbol/FAN))
- iShares Global Clean Energy ETF ([ICLN](https://www.ishares.com/us/products/239738/ishares-global-clean-energy-etf))
- Energy Select Sector SPDR ([XLE](https://www.alphacubator.com/analysis/XLE))
- VanEck Coal ETF ([KOL, delisted December 2020](https://www.vaneck.com/us/en/investments/coal-etf-kol/))
- Global X Hydrogen ETF ([HYDR, launched 2021](https://www.globalxetfs.com/funds/hydr/))
- S&P 500 and S&P 500 ESG Index total returns ([S&P Dow Jones Indices](https://www.spglobal.com/spdji/en/indices/equity/sp-500-esg-index/#overview))
- Bloomberg MSCI Global Green Bond Index ([Bloomberg](https://www.bloomberg.com/professional/products/indices/green-bond-indices/))
- EU ETS EUA prices ([ICAP](https://icapcarbonaction.com/en/ets/eu-emissions-trading-system-eu-ets))

## 3. Round-by-round narrative and factual basis

### Round 1 — The Paris Signal *(Late 2015 – 2019)*

Paris set the political direction in December 2015, but asset markets initially reflected continued fossil dominance. The April 2016 Peabody bankruptcy demonstrated stranded-asset risk, while the first Trump administration's announced Paris withdrawal hit renewable sentiment. The more durable change was institutional: the EU Sustainable Finance Action Plan, TCFD disclosure framework, China ETS, and ultimately the European Green Deal created the rulebook through which capital would later flow. In 2019, the climate strikes, record sustainable-fund inflows, and the PG&E bankruptcy connected social pressure, financial flows, and physical climate risk.

### Round 2 — Pandemic and Green Euphoria *(2020)*

COVID produced the fastest modern market crash and briefly negative WTI prices, followed by enormous monetary and fiscal support. The EU's NextGenerationEU recovery programme applied a 37% climate-spending floor. Clean-energy valuations became extreme across the sector, with the diversified ICLN ETF returning approximately 141% in 2020 and the Invesco Solar ETF (TAN) returning approximately 234% ([S&P Dow Jones Indices](https://www.spglobal.com/spdji/en/documents/index-news-and-announcements/20201116-500-tsla.pdf)). Within those baskets the range was extreme — the EV basket rose approximately 71% for the year, but with Tesla contributing most of the move — a dispersion that mattered for anyone concentrating conviction in single names. The round is designed to separate a legitimate transition tailwind from the price paid for it.

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
