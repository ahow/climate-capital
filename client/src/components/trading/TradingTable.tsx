import { memo, useCallback, useMemo, useState } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Lock, RefreshCw, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { GameAsset, Holding, PlayerState, Trade } from "@shared/schema";

// Mirror the server's per-position cap (server/dbStorage.ts → MAX_POSITION_PCT).
// The slider range itself spans the full investable amount, but a proposed
// position above this share is rejected server-side, so we surface it as an
// inline warning and block submission rather than let the POST 400.
const MAX_POSITION_PCT = 0.4;

/**
 * CLIMATE CAPITAL — Trading Table
 *
 * A single dense, scannable table where every asset has an inline slider so the
 * player can adjust positions directly on the page in one view. Replaces the
 * older tile + pop-up trading UI.
 *
 * Slider semantics: each slider's value is the PROPOSED dollar value of that
 * position. On load every slider sits at the current position value, so no
 * slider movement means no pending trades. The delta between the slider value
 * and the current position value becomes a buy (positive) or sell (negative).
 */

// ── Price helpers (mirror the server's getBuyPrice / getEndPrice) ──

// Price at the START of round N — the price a buy/sell executes at this round.
// Round 1 → startPrice; round N → roundPrices[N-2] (end of the previous round).
function getBuyPrice(asset: GameAsset, round: number): number {
  if (round <= 1) return asset.startPrice;
  const idx = round - 2;
  if (idx >= asset.roundPrices.length)
    return asset.roundPrices[asset.roundPrices.length - 1];
  return asset.roundPrices[idx];
}

// ── Formatting ──

