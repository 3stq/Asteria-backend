import { Schema, model } from "mongoose";

export interface IGift {
  recipientId: string;
  items: string[];
  sender: string;
  message: string;
  claimed: boolean;
  claimedAt?: Date;
  createdAt: Date;
}

const GiftSchema = new Schema<IGift>({
  recipientId: { 
    type: String, 
    required: true,
    index: true
  },
  items: { 
    type: [String], 
    required: true 
  },
  sender: { 
    type: String, 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  claimed: { 
    type: Boolean, 
    default: false,
    index: true
  },
  claimedAt: { 
    type: Date 
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  }
});

const Gift = model<IGift>("Gift", GiftSchema);

// Fix for the duplicate key error - remove problematic indexes
async function fixGiftIndexes() {
  try {
    const indexes = await Gift.collection.indexes();
    const problematicIndex = indexes.find(index => index.key && index.key.giftId);
    
    if (problematicIndex) {
      console.log("Removing problematic index:", problematicIndex.name);
      await Gift.collection.dropIndex(problematicIndex.name);
    }
  } catch (error) {
    console.log("Index fix may have failed, but continuing:", error.message);
  }
}

// Run the fix
fixGiftIndexes();

export default Gift;