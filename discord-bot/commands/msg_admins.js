import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

/**
 * Object is typeof Object
 * @param {any} obj
 * @returns {boolean}
 */
const typeObj = (obj) => {
  // Exclude Arrays
  return typeof obj === 'object' && typeof obj?.entries !== 'function';
};
/**
 * Object is String
 * @param {any} obj
 * @returns {boolean}
 */
const isStr = (obj) => {
  return typeof obj === 'string' || obj instanceof String;
};
/**
 * Object is Null
 * @param {any} obj - Object
 * @returns {boolean} Returns if statement true or false
 */
const isNull = (obj) => {
  return Object.is(obj, null) || Object.is(obj, undefined);
};
/**
 * Object is Blank
 * @param {any} obj - String, Array, Set, Map, or Object
 * @returns {boolean} Returns if statement true or false
 */
const isBlank = (obj) => {
  return (
    (isStr(obj) && Object.is(obj.trim(), '')) ||
    ((obj instanceof Set || obj instanceof Map) && Object.is(obj.size, 0)) ||
    (Array.isArray(obj) && Object.is(obj.length, 0)) ||
    (typeObj(obj) && Object.is(Object.keys(obj).length, 0))
  );
};
/**
 * Object is Empty
 * @param {any} obj - String, Array, Set, Map, or Object
 * @returns {boolean} Returns if statement true or false
 */
const isEmpty = (obj) => {
  return isNull(obj) || isBlank(obj);
};
const playerList = (players, fn) => {
  const list = players.filter((p) => {
    if (isEmpty(p.steamID)) {
      return false;
    }
    return true;
  });
  if (typeof fn === 'function') {
    return list.filter(fn);
  }
  return list;
}

/** @type {import('./index.js').Command} */
export default {
  data: new SlashCommandBuilder()
    .setName('msg_admins')
    .setDescription('Send message to Admins')
    .addStringOption((option) =>
      option
        .setName('message')
        .setDescription('Message content')
        .setAutocomplete(false)
        .setMaxLength(2000)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('admin')
        .setDescription('Message this admin')
        .setAutocomplete(true)
        .setMaxLength(2000)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setDMPermission(false),
  global: false,
  /**
   * @param {import('discord.js').CommandInteraction} interaction
   * @param {import('../index.js').default} bot - Discord bot
   */
  async execute(interaction, bot) {
    const server = bot.server;
    if (isEmpty(server)) {
      await interaction.reply({ content: 'Squad server not connected', ephemeral: true });
      return;
    }
    const ad = interaction.options.getString('admin');
    const msg = interaction.options.getString('message');
    const adminchat = server.getAdminsWithPermission('canseeadminchat');
    const adminList = playerList(server.players, (item) => adminchat.includes(item.steamID)).filter((item) => {
      if (isEmpty(ad)) {
        return true;
      }
      return item.name.startsWith(ad);
    });
    for (const Id of adminList) {
      await server.rcon.warn(Id.steamID, msg);
    }
    await interaction.reply({
      content: `Sent to ${adminList.length} Admins: \`\`\`\n@${interaction.user.username} - ${msg}\n\`\`\``,
      ephemeral: true
    });
  },
  /**
   * @param {import('discord.js').AutocompleteInteraction} interaction
   * @param {import('../index.js').default} bot - Discord bot
   */
  async autocomplete(interaction, bot) {
    const server = bot.server;
    if (isNull(server)) {
      await interaction.respond([{ name: 'Squad server not connected', value: '' }]);
      return;
    }
    const resp = [];
    const focusedOption = interaction.options.getFocused(true);
    const adminchat = server.getAdminsWithPermission('canseeadminchat');
    const adminList = playerList(server.players, (item) => adminchat.includes(item.steamID)).map((item) => ({ name: item.name, value: item.name }));
    if (isBlank(adminList)) {
      await interaction.respond([{ name: 'Admins not found', value: '' }]);
      return;
    };
    let i = 0;
    if (focusedOption.name === 'admin') {
      for (const p of adminList.filter((choice) => choice.name.startsWith(focusedOption.value))) {
        if (i === 25) {
          break;
        }
        i += 1;
        resp.push(p);
      };
    } else {
      resp.push({ name: `Admins in-game: ${adminList.length}`, value: '' });
    };
    await interaction.respond(resp);
  }
};
