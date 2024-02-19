import ToolkitBase from './Toolkit-base.js';

const chatColors = {
  ChatAll: [0, 201, 255],
  ChatAdmin: [13, 228, 228],
  ChatSquad: [63, 255, 0],
  ChatTeam: [28, 172, 222]
};

export default class ToolkitAdminRequest extends ToolkitBase {
  static get description() {
    return (
      'The <code>ToolkitAdminRequest</code> plugin will ping admins in a Discord channel when a player requests ' +
      'an admin via the <code>!admin</code> command in in-game chat.'
    );
  }

  static get defaultEnabled() {
    return true;
  }

  static get optionsSpecification() {
    return {
      ...ToolkitBase.optionsSpecification,
      bmClient: {
        required: true,
        description: 'BattleMetrics connector name.',
        connector: 'BattleMetrics',
        default: 'BattleMetrics'
      },
      ignoreChats: {
        required: false,
        description: 'A list of chat names to ignore.',
        default: [],
        example: ['ChatSquad']
      },
      ignorePhrases: {
        required: false,
        description: 'A list of phrases to ignore.',
        default: [],
        example: ['switch']
      },
      commands: {
        required: true,
        description: 'The command(s) that calls an admin.',
        default: [
          'admin',
          'admins',
          'help'
        ],
        example: [
          'admin'
        ]
      },
      ping: {
        required: false,
        description: 'Cooldown for pings in milliseconds, list of Discord role IDs to ping.',
        default: {
          delay: 60 * 1000,
          groups: []
        },
        example: {
          delay: 60 * 1000,
          groups: ['500455137626554379']
        }
      },
      warnInGameAdmins: {
        required: false,
        description:
          'Should in-game admins be warned after a players uses the command and should we tell how much admins are active in-game right now.',
        default: false
      },
      showInGameAdmins: {
        required: false,
        description: 'Should players know how much in-game admins there are active/online?',
        default: true
      }
    };
  }

  constructor(server, options, connectors) {
    super(server, options, connectors);
    this.bmClient = this.options.bmClient;
    this.lastPing = Date.now() - this.options.ping.delay;
    this.onChatCommand = this.onChatCommand.bind(this);
  }

  async mount() {
    // admins
    for (const c of this.options.commands) {
      const chatCommand = c.toLocaleLowerCase();
      this.addListener(`CHAT_COMMAND:${chatCommand}`, this.onChatCommand);
    }
  }

  async onChatCommand(info) {
    try {
      const steamID = this.isValid(info, 'steamID');
      if (!steamID) {
        this.err('Invalid SteamID', info);
        return;
      }

      if (this.options.ignoreChats.includes(info.chat)) return;

      for (const ignorePhrase of this.options.ignorePhrases) {
        if (info.message.includes(ignorePhrase)) return;
      }

      if (info.message.length === 0) {
        await this.warn(
          steamID,
          'Please specify what you would like help with when requesting an admin.'
        );
        return;
      }

      let amountAdmins = 0;

      const adminchat = this.server.getAdminsWithPermission('canseeadminchat');
      const admins = this.server.players.filter((player) => {
        if (this.isEmpty(player.steamID)) {
          return false;
        }
        return adminchat.includes(player.steamID);
      });
      for (const a of admins) {
        amountAdmins += 1;
        if (this.options.warnInGameAdmins) {
          await this.warn(a.steamID, `[${this.validName(info.player)}] - ${info.message}`);
        }
      }
      const isAdmin = admins.filter((a) => {
        const aSteamID = this.isValid(info, 'steamID');
        if (Object.is(a.steamID, aSteamID)) {
          return true;
        }
        return false;
      });
      if (!this.isBlank(isAdmin)) {
        return;
      }

      const discordMsg = {};
      const BattleMetricsBtn = this.createBtn(steamID);
      Object.assign(discordMsg, this.formatRow([BattleMetricsBtn]));
      const embed = this.buildEmbed(null, info.time)
        .setDescription('**Player requested Admin support**')
        .addFields(
          {
            name: 'Message',
            value: `(${info.chat}) ${info.message}`,
            inline: false
          },
          {
            name: 'Player',
            value: `${this.validSteamID(info)}`,
            inline: false
          },
          {
            name: 'Squad Data',
            value: `${this.validSquad(info)}`,
            inline: true
          },
          {
            name: 'Team Data',
            value: `${this.validTeam(info)}`,
            inline: true
          },
          {
            name: 'Admins Online',
            value: `${amountAdmins}`,
            inline: false
          }
        )
        .setColor(chatColors[info.chat]);
      Object.assign(discordMsg, {
        embeds: [embed]
      });

      if (
        this.options.ping.groups.length > 0 &&
        Date.now() - this.options.ping.delay > this.lastPing
      ) {
        discordMsg.content = this.options.ping.groups.map((groupID) => this.format.roleMention(groupID)).join(' ');
        this.lastPing = Date.now();
      }

      await this.sendDiscordMessage(discordMsg, 'admin-alerts');

      if (this.options.showInGameAdmins) {
        const msg =
          amountAdmins === 0
            ? 'There are no in-game admins, however, an admin has been notified via Discord. Please wait for us to get back to you.'
            : `There ${amountAdmins > 1 ? 'are' : 'is'} ${amountAdmins} in-game admin${
                amountAdmins > 1 ? 's' : ''
              }. Please wait for us to get back to you.`;
        await this.warn(steamID, msg);
        return;
      }
      await this.warn(
        steamID,
        'An admin has been notified. Please wait for us to get back to you.'
      );
    } catch (ex) {
      this.err(ex.message);
      this.err(ex.stack);
    }
  }
}
