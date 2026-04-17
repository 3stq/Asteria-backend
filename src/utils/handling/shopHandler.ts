import { ButtonInteraction, StringSelectMenuInteraction } from "discord.js";
import { handleShopPurchase } from "../commands/shop";

export async function handleShopInteraction(interaction: ButtonInteraction | StringSelectMenuInteraction) {
  if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

  if (interaction.isStringSelectMenu() && interaction.customId === 'shop_category') {
    await interaction.deferUpdate();
    return;
  }

  if (interaction.isButton() && interaction.customId.startsWith('buy_')) {
    const itemId = interaction.customId.replace('buy_', '');
    await handleShopPurchase(interaction, itemId);
  }
}