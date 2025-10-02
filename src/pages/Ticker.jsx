import Scoreboard from "../components/Scoreboard";
import { hsl } from "../utils/colors";

export default function TickerPage({
  matchInfo,
  primaryColor,
  secondaryColor,
  scoreBackground,
  badgeBackground,
  showBorder,
  manualTextColor,
  tickerBackground,
  useFullAssociationName,
  logoImage,
  logoTransparentBackground,
  logoTextHidden,
  logoPosition,
  logoScale,
  teamLogoScale,
  tickerOverrides,
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
        scoreBackground={scoreBackground}
        badgeBackground={badgeBackground}
        showBorder={showBorder}
        manualTextColor={manualTextColor}
        useFullAssociationName={useFullAssociationName}
        logoImage={logoImage}
        logoTransparentBackground={logoTransparentBackground}
        logoTextHidden={logoTextHidden}
        logoPosition={logoPosition}
        logoScale={logoScale}
        teamLogoScale={teamLogoScale}
        tickerOverrides={tickerOverrides}
      />
    </div>
  );
}
