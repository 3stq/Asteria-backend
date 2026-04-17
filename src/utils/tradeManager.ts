import { TradeOffer, TradeItem } from '../types/trade';
import Profiles from '../db/models/Profiles';
import { v4 as uuidv4 } from 'uuid';

export class TradeManager {
  private static activeTrades: Map<string, TradeOffer> = new Map();

  static async createTrade(senderAccountId: string, receiverAccountId: string, senderItems: TradeItem[], receiverItems: TradeItem[]) {
    const tradeId = uuidv4();
    const trade: TradeOffer = {
      senderId: senderAccountId, // Store accountId, not Discord ID
      receiverId: receiverAccountId, // Store accountId, not Discord ID
      senderItems,
      receiverItems,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      tradeId
    };

    this.activeTrades.set(tradeId, trade);
    return trade;
  }

  static getTrade(tradeId: string): TradeOffer | undefined {
    return this.activeTrades.get(tradeId);
  }

  static async acceptTrade(tradeId: string): Promise<boolean> {
    const trade = this.activeTrades.get(tradeId);
    if (!trade || trade.status !== 'pending') return false;

    const [senderHasItems, receiverHasItems] = await Promise.all([
      this.validateUserHasItems(trade.senderId, trade.senderItems), // senderId is accountId
      this.validateUserHasItems(trade.receiverId, trade.receiverItems) // receiverId is accountId
    ]);

    if (!senderHasItems || !receiverHasItems) {
      trade.status = 'cancelled';
      return false;
    }

    await this.executeTrade(trade);
    trade.status = 'accepted';
    return true;
  }

  static rejectTrade(tradeId: string): boolean {
    const trade = this.activeTrades.get(tradeId);
    if (!trade || trade.status !== 'pending') return false;
    
    trade.status = 'rejected';
    return true;
  }

  static cancelTrade(tradeId: string): boolean {
    const trade = this.activeTrades.get(tradeId);
    if (!trade) return false;
    
    trade.status = 'cancelled';
    return true;
  }

  private static async validateUserHasItems(accountId: string, items: TradeItem[]): Promise<boolean> {
    // FIXED: Now expects accountId, not Discord ID
    const profile = await Profiles.findOne({ accountId });
    if (!profile) return false;

    const athenaProfile = profile.profiles?.athena || profile.athena;
    if (!athenaProfile?.items) return false;

    for (const item of items) {
      if (item.templateId === 'Currency:MtxPurchased') {
        if ((athenaProfile.stats?.attributes?.mtx_currency ?? 0) < item.quantity) {
          return false;
        }
      } else {
        if (!athenaProfile.items[item.templateId]) {
          return false;
        }
      }
    }
    return true;
  }

  private static async executeTrade(trade: TradeOffer): Promise<void> {
    // FIXED: Now expects accountId, not Discord ID
    const [senderProfile, receiverProfile] = await Promise.all([
      Profiles.findOne({ accountId: trade.senderId }),
      Profiles.findOne({ accountId: trade.receiverId })
    ]);

    if (!senderProfile || !receiverProfile) return;

    await this.transferItems(trade.senderId, trade.receiverId, trade.senderItems);
    await this.transferItems(trade.receiverId, trade.senderId, trade.receiverItems);

    await Promise.all([senderProfile.save(), receiverProfile.save()]);
  }

  private static async transferItems(fromAccountId: string, toAccountId: string, items: TradeItem[]): Promise<void> {
    // FIXED: Now expects accountId, not Discord ID
    const [fromProfile, toProfile] = await Promise.all([
      Profiles.findOne({ accountId: fromAccountId }),
      Profiles.findOne({ accountId: toAccountId })
    ]);

    if (!fromProfile || !toProfile) return;

    const fromAthena = fromProfile.profiles?.athena || fromProfile.athena;
    const toAthena = toProfile.profiles?.athena || toProfile.athena;

    for (const item of items) {
      if (item.templateId === 'Currency:MtxPurchased') {
        const vbucksAmount = item.quantity;
        fromAthena.stats.attributes.mtx_currency = Math.max(0, (fromAthena.stats.attributes.mtx_currency || 0) - vbucksAmount);
        toAthena.stats.attributes.mtx_currency = (toAthena.stats.attributes.mtx_currency || 0) + vbucksAmount;
      } else {
        const itemData = fromAthena.items[item.templateId];
        if (itemData) {
          delete fromAthena.items[item.templateId];
          toAthena.items[item.templateId] = itemData;
        }
      }
    }
  }

  static getUserTrades(accountId: string): TradeOffer[] {
    return Array.from(this.activeTrades.values()).filter(
      trade => trade.senderId === accountId || trade.receiverId === accountId
    );
  }

  static cleanupExpiredTrades(): void {
    const now = new Date();
    for (const [tradeId, trade] of this.activeTrades.entries()) {
      if (trade.expiresAt < now) {
        this.activeTrades.delete(tradeId);
      }
    }
  }

  // NEW: Helper method to convert Discord ID to accountId
  static async getAccountIdFromDiscordId(discordId: string): Promise<string | null> {
    const profile = await Profiles.findOne({ 
      $or: [
        { discordId: discordId },
        { userId: discordId },
        { discordID: discordId },
        { id: discordId }
      ]
    });
    return profile?.accountId || null;
  }
}