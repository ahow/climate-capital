import type { GameAsset, RoundBriefing, RoundTakeaway } from "./schema";

/**
 * CLIMATE CAPITAL — Game Data
 *
 * All prices are normalised so every asset starts at $100 per unit.
 * Players allocate in $M increments. Buying $10M of an asset at $100/unit = 100,000 units.
 * Round prices reflect actual market performance, scaled to this normalised base.
 *
 * Sources: Historical equity/ETF data (Yahoo Finance, Perplexity Finance),
 * infrastructure IRR benchmarks (Brookfield, NREL), carbon market indices
 * (EU ETS via Trading Economics, VCM via Fastmarkets/CDR.fyi).
 */

// ── ASSETS ──

export const STARTING_CASH = 100_000_000; // $100M
export const MAX_POSITION_PCT = 0.40; // 40% max per position
export const MIN_TRADE = 1_000_000; // $1M minimum trade

export const GAME_ASSETS: GameAsset[] = [
  // ─── PUBLIC EQUITIES — CLEAN ENERGY ───
  {
    id: "electradrive",
    name: "ElectraDrive",
    realBasis: "Tesla (TSLA)",
    assetClass: "equity",
    sector: "Electric Vehicles",
    description: "A US electric vehicle maker that is also expanding into energy storage and solar. Highly volatile, driven by CEO profile and market sentiment as much as fundamentals.",
    riskLevel: "very-high",
    startPrice: 100,
    // Rounds: 1(2015-17), 2(2017-18), 3(2018-19), 4(2020), 5(2021), 6(2022), 7(2023-24), 8(2024-25)
    // TSLA: $14→$14.25→$20.47→$235→$381→$123→$248→$350 (approx, split-adj)
    roundPrices: [102, 146, 1679, 2724, 880, 1773, 2500],
    lockRounds: 0,
    minAllocation: 1_000_000,
  },
  {
    id: "solarpeak",
    name: "SolarPeak Inverters",
    realBasis: "Enphase Energy (ENPH)",
    assetClass: "equity",
    sector: "Solar Technology",
    description: "A leading manufacturer of solar micro-inverters. Rides the residential solar boom but is vulnerable to regulatory changes in key markets like California.",
    riskLevel: "very-high",
    startPrice: 100,
    // ENPH: ~$5→$6→$25→$175→$307→$135→$120→$65
    roundPrices: [120, 500, 3500, 6140, 2700, 2400, 1300],
    lockRounds: 0,
    minAllocation: 1_000_000,
  },
  {
    id: "nordicwind",
    name: "Nordic Wind Power",
    realBasis: "Ørsted (ORSTED)",
    assetClass: "equity",
    sector: "Offshore Wind",
    description: "Europe's largest offshore wind developer. A poster child for the energy transition, but exposed to construction costs, interest rates, and political risk.",
    riskLevel: "high",
    startPrice: 100,
    // Orsted (DKK): IPO ~134→280→600→800→1000→400→180→122
    roundPrices: [209, 448, 597, 746, 299, 134, 91],
    lockRounds: 0,
    minAllocation: 1_000_000,
  },
  {
    id: "hydrogen",
    name: "HydroGen Systems",
    realBasis: "Plug Power (PLUG)",
    assetClass: "equity",
    sector: "Hydrogen / Fuel Cells",
    description: "A hydrogen fuel cell company promising to revolutionise industrial energy. Has never been profitable but periodically attracts enormous speculative interest.",
    riskLevel: "very-high",
    startPrice: 100,
    // PLUG: $2.67→$2.50→$3→$33→$65→$13→$5→$2
    roundPrices: [94, 112, 1236, 2434, 487, 187, 75],
    lockRounds: 0,
    minAllocation: 1_000_000,
  },
  {
    id: "nextgen",
    name: "NextGen Utilities",
    realBasis: "NextEra Energy (NEE)",
    assetClass: "equity",
    sector: "Renewable Utility",
    description: "The world's largest generator of wind and solar energy, combined with a regulated Florida utility. Lower volatility than pure-play renewables, with a growing dividend.",
    riskLevel: "medium",
    startPrice: 100,
    // NEE (split-adj): ~$24→$36→$48→$72→$88→$76→$68→$76
    roundPrices: [150, 200, 300, 367, 317, 283, 317],
    lockRounds: 0,
    minAllocation: 1_000_000,
  },

  // ─── PUBLIC EQUITIES — FOSSIL FUELS ───
  {
    id: "titan",
    name: "Titan Petroleum",
    realBasis: "ExxonMobil (XOM)",
    assetClass: "equity",
    sector: "Oil Major",
    description: "The world's largest publicly traded oil company. Strong dividend, massive cash flows. Many ESG investors have excluded it, but energy security crises periodically make it the market's best performer.",
    riskLevel: "medium",
    startPrice: 100,
    // XOM: ~$80→$82→$68→$42→$61→$110→$100→$110 (+ dividends)
    roundPrices: [103, 85, 53, 76, 138, 125, 138],
    lockRounds: 0,
    minAllocation: 1_000_000,
  },
  {
    id: "appcoal",
    name: "Appalachian Coal",
    realBasis: "Peabody Energy (BTU)",
    assetClass: "equity",
    sector: "Coal Mining",
    description: "The largest private-sector coal company in the world. Under intense pressure from the energy transition and Paris Agreement commitments. Filed for bankruptcy once already.",
    riskLevel: "very-high",
    startPrice: 100,
    // BTU: ~$15 (2015, already in freefall)→$0 (bankruptcy 2016)→emerged→spike→fade
    roundPrices: [0, 0, 0, 40, 120, 80, 40],
    lockRounds: 0,
    minAllocation: 1_000_000,
  },
  {
    id: "autoemissions",
    name: "AutoEmissions AG",
    realBasis: "Volkswagen (VOW)",
    assetClass: "equity",
    sector: "Automotive",
    description: "A major European car manufacturer caught in an emissions cheating scandal. Now attempting a costly pivot to electric vehicles with uncertain results.",
    riskLevel: "high",
    startPrice: 100,
    // VW: ~€170→€140→€145→€140→€200→€120→€110→€95
    roundPrices: [82, 85, 82, 118, 71, 65, 56],
    lockRounds: 0,
    minAllocation: 1_000_000,
  },

  // ─── ETFs / INDICES ───
  {
    id: "cleanenergy",
    name: "Global Clean Energy Index",
    realBasis: "iShares Global Clean Energy ETF (ICLN)",
    assetClass: "etf",
    sector: "Clean Energy (Diversified)",
    description: "A diversified ETF tracking global clean energy companies. The single most popular way to get broad clean energy exposure, but with devastating volatility.",
    riskLevel: "high",
    startPrice: 100,
    // ICLN: ~$11→$11→$12→$28→$33→$18→$14→$15
    roundPrices: [100, 109, 255, 300, 164, 127, 136],
    lockRounds: 0,
    minAllocation: 1_000_000,
  },
  {
    id: "esgindex",
    name: "ESG Leaders Index",
    realBasis: "S&P 500 ESG Index",
    assetClass: "etf",
    sector: "Large Cap ESG",
    description: "A broad US large-cap index that applies ESG screening. Tracks very closely to the S&P 500 — the 'dirty secret' is that outperformance comes from tech overweighting, not green credentials.",
    riskLevel: "medium",
    startPrice: 100,
    // S&P 500 ESG roughly tracks S&P 500 with slight outperformance
    roundPrices: [130, 145, 180, 230, 195, 240, 290],
    lockRounds: 0,
    minAllocation: 1_000_000,
  },
  {
    id: "sp500",
    name: "Broad Market Index",
    realBasis: "S&P 500",
    assetClass: "etf",
    sector: "Large Cap (Diversified)",
    description: "The benchmark. A passive allocation to the 500 largest US companies. The question every climate investor must answer: can you beat this?",
    riskLevel: "medium",
    startPrice: 100,
    // S&P 500: ~2050→2700→2900→3750→4770→3840→4770→5600
    roundPrices: [132, 141, 183, 233, 187, 233, 273],
    lockRounds: 0,
    minAllocation: 1_000_000,
  },

  // ─── GREEN BONDS / CREDIT ───
  {
    id: "greenbond",
    name: "Global Green Bond Fund",
    realBasis: "Bloomberg Green Bond Index",
    assetClass: "credit",
    sector: "Green Fixed Income",
    description: "A diversified green bond fund offering modest yields with a small 'greenium' discount. Low volatility compared to equities, but vulnerable to interest rate rises.",
    riskLevel: "low",
    startPrice: 100,
    // Green bonds: modest returns, hit in 2022 by rates
    roundPrices: [103, 105, 108, 112, 97, 100, 104],
    lockRounds: 0,
    minAllocation: 1_000_000,
  },
  {
    id: "transitionbond",
    name: "Transition-Linked Note",
    realBasis: "Enel Sustainability-Linked Bond",
    assetClass: "credit",
    sector: "Transition Finance",
    description: "A sustainability-linked bond where the coupon steps up if the issuer misses emissions targets. A pioneer instrument testing whether financial incentives can drive corporate decarbonisation.",
    riskLevel: "low",
    startPrice: 100,
    roundPrices: [102, 104, 107, 110, 96, 101, 105],
    lockRounds: 0,
    minAllocation: 1_000_000,
  },

  // ─── INFRASTRUCTURE ───
  {
    id: "offshorewind",
    name: "North Sea Wind Fund",
    realBasis: "Hornsea-style offshore wind project",
    assetClass: "infrastructure",
    sector: "Offshore Wind Infrastructure",
    description: "A fund investing in large-scale offshore wind farm development in the North Sea. High expected returns, but illiquid and exposed to construction cost overruns and political risk. LOCKED for 2 rounds after purchase.",
    riskLevel: "high",
    startPrice: 100,
    // Good early vintages, then cost/rate squeeze
    roundPrices: [108, 116, 125, 135, 128, 95, 80],
    lockRounds: 2,
    minAllocation: 5_000_000,
  },
  {
    id: "solarfarm",
    name: "Sunbelt Solar Portfolio",
    realBasis: "US utility-scale solar farm portfolio",
    assetClass: "infrastructure",
    sector: "Solar Infrastructure",
    description: "A portfolio of utility-scale solar farms across the US sunbelt. Declining panel costs initially boost returns, but 'capture rate compression' gradually squeezes economics. LOCKED for 2 rounds after purchase.",
    riskLevel: "medium",
    startPrice: 100,
    // Solar IRR compression over time
    roundPrices: [112, 124, 138, 152, 148, 140, 135],
    lockRounds: 2,
    minAllocation: 5_000_000,
  },
  {
    id: "brookfield",
    name: "Brookfield Renewables",
    realBasis: "Brookfield Renewable Partners",
    assetClass: "infrastructure",
    sector: "Renewable Infrastructure Platform",
    description: "A diversified global renewable infrastructure fund targeting 12-15% returns. The most consistent performer in the asset class, now boosted by AI data centre power demand. LOCKED for 2 rounds after purchase.",
    riskLevel: "medium",
    startPrice: 100,
    roundPrices: [110, 120, 135, 150, 142, 158, 175],
    lockRounds: 2,
    minAllocation: 5_000_000,
  },

  // ─── CARBON MARKETS ───
  {
    id: "eucarbon",
    name: "EU Carbon Allowances",
    realBasis: "EU ETS (EUA)",
    assetClass: "carbon",
    sector: "Compliance Carbon",
    description: "European Union Emissions Trading System allowances. The most successful carbon pricing mechanism in the world. From €5/tonne in 2015 to a peak of €105 in 2023. Extreme volatility with political and regulatory risk.",
    riskLevel: "high",
    startPrice: 100,
    // EU ETS: €5→€7→€22→€33→€50→€85→€65→€70
    roundPrices: [140, 440, 660, 1000, 1700, 1300, 1400],
    lockRounds: 0,
    minAllocation: 1_000_000,
  },
  {
    id: "vcm-premium",
    name: "Premium Carbon Credits",
    realBasis: "Gold Standard / high-quality VCM credits",
    assetClass: "carbon",
    sector: "Voluntary Carbon (Quality)",
    description: "A portfolio of high-quality voluntary carbon credits from Gold Standard certified projects. More expensive than generic credits, but proven additionality and resistant to integrity scandals.",
    riskLevel: "medium",
    startPrice: 100,
    // Quality VCM: $4→$5→$7→$12→$15→$14→$16→$17
    roundPrices: [125, 175, 300, 375, 350, 400, 425],
    lockRounds: 0,
    minAllocation: 1_000_000,
  },
  {
    id: "vcm-standard",
    name: "Standard Carbon Credits",
    realBasis: "Generic Verra REDD+ credits",
    assetClass: "carbon",
    sector: "Voluntary Carbon (Generic)",
    description: "A portfolio of standard forestry-based carbon credits, primarily REDD+ projects certified by Verra. Cheaper than premium credits, but vulnerable to integrity challenges.",
    riskLevel: "high",
    startPrice: 100,
    // Standard VCM: $3→$4→$5→$9→$12→$10→$4→$4
    roundPrices: [133, 167, 300, 400, 333, 133, 133],
    lockRounds: 0,
    minAllocation: 1_000_000,
  },
  {
    id: "naturalcapital",
    name: "Natural Capital Fund",
    realBasis: "HSBC Pollination / Mirova Natural Capital",
    assetClass: "carbon",
    sector: "Nature-Based Solutions",
    description: "A fund investing in natural capital projects: forest conservation, regenerative agriculture, and blue carbon. Illiquid with a long time horizon. LOCKED for 3 rounds after purchase.",
    riskLevel: "high",
    startPrice: 100,
    // Not available until round 3; early vintages ok, then scandal hit
    roundPrices: [100, 100, 105, 112, 108, 100, 98],
    lockRounds: 3,
    minAllocation: 5_000_000,
  },

  // ─── THEMATIC / HIGH-CONVICTION ───
  {
    id: "plantprotein",
    name: "PlantProtein Co",
    realBasis: "Beyond Meat (BYND)",
    assetClass: "thematic",
    sector: "Alt Protein",
    description: "A plant-based meat company that went public to enormous fanfare. The IPO tripled on day one. Consumer demand for alt-protein is the key question.",
    riskLevel: "very-high",
    startPrice: 100,
    // BYND: not public until 2019. IPO $65→$240→$140→$25→$5→$1
    roundPrices: [100, 100, 369, 215, 38, 8, 2],
    lockRounds: 0,
    minAllocation: 1_000_000,
  },
  {
    id: "wildfire",
    name: "WildFire Utility",
    realBasis: "PG&E (PCG)",
    assetClass: "thematic",
    sector: "US Utility / Climate Risk",
    description: "A major US utility operating in wildfire-prone California. Climate-driven extreme weather is an existential threat to its business model.",
    riskLevel: "very-high",
    startPrice: 100,
    // PCG: ~$56→$66→$48→$9→$12→$12→$17→$18
    roundPrices: [118, 86, 16, 21, 21, 30, 32],
    lockRounds: 0,
    minAllocation: 1_000_000,
  },
  {
    id: "dac",
    name: "Frontier Carbon Removal",
    realBasis: "Climeworks DAC technology",
    assetClass: "thematic",
    sector: "Direct Air Capture",
    description: "An early-stage direct air capture company removing CO₂ at $600-1,000/tonne. Technology works but costs remain 10x above compliance carbon prices. A bet on exponential cost reduction.",
    riskLevel: "very-high",
    startPrice: 100,
    // Speculative - not tradeable until round 4, high risk
    roundPrices: [100, 100, 100, 90, 85, 95, 110],
    lockRounds: 0,
    minAllocation: 1_000_000,
  },
];

