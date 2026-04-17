import { Schema, model } from "mongoose";

interface IMatchmaking {
  accountId: string;
  username?: string;
  sessionId?: string;
  region?: string;
  port?: number;
  ip?: string;
  playlist?: string;
  bucket?: string;
  version?: string;
  status?: string;
  joinedAt?: Date;
  matchId?: string;
}

const MatchmakingSchema = new Schema<IMatchmaking>({
  accountId: { type: String, required: true, unique: true },
  username: { type: String, required: false },
  sessionId: { type: String, required: false },
  region: { type: String, required: false, default: "NAE" },
  port: { type: Number, required: false },
  ip: { type: String, required: false },
  playlist: { type: String, required: false, default: "playlist_default" },
  bucket: { type: String, required: false },
  version: { type: String, required: false },
  status: { 
    type: String, 
    required: false, 
    default: "queued",
    enum: ["queued", "searching", "matched", "in_game", "cancelled"]
  },
  joinedAt: { type: Date, default: Date.now },
  matchId: { type: String, required: false }
});

const Matchmaking = model<IMatchmaking>("Matchmaking", MatchmakingSchema);

export default Matchmaking;