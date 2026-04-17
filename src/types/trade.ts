export interface TradeItem {
  templateId: string;
  quantity: number;
  attributes?: any;
}

export interface TradeOffer {
  senderId: string;
  receiverId: string;
  senderItems: TradeItem[];
  receiverItems: TradeItem[];
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: Date;
  expiresAt: Date;
  tradeId: string;
}

export interface UserLockerView {
  accountId: string;
  items: { [templateId: string]: any };
  vbucks: number;
}