import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Volume2, VolumeX, SkipForward, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

type VideoApiStatus =
  | "disabled"
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "not_started";

interface VideoResponse {
  status: VideoApiStatus;
  videoUrl?: string;
}

interface VideoBriefingProps {
  round: number;
  fallbackContent: ReactNode;
  onComplete?: () => void;
}

export function VideoBriefing({ round, fallbackContent, onComplete }: VideoBriefingProps) {
  const { data, isLoading } = useQuery<VideoResponse>({
    queryKey: ["/api/videos/briefing", round],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/videos/briefing/${round}`);
      return res.json();
    },
    refetchInterval: (query) => {
      const status = (query.state.data as VideoResponse | undefined)?.status;
      return status === "pending" || status === "processing" ? 5000 : false;
    },
  });

  return (
    <VideoPlayer
      isLoading={isLoading}
      data={data}
      fallbackContent={fallbackContent}
      onComplete={onComplete}
      label={`Round ${round} briefing`}
    />
  );
}

interface VideoClosingProps {
  playerId: string;
  fallbackContent: ReactNode;
  onComplete?: () => void;
}

export function VideoClosing({ playerId, fallbackContent, onComplete }: VideoClosingProps) {
  const triggerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/videos/closing/${playerId}`);
      return res.json();
    },
  });

  useEffect(() => {
    triggerMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  const { data, isLoading } = useQuery<VideoResponse>({
    queryKey: ["/api/videos/closing", playerId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/videos/closing/${playerId}`);
      return res.json();
    },
    refetchInterval: (query) => {
      const status = (query.state.data as VideoResponse | undefined)?.status;
      return status === "pending" || status === "processing" || status === "not_started"
        ? 5000
        : false;
    },
  });

  return (
    <VideoPlayer
      isLoading={isLoading}
      data={data}
      fallbackContent={fallbackContent}
      onComplete={onComplete}
      label="Closing message"
    />
  );
}

function VideoPlayer({
  isLoading,
  data,
  fallbackContent,
  onComplete,
  label,
}: {
  isLoading: boolean;
  data?: VideoResponse;
  fallbackContent: ReactNode;
  onComplete?: () => void;
  label: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(true);
  const [showSkipFallback, setShowSkipFallback] = useState(false);

  const status = data?.status;
  const videoUrl = data?.videoUrl;
  const isWaiting =
    !data || status === "pending" || status === "processing" || status === "not_started";

  useEffect(() => {
    if (!isWaiting) {
      setShowSkipFallback(false);
      return;
    }
    const t = setTimeout(() => setShowSkipFallback(true), 10000);
    return () => clearTimeout(t);
  }, [isWaiting]);

  if (status === "disabled" || status === "failed") {
    return <>{fallbackContent}</>;
  }

  if (isLoading || !data) {
    return (
      <div className="bg-[#001E41] rounded-xl overflow-hidden p-6 text-white text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#0074B7] mb-3" />
        <p className="text-sm text-white/80">Loading {label}...</p>
      </div>
    );
  }

  if (isWaiting) {
    return (
      <div className="bg-[#001E41] rounded-xl overflow-hidden p-8 text-white relative">
        <div className="aspect-video w-full bg-black/30 rounded-lg flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0074B7]/30 to-transparent shimmer" />
          <div className="text-center space-y-3 z-10">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#0074B7]" />
            <p className="text-sm text-white font-semibold">Generating {label}…</p>
            <p className="text-xs text-white/70">
              This takes 1–3 minutes the first time, then cached for everyone.
            </p>
          </div>
        </div>
        {showSkipFallback && onComplete && (
          <div className="mt-4 text-center">
            <button
              onClick={onComplete}
              className="text-xs text-[#A8D0E6] underline hover:text-white"
            >
              Continue without video
            </button>
          </div>
        )}
        <style>{`
          .shimmer {
            animation: shimmer-slide 2.5s linear infinite;
            background-size: 200% 100%;
          }
          @keyframes shimmer-slide {
            0% { background-position: -100% 0; }
            100% { background-position: 200% 0; }
          }
        `}</style>
      </div>
    );
  }

  if (status === "completed" && videoUrl) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-[#001E41] rounded-xl overflow-hidden relative"
      >
        <div className="aspect-video w-full bg-black">
          <video
            ref={videoRef}
            src={videoUrl}
            autoPlay
            muted={muted}
            playsInline
            controls
            className="w-full h-full"
            onEnded={onComplete}
          />
        </div>
        <div className="absolute top-3 right-3 flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setMuted((m) => !m)}
            className="bg-black/50 hover:bg-black/70 text-white border-none h-8 px-2 rounded-md"
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            <span className="ml-1 text-xs">{muted ? "Unmute" : "Mute"}</span>
          </Button>
          {onComplete && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onComplete}
              className="bg-black/50 hover:bg-black/70 text-white border-none h-8 px-2 rounded-md"
            >
              <SkipForward className="h-3.5 w-3.5" />
              <span className="ml-1 text-xs">Skip</span>
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

  return <>{fallbackContent}</>;
}
