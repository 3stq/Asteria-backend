import { Schema, model } from "mongoose";

export interface ILobby {
  lobbyId: string;
  creator: string; // accountId
  members: string[]; // array of accountIds
  maxPlayers: number;
  privacy: "public" | "private" | "friends-only";
  gameMode: string;
  region: string;
  createdAt: Date;
  expiresAt: Date;
}

const LobbySchema = new Schema<ILobby>({
  lobbyId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  creator: { 
    type: String, 
    required: true 
  },
  members: { 
    type: [String], 
    default: [] 
  },
  maxPlayers: { 
    type: Number, 
    default: 4 
  },
  privacy: { 
    type: String, 
    enum: ["public", "private", "friends-only"],
    default: "friends-only"
  },
  gameMode: { 
    type: String, 
    default: "battle_royale" 
  },
  region: { 
    type: String, 
    default: "EU" 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  expiresAt: { 
    type: Date, 
    default: () => new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
  }
});

// Auto-clean expired lobbies
LobbySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default model<ILobby>("Lobby", LobbySchema);