import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvestmentUniverseContent } from "@/components/onboarding/InvestmentUniverseContent";

/**
 * Standalone "Investment Universe" onboarding page. Rendered inside the /game
 * route when player.phase === "universe". The footer button advances the
 * player into the Round 1 briefing.
 */
export default function InvestmentUniversePage({
  onContinue,
}: {
  onContinue: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <InvestmentUniverseContent
        footer={
          <Button
            data-testid="continue-to-round-1-btn"
            size="lg"
            onClick={onContinue}
            className="gap-2 bg-[#001E41] text-white hover:bg-[#0074B7] rounded-[10px] px-6 h-11"
          >
            Continue to Round 1 Briefing <ChevronRight className="h-4 w-4" />
          </Button>
        }
      />
    </motion.div>
  );
}
