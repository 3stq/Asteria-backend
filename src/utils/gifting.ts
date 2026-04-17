import { GiftData, GiftResult } from '../types/gift';
import Gift from '../db/models/Gift';
import User from '../db/models/User';
import Profiles from '../db/models/Profiles';

export async function enqueueGift(giftData: GiftData): Promise<GiftResult> {
  const giftId = generateGiftId();
  
  try {
    // Create gift record in database
    const gift = new Gift({
      giftId,
      recipientAccountId: giftData.recipientAccountId,
      sender: giftData.sender,
      message: giftData.message,
      items: giftData.items,
      giftType: giftData.giftType,
      wrapId: giftData.wrapId,
      status: 'pending',
      metadata: giftData.metadata
    });

    await gift.save();
    console.log(`[Gifting] Gift queued: ${giftId} for ${giftData.recipientAccountId}`);

    // Process gift immediately
    const result = await processGift(giftId);
    
    return {
      success: result.success,
      giftId: giftId,
      details: result.details
    };
  } catch (error) {
    console.error(`[Gifting] Failed to queue gift:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to queue gift',
      giftId: giftId
    };
  }
}

async function processGift(giftId: string): Promise<GiftResult> {
  try {
    const gift = await Gift.findOne({ giftId });
    if (!gift) {
      throw new Error(`Gift ${giftId} not found`);
    }

    // Update gift status to delivered
    gift.status = 'delivered';
    gift.deliveredAt = new Date();
    await gift.save();

    console.log(`[Gifting] Gift ${giftId} marked as delivered`);

    return {
      success: true,
      giftId: giftId,
      details: {
        items: gift.items,
        deliveredAt: gift.deliveredAt
      }
    };
  } catch (error) {
    console.error(`[Gifting] Failed to process gift ${giftId}:`, error);
    
    // Update gift status to failed
    await Gift.updateOne(
      { giftId },
      { 
        status: 'failed',
        $set: { 
          'metadata.lastError': error instanceof Error ? error.message : 'Unknown error',
          'metadata.lastAttempt': new Date()
        }
      }
    );

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process gift',
      giftId: giftId
    };
  }
}

// Backward compatibility wrapper
export async function enqueueGiftOnce(
  accountId: string, 
  sender: string, 
  message: string, 
  items: string[]
): Promise<string> {
  const giftData: GiftData = {
    recipientAccountId: accountId,
    sender: sender,
    message: message,
    items: items,
    giftType: items.length > 1 ? "cosmetic_bundle" : "single_item",
    wrapId: "GiftWrap:Wrap_GiftPaper",
    metadata: {
      commandUsed: "legacy_enqueueGiftOnce",
      timestamp: Date.now()
    }
  };

  const result = await enqueueGift(giftData);
  return result.giftId || `legacy_${Date.now()}`;
}

function generateGiftId(): string {
  return `gift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Mark a gift as consumed/claimed by a user
 */
export async function markGiftConsumed(giftId: string, accountId: string): Promise<boolean> {
  try {
    const gift = await Gift.findOne({ giftId });
    if (!gift) {
      console.warn(`[Gifting] Gift ${giftId} not found for consumption`);
      return false;
    }

    if (gift.status === 'claimed') {
      console.warn(`[Gifting] Gift ${giftId} already claimed`);
      return true;
    }

    gift.status = 'claimed';
    gift.claimedAt = new Date();
    await gift.save();

    console.log(`[Gifting] Gift ${giftId} marked as claimed by ${accountId}`);
    return true;
  } catch (error) {
    console.error(`[Gifting] Failed to mark gift ${giftId} as consumed:`, error);
    return false;
  }
}

/**
 * Check if a gift has been consumed
 */
export async function isGiftConsumed(giftId: string): Promise<boolean> {
  try {
    const gift = await Gift.findOne({ giftId });
    return gift?.status === 'claimed';
  } catch (error) {
    console.error(`[Gifting] Failed to check if gift ${giftId} is consumed:`, error);
    return false;
  }
}

/**
 * Get gift details by ID
 */
export async function getGiftDetails(giftId: string): Promise<any> {
  try {
    const gift = await Gift.findOne({ giftId });
    if (!gift) return null;

    return {
      giftId: gift.giftId,
      recipientAccountId: gift.recipientAccountId,
      sender: gift.sender,
      message: gift.message,
      items: gift.items,
      giftType: gift.giftType,
      wrapId: gift.wrapId,
      status: gift.status,
      createdAt: gift.createdAt,
      deliveredAt: gift.deliveredAt,
      claimedAt: gift.claimedAt
    };
  } catch (error) {
    console.error(`[Gifting] Failed to get details for gift ${giftId}:`, error);
    return null;
  }
}

/**
 * Get all pending gifts for a user
 */
export async function getUserGifts(accountId: string): Promise<any[]> {
  try {
    const gifts = await Gift.find({ 
      recipientAccountId: accountId,
      status: { $in: ['delivered', 'pending'] }
    }).sort({ createdAt: -1 });

    return gifts.map(gift => ({
      giftId: gift.giftId,
      sender: gift.sender,
      message: gift.message,
      items: gift.items,
      giftType: gift.giftType,
      wrapId: gift.wrapId,
      status: gift.status,
      createdAt: gift.createdAt
    }));
  } catch (error) {
    console.error(`[Gifting] Failed to get gifts for user ${accountId}:`, error);
    return [];
  }
}

/**
 * Get user's gift history
 */
export async function getUserGiftHistory(accountId: string): Promise<any[]> {
  try {
    const gifts = await Gift.find({ 
      recipientAccountId: accountId 
    }).sort({ createdAt: -1 }).limit(50);

    return gifts.map(gift => ({
      giftId: gift.giftId,
      sender: gift.sender,
      itemsCount: gift.items.length,
      status: gift.status,
      createdAt: gift.createdAt,
      claimedAt: gift.claimedAt
    }));
  } catch (error) {
    console.error(`[Gifting] Failed to get gift history for user ${accountId}:`, error);
    return [];
  }
}