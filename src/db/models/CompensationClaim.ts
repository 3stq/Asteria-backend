import mongoose, { Schema, Document } from 'mongoose'; // FIXED - added mongoose import

export interface ICompensationClaim extends Document {
  discordId: string;
  username: string;
  amount: number;
  claimedAt: Date;
}

const CompensationClaimSchema: Schema = new Schema({
  discordId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  username: { 
    type: String, 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  claimedAt: { 
    type: Date, 
    default: Date.now 
  }
});

export default mongoose.model<ICompensationClaim>('CompensationClaim', CompensationClaimSchema);