// ── ROUND BRIEFINGS ──

export const ROUND_BRIEFINGS: RoundBriefing[] = [
  {
    round: 1,
    title: "The Paris Moment",
    period: "Late 2015 – Early 2017",
    contextBullets: [
      "December 2015: 196 nations sign the Paris Agreement, committing to limit warming to well below 2°C.",
      "Coal stocks crash on the news: Peabody Energy falls 11–13% on the first trading day after the agreement.",
      "Goldman Sachs estimates the low-carbon economy is worth $600B+ and growing fast.",
      "But coal still generates 40% of global electricity. Oil demand is at record highs.",
      "Renewable energy costs are falling fast but solar and wind are still less than 5% of global electricity generation.",
      "EU carbon allowances are trading at just €5–8/tonne — cheap but potentially a sleeping giant.",
    ],
    keyQuestion: "How aggressively should you bet on the Paris signal vs. the ongoing reality of fossil fuel dominance?",
  },
  {
    round: 2,
    title: "The Trump Shock",
    period: "2017 – Mid-2018",
    contextBullets: [
      "November 2016: Donald Trump is elected US President on a pro-fossil-fuel platform.",
      "June 2017: The US formally announces withdrawal from the Paris Agreement.",
      "Non-US renewable stocks lost 14% in the 20 days following the Trump election.",
      "Pipeline stocks surged — Energy Transfer rose 19% in election week alone.",
      "But the rest of the world doubled down: the EU launched its Sustainable Finance Action Plan.",
      "The TCFD recommendations are published, endorsed by 100+ CEOs with $3.3 trillion in market cap.",
      "ESG fund inflows continued growing despite US political headwinds.",
    ],
    keyQuestion: "Was Paris a false start, or is the US an outlier? Should you follow the politics or the policy machinery?",
  },
  {
    round: 3,
    title: "The Green Wave Builds",
    period: "Mid-2018 – Late 2019",
    contextBullets: [
      "Greta Thunberg's school strikes go global. 4 million+ people march in September 2019.",
      "ESG fund inflows hit $20.6 billion in 2019 — nearly 4x the previous year's record.",
      "The EU Green Deal is announced (December 2019): Europe commits to becoming the first climate-neutral continent by 2050.",
      "Renewable energy costs cross below fossil fuels in most markets for the first time.",
      "Australian bushfires (2019–20) and extreme weather events make climate risk tangible for asset owners.",
      "PG&E files for bankruptcy (January 2019) after California wildfire liabilities exceed $30 billion.",
    ],
    keyQuestion: "Is this the beginning of a structural shift in markets, or a sentiment-driven rally?",
  },
  {
    round: 4,
    title: "Pandemic, Crash, and Green Euphoria",
    period: "2020",
    contextBullets: [
      "March 2020: COVID-19 crashes global markets. The S&P 500 falls 34% in five weeks.",
      "April 2020: Oil prices go NEGATIVE for the first time in history (WTI: -$37.63/barrel).",
      "Governments announce massive green recovery packages. The EU's €750B NextGenerationEU fund has a 37% climate spending floor.",
      "ESG funds outperform conventional funds during the crash, attracting huge attention.",
      "Clean energy enters a parabolic rally: the Global Clean Energy Index returns +142% for the year.",
      "December 2020: ElectraDrive (Tesla) joins the S&P 500, triggering $154B in rebalancing trades.",
      "PlantProtein Co (Beyond Meat) is now publicly traded and riding the alt-protein wave.",
    ],
    keyQuestion: "Are clean energy valuations justified by the green recovery, or is this a bubble forming?",
  },
  {
    round: 5,
    title: "Peak Euphoria and Net Zero Pledges",
    period: "2021",
    contextBullets: [
      "Biden is inaugurated, recommits the US to Paris, and signals massive climate legislation.",
      "COP26 in Glasgow: 140+ countries make net zero pledges covering 90% of global GDP.",
      "Clean energy valuations reach extreme levels. SPACs flood the climate space.",
      "The voluntary carbon market booms: credit prices reach $10–15/tonne.",
      "PlantProtein Co and OatMilk Global are both publicly traded with combined market cap exceeding $25 billion.",
      "BUT: inflation is rising. Central banks signal rate hikes. Bond yields are moving up.",
      "EU carbon allowances surge past €50/tonne as the EU tightens the Emissions Trading System.",
    ],
    keyQuestion: "Everything climate looks like it only goes up. Take profits on the extraordinary rally, or ride the momentum?",
  },
  {
    round: 6,
    title: "The Energy Crisis",
    period: "2022",
    contextBullets: [
      "February 2022: Russia invades Ukraine. European energy security is shattered overnight.",
      "Natural gas prices in Europe spike 10x. Oil surges above $120/barrel.",
      "Fossil fuel companies post record profits: Titan Petroleum (Exxon) earns $55.7 billion.",
      "The fossil fuel ETF returns +64% while the S&P 500 falls -18%.",
      "Clean energy stocks collapse: rising rates, supply chain disruption, and renewed fossil fuel political support.",
      "EU responds with REPowerEU: massive acceleration of renewables. But the short-term pain is severe.",
      "August 2022: Biden signs the Inflation Reduction Act — $369 billion for clean energy, the biggest climate legislation in US history.",
      "EU carbon allowances hit an ALL-TIME HIGH of €105/tonne as the energy crisis highlights carbon dependence.",
    ],
    keyQuestion: "Is this the bottom for clean energy, or the beginning of a new fossil fuel era? And what about the IRA?",
  },
  {
    round: 7,
    title: "Reality Check — ESG Backlash and Integrity Crisis",
    period: "2023 – 2024",
    contextBullets: [
      "Anti-ESG political backlash sweeps the US: Republican states pull funds from ESG-focused managers.",
      "US ESG fund outflows hit $13 billion in 2023 — the first negative year in a decade — accelerating to $19.6 billion in 2024.",
      "Nordic Wind Power (Ørsted) announces $5.6 billion in offshore wind project writedowns. Stock falls 52%.",
      "January 2023: A major investigation reveals that 90%+ of standard REDD+ carbon credits had no real climate impact.",
      "COP28 in Dubai produces historic 'transition away from fossil fuels' language, but no binding mechanism.",
      "Interest rates remain elevated. Growth stocks continue to underperform value stocks.",
      "The voluntary carbon market bifurcates sharply: premium credits hold value, generic credits collapse.",
    ],
    keyQuestion: "Is the climate investment thesis dead, or is this the buying opportunity of a generation?",
  },
  {
    round: 8,
    title: "The Second Trump Era",
    period: "Late 2024 – 2025",
    contextBullets: [
      "November 2024: Trump wins a second presidential term. Signals immediate Paris withdrawal, IRA rollback, and removal of EV mandates.",
      "Election week: Global Clean Energy Index falls -11%, Solar ETF -15%, some clean energy stocks lose 50%+.",
      "Tariffs on Chinese solar panels and EVs disrupt global clean energy supply chains.",
      "Nordic Wind Power (Ørsted) cancels its largest UK project. Trump issues stop-work orders on US offshore wind.",
      "BUT: 80%+ of IRA-funded projects are in Republican districts. Full rollback proves politically difficult.",
      "Brookfield Renewables reports record results driven by AI data centre power demand — a new unexpected catalyst.",
      "EU carbon allowances stabilise around €70/tonne. The market anticipates regulatory evolution rather than collapse.",
    ],
    keyQuestion: "This is your final allocation. Where does climate investing go from here?",
  },
];

