import type { GameAsset, RoundBriefing, RoundTakeaway } from "./schema";

/**
 * CLIMATE CAPITAL — Game Data
 *
 * All prices are normalised so every asset starts at $100 per unit.
 * Players allocate in $M increments. Buying $10M of an asset at $100/unit = 100,000 units.
 * Round prices reflect actual market performance, scaled to this normalised base.
 *
 * Sources: Historical equity/ETF data, infrastructure IRR benchmarks, and carbon market indices
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
    // Round endpoints: R1(2019), R2(2020), R3(2021), R4(2022), R5(2024), R6(mid-2026)
    // TSLA: $14→$14.25→$20.47→$235→$381→$123→$248→$350 (approx, split-adj)
    roundPrices: [174, 1470, 2202, 770, 2524, 2000],
    lockRounds: 0,
    minAllocation: 1_000_000,
    valuation: { tier: "Mega", marketCapBn: 780, peRatioProxy: 65, dividendYieldPct: 0 },
    transitionThesis:
      "The bellwether of the electric-vehicle shift, pairing high-volume EV production with energy storage and solar — a pure-play bet on transport and grid electrification.",
    riskProfile: "Speculative",
    keyRisks: [
      "Valuation swings dramatically with sentiment, not just fundamentals",
      "Heavy reliance on a single high-profile CEO",
      "Intensifying EV price competition compresses margins",
    ],
    historicalNotes: [
      { round: 2, event: "Joins the broad market index; record rebalancing trade" },
      { round: 3, event: "Parabolic clean-energy rally lifts the stock to a peak" },
      { round: 4, event: "Rate hikes and risk-off rotation trigger a sharp drawdown" },
    ],
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
    roundPrices: [744, 4999, 5212, 7549, 3765, 3200],
    lockRounds: 0,
    minAllocation: 1_000_000,
    valuation: { tier: "Mid", marketCapBn: 18, peRatioProxy: 40, dividendYieldPct: 0 },
    transitionThesis:
      "A direct play on residential solar adoption: its micro-inverters are the enabling hardware for distributed rooftop generation as homeowners electrify.",
    riskProfile: "Speculative",
    keyRisks: [
      "Highly sensitive to residential solar subsidy and net-metering rules",
      "Concentrated in a few key state markets",
      "Extreme share-price volatility through the rate cycle",
    ],
    historicalNotes: [
      { round: 2, event: "Residential solar boom drives a parabolic re-rating" },
      { round: 5, event: "Higher rates and policy changes sharply cut demand" },
    ],
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
    roundPrices: [194, 314, 186, 129, 86, 55],
    lockRounds: 0,
    minAllocation: 1_000_000,
    valuation: { tier: "Large", marketCapBn: 45, peRatioProxy: 22, dividendYieldPct: 2.5 },
    transitionThesis:
      "Europe's largest offshore wind developer and a flagship of the energy transition — building the large-scale generation capacity that decarbonised grids require.",
    riskProfile: "High",
    keyRisks: [
      "Project economics highly exposed to interest rates",
      "Construction-cost overruns on multi-year builds",
      "Auction-price and political risk in key markets",
    ],
    historicalNotes: [
      { round: 2, event: "Offshore-wind optimism pushes the stock to its peak" },
      { round: 3, event: "Auction-price pressure begins a steep de-rating" },
      { round: 5, event: "Multi-billion writedown; project cancellations" },
    ],
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
    roundPrices: [150, 1607, 1338, 586, 213, 140],
    lockRounds: 0,
    minAllocation: 1_000_000,
    valuation: { tier: "Mid", marketCapBn: 6, peRatioProxy: 0, dividendYieldPct: 0 },
    transitionThesis:
      "A bet on green hydrogen as the decarbonisation pathway for hard-to-electrify industry and heavy transport — high optionality if fuel-cell economics break through.",
    riskProfile: "Speculative",
    keyRisks: [
      "Has never been profitable; relies on continued funding",
      "Hydrogen cost curve remains far above incumbents",
      "Periodic speculative spikes detached from fundamentals",
    ],
    historicalNotes: [
      { round: 2, event: "Green-hydrogen hype drives an enormous speculative spike" },
      { round: 4, event: "Funding squeeze and rate hikes deflate the rally" },
    ],
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
    roundPrices: [235, 270, 336, 318, 231, 285],
    lockRounds: 0,
    minAllocation: 1_000_000,
    valuation: { tier: "Mega", marketCapBn: 150, peRatioProxy: 24, dividendYieldPct: 2.4 },
    transitionThesis:
      "The world's largest wind and solar generator wrapped around a regulated utility — a lower-volatility way to own the build-out of clean generation with a growing dividend.",
    riskProfile: "Moderate",
    keyRisks: [
      "Rate-sensitive given large regulated rate base",
      "Execution risk on an ambitious renewables pipeline",
      "Regulatory and weather exposure in its home market",
    ],
    historicalNotes: [
      { round: 3, event: "Renewables leadership lifts the stock to a high" },
      { round: 5, event: "Rate-driven de-rating pulls it back" },
    ],
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
    roundPrices: [85, 41, 70, 135, 126, 135],
    lockRounds: 0,
    minAllocation: 1_000_000,
    valuation: { tier: "Mega", marketCapBn: 450, peRatioProxy: 12, dividendYieldPct: 3.5 },
    transitionThesis:
      "A transition-portfolio diversifier rather than a green asset: strong cash flows and dividends provide ballast and an energy-security hedge when fossil demand spikes.",
    riskProfile: "Moderate",
    keyRisks: [
      "Long-run demand erosion as the transition advances",
      "Excluded by many ESG mandates, limiting the buyer base",
      "Earnings highly cyclical with the oil price",
    ],
    historicalNotes: [
      { round: 2, event: "Oil prices collapse during the pandemic shock" },
      { round: 4, event: "Energy crisis drives record profits; best performer" },
    ],
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
    roundPrices: [92, 24, 101, 265, 247, 220],
    lockRounds: 0,
    minAllocation: 1_000_000,
    valuation: { tier: "Small", marketCapBn: 2, peRatioProxy: 6, dividendYieldPct: 0 },
    transitionThesis:
      "Included as the cautionary counter-case: a fossil incumbent most directly in the path of decarbonisation, illustrating stranded-asset and transition risk.",
    riskProfile: "Speculative",
    keyRisks: [
      "Structural demand decline under climate policy",
      "History of bankruptcy and restructuring",
      "Extreme price swings on commodity and policy news",
    ],
    historicalNotes: [
      { round: 1, event: "Files for bankruptcy; holders wiped out" },
      { round: 4, event: "Energy crisis revives coal demand and the share price" },
    ],
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
    roundPrices: [122, 120, 182, 104, 82, 78],
    lockRounds: 0,
    minAllocation: 1_000_000,
    valuation: { tier: "Large", marketCapBn: 70, peRatioProxy: 5, dividendYieldPct: 5.5 },
    transitionThesis:
      "A legacy automaker attempting a costly pivot to electric vehicles — a turnaround bet on whether an incumbent can out-scale pure-play EV challengers.",
    riskProfile: "High",
    keyRisks: [
      "Heavy capital cost of the EV transition weighs on returns",
      "Legacy emissions-scandal liabilities and reputational drag",
      "Intense competition from dedicated EV makers",
    ],
    historicalNotes: [
      { round: 3, event: "EV-pivot optimism lifts the shares" },
      { round: 5, event: "EV price war and execution doubts pressure the stock" },
    ],
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
    roundPrices: [119, 287, 215, 202, 158, 175],
    lockRounds: 0,
    minAllocation: 1_000_000,
    valuation: { tier: "ETF", dividendYieldPct: 1.2 },
    transitionThesis:
      "The simplest one-click way to own the global clean-energy theme, spreading exposure across solar, wind and related names in a single diversified vehicle.",
    riskProfile: "High",
    keyRisks: [
      "Concentrated in a volatile, rate-sensitive sector",
      "Tracks the boom-bust cycle of clean-energy sentiment",
      "Less diversification than the headline 'broad' label implies",
    ],
    historicalNotes: [
      { round: 2, event: "Clean-energy index returns +142% in a single year" },
      { round: 5, event: "Multi-year drawdown unwinds most of the rally" },
    ],
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
    roundPrices: [186, 237, 312, 257, 320, 385],
    lockRounds: 0,
    minAllocation: 1_000_000,
    valuation: { tier: "ETF", dividendYieldPct: 1.3 },
    transitionThesis:
      "A broad large-cap index with an ESG screen — a core, low-tracking-error holding that lets investors tilt 'greener' without straying far from the benchmark.",
    riskProfile: "Moderate",
    keyRisks: [
      "Outperformance driven by tech weighting, not green credentials",
      "Screening methodology can change index composition",
      "Broad-market drawdowns affect it like any large-cap fund",
    ],
    historicalNotes: [
      { round: 3, event: "Tech-led rally lifts the index to new highs" },
    ],
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
    roundPrices: [158, 184, 233, 188, 288, 355],
    lockRounds: 0,
    minAllocation: 1_000_000,
    valuation: { tier: "ETF", dividendYieldPct: 1.4 },
    transitionThesis:
      "The benchmark every climate strategy is measured against — held as a yardstick and a diversified anchor rather than for any transition angle of its own.",
    riskProfile: "Moderate",
    keyRisks: [
      "No climate tilt; purely the market baseline",
      "Concentration in a handful of mega-cap names",
      "Exposed to broad-market drawdowns",
    ],
    historicalNotes: [
      { round: 2, event: "Pandemic crash then a rapid stimulus-fuelled recovery" },
    ],
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
    roundPrices: [114, 128, 118, 92, 101, 108],
    lockRounds: 0,
    minAllocation: 1_000_000,
    valuation: { tier: "ETF", dividendYieldPct: 3.0 },
    transitionThesis:
      "Fixed income earmarked for green projects — a low-volatility way to fund the transition directly while collecting a modest, climate-aligned yield.",
    riskProfile: "Low",
    keyRisks: [
      "Prices fall when interest rates rise (duration risk)",
      "Small 'greenium' means slightly lower yields",
      "Use-of-proceeds reporting varies by issuer",
    ],
    historicalNotes: [
      { round: 4, event: "Sharp rate rises hit bond prices across the board" },
    ],
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
    roundPrices: [108, 115, 108, 88, 96, 102],
    lockRounds: 0,
    minAllocation: 1_000_000,
    valuation: { tier: "ETF", dividendYieldPct: 3.2 },
    transitionThesis:
      "A sustainability-linked note whose coupon steps up if the issuer misses emissions targets — a pioneering instrument that ties financing cost to real decarbonisation.",
    riskProfile: "Low",
    keyRisks: [
      "Duration risk as rates move",
      "Coupon step-ups depend on issuer target design",
      "Limited liquidity in a young instrument class",
    ],
    historicalNotes: [
      { round: 4, event: "Rate shock pressures the note's price" },
    ],
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
    roundPrices: [130, 145, 155, 130, 105, 95],
    lockRounds: 2,
    minAllocation: 5_000_000,
    valuation: { tier: "Large", peRatioProxy: 0, dividendYieldPct: 5.0 },
    transitionThesis:
      "Direct ownership of large-scale offshore wind generation — the hard infrastructure of the transition, offering high targeted returns in exchange for illiquidity.",
    riskProfile: "High",
    keyRisks: [
      "Locked for 2 rounds after purchase (illiquid)",
      "Construction cost overruns and delays",
      "Returns squeezed by higher rates and auction pricing",
    ],
    historicalNotes: [
      { round: 3, event: "Strong vintages lift fund value to a peak" },
      { round: 5, event: "Cost and rate squeeze erodes returns" },
    ],
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
    roundPrices: [142, 160, 172, 158, 150, 148],
    lockRounds: 2,
    minAllocation: 5_000_000,
    valuation: { tier: "Large", peRatioProxy: 0, dividendYieldPct: 4.5 },
    transitionThesis:
      "A portfolio of operating utility-scale solar farms — contracted, cash-generative renewable infrastructure that turns falling panel costs into steady yield.",
    riskProfile: "Moderate",
    keyRisks: [
      "Locked for 2 rounds after purchase (illiquid)",
      "'Capture rate' compression erodes power-sale prices",
      "Returns sensitive to financing costs",
    ],
    historicalNotes: [
      { round: 3, event: "Falling panel costs lift returns to a high" },
      { round: 4, event: "Capture-rate compression begins to bite" },
    ],
  },
  {
    id: "brookfield",
    name: "GreenBridge Infrastructure",
    realBasis: "Brookfield Renewable Partners",
    assetClass: "infrastructure",
    sector: "Renewable Infrastructure Platform",
    description: "A diversified global renewable infrastructure fund targeting 12-15% returns. The most consistent performer in the asset class, now boosted by AI data centre power demand. LOCKED for 2 rounds after purchase.",
    riskLevel: "medium",
    startPrice: 100,
    roundPrices: [234, 422, 361, 265, 266, 310],
    lockRounds: 2,
    minAllocation: 5_000_000,
    valuation: { tier: "Large", peRatioProxy: 0, dividendYieldPct: 4.0 },
    transitionThesis:
      "A diversified global renewable platform targeting 12–15% returns — the most consistent way to compound transition infrastructure, now boosted by AI data-centre power demand.",
    riskProfile: "Moderate",
    keyRisks: [
      "Locked for 2 rounds after purchase (illiquid)",
      "Leverage amplifies sensitivity to rates",
      "Execution risk across a large global pipeline",
    ],
    historicalNotes: [
      { round: 2, event: "Platform scales rapidly; strong re-rating" },
      { round: 5, event: "Record results on AI data-centre power contracts" },
    ],
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
    roundPrices: [364, 408, 655, 1166, 933, 1050],
    lockRounds: 0,
    minAllocation: 1_000_000,
    valuation: { tier: "Commodity" },
    transitionThesis:
      "Direct exposure to the price of carbon under the world's largest compliance market — a structural long on tightening emissions caps that forces real decarbonisation.",
    riskProfile: "High",
    keyRisks: [
      "Allowance supply set by regulators, not markets",
      "Extreme price volatility through policy cycles",
      "Political risk of intervention during energy crises",
    ],
    historicalNotes: [
      { round: 4, event: "Hits an all-time high during the energy crisis" },
    ],
  },
  {
    id: "vcm-premium",
    name: "Premium Carbon Credits",
    realBasis: "Gold Standard / high-quality VCM credits",
    assetClass: "carbon",
    sector: "Voluntary Carbon (Quality)",
    description: "A portfolio of high-quality voluntary carbon credits from independently certified projects. More expensive than generic credits, but proven additionality and resistant to integrity scandals.",
    riskLevel: "medium",
    startPrice: 100,
    // Quality VCM: $4→$5→$7→$12→$15→$14→$16→$17
    roundPrices: [114, 136, 164, 218, 182, 195],
    lockRounds: 0,
    minAllocation: 1_000_000,
    valuation: { tier: "Commodity" },
    transitionThesis:
      "High-integrity voluntary carbon credits with proven additionality — exposure to corporate net-zero demand while sidestepping the integrity scandals that hit cheaper credits.",
    riskProfile: "Moderate",
    keyRisks: [
      "Voluntary demand is discretionary and sentiment-driven",
      "Methodology scrutiny can re-rate the whole market",
      "Thin, opaque secondary-market liquidity",
    ],
    historicalNotes: [
      { round: 4, event: "Premium credits hold value as generics collapse" },
    ],
  },
  {
    id: "vcm-standard",
    name: "Standard Carbon Credits",
    realBasis: "Generic Verra REDD+ credits",
    assetClass: "carbon",
    sector: "Voluntary Carbon (Generic)",
    description: "A portfolio of standard forestry-based carbon credits, primarily REDD+ projects certified by a leading registry. Cheaper than premium credits, but vulnerable to integrity challenges.",
    riskLevel: "high",
    startPrice: 100,
    // Standard VCM: $3→$4→$5→$9→$12→$10→$4→$4
    roundPrices: [120, 92, 158, 315, 185, 155],
    lockRounds: 0,
    minAllocation: 1_000_000,
    valuation: { tier: "Commodity" },
    transitionThesis:
      "Low-cost forestry credits offering the cheapest tonne of claimed avoidance — included to show the integrity trade-off between price and proven climate impact.",
    riskProfile: "High",
    keyRisks: [
      "Integrity scandals can collapse credit value",
      "Questionable additionality on many projects",
      "Demand evaporates when buyers flee reputational risk",
    ],
    historicalNotes: [
      { round: 5, event: "Integrity investigation triggers a sharp sell-off" },
    ],
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
    roundPrices: [102, 105, 108, 103, 100, 102],
    lockRounds: 3,
    minAllocation: 5_000_000,
    valuation: { tier: "Large", peRatioProxy: 0, dividendYieldPct: 1.0 },
    transitionThesis:
      "A long-horizon fund in forest conservation, regenerative agriculture and blue carbon — patient capital aimed at the nature side of the climate equation.",
    riskProfile: "High",
    keyRisks: [
      "Locked for 3 rounds after purchase (highly illiquid)",
      "Long time horizon before returns materialise",
      "Exposed to carbon-credit integrity sentiment",
    ],
    historicalNotes: [
      { round: 3, event: "Early vintages perform steadily" },
      { round: 5, event: "Nature-credit scrutiny caps the upside" },
    ],
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
    // Alt-protein: public listing in 2019, then a sustained decline
    roundPrices: [100, 165, 86, 16, 12, 8],
    lockRounds: 0,
    minAllocation: 1_000_000,
    valuation: { tier: "Small", marketCapBn: 1, peRatioProxy: 0, dividendYieldPct: 0 },
    transitionThesis:
      "A bet on plant-based protein as a lower-emissions alternative to industrial meat — a high-conviction wager that food-system change becomes mainstream consumer demand.",
    riskProfile: "Speculative",
    keyRisks: [
      "Consumer demand for alt-protein has proven fickle",
      "Persistent lack of profitability",
      "Crowded, increasingly competitive category",
    ],
    historicalNotes: [
      { round: 2, event: "Post-IPO euphoria drives an early peak" },
      { round: 4, event: "Demand disappoints; shares collapse" },
    ],
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
    roundPrices: [20, 22, 22, 26, 30, 34],
    lockRounds: 0,
    minAllocation: 1_000_000,
    valuation: { tier: "Mid", marketCapBn: 10, peRatioProxy: 9, dividendYieldPct: 0 },
    transitionThesis:
      "Included to make physical climate risk concrete: a utility whose business model is directly threatened by climate-driven wildfire — the cost side of a warming world.",
    riskProfile: "Speculative",
    keyRisks: [
      "Catastrophic wildfire liabilities",
      "Bankruptcy and restructuring history",
      "Regulatory and litigation overhang",
    ],
    historicalNotes: [
      { round: 1, event: "Wildfire liabilities force a bankruptcy filing" },
    ],
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
    roundPrices: [100, 95, 92, 100, 115, 105],
    lockRounds: 0,
    minAllocation: 1_000_000,
    valuation: { tier: "Small", marketCapBn: 1, peRatioProxy: 0, dividendYieldPct: 0 },
    transitionThesis:
      "A frontier bet on engineered carbon removal: direct air capture is essential to net-zero scenarios, with enormous upside if costs fall toward compliance-carbon levels.",
    riskProfile: "Speculative",
    keyRisks: [
      "Capture costs remain roughly 10x compliance carbon",
      "Early-stage technology with unproven economics at scale",
      "Dependent on continued grant and policy support",
    ],
    historicalNotes: [
      { round: 5, event: "Cost-curve optimism lifts valuations modestly" },
    ],
  },
];

// ── ROUND BRIEFINGS ──

// Extended briefing data used by the client ticker. The `newsHeadlines` field is
// optional in the shared schema — it's added here for UI only and the server
// returns the whole object so the client can render the ticker.
export type RoundBriefingWithNews = RoundBriefing & {
  newsHeadlines?: string[];
  videoScript?: string;
};

export const ROUND_BRIEFINGS: RoundBriefingWithNews[] = [
  {
    round: 1,
    title: "The Paris Signal",
    period: "Late 2015 – 2019",
    contextBullets: [
      "December 2015: 196 nations sign the Paris Agreement, committing to limit warming to well below 2°C.",
      "A major coal producer files for bankruptcy while coal still supplies roughly 40% of global electricity.",
      "The US elects a pro-fossil-fuel president and announces withdrawal from Paris, hitting renewable sentiment.",
      "While Washington pivots, the EU launches its Sustainable Finance Action Plan and corporate climate disclosure framework.",
      "China launches a national emissions trading scheme, creating the world's largest carbon market.",
      "Climate strikes mobilise millions in 2019 as sustainable-fund inflows reach a record $20.6 billion.",
      "The EU Green Deal commits Europe to climate neutrality by 2050 and starts building the policy machinery behind capital flows.",
      "Renewables become the lowest-cost new power source in many markets, while a California utility bankruptcy makes physical climate risk tangible.",
      "EU carbon allowances remain inexpensive early in the period, but tightening rules make them a potential sleeping giant.",
    ],
    keyQuestion: "The world signed Paris and the US pulled out. Are you following the political theatre, or the policy machinery being built underneath?",
    videoScript:
      "The Paris signal arrives, then meets political reality. One hundred and ninety-six nations commit to limit warming, yet coal still supplies forty percent of global electricity and a major coal producer enters bankruptcy. A US withdrawal from Paris jolts renewable sentiment, but Brussels accelerates: sustainable-finance rules, climate disclosure, and the Green Deal begin to turn policy into investable markets. At the same time, climate strikes and record sustainable-fund inflows bring public pressure into the financial system. Renewables become the cheapest new power in many markets, while a utility bankruptcy reveals the cost of physical climate risk. The question is not whether politics makes noise. It is whether you can see the machinery being built underneath.",
    newsHeadlines: [
      "BREAKING: 196 nations sign Paris Climate Agreement — markets digest deal",
      "Major coal producer files for Chapter 11; shareholders wiped out",
      "Clean-energy investment reaches a record $349 billion",
      "US announces Paris withdrawal; renewable shares sell off",
      "EU launches Sustainable Finance Action Plan — capital-allocation rules begin to change",
      "Corporate climate-disclosure framework wins support from major global companies",
      "China launches national emissions trading scheme — world's largest carbon market",
      "California utility files for bankruptcy after wildfire liabilities exceed $30 billion",
      "Global climate strike draws more than four million people",
      "EU Green Deal unveiled: climate neutrality by 2050",
      "Sustainable-fund inflows hit a record $20.6 billion in 2019",
    ],
  },
  {
    round: 2,
    title: "Pandemic and Green Euphoria",
    period: "2020",
    contextBullets: [
      "March 2020: COVID-19 crashes global markets. The Broad Market Index falls 34% in five weeks.",
      "April 2020: oil prices go negative for the first time in history as storage fills.",
      "The EU approves a €750 billion recovery programme with a 37% climate spending floor.",
      "ESG funds outperform conventional funds during the crash, attracting enormous attention.",
      "Global Clean Energy Index returns +142% for the year as clean-energy valuations turn parabolic.",
      "A leading EV maker joins the Broad Market Index, triggering $154 billion of rebalancing trades.",
      "Green-bond issuance tops $270 billion globally, setting a new record.",
    ],
    keyQuestion: "Are clean energy valuations justified by the green recovery, or is this a bubble forming?",
    videoScript:
      "An extraordinary year. The pandemic wipes thirty-four percent off broad equity markets in twenty-three trading days, and oil briefly trades below zero. Governments respond with green recovery packages: the EU alone earmarks more than a third of seven hundred and fifty billion euros for climate. The Global Clean Energy Index returns one hundred and forty-two percent. A leading EV maker joins the broad market index in one of the largest rebalancing events on record. Valuations are stretched. Decide whether the green recovery justifies the price, or whether you are watching a bubble form.",
    newsHeadlines: [
      "BREAKING: WTI crude futures crash to -$37.63/barrel — negative for first time",
      "Broad Market Index plunges 34% in 23 trading days as COVID-19 shuts the global economy",
      "EU approves €750bn recovery programme — 37% earmarked for climate",
      "Leading EV maker joins Broad Market Index — $154bn rebalancing trade",
      "Global Clean Energy Index returns +142% in 2020",
      "Solar-equipment shares surge as residential demand and low rates ignite a rally",
      "US election winner pledges to rejoin Paris Agreement on day one",
      "Green-bond issuance tops $270bn globally — shattering the previous record",
    ],
  },
  {
    round: 3,
    title: "Peak Euphoria and Net Zero Pledges",
    period: "2021",
    contextBullets: [
      "A new US administration recommits to Paris and signals major climate legislation.",
      "COP26 produces net-zero pledges from 140+ countries, covering roughly 90% of global GDP.",
      "Clean-energy valuations reach extreme levels as special-purpose listings flood the climate sector.",
      "The voluntary carbon market booms, with credit prices reaching $10–15 per tonne.",
      "Inflation rises sharply and central banks signal rate increases; bond yields begin moving higher.",
      "EU carbon allowances pass €50 per tonne as the bloc tightens its emissions-trading system.",
      "Offshore-wind economics begin to deteriorate as auction prices and supply-chain costs turn.",
    ],
    keyQuestion: "Everything climate looks like it only goes up. Take profits on the extraordinary rally, or ride the momentum?",
    videoScript:
      "Peak euphoria. COP26 has delivered net-zero pledges covering ninety percent of global GDP. EU carbon allowances pass fifty euros, ESG assets grow rapidly, speculative listings reshape the EV landscape, and the voluntary carbon market booms. But the cracks are visible: inflation is at a multi-decade high, central banks are preparing to raise rates, and offshore wind has begun to de-rate. Everything climate looks as if it only goes up. Your decision: take profits, or ride the momentum.",
    newsHeadlines: [
      "BREAKING: COP26 produces net-zero pledges covering 90% of global GDP",
      "Electric-vehicle listings and special-purpose deals push climate valuations to extremes",
      "EU ETS carbon price tops €50/tonne for the first time",
      "ESG assets under management reach $35 trillion globally",
      "US inflation prints 6.8%; central bank signals rate hikes",
      "Voluntary carbon-market volumes quadruple; generic credits reach $15/tonne",
      "Offshore-wind developers fall from their peaks as auction economics weaken",
    ],
  },
  {
    round: 4,
    title: "The Energy Crisis",
    period: "2022",
    contextBullets: [
      "February 2022: Russia invades Ukraine, shattering European energy security overnight.",
      "European natural-gas prices spike tenfold and oil rises above $120 per barrel.",
      "Fossil-fuel companies post record profits while fossil-fuel equities return +64% and the Broad Market Index falls -18%.",
      "Clean-energy shares struggle with rising rates, disrupted supply chains, and renewed political support for fossil fuels.",
      "The EU responds with REPowerEU, accelerating renewables despite severe short-term pain.",
      "The United States enacts $369 billion of clean-energy support through landmark climate legislation.",
      "EU carbon allowances reach an all-time high near €105 per tonne.",
    ],
    keyQuestion: "Is this the bottom for clean energy, or the beginning of a new fossil fuel era? And what about the IRA?",
    videoScript:
      "The energy crisis has rewritten the script. Russia's invasion sends European gas prices up tenfold and pushes oil above one hundred and twenty dollars a barrel. Titan Petroleum posts record profits as fossil-fuel equities rise while broad markets fall. Clean energy collapses under higher rates and supply-chain strain. Yet the policy response points the other way: Europe accelerates renewables and the United States commits three hundred and sixty-nine billion dollars to clean energy. Is this the bottom for climate assets, or the dawn of a new fossil era?",
    newsHeadlines: [
      "BREAKING: Russia invades Ukraine — European gas prices spike 10x",
      "Largest Western oil major posts $55.7bn annual profit",
      "United States enacts $369bn clean-energy support package",
      "EU ETS hits an all-time high near €105/tonne",
      "Global Clean Energy Index falls as rate-sensitive investors retreat",
      "Fossil-fuel equities return +64%; Broad Market Index falls -18%",
      "Germany restarts coal capacity during energy emergency",
      "Central bank delivers 75bp rate hike; renewables face higher financing costs",
    ],
  },
  {
    round: 5,
    title: "Reality Check — ESG Backlash and Integrity Crisis",
    period: "2023 – 2024",
    contextBullets: [
      "Anti-ESG political backlash sweeps the US as several states pull funds from ESG-focused managers.",
      "US ESG fund outflows reach $13 billion in 2023 and accelerate in 2024.",
      "Nordic Wind Power announces multi-billion-dollar offshore-wind writedowns and project cancellations.",
      "An investigation finds that many standard forestry credits may have delivered little or no claimed climate benefit.",
      "COP28 adopts historic language on transitioning away from fossil fuels, but provides no binding enforcement mechanism.",
      "Interest rates remain high and growth shares lag as capital concentrates in AI-related companies.",
      "The voluntary carbon market bifurcates: premium credits hold up while generic credits lose credibility and value.",
    ],
    keyQuestion: "Is the climate investment thesis dead, or is this the buying opportunity of a generation?",
    videoScript:
      "A reality check has arrived. Anti-ESG politics drives sustainable-fund outflows, Nordic Wind Power records multi-billion-dollar writedowns, and an investigation questions the climate impact of many standard forestry credits. The voluntary carbon market splits sharply: premium credits hold their value while generic credits collapse. Meanwhile, the AI boom draws capital away from climate names. Is the climate-investment thesis dead, or is this the buying opportunity of a generation?",
    newsHeadlines: [
      "BREAKING: investigation questions climate benefit of many standard forestry credits",
      "Nordic Wind Power announces multi-billion-dollar offshore-wind writedown",
      "US ESG fund outflows hit a record $13bn in 2023",
      "Several US states pull pension funds from ESG-focused managers",
      "COP28 calls for transition away from fossil fuels — without binding enforcement",
      "AI leaders soar; climate shares are left behind",
      "ElectraDrive deliveries miss expectations as EV price competition intensifies",
      "Voluntary carbon market splits: premium credits hold while generic credits fall",
    ],
  },
  {
    round: 6,
    title: "The Second Trump Era and AI Power Demand",
    period: "Late 2024 – Mid-2026",
    contextBullets: [
      "A second Trump administration signals a Paris withdrawal, looser EV rules, and a rollback of clean-energy incentives.",
      "The 2025 budget law shortens or ends several clean-energy tax-credit pathways, but projects already far into development retain significant support.",
      "Tariffs on Chinese-linked solar supply chains lift costs and slow some US projects a full year into the new trade regime.",
      "Nordic Wind Power completes a large rights issue after further offshore-wind cancellations and cost pressure.",
      "AI data-centre load turns power availability into a strategic constraint; hyperscalers sign multi-gigawatt renewable and hydro agreements.",
      "Nuclear returns to corporate power planning, with restart, long-term PPA, and small-reactor pipelines gathering momentum.",
      "EU carbon prices hold broadly in the €70–80 range as maritime compliance expands and the system evolves rather than collapses.",
      "Voluntary carbon demand continues to favour independently validated, high-integrity credits over undifferentiated supply.",
      "Clean-power economics increasingly rest on demand growth and grid scarcity, not only on climate-policy tailwinds.",
    ],
    keyQuestion: "This is your final allocation. Policy is receding as a tailwind, AI power demand is a new one, and technology economics keep moving. Where does climate investing go from here?",
    videoScript:
      "Your final round spans the first eighteen months of the second Trump era. Clean-energy incentives have been narrowed, tariffs have raised supply-chain costs, and offshore wind remains under pressure: Nordic Wind Power has returned to shareholders for capital after further cancellations. Yet the story is not simply policy retreat. AI data centres are turning reliable power into a scarce strategic resource, driving multi-gigawatt renewable, hydro, and nuclear agreements. EU carbon pricing has held broadly in the seventies, while voluntary carbon buyers continue to separate quality from quantity. The question is no longer whether climate policy is a tailwind. It is where technology economics and power demand can carry the transition next.",
    newsHeadlines: [
      "BREAKING: second Trump administration begins Paris withdrawal process and narrows clean-energy incentives",
      "2025 budget law accelerates several clean-energy tax-credit phase-outs; projects race to qualify",
      "Tariffs on Chinese-linked solar imports raise project costs across the US supply chain",
      "Nordic Wind Power completes major rights issue after further offshore-wind stress",
      "Hyperscalers sign multi-gigawatt clean-power agreements to meet AI data-centre demand",
      "Corporate nuclear restart and small-reactor pipeline expands as firm power becomes strategic",
      "EU ETS auction price averages roughly €73/tonne in 2025",
      "High-integrity carbon-credit principles become a market reference point as generic supply remains weak",
      "GreenBridge Infrastructure expands long-term power contracts for technology customers",
    ],
  },
];

// ── ROUND TAKEAWAYS ──

export const ROUND_TAKEAWAYS: RoundTakeaway[] = [
  {
    round: 1,
    takeaways: [
      "Appalachian Coal's bankruptcy showed how quickly a declining incumbent can wipe out shareholders — and why timing matters as much as thesis.",
      "Political shocks changed sentiment, but EU sustainable-finance rules and climate disclosure quietly built durable market infrastructure.",
      "ESG flows became self-reinforcing: inflows lifted preferred shares, attracting further inflows and reinforcing the narrative.",
      "The EU Green Deal turned social pressure and policy ambition into a long runway for climate-directed capital.",
      "WildFire Utility made physical climate risk investable: a utility can be damaged by warming even without a transition-policy shock.",
      "Cheap EU carbon allowances illustrated that policy signals can take years to become asset prices.",
    ],
    didYouKnow: "The California utility's shares fell about 91% from its 2017 high to its 2019 bankruptcy filing. It became an early, large-scale example of physical climate risk destroying shareholder value.",
  },
  {
    round: 2,
    takeaways: [
      "COVID-era ESG outperformance was largely a sector effect: tech-heavy indices benefited from the stay-at-home trade, not only sustainability credentials.",
      "Negative oil prices were a storage shock, not a permanent change in energy economics.",
      "The 2020 clean-energy rally had bubble characteristics: extreme valuations, retail enthusiasm, and a widening gap between price and fundamentals.",
      "A sound long-term thesis can still be a poor investment when bought at the wrong valuation.",
    ],
    didYouKnow: "ElectraDrive rose 743% in 2020. Its broad-index inclusion triggered about $154 billion of trading in a single session.",
  },
  {
    round: 3,
    takeaways: [
      "Net-zero pledges covered most global GDP but generally lacked binding enforcement; announcements can move sentiment without guaranteeing cash flows.",
      "Higher discount rates matter disproportionately for assets whose value rests on distant growth.",
      "Narrative momentum is not fundamental value; the most compelling story can coincide with the least forgiving entry price.",
      "The voluntary carbon boom showed how quickly a young market can grow before its integrity infrastructure catches up.",
    ],
    didYouKnow: "By the end of 2024, investors who had bought a leading clean-energy fund at its 2020 peak had lost more than 70% despite the unchanged long-run decarbonisation story.",
  },
  {
    round: 4,
    takeaways: [
      "Energy security trumped climate ambition in the short term, leading governments to reopen or extend fossil capacity.",
      "The US clean-energy package triggered enormous manufacturing announcements, but market returns lagged the policy headline.",
      "EU carbon allowances rose to a record during the crisis, showing that carbon-dependence risk can support compliance markets.",
      "Geopolitical shocks can reverse market leadership overnight; diversification across clean and conventional energy was valuable in 2022.",
    ],
    didYouKnow: "Titan Petroleum earned $55.7 billion in 2022, the largest annual profit recorded by a Western oil major, and became the year's standout equity.",
  },
  {
    round: 5,
    takeaways: [
      "Nordic Wind Power demonstrated that even leading transition operators can be overwhelmed by rates, cost inflation, and political risk.",
      "The voluntary carbon market bifurcated: premium credits retained value while generic forestry credits lost substantial credibility and price.",
      "ESG flows varied by region; US outflows did not mean sustainable investing disappeared globally.",
      "Quality matters more than labels. A 'green' designation is not a substitute for diligence on economics, integrity, and resilience.",
    ],
    didYouKnow: "The integrity crisis made buyers focus on proof of impact, additionality, and independent verification rather than simply the cheapest available tonne.",
  },
  {
    round: 6,
    takeaways: [
      "Policy risk remains material, but the 2025 rollback narrowed and accelerated programmes rather than eliminating the clean-energy investment base.",
      "AI power demand created a new source of long-term contracted demand for clean power, hydro, storage, transmission, and potentially nuclear.",
      "Offshore wind remained a reminder that strategic value does not guarantee investable project economics.",
      "EU carbon pricing and high-integrity voluntary credits showed that credible market design can endure even when broad climate sentiment weakens.",
      "The climate-investment landscape is now shaped by policy, technology economics, and power demand; strong portfolios read all three.",
    ],
    didYouKnow: "The 2025 tax-law changes reduced parts of the original clean-energy programme, but qualifying projects and politically popular manufacturing investments preserved a substantial share of its practical investment impact.",
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
    question: "After the US announced its Paris withdrawal, what happened to EU climate policy?",
    options: ["It stalled", "It accelerated", "It reversed", "No change"],
    correctIndex: 1,
    explanation: "The EU doubled down, launching its Sustainable Finance Action Plan and building disclosure rules — regulation creates markets.",
  },
  {
    round: 3,
    question: "What percentage of net-zero pledges at COP26 had legally binding targets?",
    options: ["Less than 10%", "About 25%", "About 50%", "Over 75%"],
    correctIndex: 0,
    explanation: "Fewer than 10% of pledges had legally binding enforcement. Announcements move sentiment, but not necessarily capital.",
  },
  {
    round: 4,
    question: "What was the best-performing asset class in 2022?",
    options: ["Clean-energy equities", "Green bonds", "Fossil-fuel equities", "EU carbon"],
    correctIndex: 2,
    explanation: "Fossil-fuel equities returned +64% in 2022 while broad-market indices fell -18%. Energy security trumped climate ambition.",
  },
  {
    round: 5,
    question: "True or False: ESG-labelled index funds outperformed because of their green holdings.",
    options: ["True", "False"],
    correctIndex: 1,
    explanation: "False. The ESG Leaders Index outperformed the Broad Market Index primarily because of technology concentration, not green companies.",
  },
  {
    round: 6,
    question: "What share of clean-energy projects had been located in Republican congressional districts?",
    options: ["About 30%", "About 50%", "About 65%", "Over 80%"],
    correctIndex: 3,
    explanation: "Over 80% were located in Republican districts, making a full rollback politically difficult and helping preserve parts of the investment pipeline.",
  },
];

// ── AWARDS ──

export interface Award {
  id: string;
  name: string;
  icon: string; // lucide icon name
  description: string;
}

// ── CLOSING VIDEO SCRIPT BUILDER ──

/**
 * Build a personalised ~100-word closing narration for the final-round takeaways phase.
 * Uses the existing pseudonymous asset names. No real company names.
 */
