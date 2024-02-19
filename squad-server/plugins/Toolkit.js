import ToolkitBase from './Toolkit-base.js';

// FUCK BATTLEMETRICS IT'S SO FUCKEN STUPID -- Magic
// { name: '\u200b', value: '\u200b' }

/**
 * `TypeScript` definitions for code editors & developers, "VSCodium" for example.
 * @typedef { import('./Toolkit.d.ts').TK } TK
 */

// #region Profanity List

/**
 * Exemptions
 * @description Words exempted from Profanity Filter
 */
const exemptions = /(niba|miga|dink|jewoine|cannibal)\b/gi;

/**
 * Toxicity Words
 * @description Used to detect "toxicity"
 */
const profanity =
  'dickh?ead|cocksucker|taint|s(kank|lut)|asshole|(fuck|motherfuck)er|(ame*r|me*x)icanof(you|u)|softbrain';

// #region Slurs
/**
 * The Racial Slur Database
 * @link http://www.rsdb.org/
 */
const commonSlurs =
  'wet-*back|tar-*bab(y|ies)|sheeny|\\Wcoon|german-*oven-*mitt|rag-*head|(white|black|chin(ese|a)|german|israel)supremacy';
const nWord =
  'n(o|a)gger|negro|nigger|(n|m|y|z)i(g|b)let|(n|m|y|z)i(g|b)(g|b)*(a|er|ol|y)|knee-*grow|^igga|nick(h|gu)er|kneeg';
const blacks = `sambo|baboon|afric(an't|oon)|jigaboo|blackmonkey|${nWord}`;
const whites = 'wigwog|wigg(er|rette|let)|windian|wegro|mud-*shark|wet-*dog';
const mexican =
  '^(chino|chinina)|beaner|\\W(yerd|xarnego|dago|uda)|cannedlabor|fence-*hopper|manuel-*labor|taco-*jockey';
const vietnamese = '(ch|v|g)ink|gook|agentorange';
const german = 'jew|holocaust|schleu|saupreiss|schmeisser|shit-*eater|volkswagen';
const american = 'unclecscam|pindos';
const korean = 'nork|biscuit-*head|chosenjin|shovel-*head|seoulman|kekeke|jughead|dog-*breath';
const mixedRaces = 'soggycracker|spegro';
const arabs = 'sand(monkey|moolie|rat|scratcher)|towel-*head';
const asians =
  '\\W[A-Za-z]ing(\\s-)?[A-Za-z]ong|(buddha|slope|zipper)-*head|dog-*(muncher|eater)|bananame|rice-*(picker|cooker|burner|rocket)|seaweed-*sucker|soyback|squint|yellow-*(devil|monkey)|gink';
// #endregion

/**
 * Ban player without warning
 * 
 * Format: `{{name}}: RegExp`
 */
const badSlurs = {
  Ableism:
    /downie|ree*ta?r[dt]|\Wtard|autis(tism|tic)|brain-*damage|schizo|special-*needs|window-*licker|mental(ly)?dis/,
  CurrentEvents: /hamas|pakistan|georgefloyd/,
  Homophobic: /queer|fag(s|t)*|fg{1,}t|f\\w?g{1,}\w?it/,
  Pedophilia: /fuck(.+)?\d(yr|year|y)old/,
  Political: /sieghail|hitler|nazi/,
  Prejudice: /(hate|fuck|stupid)(\s-)?(hamas|pakistan|america|mexic|canad)/,
  Racism: new RegExp(
    `${commonSlurs}|${american}|${mexican}|${blacks}|${whites}|${vietnamese}|${german}|${korean}|${mixedRaces}|${arabs}|${asians}`
  ),
  Sexism:
    /(fuck|stupid|men>|menare(better|stronger|faster|smarter|greater|cooler)th(e|a)n)(women|girl|female)|stfu.*?(women|girl|female)/,
  Toxicity:
    /mortard|stfu(manchild|admin|cerberus)|(a|are)cuck|obese|(sqd|squad).*?(stupid|trash|dumbfuck)|(incompetent|lowiq).*?(sqd|squad)/
};
// #endregion

const apologyReg = /s|oopes|my|mb|apolog|(good|gud)heavens|no/;

