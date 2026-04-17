import { TradeItem } from '../types/trade';
import Profiles from '../db/models/Profiles';

export class TradeValidation {
  static async validateTradeItems(accountId: string, items: TradeItem[]): Promise<{ valid: boolean; message?: string }> {
    // CORRECTED: Now expects accountId, not Discord ID
    const profile = await Profiles.findOne({ accountId });
    if (!profile) return { valid: false, message: 'Profile not found' };

    const athenaProfile = profile.profiles?.athena || profile.athena;
    if (!athenaProfile) return { valid: false, message: 'Athena profile not found' };

    for (const item of items) {
      if (item.templateId === 'Currency:MtxPurchased') {
        const currentVbucks = athenaProfile.stats?.attributes?.mtx_currency || 0;
        if (currentVbucks < item.quantity) {
          return { valid: false, message: 'Not enough V-Bucks' };
        }
      } else {
        if (!athenaProfile.items[item.templateId]) {
          return { valid: false, message: `Item not owned: ${item.templateId}` };
        }
      }
    }

    return { valid: true };
  }

  static validateItemIsTradable(templateId: string): boolean {
    const nonTradablePrefixes = [
      'AthenaBattlePass',
      'AthenaSeason',
      'Promo',
      'Founder'
    ];
    return !nonTradablePrefixes.some(prefix => templateId.includes(prefix));
  }

  // NEW: Helper method to use when you only have Discord ID
  static async validateTradeItemsWithDiscordId(discordId: string, items: TradeItem[]): Promise<{ valid: boolean; message?: string }> {
    // First find the profile to get accountId
    const profile = await Profiles.findOne({ 
      $or: [
        { discordId: discordId },
        { userId: discordId },
        { discordID: discordId },
        { id: discordId }
      ]
    });
    
    if (!profile) return { valid: false, message: 'Profile not found' };
    
    // Then validate using accountId
    return this.validateTradeItems(profile.accountId, items);
  }
}