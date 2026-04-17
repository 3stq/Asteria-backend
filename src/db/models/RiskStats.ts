import mongoose, { Schema, Document } from 'mongoose';

export interface IRiskStats extends Document {
  userId: string;
  username: string;
  totalWagered: number;
  totalWon: number;
  totalLost: number;
  netProfit: number;
  gamesPlayed: number;
  jackpotsWon: number;
  lastPlayed: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RiskStatsSchema: Schema = new Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  totalWagered: { type: Number, default: 0 },
  totalWon: { type: Number, default: 0 },
  totalLost: { type: Number, default: 0 },
  netProfit: { type: Number, default: 0 },
  gamesPlayed: { type: Number, default: 0 },
  jackpotsWon: { type: Number, default: 0 },
  lastPlayed: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Create index for faster queries
RiskStatsSchema.index({ netProfit: -1 });
// REMOVED duplicate index: RiskStatsSchema.index({ userId: 1 });

export default mongoose.model<IRiskStats>('RiskStats', RiskStatsSchema);