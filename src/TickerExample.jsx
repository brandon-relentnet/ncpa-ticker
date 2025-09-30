import "./App.css";

/**
 * Tournament Name      - match_info.tournament_name
 * Match ID             - match_info.match_id (internal use)
 * Active Game Index    - match_info.activeGameIndex
 * Best Of              - match_info.best_of
 * Winner Team ID       - match_info.winner_team_id (if decided)
 *
 * Team 1 Name          - activeGame.t1_name
 * Team 2 Name          - activeGame.t2_name
 * Team 1 Score         - activeGame.t1_score
 * Team 2 Score         - activeGame.t2_score
 * Team 1 Logo          - activeGame.t1_logo
 * Team 2 Logo          - activeGame.t2_logo
 * Team 1 Players       - activeGame.t1_players.map()
 * Team 2 Players       - activeGame.t2_players.map()
 *
 * Round [] of []       - activeGame.number / match_info.best_of
 * 1st to [] (win by 2) - match_info.rules
 * [] Leads []          - match_info.winning
 * 
 * Example match_info object:
 * {
    "match_id": "match_123",
    "tournament_name": "Midwest Regional",
    "best_of": 3,
    "rules": "First to 11 (win by 2)",
    "winning": "Team Alpha leads 1–0",
    "winner_team_id": null,
    "games": [
      {
        "number": 1,
        "status": "final",
        "t1_name": "Team Alpha",
        "t1_score": 11,
        "t1_logo": "/logos/alpha.png",
        "t1_players": ["Ryan Smith", "Dodo Kong"],
        "t2_name": "Team Beta",
        "t2_score": 8,
        "t2_logo": "/logos/beta.png",
        "t2_players": ["Ethan Mahony", "Mary Layne Holloway"]
      },
      {
        "number": 2,
        "status": "in_progress",
        "t1_name": "Team Alpha",
        "t1_score": 7,
        "t1_logo": "/logos/alpha.png",
        "t1_players": ["Ryan Smith", "Dodo Kong"],
        "t2_name": "Team Beta",
        "t2_score": 6,
        "t2_logo": "/logos/beta.png",
        "t2_players": ["Ethan Mahony", "Mary Layne Holloway"]
      }
    ],
    "activeGameIndex": 1
 * }
 */

export default function TickerExample() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#00ff00]">
      <div className="h-[145px] flex flex-col justify-between">
        {/* Tournament & Match Info */}
        <div className="bg-yellow-500 pl-1.5 w-[475px]">
          NCPA - match_info.tournament_name
        </div>

        {/* Teams & Scores */}
        <div className="bg-orange-500 flex-grow w-[530px] flex">
          <div className="aspect-square bg-slate-500">NCPA</div>
          <div className="flex flex-col">
            <div className="bg-green-500 flex w-[370px]">
              <div className="bg-slate-300 aspect-square">t1_logo</div>
              <div className="flex flex-col pl-2">
                <div>t1_name</div>
                <div>t1_players.map()</div>
              </div>
            </div>
            <div className="bg-green-100 flex w-[370px]">
              <div className="bg-slate-300 aspect-square">t2_logo</div>
              <div className="flex flex-col pl-2">
                <div>t2_name</div>
                <div>t2_players.map()</div>
              </div>
            </div>
          </div>
          <div className="bg-slate-500 flex flex-col">
            <div className="flex-grow">t1_score</div>
            <div className="flex-grow">t2_score</div>
          </div>
        </div>

        {/* Round / Rules / Winning */}
        <div className="bg-yellow-500 pl-1.5 w-[475px]">
          Game {`match_info.games[match_info.activeGameIndex].number`} of {`match_info.best_of`} /
          {`match_info.rules`} / {`match_info.winning`}
        </div>
      </div>
    </div>
  );
}
