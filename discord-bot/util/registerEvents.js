import { Events } from 'discord.js';

/**
 * @param {Map<string, import('../commands/index.js').Command>} commands
 * @param {import('../events/index.js').Event[]} events
 * @param {import('../index.js').default} bot - Discord bot
 */
export function registerEvents(commands, events, bot) {
  // Create an event to handle command interactions
  /** @type {import('../events/index.js').Event<Events.InteractionCreate>} */
  const interactionCreateEvent = {
    name: Events.InteractionCreate,
    async execute(interaction) {
      try {
        if (interaction.isChatInputCommand()) {
          const command = commands.get(interaction.commandName);
          if (!command) {
            throw new Error(`Command '${interaction.commandName}' not found.`);
          }
          await command.execute(interaction, bot);
        } else if (interaction.isAutocomplete()) {
          const command = commands.get(interaction.commandName);
          if (!command) {
            throw new Error(`Command '${interaction.commandName}' not found.`);
          }
          await command.autocomplete(interaction, bot);
        }
      } catch (ex) {
        console.error(ex);
        // if (interaction.isCommand()) {}
        if (interaction.isChatInputCommand()) {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
              content: 'There was an error while executing this command!',
              ephemeral: true
            });
          } else {
            await interaction.reply({
              content: 'There was an error while executing this command!',
              ephemeral: true
            });
          }
        } else if (interaction.isAutocomplete()) {
          await interaction.respond([
            { name: 'There was an error while executing this command!', value: '' }
          ]);
        }
      }
    }
  };

  for (const event of [...events, interactionCreateEvent]) {
    bot.client[event.once ? 'once' : 'on'](event.name, async (...args) => event.execute(...args));
  }
}
