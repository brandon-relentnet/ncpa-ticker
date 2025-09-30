import { useEffect, useMemo, useState } from "react";
import Scoreboard from "../components/Scoreboard";
import officialPayload from "../official_data.json";
import officialTeamsPayload from "../official_data_teams.json";
import officialMatchSample from "../officialSampleData";
import { hsl } from "../utils/colors";
import {
  extractTeamsFromMatchPayload,
  normalizeOfficialMatch,
} from "../utils/officialAdapter";

const stringify = (value) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{}";
  }
};

const buildOptionDefaults = (sourceMatch, teamMeta = {}) => {
  const fallbackGame = Array.isArray(sourceMatch?.games)
    ? sourceMatch.games[0]
    : undefined;

  const teamOneName = teamMeta.teamOne?.name ?? fallbackGame?.t1_name ?? "Team One";
  const teamTwoName = teamMeta.teamTwo?.name ?? fallbackGame?.t2_name ?? "Team Two";

  return {
    matchId: sourceMatch?.match_id ?? "match_5092",
    tournamentName:
      sourceMatch?.tournament_name ?? teamMeta.tournamentName ?? "Official Midwest Regional",
    rules: sourceMatch?.rules ?? "First to 11 (win by 2)",
    bestOf: String(sourceMatch?.best_of ?? fallbackGame?.number ?? 1),
    teamOneName,
    teamOneShort: teamMeta.teamOne?.shortName ?? teamOneName,
    teamOneLogo:
      teamMeta.teamOne?.logo ?? fallbackGame?.t1_logo ?? "/logos/alpha.png",
    teamTwoName,
    teamTwoShort: teamMeta.teamTwo?.shortName ?? teamTwoName,
    teamTwoLogo:
      teamMeta.teamTwo?.logo ?? fallbackGame?.t2_logo ?? "/logos/beta.png",
  };
};

const optionFields = [
  { key: "matchId", label: "Match ID" },
  { key: "tournamentName", label: "Tournament" },
  { key: "rules", label: "Rules" },
  { key: "bestOf", label: "Best Of", type: "number" },
  { key: "teamOneName", label: "Team One Name" },
  { key: "teamOneShort", label: "Team One Short" },
  { key: "teamOneLogo", label: "Team One Logo" },
  { key: "teamTwoName", label: "Team Two Name" },
  { key: "teamTwoShort", label: "Team Two Short" },
  { key: "teamTwoLogo", label: "Team Two Logo" },
];

const SAMPLE_GROUPS = {
  "Dummy Matches": (samples) => samples,
  "Official Sample": () => [officialMatchSample],
};

