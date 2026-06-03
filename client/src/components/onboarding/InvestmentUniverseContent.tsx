import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceDot,
} from "recharts";
import { ChevronRight, ChevronLeft, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import type { GameAsset } from "@shared/schema";
import { GAME_ASSETS } from "@shared/gameData";

// The /api/assets payload strips realBasis; everything else (including the new
// enrichment fields) is preserved.
type UniverseAsset = Omit<GameAsset, "realBasis">;

const RISK_PROFILES = ["Low", "Moderate", "High", "Speculative"] as const;
const VALUATION_TIERS = ["Small", "Mid", "Large", "Mega", "ETF", "Commodity"] as const;
type SortKey = "name" | "sector" | "risk";

const RISK_ORDER: Record<string, number> = {
  Low: 0,
  Moderate: 1,
  High: 2,
  Speculative: 3,
};

function riskChipClass(risk: string): string {
  switch (risk) {
    case "Low":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Moderate":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "High":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "Speculative":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-[#F4F6F9] text-[#494949] border-[#D9DFE7]";
  }
}

// A ticker-style pseudonym derived from the asset name (no real tickers exist).
function tickerFor(asset: UniverseAsset): string {
  const letters = asset.name.replace(/[^A-Za-z]/g, "").toUpperCase();
  return letters.slice(0, 4) || asset.id.slice(0, 4).toUpperCase();
}

// The price series shown on charts: round 0 (start) through round 7.
function priceSeries(asset: UniverseAsset): number[] {
  return [asset.startPrice, ...asset.roundPrices];
}

// ── Inline SVG sparkline (no axes/labels) ──
function Sparkline({ series }: { series: number[] }) {
  if (series.length < 2) return null;
  const w = 120;
  const h = 32;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const points = series
    .map((v, i) => {
      const x = (i / (series.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const rising = series[series.length - 1] >= series[0];
  const stroke = rising ? "#00875A" : "#C4372C";
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="overflow-visible"
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Detail chart with annotated milestones ──
function DetailChart({ asset }: { asset: UniverseAsset }) {
  const data = priceSeries(asset).map((value, round) => ({ round, value }));
  const notes = asset.historicalNotes ?? [];
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, bottom: 5, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#D9DFE7" />
          <XAxis
            dataKey="round"
            tick={{ fill: "#494949", fontSize: 12 }}
            tickFormatter={(v) => (v === 0 ? "Start" : `R${v}`)}
            stroke="#D9DFE7"
          />
          <YAxis
            tick={{ fill: "#494949", fontSize: 12 }}
            tickFormatter={(v) => `$${v}`}
            stroke="#D9DFE7"
            width={48}
          />
          <RechartsTooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #D9DFE7",
              borderRadius: "8px",
              color: "#001E41",
            }}
            formatter={(value: number) => [`$${value}`, "Price"]}
            labelFormatter={(label) =>
              label === 0 ? "Game start" : `Round ${label}`
            }
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#001E41"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#001E41" }}
          />
          {notes.map((note) => {
            const point = data.find((d) => d.round === note.round);
            if (!point) return null;
            return (
              <ReferenceDot
                key={note.round}
                x={note.round}
                y={point.value}
                r={6}
                fill="#0074B7"
                stroke="#FFFFFF"
                strokeWidth={2}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
      {notes.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {notes.map((note) => (
            <li
              key={note.round}
              className="flex items-start gap-2 text-xs text-[#494949]"
            >
              <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#0074B7] text-[9px] font-bold text-white">
                {note.round}
              </span>
              <span>
                <span className="font-semibold text-[#001E41]">
                  {note.round === 0 ? "Start" : `Round ${note.round}`}:
                </span>{" "}
                {note.event}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Detail view (modal) ──
function AssetDetail({
  asset,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  asset: UniverseAsset;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  const v = asset.valuation;
  const valuationRows: { label: string; value: string }[] = [];
  valuationRows.push({ label: "Tier", value: v.tier });
  if (v.marketCapBn != null)
    valuationRows.push({ label: "Market cap", value: `$${v.marketCapBn}bn` });
  if (v.peRatioProxy != null && v.peRatioProxy > 0)
    valuationRows.push({ label: "P/E (proxy)", value: `${v.peRatioProxy}x` });
  if (v.dividendYieldPct != null && v.dividendYieldPct > 0)
    valuationRows.push({
      label: "Dividend yield",
      value: `${v.dividendYieldPct}%`,
    });

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="bg-white border-[#D9DFE7] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 text-[#001E41] font-sans">
            <span className="text-xl">{asset.name}</span>
            <span className="font-mono text-xs text-[#9AA8B4]">
              {tickerFor(asset)}
            </span>
          </DialogTitle>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center rounded-md border border-[#D9DFE7] bg-[#F4F6F9] px-2 py-0.5 text-[11px] font-medium text-[#001E41]">
              {asset.sector}
            </span>
            <span
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${riskChipClass(asset.riskProfile)}`}
            >
              {asset.riskProfile} risk
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          <DetailChart asset={asset} />

          <p className="text-sm leading-relaxed text-[#494949]">
            {asset.description}
          </p>

          {/* Valuation */}
          <div className="rounded-lg border border-[#D9DFE7] bg-[#F4F6F9] p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#494949] mb-3">
              Valuation
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {valuationRows.map((row) => (
                <div key={row.label}>
                  <p className="text-[11px] text-[#9AA8B4]">{row.label}</p>
                  <p className="font-mono font-semibold text-sm text-[#001E41] tabular-nums">
                    {row.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Transition thesis */}
          <div className="border-l-4 border-[#0074B7] bg-white border-y border-r border-[#D9DFE7] rounded-r-lg p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0074B7] mb-1">
              Transition Thesis
            </p>
            <p className="text-sm text-[#001E41] leading-relaxed">
              {asset.transitionThesis}
            </p>
          </div>

          {/* Key risks */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#494949] mb-2">
              Key Risks
            </h4>
            <ul className="space-y-1.5">
              {asset.keyRisks.map((risk, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-[#494949]"
                >
                  <ChevronRight className="h-4 w-4 text-[#0074B7] mt-0.5 shrink-0" />
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between pt-2 border-t border-[#D9DFE7] mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onPrev}
            disabled={!hasPrev}
            className="text-[#494949] hover:text-[#001E41] hover:bg-[#F4F6F9] disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-[#494949] hover:text-[#001E41] hover:bg-[#F4F6F9]"
          >
            <X className="h-4 w-4 mr-1" /> Close
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onNext}
            disabled={!hasNext}
            className="text-[#494949] hover:text-[#001E41] hover:bg-[#F4F6F9] disabled:opacity-40"
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Multi-select chip filter ──
function ChipFilter<T extends string>({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: readonly T[];
  selected: Set<T>;
  onToggle: (value: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#494949]">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = selected.has(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className={
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors " +
                (active
                  ? "bg-[#001E41] text-white border-[#001E41]"
                  : "bg-white text-[#001E41] border-[#D9DFE7] hover:border-[#0074B7]")
              }
            >
              {active && <Check className="h-3 w-3" />}
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Investment Universe browser used both as a standalone onboarding page and
 * inside the mid-game "Investment Universe" sheet. The optional `footer`
 * (the "Continue to Round 1 Briefing" button) is supplied by the caller.
 */
export function InvestmentUniverseContent({ footer }: { footer?: React.ReactNode }) {
  // Fall back to the bundled GAME_ASSETS (minus realBasis) if the API is slow.
  const { data: apiAssets } = useQuery<UniverseAsset[]>({
    queryKey: ["/api/assets"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/assets");
      return res.json();
    },
  });
  const assets: UniverseAsset[] =
    apiAssets ?? GAME_ASSETS.map(({ realBasis, ...rest }) => rest);

  const sectors = useMemo(
    () => Array.from(new Set(assets.map((a) => a.sector))).sort(),
    [assets],
  );

  const [selectedSectors, setSelectedSectors] = useState<Set<string>>(new Set());
  const [selectedRisks, setSelectedRisks] = useState<Set<string>>(new Set());
  const [selectedTiers, setSelectedTiers] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [detailId, setDetailId] = useState<string | null>(null);

  function toggle<T extends string>(
    setter: React.Dispatch<React.SetStateAction<Set<T>>>,
    value: T,
  ) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const result = assets.filter((a) => {
      if (selectedSectors.size > 0 && !selectedSectors.has(a.sector)) return false;
      if (selectedRisks.size > 0 && !selectedRisks.has(a.riskProfile)) return false;
      if (selectedTiers.size > 0 && !selectedTiers.has(a.valuation.tier))
        return false;
      return true;
    });
    result.sort((a, b) => {
      if (sortKey === "sector") {
        const s = a.sector.localeCompare(b.sector);
        return s !== 0 ? s : a.name.localeCompare(b.name);
      }
      if (sortKey === "risk") {
        const r = RISK_ORDER[a.riskProfile] - RISK_ORDER[b.riskProfile];
        return r !== 0 ? r : a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name);
    });
    return result;
  }, [assets, selectedSectors, selectedRisks, selectedTiers, sortKey]);

  const detailIndex = filtered.findIndex((a) => a.id === detailId);
  const detailAsset = detailIndex >= 0 ? filtered[detailIndex] : null;

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="bg-[#001E41] text-white">
        <div className="max-w-6xl mx-auto px-6 pt-12 pb-8">
          <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#A8D0E6] mb-3">
            The opportunity set
          </span>
          <h2 className="font-sans font-bold text-3xl md:text-4xl leading-tight text-white">
            Investment Universe
          </h2>
          <div className="mt-4 h-1 w-16 bg-[#0074B7]" aria-hidden />
          <p className="mt-5 text-base text-white/80 max-w-2xl">
            Explore the {assets.length} assets you can allocate across — from
            renewables and grid infrastructure to carbon markets and fossil
            incumbents. Click any card for the full thesis and price history.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Filters + sort */}
        <div className="rounded-xl border border-[#D9DFE7] bg-[#F4F6F9] p-5 space-y-4">
          <ChipFilter
            label="Sector"
            options={sectors}
            selected={selectedSectors}
            onToggle={(v) => toggle(setSelectedSectors, v)}
          />
          <ChipFilter
            label="Risk profile"
            options={RISK_PROFILES}
            selected={selectedRisks}
            onToggle={(v) => toggle(setSelectedRisks, v)}
          />
          <ChipFilter
            label="Valuation tier"
            options={VALUATION_TIERS}
            selected={selectedTiers}
            onToggle={(v) => toggle(setSelectedTiers, v)}
          />
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#494949]">
              Sort by
            </label>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="bg-white border border-[#D9DFE7] rounded-md px-3 py-1.5 text-sm text-[#001E41] focus:outline-none focus:ring-2 focus:ring-[#0074B7] focus:border-[#0074B7]"
            >
              <option value="name">Name</option>
              <option value="sector">Sector</option>
              <option value="risk">Risk</option>
            </select>
            <span className="text-xs text-[#9AA8B4] ml-auto">
              Showing {filtered.length} of {assets.length}
            </span>
          </div>
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((asset) => (
            <button
              key={asset.id}
              type="button"
              data-testid={`universe-card-${asset.id}`}
              onClick={() => setDetailId(asset.id)}
              className="text-left rounded-xl bg-white border border-[#D9DFE7] p-4 hover:border-[#0074B7] hover:shadow-sm transition-all flex flex-col"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-sans font-semibold text-sm leading-tight text-[#001E41]">
                  {asset.name}
                </h3>
                <span className="font-mono text-[10px] text-[#9AA8B4] shrink-0 mt-0.5">
                  {tickerFor(asset)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="inline-flex items-center rounded-md border border-[#D9DFE7] bg-[#F4F6F9] px-1.5 py-0.5 text-[10px] font-medium text-[#001E41]">
                  {asset.sector}
                </span>
                <span
                  className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${riskChipClass(asset.riskProfile)}`}
                >
                  {asset.riskProfile}
                </span>
              </div>

              <p className="text-xs text-[#494949] mt-2 line-clamp-2">
                {asset.description}
              </p>

              <div className="flex items-center justify-between mt-3 pt-2">
                <Sparkline series={priceSeries(asset)} />
                <span className="inline-flex items-center rounded-md bg-[#001E41]/5 px-1.5 py-0.5 text-[10px] font-semibold text-[#001E41]">
                  {asset.valuation.tier}
                </span>
              </div>

              <span className="text-[11px] text-[#0074B7] font-medium mt-3">
                View details →
              </span>
            </button>
          ))}
        </div>

        {footer && <div className="flex justify-center pt-6">{footer}</div>}
      </div>

      {detailAsset && (
        <AssetDetail
          asset={detailAsset}
          onClose={() => setDetailId(null)}
          onPrev={() =>
            detailIndex > 0 && setDetailId(filtered[detailIndex - 1].id)
          }
          onNext={() =>
            detailIndex < filtered.length - 1 &&
            setDetailId(filtered[detailIndex + 1].id)
          }
          hasPrev={detailIndex > 0}
          hasNext={detailIndex < filtered.length - 1}
        />
      )}
    </div>
  );
}
