import { useState } from "react";
import { HslColorPicker } from "react-colorful";
import "./App.css";
import match_info from "./DummyData";

// Tailwind defaults
const DEFAULT_RED = { h: 0, s: 85, l: 60 };
const DEFAULT_YELLOW = { h: 46, s: 86, l: 47 };

const hsl = ({ h, s, l }) => `hsl(${h} ${s}% ${l}%)`;

// Utility: HSL → RGB → luminance
function hslToRgb({ h, s, l }) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [
    Math.round(255 * f(0)),
    Math.round(255 * f(8)),
    Math.round(255 * f(4)),
  ];
}
function luminance(rgb) {
  const a = rgb.map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}
function contrastTextColor(color) {
  const lum = luminance(hslToRgb(color));
  return lum > 0.5 ? "black" : "white";
}

export default function App() {
  const [red, setRed] = useState(DEFAULT_RED);
  const [yellow, setYellow] = useState(DEFAULT_YELLOW);
  const [open, setOpen] = useState(false);

  const [showBorder, setShowBorder] = useState(true);

  const redText = contrastTextColor(red);
  const yellowText = contrastTextColor(yellow);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#00ff00] relative">
      {/* === TICKER === */}
      <div className="flex flex-col justify-between items-center">
        <div
          className="px-3 py-1 w-fit rounded-t"
          style={{ backgroundColor: hsl(red), color: redText }}
        >
          National College Pickleball Association - {match_info.tournament_name}
        </div>

        <div
          className="flex rounded overflow-hidden"
          style={{ backgroundColor: hsl(red), color: redText }}
        >
          <div className="font-bold text-4xl flex justify-center items-center w-40">
            NCPA
          </div>

          <div
            className={`flex flex-col w-full rounded ${
              showBorder ? "border" : ""
            }`}
            style={{ backgroundColor: hsl(yellow), color: yellowText }}
          >
            {/* Team 1 */}
            <div className="flex border-b">
              <div className="w-15 aspect-square flex justify-center items-center">
                <img src={match_info.active_game.t1_logo} alt="T1 Logo" />
              </div>
              <div className="flex flex-col pl-2 justify-center flex-grow">
                <div>{match_info.active_game.t1_name}</div>
                <div className="flex truncate">
                  {match_info.active_game.t1_players.join(" & ")}
                </div>
              </div>
              <div className="w-15 border-l aspect-square flex justify-center items-center">
                {match_info.active_game.t1_score}
              </div>
            </div>

            {/* Team 2 */}
            <div className="flex">
              <div className="w-15 aspect-square flex justify-center items-center">
                <img src={match_info.active_game.t2_logo} alt="T2 Logo" />
              </div>
              <div className="flex flex-col pl-2 justify-center flex-grow ">
                <div>{match_info.active_game.t2_name}</div>
                <div className="flex truncate">
                  {match_info.active_game.t2_players.join(" & ")}
                </div>
              </div>
              <div className="w-15 aspect-square border-l flex justify-center items-center">
                {match_info.active_game.t2_score}
              </div>
            </div>
          </div>
        </div>

        <div
          className="px-3 py-1 w-fit rounded-b"
          style={{ backgroundColor: hsl(red), color: redText }}
        >
          Game {match_info.game_index} of {match_info.best_of} /{" "}
          {match_info.rules} / {match_info.winning}
        </div>
      </div>

      {/* === Floating Controls === */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="px-3 py-2 rounded-xl border border-black/10 bg-white/80 backdrop-blur shadow hover:bg-white"
        >
          🎨 Colors
        </button>

        {open && (
          <div className="p-3 rounded-2xl border border-black/10 bg-white/90 backdrop-blur shadow-xl w-[280px] space-y-4">
            <div>
              <div className="text-xs font-medium mb-2">Red Sections</div>
              <HslColorPicker color={red} onChange={setRed} />
            </div>

            <div>
              <div className="text-xs font-medium mb-2">Yellow Sections</div>
              <HslColorPicker color={yellow} onChange={setYellow} />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                id="toggleBorder"
                checked={showBorder}
                onChange={(e) => setShowBorder(e.target.checked)}
              />
              <label htmlFor="toggleBorder">Show border</label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
