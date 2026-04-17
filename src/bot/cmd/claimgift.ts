import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";
import Gift from "../../db/models/Gift";
import { addCosmetic, generateAutoVariants } from "../../utils/handling/addCosmetic";

export default {
  data: new SlashCommandBuilder()
    .setName("claimgift")
    .setDescription("🎁 Claim your gifted items and add them to your locker"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: 64 });

    try {
      // Find unclaimed gifts for this user's Discord ID
      const unclaimedGifts = await Gift.find({
        recipientId: interaction.user.id,
        claimed: false
      });

      if (unclaimedGifts.length === 0) {
        const noGiftsEmbed = new EmbedBuilder()
          .setTitle("🎁 No Gifts to Claim")
          .setDescription("You don't have any unclaimed gifts right now.")
          .setColor(0xff9500)
          .addFields(
            { 
              name: "ℹ️ What to Do", 
              value: "If you just received a gift:\n1. Wait a few seconds\n2. Use this command again\n3. Contact admin if still missing", 
              inline: false 
            },
            { 
              name: "❓ Already Received DM?", 
              value: "The gift system might be updating. Try again in 10 seconds.", 
              inline: false 
            }
          )
          .setFooter({ text: "Gifts are stored for 30 days - claim them soon!" });
        return interaction.editReply({ embeds: [noGiftsEmbed] });
      }

      // Claim all gifts
      let totalItemsClaimed = 0;
      const claimedGifts = [];
      const claimedItemsList = [];

      for (const gift of unclaimedGifts) {
        let itemsClaimed = 0;
        const giftItems = [];
        
        // Add each item from this gift
        for (const itemId of gift.items) {
          try {
            await addCosmetic(
              interaction.user.id,
              itemId.split(':')[0],
              itemId,
              {
                variants: generateAutoVariants(itemId),
                isGift: true,
                giftFrom: gift.sender,
                giftMessage: gift.message
              }
            );
            itemsClaimed++;
            totalItemsClaimed++;
            giftItems.push(itemId);
          } catch (error) {
            console.error(`Failed to add item ${itemId} from gift:`, error);
          }
        }

        if (itemsClaimed > 0) {
          // Mark gift as claimed
          gift.claimed = true;
          gift.claimedAt = new Date();
          await gift.save();
          claimedGifts.push(gift);
          
          // Add to claimed items list for display
          claimedItemsList.push({
            from: gift.sender,
            items: giftItems,
            message: gift.message
          });
        }
      }

      if (totalItemsClaimed === 0) {
        const errorEmbed = new EmbedBuilder()
          .setTitle("❌ Failed to Claim Gifts")
          .setDescription("An error occurred while adding items to your locker. Please contact support.")
          .setColor(0xff4757);
        return interaction.editReply({ embeds: [errorEmbed] });
      }

      // Build success message with gift details
      const successEmbed = new EmbedBuilder()
        .setTitle("🎉 Gifts Claimed Successfully!")
        .setDescription(`**${totalItemsClaimed} items** from **${claimedGifts.length} gifts** have been added to your locker!`)
        .setColor(0x00ff00)
        .addFields(
          { name: "📦 Total Items", value: `${totalItemsClaimed} cosmetics`, inline: true },
          { name: "🎁 Gifts Claimed", value: `${claimedGifts.length} packages`, inline: true },
          { name: "🎨 Styles", value: "All styles unlocked!", inline: true }
        );

      // Add details about each gift claimed
      claimedItemsList.forEach((gift, index) => {
        const giftNumber = index + 1;
        const itemCount = gift.items.length;
        
        successEmbed.addFields({
          name: `🎁 Gift ${giftNumber} from ${gift.from}`,
          value: `${itemCount} items${gift.message ? ` - "${gift.message}"` : ''}`,
          inline: false
        });

        // Show first few items from each gift (not too many to avoid embed limits)
        if (gift.items.length > 0 && gift.items.length <= 5) {
          successEmbed.addFields({
            name: `📦 Items from ${gift.from}`,
            value: gift.items.map(item => `• ${item}`).join('\n'),
            inline: false
          });
        } else if (gift.items.length > 5) {
          successEmbed.addFields({
            name: `📦 Items from ${gift.from}`,
            value: `${gift.items.length} items including: ${gift.items.slice(0, 3).join(', ')}...`,
            inline: false
          });
        }
      });

      // Add instructions
      successEmbed.addFields(
        { 
          name: "🚀 Next Steps", 
          value: "**Restart Fortnite completely** to see your new items in the locker!", 
          inline: false 
        },
        { 
          name: "💡 Important", 
          value: "Close Fortnite entirely and reopen it - don't just return to lobby.", 
          inline: false 
        }
      )
      .setFooter({ text: "Lyric Gift System • Enjoy your new items!" })
      .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
      console.error("[claimgift] Error:", error);
      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Error Claiming Gifts")
        .setDescription("An error occurred while claiming your gifts. Please try again later.")
        .setColor(0xff4757);
      return interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};