const regSquadID = /-sid\s(\d{1})/;
const regSteamID = /\d{17}/;
const regTeamID = /-tid\s(\d{1})/;
const regTeamName = /-tnam\s(["'])(.*?)\1/;
const regPlayerName = /-n\s(["'])(.*?)\1/;
const regSquadName = /-snam\s(["'])(.*?)\1/;
const msgReg = /-m (["'])(.*?)\1$/;

const apologyArr = [
  'Cerberus Left (He Was Hungry)',
  'Cerberus Appeased (Removed From Hades List)',
  'Cerberus Impressed (Not That He Doubted You)',
  'Cerberus Vanished (Where Did He Go)',
  'Cerberus Vanquished (Not Really)',
  "Cerberus Vanquished (He's Fine)",
  'Cerberus Vanquished (You Did This)'
];
const knives = [
  'BP_AK74Bayonet',
  'BP_AKMBayonet',
  'BP_Bayonet2000',
  'BP_G3Bayonet',
  'BP_M9Bayonet',
  'BP_OKC-3S',
  'BP_QNL-95_Bayonet',
  'BP_SA80Bayonet',
  'BP_SKS_Bayonet',
  'BP_SKS_Optic_Bayonet',
  'BP_SOCP_Knife_AUS',
  'BP_SOCP_Knife_ADF',
  'BP_VibroBlade_Knife_GC'
];
const knifeArr = [
  'KNIFED',
  'SLICED',
  'DICED',
  'ICED',
  'CUT',
  'PAPER CUT',
  'RAZORED',
  "EDWARD SCISSOR HAND'D",
  "FRUIT NINJA'D"
];
const multiArr = [
  'DESTROYED',
  'TERMINATED',
  'MULTI-KILLED'
];

const padTo2Digits = (num) => num.toString().padStart(2, '0');
const toSeconds = (milliseconds) => {
  return Math.round((milliseconds % 60000) / 1000);
};
const millisToMinutesAndSeconds = (milliseconds) => {
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = Math.round((milliseconds % 60000) / 1000);
  return seconds === 60 ? `${minutes + 1}:00` : `${minutes}:${padTo2Digits(seconds)}`;
};
/**
 * Replace everything except `[A-Za-z0-9]`
 * @template { string } S
 * @param { S } str
 * @returns { S }
 */
const toWords = (str = '') => {
  if (typeof str === 'string') {
    return str.toLowerCase().replaceAll(/\W/g, '');
  }
  return str;
};
/**
 * Replace `/[^a-z0-9\s]|\s{2,}/g`
 * @template { string } S
 * @param { S } str
 * @returns { S }
 */
const trimMsg = (str = '') => {
  if (typeof str === 'string') {
    return str.toLowerCase().replace(/[^a-z0-9\s]|\s{2,}/g, '');
  }
  return str;
};
/**
 * @template [O={}]
 * @param { O } obj 
 * @returns { keyof O }
 */
const ranPick = (obj) => obj[Math.floor(Math.random() * obj.length)];

const exCoords = new Map();

export default class Toolkit extends ToolkitBase {
  static get description() {
    return 'Toolkit Core Plugin';
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
      Ban: {
        required: false,
        description: 'BattleMetrics ban info',
        default: {
          note: 'Banned by Cerberus System',
          reason: '{{reason}} | {{timeLeft}}'
        },
        example: {
          note: 'Hammer Time',
          reason: '{{reason}} | {{timeLeft}} | discord.gg/<invite link>'
        }
      },
      ignoreChats: {
        required: false,
        default: [],
        description: 'A list of chat names to ignore.'
      },
      ping: {
        required: false,
        description: 'A list of Discord groups to ping.',
        default: {
          delay: 60000,
          group: []
        }
      },
      profanityFilter: {
        required: false,
        description: 'Profanity filter logic.',
        default: {
          squadNames: [
            {
              enabled: true,
              regExp: 'armou?r|vic|vehicle'
            }
          ]
        }
      },
      trigger: {
        required: false,
        description: 'A list of in-game triggers.',
        default: {
          admin: ['ban', 'disband', 'warn']
        }
      }
    };
  }

  // #region Constructor
  constructor(server, options, connectors) {
    super(server, options, connectors);

    // #region Binders
    this.onConnected = this.onConnected.bind(this);
    this.profanityFilter = this.profanityFilter.bind(this);
    this.hasTeamkill = this.hasTeamkill.bind(this);
    this.hasCamera = this.hasCamera.bind(this);
    this.onRoundEnd = this.onRoundEnd.bind(this);
    this.clearCache = this.clearCache.bind(this);
    this.onDisconnect = this.onDisconnect.bind(this);
    this.onKill = this.onKill.bind(this);
    this.playerList = this.playerList.bind(this);
    this.createThread = this.createThread.bind(this);
    this.altCheck = this.altCheck.bind(this);
    // #endregion

    /**
     * @type { import("../utils/battlemetrics-api.js").default }
     */
    this.bmClient = this.options.bmClient;

    /** @type {Map} */
    this.chatMessages = this.objMaps.get('chatMessages');
    /** @type {Map} */
    this.disbands = this.objMaps.get('disbands');
    /** @type {Map} */
    this.slKits = this.objMaps.get('slKits');
    /** @type {Map} */
    this.teamKills = this.server.teamKills;
    /** @type {Map} */
    this.squadChanges = this.objMaps.get('squadChanges');
    /** @type {Map} */
    this.sorryMap = this.server.sorryMap;
    /** @type {Map} */
    this.killSystem = this.objMaps.get('killSystem');
    /** @type {Map} */
    this.multiKills = this.objMaps.get('multiKills');

    this.lastBroadcast = Date.now() - this.options.ping.delay;
    this.pfSquadNames = (this.options?.profanityFilter?.squadNames || []).filter(
      (item) => item.enabled
    );
    this.Ban = this.options.Ban ?? {
      note: 'Banned by Cerberus System',
      reason: '{{reason}} | {{timeLeft}}'
    };
  }
  // #endregion

  // #region Mount
  async mount() {
    await super.mount();

    // #region Listeners
    this.addListener('NEW_GAME', this.clearCache);
    this.addListener(['CHAT_MESSAGE', 'SQUAD_CREATED'], this.profanityFilter);
    this.addListener('PLAYER_CONNECTED', this.onConnected);
    this.addListener('PLAYER_DISCONNECTED', this.onDisconnect);
    this.addListener(['POSSESSED_ADMIN_CAMERA', 'UNPOSSESSED_ADMIN_CAMERA'], this.hasCamera);
    this.addListener('ROUND_ENDED', this.onRoundEnd);
    this.addListener('TEAMKILL', this.hasTeamkill);
    this.addListener('PLAYER_WOUNDED', this.onKill);
    this.addListener('ALT_ACCOUNT', this.altCheck);
    // #endregion

    // #region Triggers
    for (const c of this.options.trigger.admin) {
      const chatCommand = c.toLowerCase();
      this.server.on(`CHAT_COMMAND:${chatCommand}`, async (info) => {
        try {
          const steamID = this.isValid(info, 'steamID');
          if (!steamID) {
            this.err('Invalid SteamID', info);
            return;
          }
          if (!(Object.is(info.chat, 'ChatAdmin') || Object.is(info.chat, 'ChatSquad'))) {
            await this.warn(steamID, 'Only works in Admin/Squad chat!');
            return;
          }
          if (!this.isAdmin(steamID)) {
            await this.lackPerms(info, `${chatCommand} ${info.message}`);
            return;
          }
          const { message, player } = info;
          if (this.isEmpty(message)) {
            return false;
          }
          if (chatCommand === 'k') {
            const raw = message.split(' ');
            const name = raw[0];
            const reason = Number.isNaN(parseInt(raw[1])) ? raw[1] : `Rule ${raw[1]} Violation`;
            const p = this.server.players.find((item) => item.name.includes(name));
            if (this.isNull(p)) {
              await this.warn(steamID, `Unable to locate the player w/ { ${name} }`);
            } else {
              await this.server.rcon.kick(p.steamID, reason);
            }
            return;
          }
          const findIDs = () => {
            return this.server.players
              .filter((p) => {
                const validID = this.isValid(p, 'steamID');
                if (!validID) {
                  return false;
                }
                return true;
              })
              .filter((p) => {
                const vSteamId = this.isValid(p, 'steamID');
                const vSquadId = this.isValid(p, 'squadID');
                const vSquadName = this.isValid(p, 'squadName');
                const vTeamId = this.isValid(p, 'teamID');
                const vTeamName = this.isValid(p, 'teamName');
                const vName = this.isValid(p, 'name');
                if (Object.is('warn', c) && /-(dev|owner|staff)\s/i.test(message)) {
                  if (/-owner\s/i.test(message) && !this.isOwner(vSteamId)) {
                    return false;
                  } else if (/-dev\s/i.test(message) && !this.isDev(vSteamId)) {
                    return false;
                  } else if (!this.isAdmin(vSteamId)) {
                    return false;
                  }
                  return true;
                }
                if (regSteamID.test(message)) {
                  return Object.is(vSteamId, message.match(regSteamID)[0]);
                }
                if (regSquadID.test(message)) {
                  if (!vSquadId) {
                    return false;
                  }
                  return vSquadId === message.match(regSquadID)[1];
                }
                if (regSquadName.test(message)) {
                  if (!vSquadName) {
                    return false;
                  }
                  return vSquadName
                    .toLowerCase()
                    .includes(message.match(regSquadName)[2].toLowerCase());
                }
                if (regTeamID.test(message)) {
                  if (!vTeamId) {
                    return false;
                  }
                  return vTeamId === message.match(regTeamID)[1];
                }
                if (regTeamName.test(message)) {
                  if (!vTeamName) {
                    return false;
                  }
                  return vTeamName
                    .toLowerCase()
                    .includes(message.match(regTeamName)[2].toLowerCase());
                }
                if (regPlayerName.test(message)) {
                  if (!vName) {
                    return false;
                  }
                  return vName
                    .toLowerCase()
                    .includes(message.match(regPlayerName)[2].toLowerCase());
                }
                return false;
              })
              .map((p) => {
                return {
                  admin: player,
                  chat: info.chat,
                  player: p,
                  time: info.time || new Date()
                };
              });
          };
          const finalIDs = this.normalizeTarget(findIDs());
          if (this.isBlank(finalIDs)) {
            return;
          }
          const hasMsg = msgReg.test(message);
          const msg = hasMsg ? message.match(msgReg)[2] : '';
          if (/disband/.test(chatCommand)) {
            if (/-reset/i.test(message)) {
              for (const p of finalIDs) {
                this[c](p, 'Disbands reset by an Admin', false, true);
              }
            } else if (/-blacklist/i.test(message)) {
              for (const p of finalIDs) {
                this[c](p, 'Squad creation has been blacklisted by an Admin', true, false);
              }
            } else {
              for (const p of finalIDs) {
                this[c](p, msg, false, false);
              }
            }
          } else if (/warn/.test(chatCommand)) {
            const embedSet = new Set();
            for (const p of finalIDs) {
              this[c](this.isValid(p.player, 'steamID'), msg);
              const embed = this.buildEmbed(info.chat, info.time, 'Warning System')
                .setDescription(`**Message:** ${msg}`)
                .addFields(
                  {
                    name: 'Player received warning',
                    value: this.validSteamID(p.player)
                  },
                  {
                    name: 'Squad Data',
                    value: this.format.codeBlock(this.validSquad(p.player)),
                    inline: true
                  },
                  {
                    name: 'Team Data',
                    value: this.format.codeBlock(this.validTeam(p.player)),
                    inline: true
                  },
                  {
                    name: '\u200b',
                    value: '\u200b',
                    inline: false
                  },
                  {
                    name: 'Executed by Admin',
                    value: this.validSteamID(p.admin),
                    inline: false
                  },
                  {
                    name: 'Squad Data',
                    value: this.format.codeBlock(this.validSquad(p.admin)),
                    inline: true
                  },
                  {
                    name: 'Team Data',
                    value: this.format.codeBlock(this.validTeam(p.admin)),
                    inline: true
                  }
                );
              if (embedSet.size >= 7) {
                await this.sendDiscordMessage(this.objEmbed(embedSet), 'admin-alerts');
                embedSet.clear();
              }
              embedSet.add(embed);
            }
            await this.sendDiscordMessage(this.objEmbed(embedSet), 'admin-alerts');
          } else if (/ban/.test(chatCommand)) {
            const exReg = /-e\s(["'])(.*?)\1/;
            for (const p of finalIDs) {
              if (exReg.test(message)) {
                const bl = await this.addToBanList(p, msg, message.match(exReg)[2]);
                await this.sendDiscordMessage(bl, bl.content ? 'cerberus' : 'auto-bans');
              } else {
                const bl = await this.addToBanList(p, msg, null);
                await this.sendDiscordMessage(bl, bl.content ? 'cerberus' : 'auto-bans');
              }
            }
          } else {
            this[c](message);
          }
        } catch (ex) {
          this.err(ex);
        }
      });
    }
    // #endregion

    await this.msgDev('[SquadJS] [Re]Starting...');
  }
  // #endregion

  async altCheck(info) {
    const { player } = info;
    const embed = this.buildEmbed([0, 201, 255], info.time ?? new Date())
      .setThumbnail('https://i.imgur.com/Hs94Zms.png')
      .setDescription(`Mutiple accounts detected under the same IP address on ${this.format.inlineCode(this.server.serverName)}`);
    for (const acc of info.accounts) {
      const p = {
        EOSID: acc.eosID,
        steamID: acc.steamID,
        name: acc.lastName,
        lastIP: acc.lastIP
      }
      if (p.steamID === player.steamID) {
        embed.addFields(
          {
            name: `(CURRENT) Database ID: ${acc.id}`,
            value: this.validSteamID(p)
          }
        );
      } else {
        embed.addFields(
          {
            name: `Database ID: ${acc.id}`,
            value: this.validSteamID(p)
          }
        );
      }
    }
    let ingame = 0;
    for (const p of this.server.players) {
      if (p.lastIP === info.ip) {
        ingame =+ 1;
      }
    }
    embed.addFields(
      {
        name: 'Accounts In-game',
        value: `\`${ingame} / ${info.accounts.length}\``
      }
    );
    await this.sendDiscordMessage(this.objEmbed(embed), 'cerberus')
  }

  // #region onConnected
  /**
   * @param {import('../../squad-server').logParser.PLAYER_CONNECTED} info
   */
  async onConnected(info) {
    try {
      const { player } = info;
      const steamID = this.validator(player, 'steamID');
      const playerName = this.validName(player);
      if (typeof steamID !== 'string') {
        return;
      }
      if (typeof playerName !== 'string') {
        return;
      }
      if (this.isBlank(toWords(playerName))) {
        const embed = this.buildEmbed([0, 201, 255], info.time ?? new Date())
          .setThumbnail('https://i.imgur.com/Hs94Zms.png')
          .setDescription('**Player Kicked:** Missing latin characters')
          .addFields({
            name: 'Player',
            value: this.validSteamID(player)
          });
        await Promise.all([
          this.server.rcon.kick(steamID, 'Latin characters required'),
          this.msgAdmins(`[Player Kicked] ${playerName} Latin characters required`),
          this.sendDiscordMessage(this.objEmbed(embed), 'admin-alerts')
        ]);
        return;
      }
      const m = this.badSlurCheck(playerName);
      if (m.type) {
        const embed = this.buildEmbed([0, 201, 255], info.time ?? new Date())
          .setThumbnail('https://i.imgur.com/Hs94Zms.png')
          .setDescription(`**Player Kicked:** \`(${m.type}) ${m.matched}\``)
          .addFields({
            name: 'Player',
            value: this.validSteamID(player)
          });
        await Promise.all([
          this.server.rcon.kick(
            steamID,
            `Change your username: (${m.type}) ${m.matched}`
          ),
          this.msgAdmins(`[Player Kicked] ${playerName}`),
          this.sendDiscordMessage(this.objEmbed(embed), 'admin-alerts')
        ]);
        return;
      }

      const loadMaps = ['chatMessages', 'multiKills', 'killSystem', 'teamKills'];
      for (const m of loadMaps) {
        if (!this[m].has(steamID)) {
          this[m].set(steamID, []);
        }
      }
    } catch (ex) {
      this.err(ex);
    }
  }
  // #endregion

  // #region onDisconnect
  /**
   * @param {import('../../squad-server').logParser.PLAYER_DISCONNECTED} info
   */
  async onDisconnect(info) {
    if (this.isSeeding()) return;
    const { player } = info;
    const steamID = this.validator(player, 'steamID');
    if (typeof steamID !== 'string') {
      this.err('[onDisconnect] Invalid steamID', info);
      return;
    }
    if (this.sorryMap.has(steamID) && this.teamKills.has(steamID)) {
      const TKs = this.teamKills.get(steamID).filter((item) => {
        if (+info.time - item.timestamp <= 60 * 1000 * 5) {
          return true;
        }
        return false;
      });
      if (TKs.length > 0) {
        this.addNote(
          info,
          'TK & DC',
          '=============================',
          'SOP (STANDARD OPERATING PROCEDURES):',
          '? +1d per intentional teamkill',
          '? Intentional Teamkill = Player does not apologize for a team kill 5 mins before they disconnect',
          '=============================',
          TKs.map((item) => item.formattedBM).join('\n')
        );

        const bl = await this.addToBanList(
          info,
          'TK & DC',
          `${TKs.length > 1 ? TKs.length : 2}d`,
          [
            {
              name: 'Team Kills',
              value: 'Posted in **BAN NOTES** + **DISCORD THREAD**',
              inline: false
            }
          ],
          'Cerberus',
          false
        );

        if (!bl.content) {
          await this.msgAdmins(`[Player Banned] TK & DC ${this.validName(player)}`);
        }

        const messages = await this.sendDiscordMessage(
          bl,
          'content' in bl ? 'cerberus' : 'auto-bans'
        );
        for (const message of messages) {
          const msgThread = await message.startThread({
            name: 'Team Kills',
            autoArchiveDuration: 10080,
            reason: steamID
          });
          await msgThread.send({
            content: TKs.map((item) => item.formattedThread).join('\n')
          });
        }
      }
    }
    for (const value of this.objMaps.values()) {
      if (!(value instanceof Map)) continue;
      if (value.has(steamID)) {
        value.delete(steamID);
      }
    }
  }
  // #endregion

  // #region Lack Permissions
  async lackPerms(info, msg = '') {
    const steamID = this.isValid(info, 'steamID');
    if (!steamID) {
      this.err('Invalid SteamID', info);
      return;
    }
    const embed = this.buildEmbed(info.chat, info.time, 'Cerberus')
      .setThumbnail('https://i.imgur.com/Hs94Zms.png')
      .setDescription(
        `**Executed Player Warning:** Player lacks permission to execute this command. \nMore Information: \`\`${
          msg ?? info.message
        }\`\``
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
      this.warn(steamID, 'You lack permissions to execute this command'),
      this.sendDiscordMessage(this.objEmbed(embed), 'cerberus')
    ]);
  }
  // #endregion

  // #region Disband System
  async disband(info = {}, msg = '', forceBlacklist, reset) {
    if (this.isEmpty(msg)) {
      msg = 'Cerberus (Squad disbanded)';
    }
    const discordMsg = {};
    const pSteamId = this.isValid(info.player, 'steamID');
    const validTeamID = parseInt(this.validator(info.player, 'teamID') || '-1');
    const validSquadID = parseInt(this.validator(info, 'squadID') || '-1');
    const embed = this.buildEmbed(info.chat || [255, 89, 0], info.time, 'Squad Disband System')
      .setDescription(`**Reason for Disband** ? ${msg}`)
      .addFields(
        {
          name: 'Squad Leader',
          value: this.validSteamID(info.player)
        },
        {
          name: 'Squad Data',
          value: this.format.codeBlock(this.validSquad(info.player)), // this.format.codeBlock(`${info.squadID} : ${info.squadName}`)
          inline: true
        },
        {
          name: 'Team Data',
          value: this.format.codeBlock(this.validTeam(info.player)), // this.format.codeBlock(`${info.player.teamID} : ${info.teamName}`)
          inline: true
        }
      );
    const blacklist = async () => {
      embed.setDescription(
        `**Reason for Disband** ? Player has been blacklisted from creating Squads this Layer, ${msg}`
      );
      await Promise.all([
        // this.server.rcon.execute(`AdminRemovePlayerFromSquad ${pSteamId}`),
        this.server.rcon.execute(`AdminDisbandSquad ${validTeamID} ${validSquadID}`),
        this.warn(pSteamId, `Blacklisted from creating Squads this Layer ? ${msg}`),
        this.sendDiscordMessage(discordMsg, 'admin-alerts'),
        this.msgAdmins(
          `Blacklisted from creating Squads this Layer ? ${this.isValid(
            info.player,
            '{{name}}',
            false
          )}: ${this.isValid(info.player, '{{squadName}}', false)}`
        )
      ]);
      await this.delay(1000);
      await this.warn(pSteamId, 'Support ? !admin {{message}}');
    };
    Object.assign(discordMsg, this.objEmbed(embed));
    if (!pSteamId) {
      embed.setColor([241, 0, 0]);
      const devDiscord = this.options.Staff.Dev.userIDs.map((Id) => `<@${Id}>`).join(' ');
      discordMsg.content = `${devDiscord}\n\`\`\`json\n${JSON.stringify(info)}\`\`\``;
      await this.sendDiscordMessage(discordMsg, 'cerberus');
      return;
    }
    if (reset) {
      this.disbands.set(pSteamId, {
        cnt: 1,
        reason: msg
      });
      embed.setDescription('**Reset Disband Counter**').addFields({
        name: 'Reset By',
        value: this.validSteamID(info.admin),
        inline: false
      });
      await this.sendDiscordMessage(discordMsg, 'admin-alerts');
      return;
    }
    if (this.isEmpty(this.disbands.get(pSteamId))) {
      this.disbands.set(pSteamId, {
        cnt: 1,
        reason: msg
      });
    }
    embed.addFields({
      name: 'Count',
      value: `${this.disbands.get(pSteamId).cnt}`,
      inline: false
    });
    if (forceBlacklist) {
      this.disbands.set(pSteamId, {
        cnt: 100,
        reason: msg
      });
    }

    const pDisbands = this.disbands.get(pSteamId);
    if (pDisbands.cnt >= 90) {
      await blacklist();
      return;
    }
    if (Object.is(pDisbands.reason, msg)) {
      this.disbands.set(pSteamId, {
        cnt: pDisbands.cnt + 1,
        reason: msg
      });
    } else {
      this.disbands.set(pSteamId, {
        cnt: 1,
        reason: msg
      });
    }
    if (pDisbands.cnt === 3) {
      await blacklist();
      return;
    } else if (pDisbands.cnt > 3) {
      // await this.server.rcon.execute(`AdminRemovePlayerFromSquad ${pSteamId}`);
      await this.server.rcon.execute(`AdminDisbandSquad ${validTeamID} ${validSquadID}`);
      await this.warn(pSteamId, `Blacklisted from creating Squads this Layer ? ${msg}`);
      await this.delay(1000);
      await this.warn(pSteamId, 'Support ? !admin {{message}}');
      return;
    }
    if (info.admin) {
      embed.addFields({
        name: 'Disbanded By',
        value: this.validSteamID(info.admin),
        inline: false
      });
    }
    await Promise.all([
      // this.server.rcon.execute(`AdminRemovePlayerFromSquad ${pSteamId}`),
      this.server.rcon.execute(`AdminDisbandSquad ${validTeamID} ${validSquadID}`),
      this.warn(pSteamId, `Squad Disbanded ? ${msg}`),
      this.sendDiscordMessage(discordMsg, 'admin-alerts')
    ]);
  }
  // #endregion

  // #region Admin Camera
  /**
   * @param {import('../../squad-server').logParser.ADMIN_CAMERA} info
   */
  async hasCamera(info) {
    try {
      const { player } = info;
      const steamID = this.validator(player, 'steamID');
      if (typeof steamID !== 'string') {
        this.err('[hasCamera] Invalid steamID', info);
        return;
      }
      const embed = this.buildEmbed(
        this.isEmpty(info.duration) ? 'CameraEntered' : 'CameraLeft',
        null,
        'Admin Camera'
      )
        .setDescription(
          `${this.validName(info)} has **${
            this.isEmpty(info.duration) ? 'Entered' : 'Left'
          }** Admin Camera.`
        )
        .addFields(
          {
            name: 'Admin',
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
          },
          {
            name: 'Server Name',
            value: this.format.codeBlock(this.server.serverName),
            inline: false
          }
        );
      if (
        player.squad &&
        player.squad.size > 1 &&
        !(this.isAdmin(player.squad.creator.steamID) && /^!/.test(player.squad.squadName))
      ) {
        if (info.duration > 0 && toSeconds(info.duration) <= 60) {
          const msg = "Cerberus (PLEASE DON'T QUICKLY GO IN-OUT OF ADMIN CAM)";
          embed.addFields({
            name: 'Player Warning',
            value: msg
          });
          await this.warn(steamID, msg, 'warning', true);
        }
      }
      if (!this.isEmpty(info.duration)) {
        embed.addFields({
          name: 'Time in Admin Camera',
          value: `${millisToMinutesAndSeconds(info.duration)} min`
        });
      }
      await this.sendDiscordMessage(this.objEmbed(embed), 'admin-camera');
    } catch (ex) {
      this.err(ex);
    }
  }
  // #endregion

  clearCache() {
    exCoords.clear();
    for (const value of this.objMaps.values()) {
      if (!(value instanceof Map)) continue;
      value.clear();
    }
  }

  // #region onRoundEnd
  async onRoundEnd(info) {
    try {
      const embed = this.buildEmbed(null, null, 'Round Status').setColor([0, 201, 255]);
      if (!info.winner || !info.loser) {
        embed.setTitle('Round Ended').setDescription('This match Ended in a Draw');
        await this.sendDiscordMessage(this.objEmbed(embed), 'round-status');
        return;
      }

      embed.addFields(
        {
          name: `Team ${info.winner.team} Won`,
          value: `${info.winner.subfaction}\n ${info.winner.faction}\n won with ${info.winner.tickets} tickets.`
        },
        {
          name: `Team ${info.loser.team} Lost`,
          value: `${info.loser.subfaction}\n ${info.loser.faction}\n lost with ${info.loser.tickets} tickets.`
        },
        {
          name: 'Ticket Difference',
          value: `${info.winner.tickets - info.loser.tickets}.`
        }
      );
      await this.sendDiscordMessage(this.objEmbed(embed), 'round-status');

      this.clearCache();
    } catch (ex) {
      this.err(ex);
    }
  }
  // #endregion

  // #region On Kill
  /**
   * @param {import('../../squad-server').logParser.PLAYER_WOUNDED} info
   */
  async onKill(info) {
    if (info.teamkill === true) return;
    // if (!info.attacker) return;
    const { attacker, victim, weapon } = info;
    if (knives.includes(weapon)) {
      const knifeMsg = `Cerberus (${attacker.name} ${ranPick(knifeArr)} ${victim.name})`;
      this.log('[KNIFE LOG]', knifeMsg);
      await this.broadcast(knifeMsg);
    }
    if (!/BP_/.test(weapon)) return;

    if (/Proj2|Projectile|Frag|Mortar/.test(weapon)) return;

    if (!this.multiKills.has(attacker.steamID)) {
      this.multiKills.set(attacker.steamID, []);
    }
    if (!this.killSystem.has(attacker.steamID)) {
      this.killSystem.set(attacker.steamID, []);
    }

    const multiKill = this.multiKills.get(attacker.steamID) || [];
    const dt = info.time;
    multiKill.push({
      damage: info.damage,
      victim,
      weapon,
      time: dt.toLocaleTimeString(),
      timestamp: +dt,
      formatted: `${this.format.time(dt)} ${this.validSteamID(victim)} w/ ${weapon}`
    });
    this.multiKills.set(attacker.steamID, multiKill);
    const hasMultiKill = multiKill.filter((item, index) => {
      const t = +dt - item.timestamp;
      if (index > 1) {
        if (t <= 1000 * 1.5 && t > 0) {
          return true;
        }
      } else if (t <= 1000 * 1.5 && t > 0) {
        return true;
      }
      return false;
    });
    if (hasMultiKill.length >= 5) {
      const msg = `Cerberus (${attacker.name} HAS ${ranPick(multiArr)} ${hasMultiKill.length} PLAYERS)`;
      this.log(msg);
      // await this.broadcast(msg);
    }

    const killSys = this.killSystem.get(attacker.steamID) || [];
    killSys.push({
      damage: info.damage,
      victim,
      weapon,
      time: dt.toLocaleTimeString(),
      timestamp: +dt,
      formatted: `${this.format.time(dt)} ${this.validSteamID(victim)} w/ ${weapon}`
    });
    this.killSystem.set(attacker.steamID, killSys);
  }
  // #endregion

  async toHades(player, discordMsg, msg) {
    if (!this.isEmpty(msg)) {
      await this.warn(player.steamID, msg);
    }
    await this.server.rcon.switchTeam(player.steamID);
    this.delay(1000).then(() => {
      this.server.rcon.switchTeam(player.steamID);
    });
    if (!this.isEmpty(discordMsg)) {
      const messages = await this.sendDiscordMessage(discordMsg, 'admin-alerts');
      return messages;
    }
  }

  // #region Teamkill System
  async hasTeamkill(info) {
    try {
      if (!info.attacker) {
        return;
      }
      const { attacker, victim, weapon } = info;
      if (!this.teamKills.has(attacker.steamID)) {
        this.teamKills.set(attacker.steamID, []);
      }
      if (!this.sorryMap.has(attacker.steamID)) {
        this.sorryMap.set(attacker.steamID, 1);
      }

      const TKArr = this.teamKills.get(attacker.steamID) || [];
      const dt = info.time;
      TKArr.push({
        time: dt.toLocaleTimeString(),
        timestamp: +dt,
        victim,
        weapon,
        formatted: `${this.format.time(dt)} TK'd ${this.validSteamID(victim)} w/ ${weapon}`,
        formattedBM: `${this.format.time(dt)} ${this.validName(attacker)} TK'd ${this.validName(victim)} w/ ${weapon}`,
        formattedThread: `${this.format.time(dt)} ${this.validSteamID(attacker)} TK'd ${this.validSteamID(victim)} w/ ${this.format.inlineCode(weapon)}`
      });
      this.teamKills.set(attacker.steamID, TKArr);

      const TKs = this.teamKills.get(attacker.steamID) || [];

      const pubEmbed = this.buildEmbed(null, info.time, 'Team Kill System')
        .setThumbnail('https://i.imgur.com/Hs94Zms.png')
        .addFields(
          {
            name: 'War Crime',
            value: `\`${this.validName(attacker)}\` killed \`${this.validName(victim)}\` /w \`${weapon}\``
          },
          {
            name: 'Team Kills',
            value: `${TKs.length}/7`
          },
          {
            name: 'Server Name',
            value: this.format.codeBlock(this.server.serverName),
            inline: false
          }
        )
        .setColor([241, 0, 0]);
      await this.sendDiscordMessage(this.objEmbed(pubEmbed), 'teamkills');

      if (this.isSeeding()) return;

      if (this.objMaps.has('pChanges')) {
        const pChanges = this.objMaps.get('pChanges');
        if (pChanges.has(attacker.steamID)) {
          const resets = pChanges.get(attacker.steamID);
          if (+dt - resets.used < 1000 * 60 * 5 && resets.cnt >= 1) {
            await this.warn(attacker.steamID, 'Cerberus (Int TK detected)');
            const embed = this.buildEmbed(null, info.time, 'Internal Teamkill System')
              .addFields(
                {
                  name: 'Player',
                  value: this.validSteamID(attacker),
                  inline: false
                },
                {
                  name: 'Squad Data',
                  value: this.format.codeBlock(this.validSquad(attacker)),
                  inline: true
                },
                {
                  name: 'Team Data',
                  value: this.format.codeBlock(this.validTeam(attacker)),
                  inline: true
                },
                {
                  name: 'Team Kills',
                  value: TKs.map((item) => item.formatted).join('\n')
                },
                {
                  name: 'Sent Player Warning',
                  value: 'Cerberus (Welcome To Hades ?)'
                }
              )
              .setColor([241, 0, 0]);
            embed.setDescription('INT TK DETECTED, Player has been sent to Hades.');
            await this.toHades(attacker, this.objEmbed(embed), 'Cerberus (Welcome To Hades ?)');
          }
        }
      }

      if (this.server.mapPlayers.has(attacker.steamID)) {
        const rr = this.server.mapPlayers.get(attacker.steamID);
        const embed = this.buildEmbed(null, info.time, 'Internal Teamkill System')
          .addFields(
            {
              name: 'Risk Rating',
              value: `${rr ?? 0} / 10`
            },
            {
              name: 'Player',
              value: this.validSteamID(attacker),
              inline: false
            },
            {
              name: 'Squad Data',
              value: this.format.codeBlock(this.validSquad(attacker)),
              inline: true
            },
            {
              name: 'Team Data',
              value: this.format.codeBlock(this.validTeam(attacker)),
              inline: true
            },
            {
              name: 'Team Kills',
              value: TKs.map((item) => item.formatted).join('\n')
            }
          )
          .setColor([241, 0, 0]);
        await this.sendDiscordMessage(this.objEmbed(embed), 'admin-alerts');
        await this.warn(
          attacker.steamID,
          "Cerberus (Please apologize in ChatAll (J) for TK's or be sent to Hades)"
        );
        await this.warn(attacker.steamID, `Cerberus (${TKs.length}/3 <-- due to high risk rating)`);
        if (TKs.length === 2) {
          await this.warn(attacker.steamID, 'Cerberus (Next TK Sends You To Hades)');
        } else if (TKs.length === 3) {
          embed.setDescription('Player has been sent to Hades.');
          await this.toHades(attacker, this.objEmbed(embed), 'Cerberus (Welcome To Hades ?)');
        } else if (TKs.length >= 4) {
          await this.server.rcon.kick(attacker.steamID, 'Cerberus (4+ TKs really?)');
        }
        return;
      }

      await this.warn(attacker.steamID, `Cerberus (${TKs.length}/5)`);

      if (TKs.length >= 6) {
        await this.server.rcon.kick(attacker.steamID, 'Cerberus (6+ TKs really?)');
      } else if (TKs.length === 5) {
        const embed = this.buildEmbed(null, info.time, 'Internal Teamkill System')
          .setThumbnail('https://i.imgur.com/Hs94Zms.png')
          .setDescription(
            `Player has been sent to Hades on ${this.format.inlineCode(this.server.serverName)}`
          )
          .addFields(
            {
              name: 'Player',
              value: this.validSteamID(attacker),
              inline: false
            },
            {
              name: 'Squad Data',
              value: this.format.codeBlock(this.validSquad(attacker)),
              inline: true
            },
            {
              name: 'Team Data',
              value: this.format.codeBlock(this.validTeam(attacker)),
              inline: true
            },
            {
              name: 'Team Kills',
              value: 'Posted in **DISCORD THREAD**'
            }
          )
          .setColor([241, 0, 0]);
        const messages = await this.toHades(
          attacker,
          this.objEmbed(embed),
          'Cerberus (Welcome To Hades ?)'
        );
        this.createThread(
          attacker.steamID,
          TKs.map((item) => item.formattedThread).join('\n'),
          'Team Kills',
          messages
        );
      } else if (TKs.length === 4) {
        await this.warn(attacker.steamID, 'Cerberus (Next TK Sends You To Hades, FINAL WARNING)');
      } else {
        await this.warn(
          attacker.steamID,
          "Cerberus (Please apologize in ChatAll (J) for TK's or be sent to Hades)"
        );
      }
    } catch (ex) {
      this.err(ex);
    }
  }
  // #endregion

  addNote(info = {}, reason, ...evidence) {
    if (reason) {
      Object.assign(info, {
        note: `${this.Ban.note} | ${reason}\n${evidence.join('\n')}`
      });
    } else if (evidence) {
      Object.assign(info, {
        note: `${this.Ban.note}\n${evidence.join('\n')}`
      });
    }
    return info;
  }

  // #region profanityFilter
  /**
   * @param {string} str
   */
  clrSpaces(str) {
    const resp = [];
    try {
      const arr = str.match(/(\s\w{1})+\W/g) || [];
      if (arr.length > 0) {
        for (const s of arr.map((item) => item.replace(/\s+/g, ''))) {
          if (s.length > 1) {
            resp.push(s);
          }
        }
      }
    } catch (ex) {
      this.err(ex);
    }
    return resp.join(' ');
  }
  /**
   * @param {string} str
   * @returns { { matched: RegExpMatchArray; type: null | string } }
   */
  badSlurCheck(str) {
    for (const [key, value] of Object.entries(badSlurs)) {
      const m = this.msgMatch(str, value, key);
      if (!m.type) continue;
      return m;
    }
    return {
      matched: '',
      type: null
    };
  }
  /**
   * @param {string} str
   * @returns {boolean}
   */
  toxicityCheck(str) {
    const regExp = new RegExp(
      `(stfu|asshole|ahole|shit|bitche*)s*(${str}|admin|team(mates*)?|you|u\\W|the(ir|re|y)|\\w{1}(e|im|er))|${profanity}`
    );
    return regExp.test(str);
  }
  /**
   * @param {string} str
   * @returns {RegExpMatchArray | string[]}
   */
  toxicityMatch(str) {
    const regExp = new RegExp(
      `(stfu|asshole|ahole|shit|bitche*})s*(${str}|admin|team(mates*)?|admin|you|u\\W|the(ir|re|y)|\\w{1}(e|im|er))|${profanity}`
    );
    const regMatch = str.match(regExp);
    if (regMatch.length > 0) {
      return regMatch;
    }
    return [];
  }
  /**
   * @param {string} str
   * @returns {boolean}
   */
  customCheck(str) {
    for (const sn of this.pfSquadNames) {
      if (!sn.regExp) continue;
      const regExp = new RegExp(sn.regExp);
      if (regExp.test(str)) {
        return true;
      }
    }
    return false;
  }
  /**
   * @template { string } T
   * @param { string } rawMessage
   * @param { RegExp } matchReg
   * @param {T} type
   * @returns { { matched: string; type: T | null } }
   */
  msgMatch(rawMessage, matchReg, type = 'Slur') {
    const resp = {
      matched: '',
      type: null
    };
    if (exemptions.test(rawMessage)) {
      return resp;
    }
    if (rawMessage.includes('?')) {
      const spArr = spaces.match(/?/) || [];
      if (spArr.length > 0) {
        resp.matched = spArr[0];
        resp.type = 'Political';
        return resp;
      }
    }
    const msg = trimMsg(rawMessage);
    const spaces = this.clrSpaces(msg);
    if (!this.isBlank(spaces)) {
      const spArr = spaces.match(matchReg) || [];
      if (spArr.length > 0) {
        resp.matched = spArr[0];
        resp.type = type;
        return resp;
      }
    }
    const msgArr = msg.match(matchReg) || [];
    if (msgArr.length > 0) {
      resp.matched = msgArr[0];
      resp.type = type;
    }
    return resp;
  }

  theHammer(info, rawMessage) {
    let rawCheck = {
      matched: '',
      type: null
    };
    const steamID = this.isValid(info, 'steamID');
    if (!steamID) {
      this.err('[theHammer] Invalid SteamID', info);
      return false;
    }
    const msgSlur = this.msgMatch(rawMessage, /g(a|e)+y|homo\b/, 'Slur');
    const msgVT = this.msgMatch(rawMessage, /kys|kill\s?(yo)?urself/, 'ViolentThreat');
    if (msgSlur.type) {
      rawCheck = msgSlur;
    } else if (msgVT.type) {
      rawCheck = msgVT;
    } else {
      rawCheck = this.badSlurCheck(rawMessage);
    }
    if (rawCheck.type) {
      const banContext = this.isNull(info.chat)
        ? rawMessage
        : (this.chatMessages.get(steamID) || []).map((item) => item.formatted).join('\n');
      this.addNote(
        info,
        rawCheck.type,
        '=============================',
        'SOP (STANDARD OPERATING PROCEDURES):',
        `? ${rawCheck.type}`,
        `? MATCHED: ${rawCheck.matched}`,
        '=============================',
        banContext
      );
      const asyncJob = async (bl) => {
        const messages = await this.sendDiscordMessage(
          bl,
          'content' in bl ? 'cerberus' : 'auto-bans'
        );
        for (const message of messages) {
          const msgThread = await message.startThread({
            name: this.isNull(info.chat) ? 'Ban Reason' : 'Chat History',
            autoArchiveDuration: 10080,
            reason: steamID
          });
          await msgThread.send({
            content: banContext
          });
        }
      };
      this.addToBanList(info, rawCheck.type, null, [
        {
          name: 'Words found',
          value: `${rawCheck.matched}`,
          inline: true
        },
        {
          name: 'Raw Message',
          value: `${rawMessage}`,
          inline: true
        },
        {
          name: this.isNull(info.chat) ? 'Ban Reason' : 'Chat History',
          value: 'Posted in **BAN NOTES** + **DISCORD THREAD**',
          inline: false
        }
      ]).then(asyncJob);
      this.msgAdmins(
        `Cerberus (Banned ${this.validName(info.player)} due to "${rawCheck.matched}")`
      );
      return true;
    }
    return false;
  }

  /**
   * @param {string} steamID
   * @param {string} threadContent
   * @param {string} threadName
   * @param {import("discord.js").Message<true>[]} messages
   */
  async createThread(steamID, threadContent, threadName = 'Ban Reason', messages) {
    for (const message of messages) {
      const msgThread = await message.startThread({
        name: threadName,
        autoArchiveDuration: 10080,
        reason: steamID
      });
      await msgThread.send({
        content: threadContent
      });
    }
  }

  /**
   * @param {import('../../squad-server').logParser.CHAT_MESSAGE} info
   */
  async profanityFilter(info) {
    try {
      const steamID = this.isValid(info, 'steamID');
      if (!steamID) {
        this.err('[profanityFilter] Invalid SteamID', info, steamID);
        return;
      }
      if (!this.chatMessages.has(steamID)) {
        this.chatMessages.set(steamID, []);
      }

      const rawMsg = this.isNull(info.chat) ? info.squadName : info.message;
      const msg = trimMsg(rawMsg);
      const { player } = info;
      const playerName = this.validName(player);

      if (!this.isNull(info.chat)) {
        const msgHistory = this.chatMessages.get(steamID);
        msgHistory.push({
          msg: rawMsg,
          formatted: `${this.format.time(info.time)} (${info.chat}) ${playerName}: ${rawMsg}`,
          timestamp: +info.time
        });
        this.chatMessages.set(steamID, msgHistory);
      }

      const checkHammer = this.theHammer(info, rawMsg);
      if (checkHammer) {
        return;
      }

      // #region Squad Names
      if (this.isNull(info.chat)) {
        if (this.toxicityCheck(msg) || /specialforce/.test(msg)) {
          this.msgAdmins(`Cerberus (Disbanned ${playerName} squad due to "${rawMsg}" in name)`);
          await this.disband(info, `Cerberus (Disbanned squad due to "${rawMsg}" in name)`);
        } else if (this.customCheck(msg)) {
          await this.disband(info, `${rawMsg} is not specific enough for asset claims`);
        }
        return;
      }
      // #endregion
      if (this.options.ignoreChats.includes(info.chat)) return;
      if (this.sorryMap.has(steamID) && apologyReg.test(msg)) {
        let toDelete = true;
        if (rawMsg === 'no') {
          toDelete = false;
          await this.warn(steamID, 'Cerberus (Did not like that)');
        } else if (/stfu/.test(msg)) {
          toDelete = false;
          await this.warn(steamID, /cerberus|bot/.test(msg) ? 'Cerberus (You have angered the Gods...)' : 'Cerberus (Did not like that)');
        } else if (/cerberus/.test(msg)) {
          await this.warn(steamID, "Cerberus (Aww it's okay ?)");
        } else {
          await this.warn(steamID, ranPick(apologyArr));
        }
        if (toDelete) {
          this.log(`${steamID} Has apologized for ${this.sorryMap.size} TKs`);
          this.sorryMap.delete(steamID);
        }
      }

      const msgMap = this.chatMessages.get(steamID);
      const calculateTime = 60 * 1000 * 5; // 5 mins
      const spamming = msgMap.filter((item, index) => {
        if (+info.time - item.timestamp > calculateTime) return false;
        if (index > 1) {
          const prev = msgMap.at(index - 1);
          const timestamp = item.timestamp - prev.timestamp;
          if (Object.is(item.msg, prev.msg) && timestamp < 100 * 60 * 1.5) {
            return true;
          }
        }
        return false;
      });
      if (spamming.length === 1) {
        await this.warn(steamID, "Cerberus (Please don't spam the chat!)");
      } else if (spamming.length === 2) {
        await this.warn(steamID, "Cerberus (Last warning, please don't spam the chat!)");
      } else if (spamming.length === 3) {
        await this.msgAdmins(`Cerberus (kicked ${player.name ?? steamID} for Spamming)`);
        await this.server.rcon.kick(steamID, 'Cerberus did warn you | Kicked for Spamming');
        return;
      }
      const discordMsg = {};
      const promiseArr = [];
      if (/running\s?man|stuck/g.test(msg)) {
        await this.warn(steamID, 'Do !stuck or !runningman in chat to fix this bug.');
        return;
      } else if (this.toxicityCheck(msg)) {
        const naughty = this.toxicityMatch(msg);
        const embed = this.buildEmbed(null, info.time)
          .setThumbnail('https://i.imgur.com/Hs94Zms.png')
          .setDescription(
            `**Detected Toxicity:** ${this.format.inlineCode(`(${info.chat}) ${rawMsg}`)}`
          )
          .addFields(
            {
              name: 'Player',
              value: this.validSteamID(info),
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
              name: 'Word Database',
              value: `${naughty.join(' ')}`,
              inline: false
            },
            {
              name: 'Chat History',
              value: 'Posted in **DISCORD THREAD**',
              inline: false
            }
          )
          .setColor(this.embedColors[info.chat]);
        Object.assign(discordMsg, this.objEmbed(embed));
        promiseArr.push(
          this.sendDiscordMessage(discordMsg, 'admin-alerts').then((messages) => {
            this.createThread(
              steamID,
              msgMap.map((item) => item.formatted).join('\n'),
              'Chat History',
              messages
            );
          })
        );
        if (this.isEmpty(this.onlineStaff())) {
          if (this.isSeeding()) {
            promiseArr.push(
              this.server.rcon.kick(steamID, 'Cerberus (Toxicity, be nice to your fellow gamers)')
            );
          } else {
            promiseArr.push(
              this.warn(
                steamID,
                'Cerberus (Toxicity can result in a BAN, be nice to your fellow gamers)'
              )
            );
          }
        } else {
          promiseArr.push(
            this.msgAdmins(`${playerName}: ${rawMsg}`),
            this.warn(
              steamID,
              'Cerberus (Toxicity can result in a BAN, be nice to your fellow gamers)'
            )
          );
        }
      } else if (
        /(http[s]|ftp|ssh|file)[:|?][\\|/|?|?].+|discord.+(@.+|[\\|/|?|?])/g.test(rawMsg)
      ) {
        const embed = this.buildEmbed(null, info.time)
          .setThumbnail('https://i.imgur.com/Hs94Zms.png')
          .setDescription('**Detected URL:** Advertisement/URL')
          .addFields(
            {
              name: 'Message',
              value: `(${info.chat}) ${rawMsg}`
            },
            {
              name: 'Player',
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
            },
            {
              name: 'Chat History',
              value: 'Posted in **DISCORD THREAD**',
              inline: false
            }
          );
        Object.assign(discordMsg, this.objEmbed(embed));
        promiseArr.push(
          this.sendDiscordMessage(discordMsg, 'admin-alerts').then((messages) => {
            this.createThread(
              steamID,
              msgMap.map((item) => item.formatted).join('\n'),
              'Chat History',
              messages
            );
          })
        );
        if (this.isEmpty(this.onlineStaff())) {
          promiseArr.push(this.server.rcon.kick(steamID, 'Advertisement/URLs'));
        } else {
          promiseArr.push(
            this.msgAdmins(`${playerName} (${rawMsg})`),
            this.warn(steamID, 'Cerberus (PLEASE do not post ADs or URLs)')
          );
        }
      } else if (
        Object.is(info.chat, 'ChatAll') &&
        /(hab.+)\s([a-z]\d{1,2}|map)/.test(rawMsg.toLowerCase())
      ) {
        const embed = this.buildEmbed(null, info.time)
          .setThumbnail('https://i.imgur.com/Hs94Zms.png')
          .setDescription('Detected **Ghosting/Griefing**')
          .addFields(
            {
              name: 'Message',
              value: `(${info.chat}) ${rawMsg}`
            },
            {
              name: 'Player',
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
            },
            {
              name: 'Chat History',
              value: 'Posted in **DISCORD THREAD**',
              inline: false
            }
          );
        Object.assign(discordMsg, this.objEmbed(embed));
        promiseArr.push(
          this.sendDiscordMessage(discordMsg, 'admin-alerts').then((messages) => {
            this.createThread(
              steamID,
              msgMap.map((item) => item.formatted).join('\n'),
              'Chat History',
              messages
            );
          }),
          this.msgAdmins(`${playerName} (${rawMsg})`)
        );
      }

      await Promise.all(promiseArr);

      if (!this.isBlank(promiseArr)) {
        this.chatMessages.delete(steamID);
      }
    } catch (ex) {
      this.err(ex);
    }
  }
  // #endregion

  // #region Utils
  playerList(fn) {
    const list = this.server.players.filter((p) => {
      if (this.isEmpty(p.steamID)) {
        return false;
      }
      return true;
    });
    if (typeof fn === 'function') {
      return list.filter(fn);
    }
    return list;
  }
  // #endregion

  colorTxt(bol = false, t = 'Synced', f = 'Not Synced') {
    if (bol) {
      return '```ansi\n[2;32m' + t + '[0m\n```';
    }
    return '```ansi\n[2;31m' + f + '[0m\n```';
  }

  // #region addToBanList
  async addToBanList(
    info = {},
    reason = '',
    expires = null,
    fields = [],
    banlist = 'default',
    cblSync = true
  ) {
    const discordMsg = {};
    try {
      const steamID = this.validator(info, 'steamID');
      if (!steamID) {
        throw new Error('[addToBanList] Invalid SteamID');
      }
      const serverName = this.format.inlineCode(this.server.serverName);
      const bl = await this.bmClient.addToBanList(info, reason, expires, this.Ban.reason, banlist);

      if (this.isNull(bl.id)) {
        throw new Error(JSON.stringify(bl));
      }

      const editBtn = this.buildButton(
        null,
        'View Ban',
        'Link',
        `https://www.battlemetrics.com/rcon/bans/edit/${bl.id}`
      );
      const cblBtn = this.buildButton(
        null,
        'View CBL',
        'Link',
        `https://communitybanlist.com/search/${steamID}`
      );
      Object.assign(discordMsg, this.formatRow([editBtn, cblBtn]));

      const expDate =
        bl.exp === 'Perm' || this.isNull(bl.exp)
          ? this.format.bold('Perm')
          : this.format.time(this.toDate(bl.exp));
      const embed = this.buildEmbed([255, 0, 0], info.time ?? new Date(), 'Cerberus')
        .setThumbnail('https://i.imgur.com/Hs94Zms.png')
        .addFields(
          {
            name: 'Player',
            value: this.validSteamID(info.player ?? info),
            inline: false
          },
          {
            name: 'Ban UUID',
            value: this.format.hyperlink(
              bl.UUID,
              `https://www.battlemetrics.com/rcon/bans/?filter[banList]=${
                bl.listData.listID ?? ''
              }&filter[search]=${bl.UUID ?? ''} 'View Ban'`
            ),
            inline: true
          },
          {
            name: 'Ban Info',
            value: `Banned until ${expDate} (${bl.formatExpires})`,
            inline: true
          },
          {
            name: 'Ban Message',
            value: bl.reason ?? bl.formatReason,
            inline: true
          },
          {
            name: 'Community Ban List Sync',
            value: this.colorTxt(cblSync),
            inline: false
          },
          ...fields
        );
      if ('admin' in info) {
        const adminID = this.isValid(info.admin, 'steamID');
        if (this.isEmpty(adminID)) {
          embed.setDescription(`Banned by **SYSTEM** on ${serverName}`);
        } else {
          embed.setDescription(`Banned by **ADMIN** on ${serverName}`).addFields({
            name: 'Banned By',
            value: this.validSteamID(info.admin)
          });
          await this.warn(adminID, `Success, created ban: ${bl.UUID}`);
        }
      } else {
        embed.setDescription(`Banned by **SYSTEM** on ${serverName}`);
      }
      await this.msgAdmins(`[Banned] ${bl.steamID ?? steamID}: ${bl.formatReason}`);
      Object.assign(discordMsg, this.objEmbed(embed));
    } catch (ex) {
      this.err('addToBanList', ex);
      if ('admin' in info) {
        const adminID = this.isValid(info.admin, 'steamID');
        if (adminID) {
          await this.warn(adminID, 'An error occured, please ban manually');
        }
      }
      discordMsg.content = `[${reason}] Error occured in addToBanList: ${ex.message}\n${
        ex.stack
      }\n${JSON.stringify(info, null, ' ')}`;
    }
    return discordMsg;
  }
  // #endregion
}

/** SquadJS Events
 * ADMIN_BROADCAST
 * DEPLOYABLE_DAMAGED
 * CHAT_MESSAGE
 * CHAT_COMMAND:<command message>
 * NEW_GAME
 * PLAYER_BANNED
 * PLAYER_DAMAGED
 * PLAYER_DIED
 * PLAYER_DISCONNECTED
 * PLAYER_CONNECTED
 * PLAYER_KICKED
 * PLAYER_POSSESS
 * PLAYER_REVIVED
 * PLAYER_SQUAD_CHANGE
 * PLAYER_TEAM_CHANGE
 * PLAYER_UNPOSSESS
 * PLAYER_WARNED
 * PLAYER_WOUNDED
 * POSSESSED_ADMIN_CAMERA
 * RCON_ERROR
 * ROUND_ENDED
 * SQUAD_CREATED
 * TEAMKILL
 * TICK_RATE
 * UPDATED_A2S_INFORMATION
 * UPDATED_PLAYER_INFORMATION
 * UPDATED_LAYER_INFORMATION
 * UNPOSSESSED_ADMIN_CAMERA
 */
