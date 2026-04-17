import { SlashCommandBuilder } from "discord.js";
import { TradeManager } from '../../utils/tradeManager';
import { TradeValidation } from '../../utils/tradeValidation';
import Profiles from '../../db/models/Profiles';

export default {
  data: new SlashCommandBuilder()
    .setName("trade")
    .setDescription("Trade items with friends")
    .addSubcommand(subcommand =>
      subcommand
        .setName("request")
        .setDescription("Request to trade with a friend")
        .addUserOption(option =>
          option.setName("friend")
            .setDescription("Select a friend to trade with")
            .setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("accept")
        .setDescription("Accept a trade request")
        .addStringOption(option =>
          option.setName("trade_id")
            .setDescription("Trade ID to accept")
            .setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("deny")
        .setDescription("Deny a trade request")
        .addStringOption(option =>
          option.setName("trade_id")
            .setDescription("Trade ID to deny")
            .setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("view")
        .setDescription("View your locker with all cosmetics")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("list")
        .setDescription("List your active trade requests")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("cancel")
        .setDescription("Cancel your trade request")
        .addStringOption(option =>
          option.setName("trade_id")
            .setDescription("Trade ID to cancel")
            .setRequired(true))
    ),
  
  async execute(interaction: any) {
    const subCommand = interaction.options.getSubcommand();
    
    try {
      console.log(`[TRADE] User ${interaction.user.id} (${interaction.user.username}) executed: ${subCommand}`);
      
      switch (subCommand) {
        case 'request':
          return await handleTradeRequest(interaction);
        case 'accept':
          return await handleTradeAccept(interaction);
        case 'deny':
          return await handleTradeDeny(interaction);
        case 'view':
          return await handleViewLocker(interaction);
        case 'list':
          return await handleListTrades(interaction);
        case 'cancel':
          return await handleCancelTrade(interaction);
        default:
          return interaction.reply('❌ Unknown subcommand');
      }
    } catch (error) {
      console.error('Trade command error:', error);
      return interaction.reply('❌ An error occurred during the trade operation.');
    }
  }
};

async function handleTradeRequest(interaction: any) {
  const friendUser = interaction.options.getUser("friend");
  
  if (friendUser.bot) {
    return interaction.reply("❌ You can't trade with bots!");
  }
  
  if (friendUser.id === interaction.user.id) {
    return interaction.reply("❌ You can't trade with yourself!");
  }

  try {
    // Find both profiles using Discord ID
    const [senderProfile, receiverProfile] = await Promise.all([
      findProfileByDiscordId(interaction.user.id),
      findProfileByDiscordId(friendUser.id)
    ]);

    if (!senderProfile) {
      return interaction.reply("❌ Your profile not found. Please register first using `/register`!");
    }

    if (!receiverProfile) {
      return interaction.reply("❌ Your friend's profile not found. They need to register first using `/register`!");
    }

    // Use accountId for TradeManager
    const trade = await TradeManager.createTrade(
      senderProfile.accountId,
      receiverProfile.accountId,
      [],
      []
    );

    return interaction.reply(
      `✅ Trade request sent to ${friendUser.username}!\n` +
      `🆔 Trade ID: ${trade.tradeId}\n` +
      `Your friend can use: \`/trade accept ${trade.tradeId}\` or \`/trade deny ${trade.tradeId}\``
    );

  } catch (error) {
    console.error('Trade request error:', error);
    return interaction.reply('❌ Failed to create trade request. Please try again.');
  }
}

async function handleTradeAccept(interaction: any) {
  const tradeId = interaction.options.getString('trade_id');

  try {
    // Find user profile using Discord ID
    const userProfile = await findProfileByDiscordId(interaction.user.id);
    if (!userProfile) {
      return interaction.reply('❌ Your profile not found. Please register first!');
    }

    const trade = TradeManager.getTrade(tradeId);
    
    if (!trade) {
      return interaction.reply('❌ Trade not found or expired.');
    }

    if (trade.receiverId !== userProfile.accountId) {
      return interaction.reply('❌ This trade request is not for you.');
    }

    if (trade.status !== 'pending') {
      return interaction.reply(`❌ This trade has already been ${trade.status}.`);
    }

    const success = await TradeManager.acceptTrade(tradeId);
    if (!success) {
      return interaction.reply('❌ Failed to accept trade. Items may no longer be available.');
    }
    
    return interaction.reply(
      `✅ Trade accepted!\n` +
      `🆔 Trade ID: ${trade.tradeId}\n` +
      `Trade completed successfully!`
    );

  } catch (error) {
    console.error('Trade accept error:', error);
    return interaction.reply('❌ Failed to accept trade. Please try again.');
  }
}

async function handleTradeDeny(interaction: any) {
  const tradeId = interaction.options.getString('trade_id');

  try {
    const success = TradeManager.rejectTrade(tradeId);

    if (success) {
      return interaction.reply('✅ Trade request denied.');
    } else {
      return interaction.reply('❌ Trade not found or already processed.');
    }
  } catch (error) {
    console.error('Trade deny error:', error);
    return interaction.reply('❌ Failed to deny trade. Please try again.');
  }
}

async function handleCancelTrade(interaction: any) {
  const tradeId = interaction.options.getString('trade_id');

  try {
    // Find user profile using Discord ID
    const userProfile = await findProfileByDiscordId(interaction.user.id);
    if (!userProfile) {
      return interaction.reply('❌ Your profile not found. Please register first!');
    }

    const trade = TradeManager.getTrade(tradeId);
    
    if (!trade) {
      return interaction.reply('❌ Trade not found.');
    }

    if (trade.senderId !== userProfile.accountId) {
      return interaction.reply('❌ You can only cancel your own trade requests.');
    }

    const success = TradeManager.cancelTrade(tradeId);
    if (success) {
      return interaction.reply('✅ Trade request cancelled.');
    } else {
      return interaction.reply('❌ Trade not found or already processed.');
    }
  } catch (error) {
    console.error('Trade cancel error:', error);
    return interaction.reply('❌ Failed to cancel trade. Please try again.');
  }
}

async function handleViewLocker(interaction: any) {
  try {
    // Find profile by Discord ID
    const profile = await findProfileByDiscordId(interaction.user.id);
    
    if (!profile) {
      return interaction.reply('❌ Profile not found. Please register first using `/register` command.');
    }

    // Flexible profile structure handling
    const athenaProfile = profile.profiles?.athena || profile.athena || profile;
    
    if (!athenaProfile) {
      return interaction.reply('❌ Athena profile not found. Please log in to the game first.');
    }

    const items = athenaProfile.items || {};
    const vbucks = athenaProfile.stats?.attributes?.mtx_currency || 
                   athenaProfile.currency?.mtx || 
                   athenaProfile.vbucks || 
                   0;
    
    const itemCount = Object.keys(items).length;

    // Show a sample of items
    const itemList = Object.keys(items).slice(0, 10).map(itemId => 
      `• ${itemId.replace('Athena', '').replace('Pickaxe', '🪓').replace('Character', '👤').replace('Backpack', '🎒').replace('Glider', '🪂').replace('Dance', '💃')}`
    ).join('\n');

    const moreItems = itemCount > 10 ? `\n... and ${itemCount - 10} more items` : '';

    return interaction.reply(
      `🎒 **Your Locker**\n` +
      `💰 **V-Bucks:** ${vbucks}\n` +
      `🎁 **Total Items:** ${itemCount}\n\n` +
      `**Sample Items:**\n${itemList}${moreItems}\n\n` +
      `Use \`/trade request @friend\` to start a trade!`
    );
  } catch (error) {
    console.error('Error viewing locker:', error);
    return interaction.reply('❌ An error occurred while viewing your locker.');
  }
}

async function handleListTrades(interaction: any) {
  try {
    // Find user profile using Discord ID
    const userProfile = await findProfileByDiscordId(interaction.user.id);
    if (!userProfile) {
      return interaction.reply('❌ Your profile not found. Please register first!');
    }

    const trades = TradeManager.getUserTrades(userProfile.accountId);
    
    if (trades.length === 0) {
      return interaction.reply('📭 No active trade requests found.');
    }

    const tradeList = trades.map(trade => {
      const isSender = trade.senderId === userProfile.accountId;
      const status = trade.status.toUpperCase();
      const role = isSender ? '👤 Sender' : '👥 Receiver';
      
      return `🆔 ${trade.tradeId} | ${role} | 📊 ${status}`;
    }).join('\n');

    return interaction.reply(`📋 **Your Active Trades:**\n${tradeList}`);
  } catch (error) {
    console.error('Trade list error:', error);
    return interaction.reply('❌ Failed to retrieve trade list.');
  }
}

// Helper function to find profile by Discord ID
async function findProfileByDiscordId(discordId: string) {
  return await Profiles.findOne({ 
    $or: [
      { discordId: discordId },
      { userId: discordId },
      { discordID: discordId },
      { id: discordId }
    ]
  });
}