function formatMillions(value: number, decimals = 2): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${(Math.abs(value) / 1_000_000).toFixed(decimals)}m`;
}

// ── Risk chip colour (Low/Moderate/Mid = light grey, High = amber, Speculative = light red) ──

function riskChipClass(profile: GameAsset["riskProfile"]): string {
  switch (profile) {
    case "High":
      return "bg-[#FCEFD6] text-[#8A5A00] border-[#E6A100]/40";
    case "Speculative":
      return "bg-[#FBE4E1] text-[#C4372C] border-[#C4372C]/30";
    case "Low":
    case "Moderate":
    default:
      return "bg-[#F4F6F9] text-[#494949] border-[#D9DFE7]";
  }
}

// ── Sparkline ──

/**
 * Inline price sparkline. CRITICAL: only renders price points from round 1 up to
 * and including the START price of the current round, so no future prices leak.
 *
 * The round-start price series is:
 *   round 1  → startPrice
 *   round k  → roundPrices[k-2]   (k >= 2)
 * which is [startPrice, ...roundPrices.slice(0, upToRound - 1)] → exactly
 * `upToRound` data points.
 */
function PriceSparkline({
  asset,
  upToRound,
}: {
  asset: GameAsset;
  upToRound: number;
}) {
  const data = useMemo(() => {
    const points = [
      asset.startPrice,
      ...asset.roundPrices.slice(0, Math.max(0, upToRound - 1)),
    ];
    return points.map((price, i) => ({ round: i + 1, price }));
  }, [asset, upToRound]);

  const last = data[data.length - 1];

  return (
    <div style={{ width: 140, height: 50 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 6, bottom: 6, left: 6 }}>
          <Line
            type="monotone"
            dataKey="price"
            stroke="#001E41"
            strokeWidth={1.75}
            dot={false}
            isAnimationActive={false}
          />
          {/* Tiny dot at the latest point only */}
          <Line
            dataKey="price"
            stroke="transparent"
            isAnimationActive={false}
            dot={(props: any) => {
              if (props.index !== data.length - 1)
                return <g key={props.index} />;
              return (
                <circle
                  key={props.index}
                  cx={props.cx}
                  cy={props.cy}
                  r={2.5}
                  fill="#0074B7"
                />
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
      <span className="sr-only">
        Price through round {upToRound}: latest ${last?.price.toFixed(0)}
      </span>
    </div>
  );
}

// ── Position slider (Radix primitive directly, for full marker/colour control) ──

function PositionSlider({
  value,
  max,
  originalValue,
  step,
  disabled,
  onChange,
}: {
  value: number;
  max: number;
  originalValue: number;
  step: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  const markerPct = max > 0 ? Math.min(100, (originalValue / max) * 100) : 0;

  return (
    <div className="relative w-full">
      <SliderPrimitive.Root
        data-testid="position-slider"
        className="relative flex w-full touch-none select-none items-center py-2"
        value={[Math.min(value, max)]}
        min={0}
        max={Math.max(max, 1)}
        step={Math.max(step, 1)}
        disabled={disabled}
        onValueChange={([v]) => onChange(v)}
      >
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-[#E3E8EF]">
          <SliderPrimitive.Range className="absolute h-full bg-[#0074B7]" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className="block h-4 w-4 rounded-full border-2 border-white bg-[#001E41] shadow ring-offset-background transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0074B7] disabled:pointer-events-none disabled:opacity-40"
          aria-label="Adjust position"
        />
      </SliderPrimitive.Root>

      {/* Fixed original-position marker — stays put as the thumb is dragged away */}
      {!disabled && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="pointer-events-auto absolute top-1/2 z-10 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 cursor-help rounded-full border border-white bg-[#494949]"
                style={{ left: `${markerPct}%` }}
                aria-hidden
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Original: {formatMillions(originalValue, 1)}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

// ── Row data shape passed to each (memoised) row ──

interface RowAsset {
  asset: GameAsset;
  holding: Holding | undefined;
  locked: boolean;
  buyPrice: number;
  units: number;
  positionValue: number; // current $ value of the holding (at this round's mark)
  max: number; // slider max = cash + current position value
  step: number;
  proposed: number; // current slider value in $
  proposedRoundUpTo: number; // current round — caps the sparkline (no future leak)
  overLimit: boolean; // proposed position exceeds the per-position cap
}

// ── Single table row (memoised so dragging one slider doesn't re-render all) ──

const Row = memo(function TradeRow({
  row,
  onChange,
}: {
  row: RowAsset;
  onChange: (assetId: string, v: number) => void;
}) {
  const {
    asset,
    locked,
    buyPrice,
    units,
    positionValue,
    max,
    step,
    proposed,
  } = row;

  const handle = useCallback(
    (v: number) => onChange(asset.id, v),
    [asset.id, onChange],
  );

  const delta = proposed - positionValue;
  const deltaPct = positionValue > 0 ? (delta / positionValue) * 100 : 0;
  const deltaColor =
    Math.abs(delta) < 1
      ? "text-[#494949]"
      : delta > 0
        ? "text-[#00875A]"
        : "text-[#C4372C]";
  // Cash impact: buying more reduces cash (negative), selling increases it (positive)
  const cashImpact = -delta;
  const cashColor =
    Math.abs(cashImpact) < 1
      ? "text-[#494949]"
      : cashImpact > 0
        ? "text-[#00875A]"
        : "text-[#C4372C]";

  return (
    <tr
      data-testid={`trade-row-${asset.id}`}
      className="border-b border-[#EDF0F4] align-middle hover:bg-[#FAFBFC]"
    >
      {/* 1. Asset */}
      <td className="py-3 pl-4 pr-2 align-top">
        <div className="font-sans font-semibold text-sm leading-tight text-[#001E41]">
          {asset.name}
        </div>
        <div className="mt-0.5 text-[11px] uppercase tracking-wider text-[#9AA8B4]">
          {asset.assetClass}
          {locked && (
            <span className="ml-1.5 inline-flex items-center gap-0.5 text-[#8A5A00]">
              <Lock className="h-2.5 w-2.5" /> locked
            </span>
          )}
        </div>
      </td>

      {/* 2. Sector / Risk */}
      <td className="px-2 py-3 align-top">
        <div className="flex flex-col gap-1">
          <span className="inline-flex w-fit items-center rounded-md bg-[#0074B7]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#0074B7]">
            {asset.sector}
          </span>
          <span
            className={`inline-flex w-fit items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${riskChipClass(asset.riskProfile)}`}
          >
            {asset.riskProfile}
          </span>
        </div>
      </td>

      {/* 3. Price chart */}
      <td className="px-2 py-3 align-middle">
        <PriceSparkline asset={asset} upToRound={row.proposedRoundUpTo} />
      </td>

      {/* 4. Buy price */}
      <td className="px-2 py-3 text-right align-middle">
        <span className="font-mono text-sm tabular-nums text-[#001E41]">
          ${buyPrice.toFixed(0)}
        </span>
      </td>

      {/* 5. Your position */}
      <td className="px-2 py-3 text-right align-middle">
        <div className="font-mono text-sm tabular-nums text-[#001E41]">
          {formatMillions(positionValue)}
        </div>
        <div className="text-[11px] text-[#9AA8B4] tabular-nums">
          {units > 0 ? `${Math.round(units).toLocaleString()} units` : "—"}
        </div>
      </td>

      {/* 6. Adjust (slider) */}
      <td className="px-3 py-3 align-middle min-w-[220px]">
        <div className="text-center font-mono text-base font-bold tabular-nums text-[#001E41]">
          {formatMillions(proposed)}
        </div>
        <PositionSlider
          value={proposed}
          max={max}
          originalValue={positionValue}
          step={step}
          disabled={locked}
          onChange={handle}
        />
        {locked ? (
          <div className="flex items-center justify-center gap-1 text-[10px] text-[#8A5A00]">
            <Lock className="h-2.5 w-2.5" /> Locked until round{" "}
            {row.holding?.lockedUntilRound}
          </div>
        ) : (
          <div className="flex justify-between text-[10px] text-[#9AA8B4] tabular-nums">
            <span>Min $0</span>
            <span>Max {formatMillions(max, 1)}</span>
          </div>
        )}
        {row.overLimit && (
          <div className="mt-1 flex items-center justify-center gap-1 text-[10px] font-medium text-[#C4372C]">
            <AlertTriangle className="h-2.5 w-2.5" /> Max 40% per position
          </div>
        )}
      </td>

      {/* 7. Δ vs original */}
      <td className="px-2 py-3 text-right align-middle">
        <div className={`flex items-center justify-end gap-1 font-mono text-sm tabular-nums ${deltaColor}`}>
          {Math.abs(delta) >= 1 &&
            (delta > 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            ))}
          {delta > 0 ? "+" : ""}
          {formatMillions(delta)}
        </div>
        {positionValue > 0 && Math.abs(delta) >= 1 && (
          <div className={`text-[11px] tabular-nums ${deltaColor}`}>
            ({deltaPct > 0 ? "+" : ""}
            {deltaPct.toFixed(0)}%)
          </div>
        )}
      </td>

      {/* 8. Cash impact */}
      <td className="px-2 py-3 pr-4 text-right align-middle">
        <span className={`font-mono text-sm tabular-nums ${cashColor}`}>
          {cashImpact > 0 ? "+" : ""}
          {formatMillions(cashImpact)}
        </span>
      </td>
    </tr>
  );
});

// ── Mobile card (one per asset) ──

const MobileCard = memo(function MobileCard({
  row,
  onChange,
}: {
  row: RowAsset;
  onChange: (assetId: string, v: number) => void;
}) {
  const { asset, locked, buyPrice, units, positionValue, max, step, proposed } =
    row;
  const handle = useCallback(
    (v: number) => onChange(asset.id, v),
    [asset.id, onChange],
  );

  const delta = proposed - positionValue;
  const deltaPct = positionValue > 0 ? (delta / positionValue) * 100 : 0;
  const deltaColor =
    Math.abs(delta) < 1
      ? "text-[#494949]"
      : delta > 0
        ? "text-[#00875A]"
        : "text-[#C4372C]";
  const cashImpact = -delta;
  const cashColor =
    Math.abs(cashImpact) < 1
      ? "text-[#494949]"
      : cashImpact > 0
        ? "text-[#00875A]"
        : "text-[#C4372C]";

  return (
    <div
      data-testid={`trade-card-${asset.id}`}
      className="rounded-xl border border-[#D9DFE7] bg-white p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-sans font-semibold text-sm leading-tight text-[#001E41]">
            {asset.name}
          </div>
          <div className="mt-0.5 text-[11px] uppercase tracking-wider text-[#9AA8B4]">
            {asset.assetClass}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-[#9AA8B4]">
            Buy price
          </div>
          <div className="font-mono text-sm tabular-nums text-[#001E41]">
            ${buyPrice.toFixed(0)}
          </div>
        </div>
      </div>

      {/* Chip row */}
      <div className="flex flex-wrap gap-1.5">
        <span className="inline-flex items-center rounded-md bg-[#0074B7]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#0074B7]">
          {asset.sector}
        </span>
        <span
          className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${riskChipClass(asset.riskProfile)}`}
        >
          {asset.riskProfile}
        </span>
        {locked && (
          <span className="inline-flex items-center gap-0.5 rounded-md border border-[#E6A100]/40 bg-[#FCEFD6] px-1.5 py-0.5 text-[10px] font-medium text-[#8A5A00]">
            <Lock className="h-2.5 w-2.5" /> Locked
          </span>
        )}
      </div>

      {/* Full-width chart */}
      <div className="flex justify-center">
        <PriceSparkline asset={asset} upToRound={row.proposedRoundUpTo} />
      </div>

      {/* Position + slider */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#494949]">Your position</span>
        <span className="font-mono tabular-nums text-[#001E41]">
          {formatMillions(positionValue)}{" "}
          <span className="text-[#9AA8B4]">
            ({units > 0 ? `${Math.round(units).toLocaleString()} units` : "—"})
          </span>
        </span>
      </div>

      <div className="text-center font-mono text-lg font-bold tabular-nums text-[#001E41]">
        {formatMillions(proposed)}
      </div>
      <PositionSlider
        value={proposed}
        max={max}
        originalValue={positionValue}
        step={step}
        disabled={locked}
        onChange={handle}
      />
      {locked ? (
        <div className="flex items-center justify-center gap-1 text-[10px] text-[#8A5A00]">
          <Lock className="h-2.5 w-2.5" /> Locked until round{" "}
          {row.holding?.lockedUntilRound}
        </div>
      ) : (
        <div className="flex justify-between text-[10px] text-[#9AA8B4] tabular-nums">
          <span>Min $0</span>
          <span>Max {formatMillions(max, 1)}</span>
        </div>
      )}
      {row.overLimit && (
        <div className="flex items-center justify-center gap-1 text-[10px] font-medium text-[#C4372C]">
          <AlertTriangle className="h-2.5 w-2.5" /> Exceeds 40% max per position
        </div>
      )}

      <div className="flex justify-between border-t border-[#EDF0F4] pt-2 text-xs">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[#9AA8B4]">
            Δ vs original
          </div>
          <div className={`font-mono tabular-nums ${deltaColor}`}>
            {delta > 0 ? "+" : ""}
            {formatMillions(delta)}
            {positionValue > 0 && Math.abs(delta) >= 1 && (
              <span className="ml-1">
                ({deltaPct > 0 ? "+" : ""}
                {deltaPct.toFixed(0)}%)
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-[#9AA8B4]">
            Cash impact
          </div>
          <div className={`font-mono tabular-nums ${cashColor}`}>
            {cashImpact > 0 ? "+" : ""}
            {formatMillions(cashImpact)}
          </div>
        </div>
      </div>
    </div>
  );
});

// ── Main table component ──

export function TradingTable({
  player,
  assets,
  isSubmitting,
  onSubmit,
}: {
  player: PlayerState;
  assets: GameAsset[];
  isSubmitting: boolean;
  onSubmit: (trades: Trade[]) => void;
}) {
  const round = player.currentRound;

  // Build a stable map of the player's current position values keyed by assetId.
  const baseRows = useMemo(() => {
    return assets.map((asset) => {
      const holding = player.portfolio.holdings.find(
        (h) => h.assetId === asset.id,
      );
      // Holdings are marked at the current round's buy price (start-of-round),
      // the same price the player trades into — matching the server's math.
      const buyPrice = getBuyPrice(asset, round);
      const units = holding ? holding.units : 0;
      const positionValue = units * buyPrice;
      const locked = !!holding && holding.lockedUntilRound > round;
      // Slider max = everything the player could put into this asset =
      // current free cash + the current position value of this asset.
      const max = player.portfolio.cash + positionValue;
      // Step: 1% of range or $100k, whichever is larger.
      const step = Math.max(Math.round(max * 0.01), 100_000);
      return {
        asset,
        holding,
        locked,
        buyPrice,
        units,
        positionValue,
        max,
        step,
      };
    });
  }, [assets, player.portfolio.holdings, player.portfolio.cash, round]);

  // Slider values keyed by assetId (dollars). Default = current position value.
  const initialValues = useMemo(() => {
    const v: Record<string, number> = {};
    for (const r of baseRows) v[r.asset.id] = r.positionValue;
    return v;
  }, [baseRows]);

  const [values, setValues] = useState<Record<string, number>>(initialValues);

  // If the underlying player data changes (e.g. refetch), re-seed any values we
  // haven't got an entry for, without clobbering in-progress edits.
  const merged = useMemo(() => {
    const out: Record<string, number> = {};
    for (const r of baseRows) {
      out[r.asset.id] = values[r.asset.id] ?? r.positionValue;
    }
    return out;
  }, [baseRows, values]);

  const handleChange = useCallback((assetId: string, v: number) => {
    setValues((prev) => ({ ...prev, [assetId]: v }));
  }, []);

  const resetAll = useCallback(() => {
    setValues(initialValues);
  }, [initialValues]);

  // ── Running totals ──
  const totalPortfolioValue = useMemo(
    () => player.portfolio.cash + baseRows.reduce((s, r) => s + r.positionValue, 0),
    [baseRows, player.portfolio.cash],
  );

  const netCashImpact = useMemo(() => {
    // Sum of (current position value - proposed value) across all rows.
    // Positive net = selling on balance (cash up); negative = buying (cash down).
    return baseRows.reduce(
      (s, r) => s + (r.positionValue - (merged[r.asset.id] ?? r.positionValue)),
      0,
    );
  }, [baseRows, merged]);

  const netCashAfter = player.portfolio.cash + netCashImpact;
  const cashNegative = netCashAfter < -1; // tolerance for float noise

  const hasPendingChanges = useMemo(
    () =>
      baseRows.some(
        (r) => Math.abs((merged[r.asset.id] ?? r.positionValue) - r.positionValue) >= 1,
      ),
    [baseRows, merged],
  );

  // Any proposed position above the server's per-position cap. Total portfolio
  // value is unchanged by trades (cash ↔ marks net to zero), so we compare each
  // proposed value against MAX_POSITION_PCT of the total.
  const overLimitIds = useMemo(() => {
    const limit = totalPortfolioValue * MAX_POSITION_PCT;
    const ids = new Set<string>();
    for (const r of baseRows) {
      const proposed = merged[r.asset.id] ?? r.positionValue;
      // Only flag positions we're increasing beyond the cap; never block an
      // unchanged (or reduced) holding that already happens to exceed it.
      if (proposed > r.positionValue + 1 && proposed > limit + 1) {
        ids.add(r.asset.id);
      }
    }
    return ids;
  }, [baseRows, merged, totalPortfolioValue]);

  const hasOverLimit = overLimitIds.size > 0;

  function buildTrades(): Trade[] {
    const trades: Trade[] = [];
    for (const r of baseRows) {
      const proposed = merged[r.asset.id] ?? r.positionValue;
      const delta = proposed - r.positionValue;
      if (Math.abs(delta) < 1) continue;
      if (delta > 0) {
        trades.push({ assetId: r.asset.id, action: "buy", amount: Math.round(delta) });
      } else {
        trades.push({
          assetId: r.asset.id,
          action: "sell",
          amount: Math.round(Math.abs(delta)),
        });
      }
    }
    // Process sells before buys so freed-up cash is available for the buys and
    // the server's sequential cash check passes.
    trades.sort((a, b) => (a.action === b.action ? 0 : a.action === "sell" ? -1 : 1));
    return trades;
  }

  function handleConfirm() {
    onSubmit(buildTrades());
  }

  const rows: RowAsset[] = baseRows.map((r) => ({
    ...r,
    proposed: merged[r.asset.id] ?? r.positionValue,
    proposedRoundUpTo: round,
    overLimit: overLimitIds.has(r.asset.id),
  }));

  return (
    <div className="flex flex-col min-h-[calc(100vh-57px)] bg-white">
      {/* Sticky banner */}
      <div className="sticky top-0 z-30 border-b border-[#D9DFE7] bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-[1400px] px-4 py-3">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0074B7]">
                Round {round} · Trading
              </span>
              <h2 className="font-sans text-xl font-bold text-[#001E41]">
                Adjust your portfolio
              </h2>
            </div>
            <div className="flex flex-wrap items-end gap-5">
              <Metric label="Cash available" value={formatMillions(player.portfolio.cash)} />
              <Metric
                label="Net cash after trades"
                value={formatMillions(netCashAfter)}
                valueClass={cashNegative ? "text-[#C4372C]" : "text-[#00875A]"}
              />
              <Metric
                label="Total portfolio (current marks)"
                value={formatMillions(totalPortfolioValue)}
              />
              <button
                type="button"
                data-testid="reset-all-btn"
                onClick={resetAll}
                disabled={!hasPendingChanges}
                className="inline-flex items-center gap-1 text-sm text-[#0074B7] hover:text-[#001E41] disabled:opacity-40"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Reset all
              </button>
            </div>
          </div>
          {cashNegative && (
            <div
              data-testid="cash-negative-warning"
              className="mt-2 flex items-center gap-2 rounded-md border border-[#C4372C]/30 bg-[#FBE4E1] px-3 py-1.5 text-sm text-[#C4372C]"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Cash would go negative — reduce some purchases.
            </div>
          )}
          {hasOverLimit && !cashNegative && (
            <div
              data-testid="over-limit-warning"
              className="mt-2 flex items-center gap-2 rounded-md border border-[#C4372C]/30 bg-[#FBE4E1] px-3 py-1.5 text-sm text-[#C4372C]"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              A position exceeds the 40% per-position limit — reduce it before
              confirming.
            </div>
          )}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block flex-1 overflow-auto">
        <div className="mx-auto max-w-[1400px] px-4 py-4">
          <table className="w-full border-collapse">
            <thead className="sticky top-[73px] z-20 bg-[#F4F6F9]">
              <tr className="text-[10px] uppercase tracking-wider text-[#494949]">
                <th className="py-2 pl-4 pr-2 text-left font-semibold">Asset</th>
                <th className="px-2 py-2 text-left font-semibold">Sector / Risk</th>
                <th className="px-2 py-2 text-left font-semibold">Price (to date)</th>
                <th className="px-2 py-2 text-right font-semibold">Buy price</th>
                <th className="px-2 py-2 text-right font-semibold">Your position</th>
                <th className="px-3 py-2 text-center font-semibold">Adjust</th>
                <th className="px-2 py-2 text-right font-semibold">Δ vs original</th>
                <th className="px-2 py-2 pr-4 text-right font-semibold">Cash impact</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <Row key={row.asset.id} row={row} onChange={handleChange} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden flex-1 overflow-auto">
        <div className="px-4 py-4 space-y-3">
          {rows.map((row) => (
            <MobileCard key={row.asset.id} row={row} onChange={handleChange} />
          ))}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 z-30 border-t border-[#D9DFE7] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3">
          <div className="text-sm text-[#494949]">
            {hasPendingChanges ? (
              <>
                Net cash after trades:{" "}
                <span
                  className={`font-mono font-semibold tabular-nums ${cashNegative ? "text-[#C4372C]" : "text-[#00875A]"}`}
                >
                  {formatMillions(netCashAfter)}
                </span>
              </>
            ) : (
              <span className="text-[#9AA8B4]">
                Move a slider to propose a trade, or confirm to hold.
              </span>
            )}
          </div>
          <button
            type="button"
            data-testid="confirm-trades-btn"
            onClick={handleConfirm}
            disabled={isSubmitting || cashNegative || hasOverLimit}
            className="inline-flex items-center gap-2 rounded-[10px] bg-[#001E41] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0074B7] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting
              ? "Submitting…"
              : "Confirm trades & proceed to results"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  valueClass = "text-[#001E41]",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="text-right">
      <div className="text-[10px] uppercase tracking-wider text-[#9AA8B4]">
        {label}
      </div>
      <div className={`font-mono text-lg font-bold tabular-nums ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}
