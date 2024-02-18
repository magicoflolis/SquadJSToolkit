const delay = (ms = 5000) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
/** @type {import('./index.js').Command} */
export default {
  data: {
		name: 'ping',
		description: 'Replies with Pong!',
	},
	global: true,
  /**
   * @param {import('discord.js').CommandInteraction} interaction
   * @param {import('../index.js').default} bot - Discord bot
   */
  async execute(interaction, bot) {
    const server = bot.server;
    await interaction.reply({
      content: server === null ? 'Bot: Pong!\nSquad: Not connected' : 'Bot: Pong!\nSquad: Pong!',
      ephemeral: true
    });
    await delay();
    await interaction.deleteReply();
  }
};
