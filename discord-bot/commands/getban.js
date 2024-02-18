import { ChannelType, SlashCommandBuilder, PermissionFlagsBits, ThreadAutoArchiveDuration } from 'discord.js';

/**
 * Object is Null
 * @param {*} obj - Object
 * @returns {boolean} Returns if statement true or false
 */
const isNull = (obj) => {
  return Object.is(obj, null) || Object.is(obj, undefined);
};
/**
 * Object is Blank
 * @param {*} obj - String, Array, Set, Map, or Object
 * @returns {boolean} Returns if statement true or false
 */
const isBlank = (obj) => {
  const tpObj = Boolean(obj) && typeof obj === 'object' && typeof obj?.entries !== 'function';
  return (
    (typeof obj === 'string' && Object.is(obj.trim(), '')) ||
    ((obj instanceof Set || obj instanceof Map) && Object.is(obj.size, 0)) ||
    (Array.isArray(obj) && Object.is(obj.length, 0)) ||
    (tpObj && Object.is(Object.keys(obj).length, 0))
  );
};
/**
 * Object is Empty
 * @param {*} obj - String, Array, Set, Map, or Object
 * @returns {boolean} Returns if statement true or false
 */
const isEmpty = (obj) => {
  return isNull(obj) || isBlank(obj);
};

/** @type {import('./index.js').Command} */
export default {
  data: new SlashCommandBuilder()
    .setName('getban')
    .setDescription('Get a players BattleMetrics ban')
    .addStringOption((option) =>
      option
        .setName('steamid')
        .setDescription('Steam64ID')
        .setAutocomplete(false)
        .setMaxLength(17)
        .setMinLength(17)
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option.setName('hidden').setDescription('Hide the message from other users')
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
    const embeds = [];
    const hidden = interaction.options.getBoolean('hidden');
    const steamIDStr = interaction.options.getString('steamid');
    const playerInfo = await server.BM.quickMatch(steamIDStr);
    const { names, player, steamID } = playerInfo.identifiers;
    const playerBans = await server.BM.lookupBans(player);
    const meta = playerBans.meta;
    const createThread = {
      notes: [],
      reason: []
    };
    for (const ban of playerBans.bans) {
      const embed = server.DiscordBot.buildEmbed([255, 0, 0], new Date(), 'Hermes', {
        iconURL: 'https://i.imgur.com/lLfSaG2.png',
        thumb: 'https://i.imgur.com/WNQL1ID.png'
      });
      const info = ban.info;
      const reason = info.reason ?? 'No Reason Given';
      const notes = info.note ?? 'No Notes Added';
      const unixTimestamp = Math.floor(new Date(info.timestamp).getTime() / 1000);
      const discordTimestamp = `<t:${unixTimestamp}:f>`;
      if (notes.length > 4096) {
        createThread.notes.push(notes);
      }
      if (reason.length > 4096) {
        createThread.reason.push(reason);
      }

      embed.addFields(
        {
          name: 'Player Info',
          value: `Names: ${names.join(', ')}\nSteam64ID: ${steamID}`,
          inline: false
        },
        {
          name: 'Ban Reason',
          value: reason.length > 4096 ? 'REASON ADDED TO THREAD' : reason,
          inline: false
        },
        {
          name: 'Ban Notes',
          value: notes.length > 4096 ? 'NOTES ADDED TO THREAD' : notes,
          inline: false
        },
        {
          name: 'Ban Timestamp',
          value: discordTimestamp,
          inline: false
        }
      );
      embeds.push(embed);
    }
    const reply = await interaction.reply({
      content: isNull(meta)
        ? 'Total number of Bans not found'
        : `Active Bans: ${meta.active}\nExpired Bans: ${meta.expired}\nTotal Bans: ${meta.total}`,
      embeds,
      ephemeral: hidden
    });
    const msg = await reply.fetch();
    for (const [k, v] of Object.entries(createThread)) {
      if (v.length === 0) continue;
      let threadReason = 'Thread creation not provided';
      if (k === 'notes') {
        threadReason = 'Ban Notes';
      } else if (k === 'reason') {
        threadReason = 'Ban Reason';
      }

      const msgThread = await msg.startThread({
        name: threadReason,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
        type: ChannelType.PublicThread,
        reason: steamID
      });

      for (const i of v) {
        await msgThread.send({
          content: i
        });
      }
    }
  }
};
