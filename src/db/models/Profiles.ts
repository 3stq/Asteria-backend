import { Schema, model } from "mongoose";

interface IProfile {
  discordId: string;
  accountId: string;
  profiles: Record<string, any>;
  created: Date;
  access_token: string;
  refresh_token: string;
}

const ProfileSchema = new Schema<IProfile>({
  discordId: { 
    type: String, 
    required: true, 
    unique: true
  },
  accountId: { 
    type: String, 
    required: true 
  },
  profiles: { 
    type: Schema.Types.Mixed, 
    required: true 
  },
  created: {
    type: Date,
    default: Date.now
  },
  access_token: {
    type: String,
    default: ""
  },
  refresh_token: {
    type: String,
    default: ""
  }
});

// Static method to find by Discord ID
ProfileSchema.statics.findByDiscordId = function(discordId: string) {
  return this.findOne({ discordId });
};

const Profiles = model<IProfile>("Profiles", ProfileSchema);

export default Profiles;