export default function TestingPage({
  matchInfo,
  onApplyMatch,
  onActiveGameIndexChange,
  onLoadSampleMatch,
  sampleMatches,
  primaryColor,
  secondaryColor,
  showBorder,
  manualTextColor,
  tickerBackground,
  useFullAssociationName,
}) {
  const [jsonInput, setJsonInput] = useState(() => stringify(officialPayload));
  const [teamJsonInput, setTeamJsonInput] = useState(() => stringify(officialTeamsPayload));
  const [options, setOptions] = useState(() =>
    buildOptionDefaults(matchInfo, extractTeamsFromMatchPayload(officialTeamsPayload))
  );
  const [conversionError, setConversionError] = useState(null);
  const parsedTeamInput = useMemo(() => {
    try {
      const parsed = JSON.parse(teamJsonInput);
      return extractTeamsFromMatchPayload(parsed);
    } catch {
      return {};
    }
  }, [teamJsonInput]);
  const defaultOptions = useMemo(
    () => buildOptionDefaults(matchInfo, parsedTeamInput),
    [matchInfo, parsedTeamInput]
  );

  const sampleCollections = useMemo(() => {
    return Object.entries(SAMPLE_GROUPS).flatMap(([group, builder]) =>
      builder(sampleMatches ?? []).map((item) => ({
        group,
        match: item,
      }))
    );
  }, [sampleMatches]);

  useEffect(() => {
    setOptions(defaultOptions);
  }, [defaultOptions]);

  const handleOptionChange = (key, value) => {
    setOptions((previous) => ({ ...previous, [key]: value }));
  };

  const handleConvert = () => {
    setConversionError(null);
    try {
      const parsedGames = JSON.parse(jsonInput);
      const teamOverrides = parsedTeamInput;
      const normalized = normalizeOfficialMatch(parsedGames, {
        matchId: options.matchId || undefined,
        tournamentName:
          options.tournamentName || teamOverrides.tournamentName || undefined,
        rules: options.rules || undefined,
        bestOf: options.bestOf ? Number(options.bestOf) : undefined,
        teamOne: {
          ...teamOverrides.teamOne,
          name:
            options.teamOneName || teamOverrides.teamOne?.name || defaultOptions.teamOneName,
          shortName:
            options.teamOneShort ||
            teamOverrides.teamOne?.shortName ||
            options.teamOneName ||
            defaultOptions.teamOneShort,
          logo:
            options.teamOneLogo || teamOverrides.teamOne?.logo || defaultOptions.teamOneLogo,
        },
        teamTwo: {
          ...teamOverrides.teamTwo,
          name:
            options.teamTwoName || teamOverrides.teamTwo?.name || defaultOptions.teamTwoName,
          shortName:
            options.teamTwoShort ||
            teamOverrides.teamTwo?.shortName ||
            options.teamTwoName ||
            defaultOptions.teamTwoShort,
          logo:
            options.teamTwoLogo || teamOverrides.teamTwo?.logo || defaultOptions.teamTwoLogo,
        },
      });

      onApplyMatch(normalized);
    } catch (error) {
      setConversionError(error.message ?? "Failed to convert payload");
    }
  };

  const handleApplyOfficialSample = () => {
    onApplyMatch(officialMatchSample);
  };

  const handleApplyDummySample = (matchId) => {
    onLoadSampleMatch(matchId);
  };

  const handleResetInput = () => {
    setJsonInput(stringify(officialPayload));
    setTeamJsonInput(stringify(officialTeamsPayload));
    setOptions(
      buildOptionDefaults(
        matchInfo,
        extractTeamsFromMatchPayload(officialTeamsPayload)
      )
    );
    setConversionError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 py-10 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 xl:flex-row">
        <div className="flex-1 space-y-6">
          <section>
            <h1 className="text-3xl font-semibold text-lime-400">
              Testing Sandbox
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Convert official API payloads into ticker-ready match data and preview the result instantly.
            </p>
          </section>

          <section>
            <div
              className="rounded-3xl border border-slate-800 p-10 shadow-lg"
              style={{ backgroundColor: hsl(tickerBackground) }}
            >
              <Scoreboard
                matchInfo={matchInfo}
                primaryColor={primaryColor}
                secondaryColor={secondaryColor}
                showBorder={showBorder}
                manualTextColor={manualTextColor}
                useFullAssociationName={useFullAssociationName}
              />
            </div>
            <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
              <header className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Active Match Snapshot
                  </h2>
                  <p className="text-xs text-slate-500">
                    Inspect the data currently feeding the scoreboard.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-lime-400 hover:text-lime-300"
                    onClick={handleApplyOfficialSample}
                  >
                    Load Official Sample
                  </button>
                  {sampleCollections
                    .filter(({ group }) => group === "Dummy Matches")
                    .map(({ match }) => (
                      <button
                        key={match.match_id}
                        type="button"
                        className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-lime-400 hover:text-lime-300"
                        onClick={() => handleApplyDummySample(match.match_id)}
                      >
                        {match.match_id}
                      </button>
                    ))}
                </div>
              </header>
              <pre className="max-h-80 overflow-auto rounded-2xl bg-slate-950 p-4 text-[11px] leading-relaxed text-slate-200">
                {stringify(matchInfo)}
              </pre>
            </div>
          </section>
        </div>

        <aside className="w-full max-w-xl space-y-6">
          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
            <header className="mb-5">
              <h2 className="text-lg font-semibold text-white">Conversion Controls</h2>
              <p className="text-xs text-slate-500">
                Paste raw JSON from `get-games`, tweak metadata, then convert.
              </p>
            </header>

            <div className="space-y-3">
              {optionFields.map((field) => (
                <label key={field.key} className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {field.label}
                  <input
                    type={field.type ?? "text"}
                    value={options[field.key] ?? ""}
                    onChange={(event) => handleOptionChange(field.key, event.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400"
                  />
                </label>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Official JSON Payload
                <textarea
                  value={jsonInput}
                  onChange={(event) => setJsonInput(event.target.value)}
                  rows={16}
                  className="min-h-[240px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-[13px] text-slate-100 focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400"
                />
              </label>
              <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Official Match Payload (Teams)
                <textarea
                  value={teamJsonInput}
                  onChange={(event) => setTeamJsonInput(event.target.value)}
                  rows={12}
                  className="min-h-[200px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-[13px] text-slate-100 focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400"
                />
              </label>

              {conversionError && (
                <p className="rounded-lg border border-red-500 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">
                  {conversionError}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  className="flex-1 rounded-full border border-slate-700 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-lime-400 hover:text-lime-300"
                  onClick={handleConvert}
                >
                  Convert & Apply
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-700 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-lime-400 hover:text-lime-300"
                  onClick={handleResetInput}
                >
                  Reset
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
            <header className="mb-4">
              <h2 className="text-lg font-semibold text-white">Game Selector</h2>
              <p className="text-xs text-slate-500">
                Step through the games in the converted match.
              </p>
            </header>
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm">
              <div>
                <div className="font-medium text-slate-300">Active Game</div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500">
                  {matchInfo.games?.length ?? 0} total games
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-full border border-slate-700 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-lime-400 hover:text-lime-300 disabled:opacity-40"
                  onClick={() => onActiveGameIndexChange((matchInfo.activeGameIndex ?? 0) - 1)}
                  disabled={(matchInfo.activeGameIndex ?? 0) <= 0}
                >
                  Prev
                </button>
                <div className="w-16 text-center text-sm font-semibold text-slate-200">
                  Game {(matchInfo.activeGameIndex ?? 0) + 1}
                </div>
                <button
                  type="button"
                  className="rounded-full border border-slate-700 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-lime-400 hover:text-lime-300 disabled:opacity-40"
                  onClick={() => onActiveGameIndexChange((matchInfo.activeGameIndex ?? 0) + 1)}
                  disabled={(matchInfo.activeGameIndex ?? 0) >= (matchInfo.games?.length ?? 1) - 1}
                >
                  Next
                </button>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-slate-500">
              Match ID: {matchInfo.match_id}
            </p>
            <p className="text-[11px] text-slate-500">
              Tournament: {matchInfo.tournament_name}
            </p>
            <p className="text-[11px] text-slate-500">
              Summary: {matchInfo.winning}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