// ── ROUND TAKEAWAYS ──

export const ROUND_TAKEAWAYS: RoundTakeaway[] = [
  {
    round: 1,
    takeaways: [
      "Appalachian Coal (Peabody Energy) filed for bankruptcy in April 2016 — holders lost 100% of their investment.",
      "Clean energy stocks gained only modestly. The Paris rally was real but muted for equities in the near term.",
      "EU carbon allowances remained cheap at €5–8/tonne — the signal was there but the price had not yet responded.",
      "Policy signals can take years to feed into asset prices. Early movers in carbon allowances were eventually rewarded enormously, but patience was required.",
    ],
    didYouKnow: "Peabody Energy's stock had already fallen 95% from $300 to $15 before the Paris Agreement was signed. The final 13% drop was the coup de grâce, not the main event. Timing matters as much as thesis.",
  },
  {
    round: 2,
    takeaways: [
      "Markets had largely priced in Trump's stance by inauguration. The actual Paris withdrawal announcement was a non-event for asset prices.",
      "EU policy machinery accelerated behind the scenes: the SFDR framework was being designed, creating foundations for the ESG asset management boom.",
      "The TCFD framework became the structural catalyst for corporate climate disclosure globally.",
      "Geopolitics creates sentiment, but regulation creates markets. The EU's quiet regulatory build-up mattered more than US politics.",
    ],
    didYouKnow: "Non-US renewable stocks lost 14% in the 20 days after Trump's election — but most of that loss was recovered within months. Short-term political shocks often reverse faster than expected.",
  },
  {
    round: 3,
    takeaways: [
      "PG&E's bankruptcy was the first major example of physical climate risk destroying shareholder value at utility scale — $30 billion in wildfire liabilities.",
      "ESG fund flows created a self-reinforcing cycle: inflows drove up ESG stock prices, which attracted more inflows.",
      "The EU Green Deal laid the groundwork for trillions in climate-directed capital over the following decade.",
      "Social movements create political pressure, which creates policy, which creates markets. The 'Greta effect' translated into real capital flows.",
    ],
    didYouKnow: "PG&E's stock fell 91% from its 2017 high to its 2019 bankruptcy filing. It was one of the first 'climate bankruptcy' cases — a utility destroyed not by transition risk but by physical climate impacts.",
  },
  {
    round: 4,
    takeaways: [
      "COVID-era ESG outperformance was largely a sector effect: tech-heavy ESG indices benefited from the stay-at-home trade, not from sustainability credentials.",
      "Negative oil prices (-$37.63/barrel) were a once-in-history event caused by storage constraints, not a permanent shift in energy economics.",
      "The clean energy rally of 2020 had the hallmarks of a speculative bubble: extreme valuations, retail investor euphoria, and fundamental disconnects.",
      "A good investment thesis can still produce a bad investment at the wrong price. Valuation discipline matters even when you believe the long-term story.",
    ],
    didYouKnow: "ElectraDrive (Tesla) rose +743% in 2020 alone. On the day it joined the S&P 500 in December, $154 billion worth of stock was traded in a single session — one of the largest trading events in market history.",
  },
  {
    round: 5,
    takeaways: [
      "Clean energy valuations at their peak were pricing in decades of future growth. When interest rates rose, those distant cash flows were discounted more heavily.",
      "Net zero pledges covered 90% of global GDP but had no binding enforcement mechanism. Markets briefly rallied on announcements, then reverted.",
      "PlantProtein Co (Beyond Meat) peaked at $240 in 2019 and was already declining — the alt-protein thesis was broken by consumer reality, not by climate policy.",
      "Narrative momentum is not the same as fundamental value. The best time to sell is often when the story feels most compelling.",
    ],
    didYouKnow: "At its peak, the Solar ETF (TAN) had returned +234% in a single year (2020). By the end of 2024, nearly all of those gains had evaporated. Investors who bought at the peak lost more than 70%.",
  },
  {
    round: 6,
    takeaways: [
      "Energy security trumped climate ambition in the short term. Governments that had been closing coal plants reopened them.",
      "The Inflation Reduction Act triggered $133 billion in clean energy manufacturing announcements — but the market impact was slow to materialise.",
      "EU carbon allowances actually rose to their all-time high (€105/tonne) during the energy crisis, as the crisis highlighted the cost of carbon dependence.",
      "Geopolitical shocks can reverse market dynamics overnight. Diversification across both fossil and clean assets was the winning strategy in 2022.",
    ],
    didYouKnow: "Titan Petroleum (ExxonMobil) earned $55.7 billion in profit in 2022 — the largest annual profit ever recorded by a Western oil company. The stock many ESG investors had excluded became the year's best performer.",
  },
  {
    round: 7,
    takeaways: [
      "Nordic Wind Power's (Ørsted's) collapse showed that even best-in-class operators can be destroyed by macro conditions: rising rates, cost inflation, and political reversals.",
      "The voluntary carbon market bifurcated: Gold Standard premium credits actually increased in value, while generic REDD+ credits collapsed by 60-70%.",
      "US ESG fund outflows were concentrated in the US; European sustainable fund flows remained net positive throughout.",
      "Quality matters more than labels. 'Green' is not a sufficient investment thesis. Due diligence on specific assets, credit integrity, and business model resilience is essential.",
    ],
    didYouKnow: "The 2023 Guardian/Verra investigation found that over 90% of REDD+ forest carbon credits examined had no measurable impact on deforestation. Verra's market share fell from 80% to 35% within two years.",
  },
  {
    round: 8,
    takeaways: [
      "Policy risk is the dominant driver of climate investment returns. The same asset class can look like genius or folly depending on who wins an election.",
      "The IRA's political resilience — 80%+ of projects in Republican districts — illustrates how smart policy design can survive political transitions.",
      "The AI/data centre energy demand surge created an unexpected new demand driver for renewables, partially decoupling clean energy economics from climate policy.",
      "The climate investment landscape is shaped by three forces: policy, technology economics, and energy demand. The best investors read all three.",
    ],
    didYouKnow: "Brookfield Renewable's record results in 2025 were driven substantially by contracts to supply power to AI data centres for Microsoft and Alphabet — a demand driver that didn't exist when most clean energy investments were originally underwritten.",
  },
];

