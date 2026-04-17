export interface GiftData {
  recipientAccountId: string;
  sender: string;
  message: string;
  items: string[];
  giftType: "cosmetic_bundle" | "single_item" | "battlepass";
  wrapId?: string;
  isSurprise?: boolean;
  currency?: string;
  price?: number;
  metadata?: {
    discordGifter?: string;
    discordChannel?: string;
    commandUsed?: string;
    timestamp?: number;
  };
}

export interface GiftResult {
  success: boolean;
  giftId?: string;
  error?: string;
  details?: any;
}

export interface GiftQueueItem {
  id: string;
  data: GiftData;
  createdAt: Date;
  attempts: number;
  status: "pending" | "processing" | "completed" | "failed";
  lastAttempt?: Date;
  result?: GiftResult;
}

export interface GiftDeliveryResponse {
  offerId: string;
  receipt: string;
  entitlementIds: string[];
  error?: string;
}