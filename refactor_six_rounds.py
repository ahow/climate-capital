from pathlib import Path
import re

p = Path('/home/user/workspace/climate-capital/shared/gameData.ts')
s = p.read_text()

prices = {
    'electradrive': [174, 1470, 2202, 770, 2524, 2000],
    'solarpeak': [744, 4999, 5212, 7549, 3765, 3200],
    'nordicwind': [194, 314, 186, 129, 86, 55],
    'hydrogen': [150, 1607, 1338, 586, 213, 140],
    'nextgen': [235, 270, 336, 318, 231, 285],
    'titan': [85, 41, 70, 135, 126, 135],
    'appcoal': [92, 24, 101, 265, 247, 220],
    'autoemissions': [122, 120, 182, 104, 82, 78],
    'cleanenergy': [119, 287, 215, 202, 158, 175],
    'esgindex': [186, 237, 312, 257, 320, 385],
    'sp500': [158, 184, 233, 188, 288, 355],
    'greenbond': [114, 128, 118, 92, 101, 108],
    'transitionbond': [108, 115, 108, 88, 96, 102],
    'offshorewind': [130, 145, 155, 130, 105, 95],
    'solarfarm': [142, 160, 172, 158, 150, 148],
    'brookfield': [234, 422, 361, 265, 266, 310],
    'eucarbon': [364, 408, 655, 1166, 933, 1050],
    'vcm-premium': [114, 136, 164, 218, 182, 195],
    'vcm-standard': [120, 92, 158, 315, 185, 155],
    'naturalcapital': [102, 105, 108, 103, 100, 102],
    'plantprotein': [100, 165, 86, 16, 12, 8],
    'wildfire': [20, 22, 22, 26, 30, 34],
    'dac': [100, 95, 92, 100, 115, 105],
}
for asset_id, values in prices.items():
    pattern = rf'(id: "{re.escape(asset_id)}"[\s\S]*?roundPrices: )\[[^\]]*\]'
    s, n = re.subn(pattern, r'\1[' + ', '.join(map(str, values)) + ']', s, count=1)
    if n != 1:
        raise RuntimeError(f'Could not update {asset_id}: {n}')

# In the asset section only, map old rounds to the compressed timeline.
assets_end = s.index('// ── ROUND BRIEFINGS ──')
asset_section = s[:assets_end]
round_map = {'8': '6', '7': '5', '6': '4', '5': '3', '4': '2', '3': '1', '2': '1', '1': '1'}
asset_section = re.sub(r'(\{ round: )([1-8])(, event:)', lambda m: m.group(1) + round_map[m.group(2)] + m.group(3), asset_section)
asset_section = asset_section.replace(
    '// Rounds: 1(2015-17), 2(2017-18), 3(2018-19), 4(2020), 5(2021), 6(2022), 7(2023-24), 8(2024-25)',
    '// Round endpoints: R1(2019), R2(2020), R3(2021), R4(2022), R5(2024), R6(mid-2026)'
)
s = asset_section + s[assets_end:]

briefings = r'''export const ROUND_BRIEFINGS: RoundBriefingWithNews[] = [
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
];'''

takeaways = r'''export const ROUND_TAKEAWAYS: RoundTakeaway[] = [
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
];'''

predictions = r'''export const PREDICTION_QUESTIONS: PredictionQuestion[] = [
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
];'''

s = re.sub(r'export const ROUND_BRIEFINGS: RoundBriefingWithNews\[\] = \[[\s\S]*?\n\];\n\n// ── ROUND TAKEAWAYS', briefings + '\n\n// ── ROUND TAKEAWAYS', s, count=1)
s = re.sub(r'export const ROUND_TAKEAWAYS: RoundTakeaway\[\] = \[[\s\S]*?\n\];\n\n// ── PREDICTION QUESTIONS', takeaways + '\n\n// ── PREDICTION QUESTIONS', s, count=1)
s = re.sub(r'export const PREDICTION_QUESTIONS: PredictionQuestion\[\] = \[[\s\S]*?\n\];\n\n// ── AWARDS', predictions + '\n\n// ── AWARDS', s, count=1)
s = s.replace('round-8 takeaways phase', 'final-round takeaways phase')
s = s.replace('over eight rounds.', 'over six rounds.')
p.write_text(s)
