import { useEffect } from "react";
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
  tickerBackgroundTransparent,
  useFullAssociationName,
  logoImage,
  logoTransparentBackground,
  logoTextHidden,
  logoPosition,
  logoScale,
  teamLogoScale,
  tickerOverrides,
}) {
  /* When transparent mode is on, override the html/body backgrounds so
     nothing bleeds through behind the ticker wrapper. */
  useEffect(() => {
    if (!tickerBackgroundTransparent) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.background;
    const prevBody = body.style.background;
    html.style.background = "transparent";
    body.style.background = "transparent";
    return () => {
      html.style.background = prevHtml;
      body.style.background = prevBody;
    };
  }, [tickerBackgroundTransparent]);

  return (
    <div
      className="flex min-h-screen items-center justify-center p-10"
      style={{ backgroundColor: tickerBackgroundTransparent ? "transparent" : hsl(tickerBackground) }}
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
