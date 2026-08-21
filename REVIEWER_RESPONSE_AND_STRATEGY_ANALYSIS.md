# Reviewer response and strategy analysis

Prepared for the Climate Capital architect / development team, in response to Andy Howard's August 2026 QA and Strategy Test.

---

## Part 1 — Reviewer findings, triaged

The reviewer tested the **8-round** version of the game in August 2026. Two of their four release-blocking bugs (Round 8 not running, HeyGen video briefings not appearing) were tested against a build that has since been superseded. This changes the triage materially — those items need re-verification against the current 6-round build before any dev work is assigned.

Every item below is classified as:

- **A. Already fixed** — resolved by later commits, dev only needs to confirm on the current build.
- **B. Reproduce and fix** — the finding is a real bug against the current build.
- **C. Design change** — the finding is a substantive design point; requires content or calibration work, not a bug fix.
- **D. Won't fix (yet)** — deliberate deferral with reasoning.

### Release blockers

| # | Finding | Category | Recommended action |
|---|---|---|---|
| 1 | Round 8 price simulation doesn't run — every asset shows +0.0% | **A. Already fixed** — the game was refactored to 6 rounds in [commit `9b2acb4`](https://github.com/ahow/climate-capital/commit/9b2acb43794ce0cdac80090a311fbeed192309b2). There is no Round 8 in the current build. Verify by playing through Round 6 on the current deployment. If the equivalent final-round-doesn't-run bug appears in R6, treat as B and fix. | Verification only. |
| 2 | Ask Analyst / Research Desk returns "temporarily unavailable" | **B. Reproduce and fix** — the endpoint exists (`POST /api/games/:id/research`) and the temporal-framing prompt was tightened in [commit `bfc2e7f`](https://github.com/ahow/climate-capital/commit/bfc2e7f). This must be tested on Heroku with a valid `ANTHROPIC_API_KEY`. The "temporarily unavailable" message is what the client shows when the API returns a non-200. First step: check Heroku logs for the exact failure — token expired, rate limited, or an env-var regression. | Dev to reproduce on live and check server logs; likely env-var or rate-limit issue, not code. |
| 3 | HeyGen video briefings never appear | **D. Won't fix (yet), but be explicit** — HeyGen is intentionally gated behind `HEYGEN_API_KEY` and `APP_BASE_URL` env vars. Without them, the client falls back to text briefings. Recommend showing an explicit UI badge ("Text briefing — video not configured for this environment") rather than silently rendering text-only, so testers know it's not broken. | Add a small info banner in `VideoBriefing.tsx` fallback path. |
| 4 | `/#/leaderboard` renders a blank white page | **B. Reproduce and fix** — likely a router issue where the standalone route doesn't mount the leaderboard component; the widget path works because it's rendered from the game shell. Should be a one-file fix in `client/src/App.tsx` routing. | Confirm the route exists and the component mounts on cold navigation. |
| 5 | Hindsight leakage: Investment Universe modals show 2015–2025 price history with future-round annotations before the game starts | **B. Reproduce and fix** — this is a genuine and important issue that survived the R2 tightening (that tightening only covered the Ask Analyst prompt). The Investment Universe modals should either (a) hide the price chart entirely on the pre-game landing, or (b) show only "descriptive" data (sector, thesis, risk profile) and reveal the price chart round-by-round the same way the trading table's sparkline does. Recommend (b). | Materially reduces the game's analytical validity — worth prioritising. |
| 6 | Round 4 briefing text discloses "Clean Energy Index already +142% for the year" before allocation | **B. Reproduce and fix** — in the current 6-round build this content sits inside the **R2 briefing** (2020 = Pandemic and Green Euphoria). Rewrite to "clean energy funds seeing record inflows" or "the sector rally has been extraordinary this year" without the specific figure. | Content-only edit. |

### Medium-severity findings

| # | Finding | Category | Recommended action |
|---|---|---|---|
| 7 | Leaderboard widget vs Game Over standings show different values for the same account | **B. Reproduce and fix** — this is a state-consistency bug. The two views should read from the same source of truth. Likely the widget is showing cached/stale portfolio values from `player.portfolio.currentValue` (updated only at trade time) while the final standings recomputes from current-round marks. Standardise on the recompute path everywhere. | Dev should locate the two computation paths and unify. |
| 8 | Header portfolio value briefly diverges from the Allocate/Review "calculated total" (e.g. $131.1M vs $103.7M in R2) | **B. Reproduce and fix** — same root cause as (7): two components computing portfolio value independently. Unify on a single `usePortfolioValue()` hook. | Same fix as (7). |
| 9 | Round counter overflow: "Round 9 of 8" after Round 8 | **A. Already fixed** — the phase machine was rewritten during the 6-round refactor; the terminal phase is now `finished`. Verify but likely not reproducible. | Verification only. |
| 10 | Return-magnitude calibration issues (Round 4 clean-tech, Round 2 oil-major) | **C. Design change — see Part 2 below.** The reviewer is analytically correct. Recommend a targeted recalibration: trim the 2020 leg of ElectraDrive, SolarPeak, and HydroGen to sector-average returns (not single-name outliers), and reduce the R1 (Trump Shock) Titan Petroleum drawdown from -51.8% to something closer to -15%. See Part 2 for exact recommended prices and impact on strategy rankings. | Content / data calibration. |

### Low-severity findings

| # | Finding | Category | Recommended action |
|---|---|---|---|
| 11 | No password / session recovery / auth | **D. Won't fix (yet)** — deliberately kept simple for the current audience. If wider release is planned, add magic-link auth. | Defer until wider release. |
| 12 | Undocumented one-round lock on Infrastructure category | **B. Reproduce and fix** — surface the lock in the Investment Universe detail card, the trading table row (a small padlock icon with tooltip on the slider), and the pre-round briefing. Currently the user only discovers the lock by trying to sell. | UX-only; small copy + icon change. |
| 13 | No "must allocate 100%" validation | **C. Design change** — this is intentional (players are allowed to hold cash) but the reviewer's point is fair: nothing signals that cash is being left uninvested. Recommend adding a small warning below the sticky banner if cash > 20%, e.g. "You are holding $X in cash — this earns no return." | Content / UX. |
| 14 | Takeaways quiz appears inconsistently (present R2, R4–8; absent R1, R3) | **A. Already fixed** — the game is now 6 rounds and PREDICTION_QUESTIONS was rewritten with a coherent per-round mapping. Verify on current build. If a quiz is still missing in the new R1 or R3, add one. | Verification. |
| 15 | Five dormant $100M accounts clutter the leaderboard | **B. Reproduce and fix** — the admin panel already supports per-player deletion. Recommend either (a) filtering the leaderboard to only show players who have advanced past R1, or (b) badging dormant accounts as "not started". Option (a) is simpler. | Simple query filter. |

### Additional items not in the reviewer's list

- **The nuanced-strategy player felt punished for taking profits after R2 (old R4).** This is not a bug — it's the calibration issue in (10) manifesting as player experience. Fixing the calibration also fixes this.
- **The trading table added in commits `d35b8c0` / `9cd2c96`** was not in the reviewer's test build. Their comments about the "buy/sell UX" therefore don't apply — but there may be new UX findings on the new table worth soliciting.
- **The onboarding pages (How to Play, Investment Universe) added in commit `047c4c1`** partially address finding #12 but explicitly regress on finding #5 by showing full price histories.

---

## Part 2 — Strategy analysis

The reviewer's central analytical claim is that the game rewards concentrated buy-and-hold-green over active management, and that this reflects a calibration artefact rather than a genuine lesson about climate investing. I ran the numbers against the current 6-round build to test that claim directly.

### Method

I simulated 12 strategies against the actual `roundPrices` arrays in `shared/gameData.ts`, starting from $100M, with the 40% per-position cap enforced. Assets locked at game start (private funds) were excluded from initial allocation.

**Strategies tested:**

1. **Always green (rebalanced)** — 15 tradeable green assets equal-weighted, rebalanced to equal weight each round
2. **Always green (buy & hold)** — Same initial weights, never rebalanced (positions drift with prices)
3. **Always brown (rebalanced)** — Oil, coal (from R2), autos, PG&E
4. **Naive diversified 60/40** — Broad market + ICLN + ESG + green bonds
5. **Carbon-forward** — 35% EU carbon allowances + diversified equity sleeve
6. **Nuanced adaptive** — Reads each briefing and rotates: EUAs in R1, clean-tech in R2, take profits R3, energy tilt R4, quality tilt R5. This is the strategy a Schroders analyst reading the briefings should have run.
7. **Contrarian** — Buy the 5 worst-performing assets of the prior round
8. **Momentum** — Buy the 5 best-performing assets of the prior round
9. **Perfect hindsight** — Top-5 winners of each round (upper bound only, not achievable)
10. **Concentrated Tesla+EUA** — 40% ElectraDrive, 40% EUA, 20% green bonds
11. **Passive 50/50 index** — Broad market + ESG, buy & hold
12. **Always brown buy & hold** — Same as (3) without rebalancing

### Results — game as currently calibrated

| Rank | Strategy | Final ($M) | Total return | CAGR | Max DD |
|---|---|---|---|---|---|
| 1 | Perfect hindsight (upper bound) | $4,960m | +4,860% | +42.6% | 0.0% |
| 2 | **Concentrated Tesla+EUA** | **$1,057m** | **+957%** | **+23.9%** | **-1.9%** |
| 3 | Always green (rebalanced) | $294m | +194% | +10.3% | -10.7% |
| 4 | Carbon-forward | $237m | +137% | +8.1% | 0.0% |
| 5 | Always green buy & hold | $228m | +128% | +7.8% | -29.3% |
| 6 | Always brown (rebalanced) | $226m | +126% | +7.7% | -29.3% |
| 7 | **Nuanced adaptive** | **$222m** | **+122%** | **+7.5%** | **-0.2%** |
| 8 | Passive index 50/50 | $193m | +93% | +6.1% | -15.9% |
| 9 | Naive diversified 60/40 | $190m | +90% | +6.0% | -16.9% |
| 10 | Momentum | $158m | +58% | +4.3% | -25.0% |
| 11 | Always brown buy & hold | $158m | +58% | +4.2% | -29.3% |
| 12 | Contrarian | $135m | +35% | +2.8% | -40.1% |

### What this shows

**The reviewer is right, quantitatively.**

The single decisive move is **Round 1**, where ElectraDrive returns +744.8%, HydroGen +971%, and SolarPeak +571.9%. In per-round terms:

- Always green rebalanced makes **+201.9%** in R1 and then **loses money** in every subsequent round (+9.1%, -3.7%, -2.1%, -5.3%).
- The Concentrated Tesla+EUA bet makes **+305.2%** in R1 alone — it wins the game before Round 2 starts.
- The Nuanced strategy makes +19.7% in R1 (it took EUA-heavy positioning), which is a solid absolute number but leaves it 200+ points behind after one round.
- Every strategy that does not concentrate in ElectraDrive/HydroGen/SolarPeak in R1 finishes behind those that do, regardless of what they do in later rounds.

**This is a lottery-ticket dynamic dressed as a climate-investing lesson.** The winning move is to have picked three specific tickers pre-2020 — which in reality was doable only by a small number of investors who bet on Tesla before the S&P inclusion trade. Presenting this as "the diversified green strategy won" is misleading.

### Results — realism-recalibrated

I re-ran the same simulation after trimming the three biggest outliers to sector-plausible 2020 returns:

- ElectraDrive: +744.8% → +170% (still Tesla-like but not single-name-outlier)
- SolarPeak: +571.9% → +160% (closer to Enphase's actual, but presented as diversified solar exposure)
- HydroGen: +971% → +200% (still huge, still Plug-like)

All subsequent prices scale proportionally so the *shape* of each asset's later path is preserved.

| Rank | Strategy | Final ($M) | CAGR | Max DD |
|---|---|---|---|---|
| 1 | Concentrated Tesla+EUA | $457m | +14.8% | -1.9% |
| 2 | **Carbon-forward** | **$237m** | **+8.1%** | **0.0%** |
| 3 | Always brown (rebalanced) | $226m | +7.7% | -29.3% |
| 4 | **Nuanced adaptive** | **$222m** | **+7.5%** | **-0.2%** |
| 5 | Passive index 50/50 | $193m | +6.1% | -15.9% |
| 6 | Naive diversified 60/40 | $190m | +6.0% | -16.9% |
| 7 | Always green (rebalanced) | $163m | +4.5% | -10.7% |
| 8 | Always green buy & hold | $142m | +3.3% | -18.1% |

**The story flips.** Carbon-forward moves from 4th to 2nd. Nuanced adaptive moves from 7th to 4th with the second-lowest drawdown of any strategy (-0.2%). Always green drops from 3rd to 7th. The lottery ticket still wins in absolute terms, but its lead over the disciplined strategies collapses from ~$820m to ~$220m — and its Sharpe-like profile (return per unit of drawdown) becomes indistinguishable from a coin flip.

### The winning and losing strategies, distilled

**In the current (uncalibrated) game, the "winning" strategy is:**

1. Do not spend time on the briefings, the Research Desk, or the ticker.
2. Allocate 40% to ElectraDrive and 40% to EU Carbon Allowances at the start of Round 1.
3. Do nothing else. Rebalance minimally.
4. Finish 1st with a ~$1bn portfolio.

**The "losing" strategies are:**

1. Take profits after Round 1 (nuanced strategy).
2. Buy the diversified clean-energy index rather than single names (naive 60/40).
3. Hold cash for optionality.
4. Bet contrarian — buy whatever fell most last round.

**In a realism-recalibrated game, the winning strategy would be:**

1. Anchor 30–35% in EU carbon allowances from R1 (the single most reliable compounder in the game — real EUAs went from €5 to €105 in the underlying decade, and even trimmed the game's EUA path is +188% total).
2. Hold a diversified equity core (broad index + ESG index + green bonds), 30–40%.
3. Tilt tactically to fossils in R4 (energy crisis) — this is the one round where being underweight brown is genuinely painful.
4. Rotate toward AI-power renewables (GreenBridge, NextGen) in R6, catching the mid-2020s data-centre power demand story.
5. Avoid standard REDD+ carbon credits from R5 onwards (the Verra integrity crisis).

**This is what the game should reward** — and with recalibration, does reward. It matches the "diversified core + tactical tilt" thesis Andy laid out in the review, and it matches how a Schroders sustainability desk would actually navigate the decade.

### The concentration warning

Even in the recalibrated case, **Concentrated Tesla+EUA still finishes first**. This is not a bug in the game — it's a real-world truth that a small number of concentrated bets outperform diversified ones over 10-year windows if you pick the right names. But three points make this uncomfortable as a game outcome:

1. **The player has no signal ex-ante that ElectraDrive is the right pick.** In the real market, Tesla-vs-Rivian-vs-Lucid was not obvious in 2019. The game only presents ElectraDrive as the EV bet, so picking it is not a skill display.
2. **The concentrated player takes on the maximum permitted single-name risk (40%).** In the real Tesla case, the drawdown from 2021 peak to 2023 trough was over 70%. A player with 40% in ElectraDrive at the R3 (2021) peak would have lost ~28% of the whole portfolio in R4 in a properly calibrated version — the current game undercalls this drawdown.
3. **The game does not have a "single-name equivalent risk warning".** A real institutional mandate would forbid this position altogether.

**Recommendation:** either lower the per-position cap from 40% to 25% (matching typical institutional mandates), or add a "concentration penalty" that expresses regulatory reality — a small return haircut on positions above 25% to reflect stress-test capital requirements.

---

## Part 3 — Prioritised backlog for the developer

Grouped by delivery unit. Each item is a self-contained ticket.

### Sprint 1 — Release-blocking (do first, this week)

| # | Ticket | Time est. |
|---|---|---|
| S1-1 | Verify the R6 (formerly R8) price simulation works end-to-end on current Heroku deployment | 30 min |
| S1-2 | Reproduce Ask Analyst failure, check Heroku logs, fix `ANTHROPIC_API_KEY` env var or rate limits | 1-2h |
| S1-3 | Fix `/#/leaderboard` standalone route rendering | 1-2h |
| S1-4 | Hide future-round price data + event annotations from Investment Universe modals on pre-game landing; unlock round-by-round as game progresses | 2-4h |
| S1-5 | Remove specific in-round outcome disclosures from all round briefings (esp. R2 "+142%"); reframe as flow/sentiment language | 1-2h |
| S1-6 | Add explicit "Text briefing — video not configured" badge in the video fallback path | 30 min |

### Sprint 2 — Realism calibration (this week or next)

| # | Ticket | Time est. |
|---|---|---|
| S2-1 | Trim ElectraDrive, SolarPeak, HydroGen R1 (2020) returns to sector-plausible magnitudes. Preserve later-round shape by scaling all subsequent prices proportionally. Update `roundPrices` in `shared/gameData.ts` and re-run the simulator to verify strategy rankings shift as expected. | 2-3h |
| S2-2 | Adjust R1 (Trump Shock component) Titan Petroleum drawdown from -51.8% to -15% — XLE was flat in 2017 | 30 min |
| S2-3 | Adjust R5 EU Carbon from -20% to -8% — actual EUAs were sideways-to-modestly-down in 2023, most of the drawdown was in 2024 | 30 min |
| S2-4 | Reduce per-position cap from 40% to 25%, OR add a concentration warning banner above 25% | 1-2h |
| S2-5 | Add a "diversified benchmark" line to the end-of-game takeaways screen showing what a "core + tactical tilt" portfolio would have returned, so players can see whether they added skill vs the benchmark | 3-4h |

### Sprint 3 — Data consistency (medium priority)

| # | Ticket | Time est. |
|---|---|---|
| S3-1 | Unify portfolio-value computation into a single `usePortfolioValue()` hook — fixes both the widget-vs-final-standings mismatch and the header-vs-allocate mismatch | 2-3h |
| S3-2 | Filter dormant $100M accounts from leaderboard (players who never advanced past R1) | 30 min |
| S3-3 | Surface the private-fund lock in the trading table (padlock icon + tooltip on slider) and in the Investment Universe card | 1-2h |
| S3-4 | Add "you are holding $X in cash" warning when cash > 20% of portfolio | 1h |

### Sprint 4 — Nice-to-have (defer)

| # | Ticket | Time est. |
|---|---|---|
| S4-1 | Magic-link auth for wider-release readiness | 4-8h |
| S4-2 | Verify PREDICTION_QUESTIONS render in all rounds after 6-round refactor | 30 min |
| S4-3 | Solicit new UX feedback on the trading table (which the reviewer didn't test) | External |

---

## Part 4 — What I disagree with in the review

Two mild pushbacks, offered for balance:

**1. The reviewer suggests recalibrating Round 4 clean-tech "to be closer to ICLN's real +141% at the index level, with single-name outliers reserved for the tickers that historically delivered them."** This is directionally right but glosses over an important design tension: if ElectraDrive returns +145% and ICLN returns +141% in the same round, then ElectraDrive is no longer a distinguishable bet. The game needs *some* dispersion for the "single-name concentration" concept to have any meaning. My recommendation: keep ElectraDrive at ~+170% (still meaningfully above ICLN) but not the +744% single-name Tesla number. This preserves the pedagogical point about concentration risk without making the entire game a Tesla-timing bet.

**2. The reviewer's implicit framing that "the nuanced strategy is the right answer that the game punishes" is partly right but also partly a preference.** In the real 2015–2025 tape, a buy-and-hold ICLN portfolio *did* materially beat most active managers. The Nuanced adaptive strategy's third-place finish in the reviewer's test partly reflects that a well-timed profit-take is genuinely hard, not just a game calibration artefact. That said, the -0.2% drawdown vs -29.3% drawdown for the passive-green strategy is a huge risk-adjusted advantage that a real asset owner would value, and the game's current scoring (final $ value only) hides that. **Adding a Sharpe-like metric to the end-of-game summary** would surface this and give the nuanced player a proper win.

---

*Full simulation code: [`strategy_simulator.py`](https://github.com/ahow/climate-capital/blob/main/strategy_simulator.py) and [`strategy_simulator_recalibrated.py`](https://github.com/ahow/climate-capital/blob/main/strategy_simulator_recalibrated.py). Raw per-round returns and asset-level data: `/tmp/assets.json`.*
