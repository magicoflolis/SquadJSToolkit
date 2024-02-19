// Profanity filter from `Toolkit.js`
// DO NOT ENABLE BOTH!
import ToolkitBase from './Toolkit-base.js';

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

export default class ToolkitProfanity extends ToolkitBase {
  static get description() {
    return 'The <code>ToolkitProfanity</code> plugin guards your server from any & all profanities, toxic players, or unwanted phrases!';
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
      }
    };
  }

  constructor(server, options, connectors) {
    super(server, options, connectors);

    // #region Binders
    this.onConnected = this.onConnected.bind(this);
    this.profanityFilter = this.profanityFilter.bind(this);
    // #endregion

    /**
     * @type { import("../utils/battlemetrics-api.js").default }
     */
    this.bmClient = this.options.bmClient;
    /** @type {Map} */
    this.chatMessages = this.objMaps.get('chatMessages');
    this.Ban = this.options.Ban ?? {
      note: 'Banned by Cerberus System',
      reason: '{{reason}} | {{timeLeft}}'
    };
  }

  async mount() {
    this.addListener(['CHAT_MESSAGE', 'SQUAD_CREATED'], this.profanityFilter);
    this.addListener('PLAYER_CONNECTED', this.onConnected);
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
          this.server.rcon.kick(steamID, 'Latin characters required | discord.gg/DMH'),
          this.msgAdmins(`[Player Kicked] ${playerName} Latin characters required`),
          this.sendDiscordMessage(this.objEmbed(embed))
        ]);
        return;
      }
      const m = this.badSlurCheck(playerName);
      if (m.type) {
        const embed = this.buildEmbed([0, 201, 255], info.time ?? new Date())
          .setThumbnail('https://i.imgur.com/Hs94Zms.png')
          .setDescription(`**Player Kicked:** \`(${m.type}) ${m.matched}\` Rule 3 Violation`)
          .addFields({
            name: 'Player',
            value: this.validSteamID(player)
          });
        await Promise.all([
          this.server.rcon.kick(
            steamID,
            `Change your username: (${m.type}) ${m.matched} | Rule 3 | discord.gg/DMH`
          ),
          this.msgAdmins(`[Player Kicked] ${playerName}`),
          this.sendDiscordMessage(this.objEmbed(embed))
        ]);
        return;
      }

      if (!this.chatMessages.has(steamID)) {
        this.chatMessages.set(steamID, []);
      }
    } catch (ex) {
      this.err(ex);
    }
  }
  // #endregion

  /**
   * Add to BattleMetrics ban note
   * @template [O={}]
   * @param { O } info
   * @param { string } reason
   * @param  { ...string } evidence
   * @returns { { note: string; } extends O }
   */
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
   * @param { string } str
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
    if (rawMessage.includes('卐')) {
      const spArr = spaces.match(/卐/) || [];
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
        `➼ ${rawCheck.type}`,
        `➼ MATCHED: ${rawCheck.matched}`,
        '=============================',
        banContext
      );
      const asyncJob = async (bl) => {
        const messages = await this.sendDiscordMessage(
          bl
          // 'content' in bl ? 'cerberus' : 'auto-bans'
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
        }
        return;
      }
      // #endregion
      if (this.options.ignoreChats.includes(info.chat)) return;

      const msgMap = this.chatMessages.get(steamID);
      const discordMsg = {};
      const promiseArr = [];
      if (this.toxicityCheck(msg)) {
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
          this.sendDiscordMessage(discordMsg).then((messages) => {
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
        /(http[s]|ftp|ssh|file)[:|：][\\|/|＼|／].+|discord.+(@.+|[\\|/|＼|／])/g.test(rawMsg)
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
          this.sendDiscordMessage(discordMsg).then((messages) => {
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
          this.sendDiscordMessage(discordMsg).then((messages) => {
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
            value: bl.reason ?? bl.formatReason ?? 'No reason given',
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