// ── PREDICTION QUESTIONS (between-round engagement) ──

export interface PredictionQuestion {
  round: number; // shown before this round's results
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const PREDICTION_QUESTIONS: PredictionQuestion[] = [
  {
    round: 2,
    question: "After Trump's election, what happened to EU climate policy?",
    options: ["It stalled", "It accelerated", "It reversed", "No change"],
    correctIndex: 1,
    explanation: "The EU doubled down, launching the Sustainable Finance Action Plan and accelerating SFDR development — regulation creates markets.",
  },
  {
    round: 4,
    question: "During the COVID crash, how did ESG funds perform vs conventional funds?",
    options: ["Much worse", "About the same", "Slightly better", "Significantly better"],
    correctIndex: 2,
    explanation: "ESG funds slightly outperformed — but mainly because they were overweight tech stocks (the stay-at-home trade), not because of sustainability.",
  },
  {
    round: 5,
    question: "What percentage of net zero pledges at COP26 had legally binding targets?",
    options: ["Less than 10%", "About 25%", "About 50%", "Over 75%"],
    correctIndex: 0,
    explanation: "Fewer than 10% of net zero pledges had any legally binding enforcement mechanism — announcements move sentiment, but not necessarily capital.",
  },
  {
    round: 6,
    question: "What was the best-performing asset class in 2022?",
    options: ["Clean energy equities", "Green bonds", "Fossil fuel equities", "EU carbon"],
    correctIndex: 2,
    explanation: "Fossil fuel equities (XLE ETF) returned +64% in 2022 while the S&P 500 fell -18%. Energy security trumped climate ambition.",
  },
  {
    round: 7,
    question: "True or False: ESG-labelled index funds outperformed because of their green holdings.",
    options: ["True", "False"],
    correctIndex: 1,
    explanation: "False. The S&P 500 ESG Index outperformed the regular S&P 500 primarily because of tech stock concentration (Apple, Microsoft), not green companies.",
  },
  {
    round: 8,
    question: "What percentage of IRA-funded clean energy projects are in Republican congressional districts?",
    options: ["About 30%", "About 50%", "About 65%", "Over 80%"],
    correctIndex: 3,
    explanation: "Over 80% of IRA-funded projects landed in Republican districts, making full rollback politically difficult — smart policy design matters.",
  },
];

// ── AWARDS ──

export interface Award {
  id: string;
  name: string;
  icon: string; // lucide icon name
  description: string;
}

export const AWARDS: Award[] = [
  { id: "champion", name: "Climate Capital Champion", icon: "trophy", description: "Highest total portfolio value at game end." },
  { id: "alpha", name: "Pure Alpha", icon: "trending-up", description: "Highest total return regardless of strategy." },
  { id: "baron", name: "The Carbon Baron", icon: "flame", description: "Highest return from fossil fuel holdings. Deliberately provocative." },
  { id: "stranded", name: "The Stranded Asset", icon: "alert-triangle", description: "Largest single-position loss. A warning about concentration risk." },
  { id: "steady", name: "The Steady Hand", icon: "shield", description: "Best risk-adjusted return — lowest volatility with positive returns." },
  { id: "greenwash", name: "The Greenwash Detector", icon: "search", description: "Best carbon credit selection — avoided the integrity scandal." },
  { id: "contrarian", name: "The Contrarian", icon: "refresh-cw", description: "Best return from buying when an asset class was down 20%+ from its peak." },
];
