import Scoreboard from "../components/Scoreboard";
import { hsl } from "../utils/colors";

export default function TickerPage({
  matchInfo,
  primaryColor,
  secondaryColor,
  showBorder,
  manualTextColor,
  tickerBackground,
}) {
  return (
    <div
      className="flex min-h-screen items-center justify-center p-10"
      style={{ backgroundColor: hsl(tickerBackground) }}
    >
      <Scoreboard
        matchInfo={matchInfo}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        showBorder={showBorder}
        manualTextColor={manualTextColor}
      />
    </div>
  );
}
