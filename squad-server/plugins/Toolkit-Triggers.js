import ToolkitBase from './Toolkit-base.js';

const chatColors = {
  ChatAll: [0, 201, 255],
  ChatAdmin: [13, 228, 228],
  ChatSquad: [63, 255, 0],
  ChatTeam: [28, 172, 222]
};

export default class ToolkitTriggers extends ToolkitBase {
  static get description() {
    return 'Toolkit Trigger Plugin';
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
      triggers: {
        required: false,
        description: 'A list of in-game triggers.',
        default: {
          admin: {
            commands: [],
            ignore: {
              chats: ['ChatAll'],
              phrases: []
            }
          },
          dev: {
            commands: [],
            ignore: {
              chats: ['ChatAll'],
              phrases: []
            }
          },
          public: {
            commands: ['runningman', 'stuck', 'switch'],
            ignore: {
              chats: [],
              phrases: []
            }
          }
        }
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
    this.adminCMD = this.adminCMD.bind(this);
    this.devCMD = this.devCMD.bind(this);
    this.publicCMD = this.publicCMD.bind(this);

    this.bmClient = this.options.bmClient;

    this.pChanges = this.objMaps.get('pChanges');
    this.teamKills = this.server.teamKills;
    /** @type {Map} */
    this.sorryMap = this.server.sorryMap;
    this.lastPing = Date.now() - this.options.ping.delay;
  }

  async mount() {
    // #region Triggers
    try {
      for (const [key, value] of Object.entries(this.options.triggers)) {
        /** @type {string[]} */
        if (!Array.isArray(value.commands)) continue;
        const addTrigger = (commandStr, fn) => {
          const chatCommand = commandStr.toLowerCase();
          this.server.on(`CHAT_COMMAND:${chatCommand}`, async (info) => {
            try {
              const steamID = this.isValid(info, 'steamID');
              if (!steamID) {
                this.err(`[${key}: !${chatCommand}] Invalid SteamID`, info);
                return;
              }
              if (/admin/.test(key)) {
                if (!this.isAdmin(steamID)) {
                  await this.lackPerms(info, `${chatCommand} ${info.message}`);
                  return;
                }
              } else if (/dev/.test(key)) {
                if (!this.isDev(steamID)) {
                  await this.lackPerms(info, `${chatCommand} ${info.message}`);
                  return;
                }
              }
              if (this.checkPhrase(value, info)) return;
              if (this.checkChat(value, info)) {
                await this.warn(steamID, 'Trigger does not work in this chat!');
                return;
              }
              if (this.isFunc(this[`${key}CMD`])) {
                if (fn) {
                  this[`${key}CMD`](info, steamID, chatCommand, fn);
                  return;
                }
                this[`${key}CMD`](info, steamID, chatCommand);
              }
            } catch (ex) {
              this.err(ex.message);
              this.err(ex.stack);
            }
          });
        };
        for (const c of value.commands) {
          if (typeof c === 'object') {
            const fn = c.fn ?? '';
            for (const com of c.cmds) {
              addTrigger(com, fn);
            }
          } else {
            addTrigger(c);
          }
        }
      }
    } catch (ex) {
      this.err(ex.message);
      this.err(ex.stack);
    }
    // #endregion
  }

  async adminCMD(info, steamID, chatCommand) {
    try {
      if (/dnd/.test(chatCommand)) {
        const isDND = this.DNDPlayers.ping.filter((item) => item === steamID);
        if (this.isBlank(isDND)) {
          this.dbg('DMH', 1, steamID, '[ON] Do not disturb mode');
          await this.warn(steamID, '[ON] Do not disturb mode', 'warning', true);
          this.DNDPlayers.ping.push(steamID);
          this.DNDPlayers.warning.push(steamID);
        } else {
          for (const p of this.DNDPlayers.ping) {
            if (p === steamID) {
              this.DNDPlayers.ping.splice(this.DNDPlayers.ping.indexOf(p), 1);
              this.DNDPlayers.warning.splice(this.DNDPlayers.warning.indexOf(p), 1);
            }
          }
          this.dbg('DMH', 1, steamID, '[OFF] Do not disturb mode');
          await this.warn(steamID, '[OFF] Do not disturb mode', 'warning', true);
        }
      }
    } catch (ex) {
      this.err(ex.message);
      this.err(ex.stack);
    }
  }

  async devCMD(info, steamID, chatCommand) {
    try {
      if (/cerberus/.test(chatCommand)) {
        const steamIDs = this.server.players.map((item) => item.steamID);
        await this.warn(steamIDs, '[?] What da dog doing?');
        await this.delay(1000);
        await this.broadcast('[Cerberus] Currently In-Game: Squad');
      }
    } catch (ex) {
      this.err(ex.message);
      this.err(ex.stack);
    }
  }

  async publicCMD(info, steamID, chatCommand, fn) {
    try {
      const { message, player } = info;
      const runningMan = async () => {
        let p = {};
        let sID = steamID;
        let warnMsg = 'Running Man be gone! This trigger is monitored.';
        if (!this.isEmpty(message)) {
          if (this.isAdmin(steamID)) {
            warnMsg = 'An Admin has excuted the Running Man fix on you';
            sID = message;
            p = await this.server.getPlayerBySteamID(message);
          }
        }
        const embed = this.buildEmbed(info.chat, info.time)
          .setDescription(`${this.format.inlineCode(`(${info.chat}) !${chatCommand}`)} on ${this.format.inlineCode(this.server.serverName)}`)
          .addFields(
            {
              name: this.isEmpty(message) ? 'Player' : 'Admin',
              value: this.validSteamID(player)
            },
            {
              name: 'Squad Data',
              value: this.format.codeBlock(this.validSquad(player)),
              inline: true
            },
            {
              name: 'Team Data',
              value: this.format.codeBlock(this.validTeam(player)),
              inline: true
            }
          );
        if (!this.isEmpty(p)) {
          embed.addFields(
            {
              name: '\u200b',
              value: '\u200b',
              inline: false
            },
            {
              name: 'Player',
              value: this.validSteamID(p)
            },
            {
              name: 'Squad Data',
              value: this.format.codeBlock(this.validSquad(p)),
              inline: true
            },
            {
              name: 'Team Data',
              value: this.format.codeBlock(this.validTeam(p)),
              inline: true
            }
          );
          await this.warn(steamID, `You have fixed the Running Man for ${this.validName(p)}`);
        }
        await this.sendDiscordMessage(this.objEmbed(embed), 'admin-alerts');
        await this.warn(sID, warnMsg);
        await this.server.rcon.switchTeam(steamID);
        await this.delay(1000);
        await this.server.rcon.switchTeam(steamID);
        return true;
      };
      // this.server.rcon.forceTeamChange
      const switchTeam = async () => {
        try {
          let p = {};
          let sID = steamID;
          let warnMsg = 'This action is for playing with friends only, this trigger is monitored.';
          const desc = `${this.format.inlineCode(`(${info.chat}) !${chatCommand}`)} on ${this.format.inlineCode(this.server.serverName)}`;
          if (!this.isEmpty(message)) {
            warnMsg = 'Your team has been switched by an Admin';
            sID = message;
            p = await this.server.getPlayerBySteamID(message);
          }
          const embed = this.buildEmbed(info.chat, info.time)
            .setDescription(desc)
            .addFields(
              {
                name: this.isEmpty(message) ? 'Player' : 'Admin',
                value: this.validSteamID(info),
                inline: false
              },
              {
                name: 'Squad Data',
                value: this.format.codeBlock(this.validSquad(player)),
                inline: true
              },
              {
                name: 'Team Data',
                value: this.format.codeBlock(this.validTeam(player)),
                inline: true
              }
            );
          if (!this.isEmpty(p)) {
            embed.addFields(
              {
                name: '\u200b',
                value: '\u200b',
                inline: false
              },
              {
                name: 'Player',
                value: this.validSteamID(p)
              },
              {
                name: 'Squad Data',
                value: this.format.codeBlock(this.validSquad(p)),
                inline: true
              },
              {
                name: 'Team Data',
                value: this.format.codeBlock(this.validTeam(p)),
                inline: true
              }
            );
            await this.warn(steamID, `You have switched ${this.validName(p)} teams`);
          }
          if (!this.isSeeding()) {
            if (this.sorryMap.has(sID) && this.teamKills.has(sID)) {
              const TKs = this.teamKills.get(sID) || [];
              if (!this.isBlank(TKs.filter((item) => +info.time - item.timestamp < 1000 * 60 * 1.5))) {
                warnMsg = 'Cerberus (Forbidden, int TK detected)';
                embed.setDescription(`${desc} - Trigger forbidden, int TK detected`);
                this.pChanges.set(sID, {
                  cnt: 999,
                  used: +info.time
                });
                await Promise.all([
                  this.warn(sID, warnMsg),
                  this.sendDiscordMessage(this.objEmbed(embed), 'admin-alerts')
                ]);
                return;
              }
            }

            if (!this.pChanges.has(sID)) {
              this.pChanges.set(sID, {
                cnt: 1,
                used: 1
              });
            }
            const resets = this.pChanges.get(sID);
            if (resets.cnt > 1) {
              await this.warn(steamID, 'Cerberus (Already used for this Layer)');
              return false;
            }
            const compare = +info.time - resets.used;
            this.pChanges.set(steamID, {
              cnt: resets.cnt + 1,
              used: compare
            });
            if (compare <= 1000 * 100) {
              warnMsg = 'Used too often, please manually switch or wait 100 seconds';
              embed.setDescription(`${desc} - Trigger blocked, used 2x within 100 seconds`);
              await Promise.all([
                this.warn(sID, warnMsg),
                this.sendDiscordMessage(this.objEmbed(embed), 'admin-alerts')
              ]);
              return;
            }
          }
          await Promise.all([
            this.warn(sID, warnMsg),
            this.server.rcon.switchTeam(sID),
            this.sendDiscordMessage(this.objEmbed(embed), 'admin-alerts')
          ]);
        } catch (ex) {
          this.err(ex);
        }
      };
      const adminSupport = async () => {
        try {
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
              await this.warn(a.steamID, `[!${chatCommand}] ${this.validName(info.player)} (${info.message})`);
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
          const embed = this.buildEmbed(null, info.time, 'Admin Support Hotline')
            .setDescription(`${this.format.inlineCode(`(${info.chat}) ${info.message}`)} on ${this.format.inlineCode(this.server.serverName)}`)
            .addFields(
              {
                name: 'Player',
                value: this.validSteamID(info), // `${this.validSteamID(info)}`
                inline: false
              },
              {
                name: 'Squad Data',
                value: this.format.codeBlock(this.validSquad(info)),
                inline: true
              },
              {
                name: 'Team Data',
                value: this.format.codeBlock(this.validTeam(info)),
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
            +info.time - this.options.ping.delay > this.lastPing
          ) {
            discordMsg.content = this.options.ping.groups
              .map((groupID) => `<@&${groupID}>`)
              .join(' ');
            this.lastPing = +info.time;
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
          this.err(ex);
        }
      };
      if (fn) {
        if (/switch/.test(fn)) {
          await switchTeam();
        } else if (/doubleswitch/.test(fn)) {
          await runningMan();
        } else if (/help/.test(fn)) {
          await adminSupport();
        } else {
          await this.warn(steamID, 'Trigger does not exist');
        }
      }
    } catch (ex) {
      this.err(ex.message);
      this.err(ex.stack);
    }
  }

  // #region Lack Permissions
  async lackPerms(info, msg = '') {
    const steamID = this.isValid(info, 'steamID');
    if (!steamID) {
      this.err('Invalid SteamID', info);
      return;
    }
    const embed = this.buildEmbed(info.chat, info.time, 'Cerberus')
      .setDescription(
        `${this.format.bold('Executed Player Warning:')} Player lacks permission to execute this command! \nMore Information: ${this.format.inlineCode(msg ?? info.message)}`
      )
      .addFields(
        {
          name: 'Player',
          value: this.validSteamID(info.player)
        },
        {
          name: 'Squad Data',
          value: this.format.codeBlock(this.validSquad(info.player)),
          inline: true
        },
        {
          name: 'Team Data',
          value: this.format.codeBlock(this.validTeam(info.player)),
          inline: true
        }
      );
    await Promise.all([
      this.warn(steamID, 'You lack permissions to execute this command!', 'warning', true),
      this.sendDiscordMessage(this.objEmbed(embed), 'cerberus')
    ]);
  }
  // #endregion

  checkChat(value = {}, info = {}) {
    let resp = false;
    if (Array.isArray(this.options.ignoreChats)) {
      for (const ignoreChat of this.options.ignoreChats) {
        if (info.chat.includes(ignoreChat)) {
          resp = true;
          break;
        }
      }
    }
    if ('ignore' in value && !resp) {
      if (Array.isArray(value.ignore.chats)) {
        for (const ignoreChat of value.ignore.chats) {
          if (info.chat.includes(ignoreChat)) {
            resp = true;
            break;
          }
        }
      }
    }
    return resp;
  }

  checkPhrase(value = {}, info = {}) {
    let resp = false;
    if (Array.isArray(this.options.ignorePhrases)) {
      for (const ignorePhrase of this.options.ignorePhrases) {
        if (info.message.includes(ignorePhrase)) {
          resp = true;
          break;
        }
      }
    }
    if ('ignore' in value && !resp) {
      if (Array.isArray(value.ignore.phrases)) {
        for (const ignorePhrase of value.ignore.phrases) {
          if (info.message.includes(ignorePhrase)) {
            resp = true;
            break;
          }
        }
      }
    }
    return resp;
  }
}
