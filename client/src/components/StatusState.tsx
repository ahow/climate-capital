import { AlertCircle, Inbox, Loader2, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

type StatusVariant = "loading" | "empty" | "error" | "offline";

const ICONS = {
  loading: Loader2,
  empty: Inbox,
  error: AlertCircle,
  offline: WifiOff,
};

export function StatusState({
  variant,
  title,
  description,
  actionLabel,
  onAction,
  fullScreen = false,
}: {
  variant: StatusVariant;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  fullScreen?: boolean;
}) {
  const Icon = ICONS[variant];
  return (
    <div
      className={
        fullScreen
          ? "flex min-h-screen items-center justify-center bg-[#F7F9FB] px-4"
          : "flex min-h-[260px] items-center justify-center px-4 py-10"
      }
      role={variant === "error" || variant === "offline" ? "alert" : "status"}
      aria-live="polite"
    >
      <div className="max-w-md rounded-2xl border border-[#D9DFE7] bg-white p-7 text-center shadow-sm">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#0074B7]/10 text-[#0074B7]">
          <Icon className={variant === "loading" ? "h-5 w-5 animate-spin" : "h-5 w-5"} />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-[#001E41]">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#647487]">{description}</p>
        {actionLabel && onAction && (
          <Button
            type="button"
            onClick={onAction}
            className="mt-5 bg-[#001E41] text-white hover:bg-[#0074B7]"
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
