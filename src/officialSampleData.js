import officialPayload from "./official_data.json";
import officialTeamsPayload from "./official_data_teams.json";
import { extractTeamsFromMatchPayload, normalizeOfficialMatch } from "./utils/officialAdapter";

const teamMetadata = extractTeamsFromMatchPayload(officialTeamsPayload);
const { teamOne, teamTwo, tournamentName } = teamMetadata;

export const officialMatchSample = normalizeOfficialMatch(officialPayload, {
  matchId: "match_5092",
  tournamentName: tournamentName ?? "Official Midwest Regional",
  rules: "First to 11 (win by 2)",
  teamOne,
  teamTwo,
  bestOf: 7,
});

export default officialMatchSample;
