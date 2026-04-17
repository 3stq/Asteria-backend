import { ChatInputCommandInteraction } from "discord.js";

export interface CommandContext {
    interaction: ChatInputCommandInteraction;
    reply: (msg: string) => Promise<void>;
}
