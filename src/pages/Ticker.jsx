import Scoreboard from "../components/Scoreboard";
import { hsl } from "../utils/colors";

export default function TickerPage({
  matchInfo,
  primaryColor,
  secondaryColor,
  showBorder,
  manualTextColor,
  tickerBackground,
  useFullAssociationName,
  logoImage,
  logoTransparentBackground,
  logoTextHidden,
  logoPosition,
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
        useFullAssociationName={useFullAssociationName}
        logoImage={logoImage}
        logoTransparentBackground={logoTransparentBackground}
        logoTextHidden={logoTextHidden}
        logoPosition={logoPosition}
      />
    </div>
  );
}
