import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

/**
 * setTimeout w/ Promise
 * @param {Number} timeout - Delay in milliseconds
 * @returns {Promise} Promise object
 */
const delay = (timeout = 5000) => {
  return new Promise((resolve) => setTimeout(resolve, timeout));
};

/** @type {import('./index.js').Command} */
export default {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Exit node process')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),
  global: false,
  /**
   * @param {import('discord.js').CommandInteraction} interaction
   * @param {import('../index.js').default} bot - Discord bot
   */
  async execute(interaction, bot) {
    const server = bot.server;
    if (server !== null) {
      await server.unwatch();
    }
    await interaction.reply({
      content: `Shutting down discord bot${server !== null ? ' + SquadJS' : ''}...`,
      ephemeral: true
    });
    await delay(2000);
    await interaction.deleteReply();
    process.exit(0);
  }
};
