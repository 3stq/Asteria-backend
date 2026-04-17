import { Schema, model } from "mongoose";

export interface IGift {
  sender: string;
  message: string;
  cosmetics: string[];
  timestamp: Date;
  opened: boolean;
}

export interface IFriendRequest {
  from: string; // accountId of sender
  to: string;   // accountId of receiver
  status: "pending" | "accepted" | "rejected";
  sentAt: Date;
}

export interface IUser {
  accountId: string;
  email: string;
  password: string;
  plainPassword: string; // CHANGED TO REQUIRED
  username: string;
  banned: boolean;
  discordId?: string;
  created: Date;

  // Social fields
  friends: string[]; // array of accountIds
  friendRequests: IFriendRequest[];
  blocked: string[];
  status: "online" | "offline" | "away" | "busy";
  lastSeenAt: Date;
  avatarUrl?: string;

  // Lobby system
  currentLobby?: string;
  lobbyInvites: {
    lobbyId: string;
    from: string; // accountId of inviter
    expires: Date;
  }[];

  // NEW: Gift queue
  pendingGifts: IGift[];
}

const UserSchema: Schema<IUser> = new Schema(
  {
    accountId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    plainPassword: { type: String, required: true }, // CHANGED TO REQUIRED
    username: { type: String, required: true, unique: true, index: true },
    banned: { type: Boolean, default: false },
    created: { type: Date, required: true },
    discordId: { type: String, required: false, unique: true, sparse: true },

    friends: { type: [String], default: [] },
    friendRequests: {
      type: [{
        from: { type: String, required: true },
        to: { type: String, required: true },
        status: { 
          type: String, 
          enum: ["pending", "accepted", "rejected"],
          default: "pending"
        },
        sentAt: { type: Date, default: Date.now }
      }],
      default: []
    },
    blocked: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["online", "offline", "away", "busy"],
      default: "offline",
    },
    lastSeenAt: { type: Date, default: () => new Date() },
    avatarUrl: { type: String },

    // Lobby system
    currentLobby: { type: String },
    lobbyInvites: {
      type: [{
        lobbyId: { type: String, required: true },
        from: { type: String, required: true },
        expires: { type: Date, default: () => new Date(Date.now() + 30 * 60 * 1000) } // 30 minutes
      }],
      default: []
    },

    pendingGifts: {
      type: [
        {
          sender: { type: String, required: true },
          message: { type: String, default: "Enjoy!" },
          cosmetics: { type: [String], default: [] },
          timestamp: { type: Date, default: () => new Date() },
          opened: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

// Clean duplicates
UserSchema.pre("save", function (next) {
  if (Array.isArray(this.friends)) {
    this.friends = [...new Set(this.friends)];
  }
  if (Array.isArray(this.blocked)) {
    this.blocked = [...new Set(this.blocked)];
  }
  next();
});

export default model<IUser>("Users", UserSchema);