// src/app/routes/core/gifts.ts
import { Hono } from "hono";
import User from "../../../db/models/User";
import Profiles from "../../../db/models/Profiles";
import { markGiftConsumed, enqueueGiftOnce } from "../../../utils/gifting";
import { addCosmetic } from "../../../utils/handling/addCosmetic";

// Infer addCosmetic type from templateId
function inferType(templateId: string):
  | "athena" | "skin" | "pickaxe" | "emote" | "glider" | "backpack" {
  if (templateId.startsWith("AthenaCharacter:")) return "athena";
  if (templateId.startsWith("AthenaPickaxe:")) return "pickaxe";
  if (templateId.startsWith("AthenaDance:")) return "emote";
  if (templateId.startsWith("AthenaGlider:")) return "glider";
  if (templateId.startsWith("AthenaBackpack:")) return "backpack";
  return "athena";
}

export default function gifts(app: Hono) {
  // Optional: enqueue a gift quickly (useful for testing)
  app.post("/core/gifts/enqueue", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const { accountId, from = "Lyric", message = "Enjoy!", items } = body || {};
    if (!accountId || !Array.isArray(items) || items.length === 0) {
      return c.json({ ok: false, error: "missing accountId or items[]" }, 400);
    }
    await enqueueGiftOnce(accountId, from, message, items);
    return c.json({ ok: true });
  });

  // Read queue
  app.get("/core/gifts/:accountId", async (c) => {
    const { accountId } = c.req.param();
    const doc = await Profiles.findOne({ accountId });
    if (!doc) return c.json({ ok: false, error: "profile not found" }, 404);

    const queue = ((doc.profiles as any).common_core?.giftQueue ?? []) as any[];
    return c.json({ ok: true, queue });
  });

  // Claim a gift (grants items + marks consumed)
  app.post("/core/gifts/claim", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const accountId: string | undefined = body.accountId;
    const giftId: string | undefined = body.giftId;

    if (!accountId || !giftId) {
      return c.json({ ok: false, error: "missing accountId or giftId" }, 400);
    }

    const profiles = await Profiles.findOne({ accountId });
    if (!profiles) return c.json({ ok: false, error: "profile not found" }, 404);

    const commonCore = ((profiles.profiles as any).common_core ??= {});
    const queue: any[] = (commonCore.giftQueue = Array.isArray(commonCore.giftQueue)
      ? commonCore.giftQueue
      : []);
    const gift = queue.find((g) => g.id === giftId && !g.consumed);
    if (!gift) return c.json({ ok: false, error: "gift not found or already consumed" }, 404);

    const user = await User.findOne({ accountId });
    if (!user) return c.json({ ok: false, error: "user not found" }, 404);

    let granted = 0;
    for (const templateId of gift.items as string[]) {
      try {
        const type = inferType(templateId);
        await addCosmetic(user.discordId, type, templateId);
        granted++;
      } catch (e) {
        console.warn("[gifts/claim] failed:", templateId, "→", accountId, e);
      }
    }

    const consumed = await markGiftConsumed(accountId, giftId);
    return c.json({ ok: true, granted, consumed });
  });
}