export function buildClosingScript(
  playerName: string,
  finalPortfolioValue: number,
  startingValue: number,
  top3Holdings: { name: string; value: number }[],
): string {
  const safeName = (playerName && playerName.trim()) || "Investor";
  const startFmt = formatMillions(startingValue);
  const endFmt = formatMillions(finalPortfolioValue);
  const returnPct = ((finalPortfolioValue - startingValue) / startingValue) * 100;
  const direction = returnPct >= 0 ? "gain" : "loss";
  const pctStr = `${returnPct >= 0 ? "" : ""}${returnPct.toFixed(1)}%`;
  const topNames = top3Holdings
    .filter((h) => h.value > 0)
    .slice(0, 3)
    .map((h) => h.name);
  let holdingsLine = "";
  if (topNames.length === 3) {
    holdingsLine = `Your largest allocations sat in ${topNames[0]}, ${topNames[1]}, and ${topNames[2]}.`;
  } else if (topNames.length === 2) {
    holdingsLine = `Your largest allocations sat in ${topNames[0]} and ${topNames[1]}.`;
  } else if (topNames.length === 1) {
    holdingsLine = `Your largest allocation sat in ${topNames[0]}.`;
  } else {
    holdingsLine = "Your fund ended the decade holding cash.";
  }

  return `${safeName}, the final bell has rung. Your Climate Capital fund started at ${startFmt} and finished at ${endFmt} — a ${Math.abs(returnPct).toFixed(1)}% ${direction} over six rounds. ${holdingsLine} You navigated a decade that compressed Paris, the energy crisis, ESG backlash, and an AI-driven power boom into a single evening. In real markets these forces play out over decades, and the discipline you have shown — reading policy, technology, and demand together — is exactly what climate investing requires. Thank you for playing. The decarbonisation transition continues; your fund's story is now part of it.`;
}

function formatMillions(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)} billion`;
  return `$${(value / 1_000_000).toFixed(1)} million`;
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
