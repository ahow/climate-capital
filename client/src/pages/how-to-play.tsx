import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HowToPlayContent } from "@/components/onboarding/HowToPlayContent";

/**
 * Standalone "How to Play" onboarding page. Rendered inside the /game route
 * when player.phase === "howToPlay". The footer button advances the player to
 * the Investment Universe phase.
 */
export default function HowToPlayPage({ onContinue }: { onContinue: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <HowToPlayContent
        footer={
          <Button
            data-testid="next-explore-investments-btn"
            size="lg"
            onClick={onContinue}
            className="gap-2 bg-[#001E41] text-white hover:bg-[#0074B7] rounded-[10px] px-6 h-11"
          >
            Next: Explore Investments <ArrowRight className="h-4 w-4" />
          </Button>
        }
      />
    </motion.div>
  );
}
