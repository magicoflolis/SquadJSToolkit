import Logger from 'core/logger';
import BasePlugin from './base-plugin.js';
import {
  ActionRowBuilder,
  bold,
  ButtonBuilder,
  ButtonStyle,
  channelMention,
  codeBlock,
  EmbedBuilder,
  hideLinkEmbed,
  hyperlink,
  inlineCode,
  roleMention,
  time,
  userMention
} from 'discord.js';

const vAPI = {
  jobs: [],
  add: function (job) {
    this.jobs.push(job);
  },
  exec: function () {
    // Shutdown asynchronously, to ensure shutdown jobs are called from
    // the top context.
    setTimeout(() => {
      const jobs = this.jobs.slice();
      this.jobs.length = 0;
      while (jobs.length !== 0) {
        jobs.pop()();
      }
    });
  },
  remove: function (job) {
    let pos;
    while ((pos = this.jobs.indexOf(job)) !== -1) {
      this.jobs.splice(pos, 1);
    }
  }
};

const embedColors = {
  CameraEntered: 2202966,
  CameraLeft: 15416641,
  ChatAll: [0, 201, 255],
  ChatAdmin: [13, 228, 228],
  ChatSquad: [63, 255, 0],
  ChatTeam: [28, 172, 222],
  TeamKills: [255, 0, 0]
};

const embedInfoDefaults = {
  clan: 'SquadJS ',
  name: 'Server Watchdog',
  iconURL: null,
  url: null,
  format: {
    player:
      "[[{{name}}](https://www.battlemetrics.com/rcon/players?filter[search]={{EOSID}}&method=quick&redirect=1 'Go to BattleMetrics')] - [[{{steamID}}](https://steamcommunity.com/profiles/{{steamID}} 'Go to Steam Profile')]",
    squad: '{{squadID}} : {{squadName}}',
    team: '{{teamID}} : {{teamName}}'
  }
};

export default class ToolkitBase extends BasePlugin {
  static get optionsSpecification() {
    return {
      discordClient: {
        required: true,
        description: 'Discord connector name.',
        connector: 'discord',
        default: 'discord'
      },
      chatColors: {
        required: false,
        description: 'Chat colors',
        default: embedColors
      },
      embedInfo: {
        required: false,
        description: 'Server info for embed messages.',
        default: embedInfoDefaults,
        example: {
          clan: '[SquadJS] ',
          name: 'Cerberus',
          iconURL: '<Image URL>',
          url: 'https://www.battlemetrics.com/servers/squad/<Server ID>',
          format: {
            player: '[{{name}}](https://steamcommunity.com/profiles/{{steamID}})',
            squad: '({{squadID}}) - {{squadName}}',
            team: '({{teamID}}) - {{teamName}}'
          }
        }
      },
      DNDPlayers: {
        required: false,
        description: 'Do Not Disturb Players',
        default: {
          ping: [],
          warning: []
        },
        example: {
          ping: ['76543210987654321'],
          warning: ['76543210987654321']
        }
      },
      Staff: {
        required: false,
        description: 'Determine which perms a staff memeber has',
        default: {
          Admin: {
            perms: ['cameraman'],
            steamIDs: [],
            userIDs: []
          },
          BaseAdmin: {
            perms: ['canseeadminchat'],
            steamIDs: [],
            userIDs: []
          },
          Owner: {
            perms: ['!featuretest', 'manageserver'],
            steamIDs: [],
            userIDs: []
          },
          Dev: {
            perms: ['debug', 'featuretest'],
            steamIDs: [],
            userIDs: []
          }
        },
        example: {
          Admin: {
            perms: ['cameraman'],
            steamIDs: [],
            userIDs: []
          },
          BaseAdmin: {
            perms: ['canseeadminchat'],
            steamIDs: [],
            userIDs: []
          },
          Owner: {
            perms: ['!debug', 'featuretest'],
            steamIDs: [],
            userIDs: []
          },
          Dev: {
            perms: ['debug', 'featuretest'],
            steamIDs: ['76543210987654321'],
            userIDs: ['123456789012345678']
          }
        }
      }
    };
  }

  // #region Constructor
  constructor(server, options, connectors) {
    super(server, options, connectors);

    // #region Binders
    this.dbg = this.dbg.bind(this);
    this.err = this.err.bind(this);
    this.log = this.log.bind(this);
    this.warn = this.warn.bind(this);
    this.broadcast = this.broadcast.bind(this);
    this.clearSystem = this.clearSystem.bind(this);
    // #endregion

    /** @type { import('discord.js').Client<true> } */
    this.discordClient = this.options.discordClient;
    this.DiscordBot = this.server.DiscordBot;
    this.sendDiscordMessage = this.DiscordBot.sendDiscordMessage;

    this.webURL = this.server.webURL || 'https://www.battlemetrics.com/servers/squad';
    this.embedColors = this.setObj(embedColors, this.options.chatColors ?? {});
    this.embedInfo = this.setObj(
      'DiscordBot' in this.server ? this.DiscordBot.embedInfo : embedInfoDefaults,
      this.options.embedInfo ?? {}
    );
    this.channels = new Map();
    this.objMaps = this.server.objMaps;

    this.DNDPlayers = this.options.DNDPlayers || { ping: [], warning: [] };
    /** @type { import("./Toolkit.d.ts").optionsSpecificationsString } */
    this.Staff = this.options.Staff;
  }
  // #endregion

  // #region prepareToMount
  async prepareToMount() {
    this.channels = this.DiscordBot.getChannels();
  }
  // #endregion

  // #region mount
  async mount() {
    this.addListener('ROUND_ENDED', this.clearSystem);
  }
  // #endregion

  // #region unmount
  async unmount() {
    this.objMaps.clear();
    vAPI.exec();
  }
  // #endregion

  clearSystem() {
    for (const value of this.objMaps.values()) {
      if (!(value instanceof Map)) continue;
      value.clear();
    }
  }

  format = {
    bold,
    channelMention,
    codeBlock,
    hideLinkEmbed,
    hyperlink,
    inlineCode,
    roleMention,
    time,
    userMention
  };
  /**
   * @type { import('./Toolkit.d.ts').ToolkitBase["toDate"] }
   */
  toDate(str) {
    const resp = [];
    for (const key of this.normalizeTarget(str)) {
      if (key instanceof Date) {
        resp.push(key);
      } else {
        resp.push(new Date(key));
      }
    }
    return resp.length >= 2 ? resp : resp[0];
  }
  /**
   * @type { import('./Toolkit.d.ts').ToolkitBase["buildButton"] }
   */
  buildButton(CustomId, Label, style = 'Primary', link) {
    const btn = new ButtonBuilder().setLabel(Label).setStyle(ButtonStyle[style]);
    if (this.isEmpty(link)) {
      btn.setCustomId(CustomId);
    } else {
      btn.setURL(link);
    }
    return btn;
  }
  /**
   * @type { import('./Toolkit.d.ts').ToolkitBase["buildEmbed"] }
   */
  buildEmbed(color, time, author, options = {}) {
    const embed = new EmbedBuilder();
    if (this.isObj(author)) {
      embed.setAuthor(author);
    } else {
      options.name = author ?? this.embedInfo.name;
      const eInfo = this.setObj(this.embedInfo, options);
      embed.setAuthor({
        name: `${this.isEmpty(eInfo.clan) ? '' : eInfo.clan}${eInfo.name}`,
        iconURL: eInfo.iconURL,
        url: eInfo.url
      });
    }
    if (options.title) {
      embed.setTitle(options.title);
    }
    if (options.desc) {
      embed.setDescription(options.desc);
    }
    if (typeof options.thumb === 'string') {
      embed.setThumbnail(options.thumb);
    }
    if (!this.isEmpty(color)) {
      if (typeof color === 'string') {
        embed.setColor(color in this.embedColors ? this.embedColors[color] : color);
      } else {
        embed.setColor(color);
      }
    }
    if (this.isNull(time)) {
      embed.setTimestamp(new Date());
    } else if (typeof time === 'string') {
      embed.setTimestamp(new Date(time));
    } else {
      embed.setTimestamp(time);
    }
    return embed;
  }

  /**
   * @template { import("discord.js").EmbedBuilder } EB
   * @param { EB | EB[] | Set<EB> } embed
   * @returns { { embeds: EB[], files: FA[] } }
   */
  objEmbed(embed, file) {
    /**
     * @type { { embeds: EB[], files: FA[] } }
     */
    const obj = {
      embeds: [],
      files: []
    };
    if (embed) {
      if (Array.isArray(embed)) {
        obj.embeds = embed;
      } else if (embed instanceof Set) {
        obj.embeds = [...embed];
      } else {
        obj.embeds = [embed];
      }
    }
    if (file) {
      if (Array.isArray(file)) {
        obj.files = file;
      } else if (file instanceof Set) {
        obj.files = [...file];
      } else {
        obj.files = [file];
      }
    }
    return obj;
  }

  /**
   * @template { import("discord.js").ButtonBuilder } BB
   * @param { BB[] } buttons
   * @returns { { components: import("discord.js").ActionRowBuilder<BB>[] } }
   */
  formatRow(buttons) {
    const row = new ActionRowBuilder().addComponents(...buttons);
    return {
      components: [row]
    };
  }

  addListener(events, ...callbacks) {
    try {
      for (const c of this.normalizeTarget(callbacks)) {
        c.bind(this);
      }
      for (const evt of this.normalizeTarget(events)) {
        const trigCalls = (info) => {
          try {
            for (const c of this.normalizeTarget(callbacks)) {
              c(info); // c.call(this, info);
            }
          } catch (ex) {
            this.err(ex);
          }
        };
        this.server.addListener(evt, trigCalls);
        vAPI.add(() => {
          this.server.removeListener(evt, trigCalls);
        });
      }
    } catch (ex) {
      this.err(ex);
    }
  }
  /**
   * @type { import('./Toolkit.d.ts').ToolkitBase["setObj"] }
   */
  setObj(objA = {}, objB = {}) {
    objA = objA ?? {};
    objB = objB ?? {};
    for (const [key, value] of Object.entries(objA)) {
      if (!Object.hasOwn(objB, key)) {
        objB[key] = value;
      } else if (typeof value === 'object') {
        this.setObj(value, objB[key]);
      }
    }
    return objB;
  }

  isSeeding() {
    return this.server.a2sPlayerCount < 50;
  }

  getStaff(type = 'Admin', str = 'perms') {
    try {
      if (!(this.isStr(type) || this.isStr(str))) {
        return '';
      }
      if (type in this.Staff) {
        if (this.isEmpty(str)) {
          return this.Staff[type];
        }
        if (str in this.Staff[type]) {
          return this.Staff[type][str];
        }
      }
    } catch (ex) {
      this.err(ex);
    }
    return '';
  }

  isAdmin(steamID) {
    if (!this.Perms.has(steamID)) {
      return false;
    }
    try {
      const staffType = this.getStaff('Admin', 'perms');
      if (this.isEmpty(staffType) || Array.isArray(staffType)) {
        return false;
      }
      for (const perm of staffType) {
        const hasException = /!([\w]+)/.exec(perm);
        if (!this.isNull(hasException)) {
          if (!this.hasPerm(steamID, hasException[1])) {
            continue;
          }
        }
        if (this.hasPerm(steamID, perm)) continue;
        return false;
      }
      return true;
    } catch (ex) {
      this.err(ex);
    }
  }

  isAnyAdmin(steamID) {
    if (!this.Perms.has(steamID)) {
      return false;
    }
    try {
      const staffType = this.getStaff('BaseAdmin', 'perms');
      if (this.isEmpty(staffType) || Array.isArray(staffType)) {
        return false;
      }
      for (const perm of staffType) {
        const hasException = /!([\w]+)/.exec(perm);
        if (!this.isNull(hasException)) {
          if (!this.hasPerm(steamID, hasException[1])) {
            continue;
          }
        }
        if (this.hasPerm(steamID, perm)) continue;
        return false;
      }
      return true;
    } catch (ex) {
      this.err(ex);
    }
  }

  isDev(steamID) {
    try {
      if (!this.Perms.has(steamID)) {
        return false;
      }
      const staffType = this.getStaff('Dev', 'perms');
      if (this.isEmpty(staffType) || !Array.isArray(staffType)) {
        return false;
      }
      for (const perm of staffType) {
        const hasException = /!([\w]+)/.exec(perm);
        if (!this.isNull(hasException)) {
          if (!this.hasPerm(steamID, hasException[1])) {
            continue;
          }
        }
        if (this.hasPerm(steamID, perm)) {
          return true;
        }
      }
      return false;
    } catch (ex) {
      this.err(ex);
    }
  }

  isOwner(steamID) {
    if (!this.Perms.has(steamID)) {
      return false;
    }
    const staffType = this.getStaff('Owner', 'perms');
    if (this.isEmpty(staffType) || !Array.isArray(staffType)) {
      return false;
    }
    for (const perm of staffType) {
      const hasException = /!([\w]+)/.exec(perm);
      if (!this.isNull(hasException)) {
        if (!this.hasPerm(steamID, hasException[1])) {
          continue;
        }
      }
      if (this.hasPerm(steamID, perm)) continue;
      return false;
    }
    return true;
  }

  hasPerm(steamID, perm) {
    if (!this.Perms.has(steamID)) {
      return false;
    }
    return perm in this.server.admins[steamID];
  }

  Perms = {
    /**
     * @template { string } S
     * @param { S } steamID 
     * @returns { SquadJS.SquadServer["admins"][S] | null }
     */
    get: (steamID) => {
      if (steamID && this.Perms.has(steamID)) {
        return this.server.admins[steamID];
      }
      return null;
    },
    has: (steamID, perm) => {
      if (steamID) {
        if (perm) {
          return Boolean(this.server.admins) && steamID in this.server.admins && perm in this.server.admins[steamID];
        }
        return Boolean(this.server.admins) && steamID in this.server.admins;
      }
      return false;
    },
    Staff: {
      /**
       * @template { import("./Toolkit.d.ts").optionsSpecificationsString } O
       * @template { string } C
       * @template { string } T
       * @param { C } category 
       * @param { T } type
       * @returns { O[C][T] | null }
       */
      get: (category = 'Admin', type = 'perms') => {
        if (category && this.Perms.Staff.has(category)) {
          if (type && this.Perms.Staff.has(category, type)) {
            return this.Staff[category][type];
          }
          return this.Staff[category];
        }
        return null;
      },
      has: (category, type) => {
        if (category) {
          if (type) {
            return Boolean(this.Staff) && category in this.Staff && type in this.Staff[category];
          }
          return Boolean(this.Staff) && category in this.Staff;
        }
        return false;
      },
    }
  }

  /**
   *
   * @param { string } msg
   * @returns { Promise<void> }
   */
  async broadcast(msg) {
    await this.server.rcon.broadcast(msg);
  }
  /**
   *
   * @param { SquadJSRcon.PlayerType["steamID"] } steamID
   * @param { 'warning' | 'ping' } type
   * @returns { boolean }
   */
  getDND(steamID, type = 'warning') {
    try {
      if (!(this.isStr(steamID) || this.isStr(type))) {
        return true;
      }
      if (type in this.DNDPlayers) {
        if (Array.isArray(this.DNDPlayers[type])) {
          return this.isBlank(this.DNDPlayers[type].filter((item) => Object.is(steamID, item)));
        }
      }
      return true;
    } catch (ex) {
      this.err(ex);
    }
  }
  /**
   *
   * @param { SquadJSRcon.PlayerType["steamID"] | SquadJSRcon.PlayerType["steamID"][] } steamID
   * @param { string | string[] } msg
   * @param { "warning" | "ping" } type
   * @param { boolean } force
   * @returns { Promise<undefined | void> }
   */
  async warn(steamID, msg, type = 'warning', force = false) {
    try {
      if (this.isEmpty(steamID) || this.isEmpty(msg)) return;
      const sendWarning = async () => {
        if (Array.isArray(msg)) {
          for (const m of msg) {
            for (const Id of this.normalizeTarget(steamID)) {
              await this.server.rcon.warn(this.isObj(Id) ? Id.steamID : Id, m);
              await this.delay(1000);
            }
          }
        } else {
          for (const Id of this.normalizeTarget(steamID)) {
            await this.server.rcon.warn(this.isObj(Id) ? Id.steamID : Id, msg);
          }
        }
      };
      if (force) {
        await sendWarning();
        return;
      }
      if (!this.getDND(steamID, type)) return;
      await sendWarning();
    } catch (ex) {
      this.err(ex);
    }
  }

  // #region Msg Admins
  async msgAdmins(txt = '') {
    for (const steamID of this.onlineStaff('isAdmin')) {
      await this.warn(steamID, txt, 'ping');
    }
  }
  // #endregion

  // #region Msg Dev
  async msgDev(txt = '') {
    this.verbose(1, txt);
    for (const steamID of this.onlineStaff('isDev')) {
      await this.warn(steamID, txt, 'ping');
    }
  }
  // #endregion

  // #region Msg Owners
  async msgOwners(txt = '') {
    for (const steamID of this.onlineStaff('isOwner')) {
      await this.warn(steamID, txt, 'ping');
    }
  }
  // #endregion

  // #region onlineStaff
  /**
   * @param { 'isAdmin' | 'isOwner' | 'isDev' } type
   * @returns { SquadJSRcon.PlayerType[] }
   */
  onlineStaff(type = 'isAdmin') {
    const staff = [];
    for (const p of this.server.players) {
      if (!p.steamID) continue;
      if (!this[type](p.steamID)) continue;
      staff.push(p.steamID);
    }
    // this.server.players.filter((p) => p.steamID && this[type](p.steamID)).map((p) => p.steamID);
    return staff;
  }
  // #endregion
  /**
   * setTimeout w/ Promise
   * @param { number | 5000} timeout - Delay in milliseconds
   * @returns { Promise<void> } Promise object
   */
  delay(timeout = 5000) {
    return new Promise((resolve) => setTimeout(resolve, timeout));
  }
  /**
   * @template T
   * @param { T } target
   * @returns { T[] }
   */
  normalizeTarget(target) {
    if (target === null) {
      return [];
    }
    if (Array.isArray(target)) {
      return target;
    }
    if (target instanceof Map) {
      const arr = [];
      for (const [k, v] of target) {
        arr.push([k, v]);
      }
      return arr;
    }
    if (target instanceof Set) {
      return [...target];
    }
    if (typeof target === 'string') {
      return [target];
    }
    if (Array.from(target).length > 0) {
      return Array.from(target)
    }
    return [target];
  }

  /**
   * Object is `Function`
   * @template O
   * @param { O } obj
   * @returns { boolean }
   */
  isFunc(obj) {
    /** @type { string } */
    const s = Object.prototype.toString.call(obj);
    return s.includes('Function');
  }

  /**
   * Object is typeof `{}`
   * @template O
   * @param { O } obj
   * @returns { boolean }
   */
  isObj(obj) {
    /** @type { string } */
    const s = Object.prototype.toString.call(obj);
    return s.includes('Object');
  }

  /**
   * Object is typeof `new Set()` or `new Map()`
   * @template O
   * @param { O } obj
   * @returns { boolean }
   */
  isSM(obj) {
    /** @type { string } */
    const s = Object.prototype.toString.call(obj);
    return s.includes('Set') || s.includes('Map');
  }

  /**
   * Object is typeof `""`
   * @template O
   * @param { O } obj
   * @returns { boolean }
   */
  isStr(obj) {
    /** @type { string } */
    const s = Object.prototype.toString.call(obj);
    return s.includes('String');
  }

  /**
   * Object is `null` or `undefined`
   * @template O
   * @param { O } obj - Object
   * @returns { boolean } Returns if statement true or false
   */
  isNull(obj) {
    return Object.is(obj, null) || Object.is(obj, undefined);
  }

  /**
   * Object is Blank
   * @template O
   * @param { O } obj - String, Array, Set, Map, or Object
   * @returns { boolean } Returns if statement true or false
   */
  isBlank(obj) {
    return (
      (typeof obj === 'string' && Object.is(obj.trim(), '')) ||
      (this.isSM(obj) && Object.is(obj.size, 0)) ||
      (Array.isArray(obj) && Object.is(obj.length, 0)) ||
      (this.isObj(obj) && Object.is(Object.keys(obj).length, 0))
    );
  }

  /**
   * Object is Empty
   * @template O
   * @param { O } obj - String, Array, Set, Map, or Object
   * @returns { boolean } Returns if statement true or false
   */
  isEmpty(obj) {
    return this.isNull(obj) || this.isBlank(obj);
  }
  /**
   * @template [O={}]
   * @param { O } obj
   * @param { string } locate
   * @returns { keyof O | null }
   */
  validator(obj = {}, locate = '') {
    try {
      obj = obj || {};
      if (!this.isStr(locate)) {
        throw new Error('{ locate } needs to be a type of String');
      }
      if (!this.isObj(obj)) {
        throw new Error('{ obj } needs to be a type of Object');
      }
      for (const [key, value] of Object.entries(obj)) {
        if (value instanceof Date) continue;
        if (key === locate) {
          return value;
        } else if (typeof value === 'object') {
          return this.validator(value, locate);
        }
      }
    } catch (ex) {
      this.err(ex);
    }
    return null;
  }
  /**
   * @template [O=object]
   * @param { O } info - Root object
   * @param { string } template - String template
   * @param { boolean } bol - Return template if invalid
   * @returns { keyof O | null } Returns boolean, template, or value of template if valid
   * @example <caption>Example usage</caption>
   * this.isValid(info, '{{steamID}}'); // Returns '76774190522813645'
   * this.isValid(info, 'steamID'); // Returns '76774190522813645'
   * this.isValid(info.squadID, '{{steamID}}'); // Returns '{{steamID}}'
   * this.isValid(info.squadID, 'steamID'); // Returns false
   */
  isValid(info = {}, template = '', bol = true) {
    const reg = /\{\{(.*?)\}\}/g;
    try {
      if (!this.isStr(template)) {
        throw new Error('{ template } needs to be a type of String');
      }
      if (!this.isObj(info)) {
        throw new Error('{ info } needs to be a type of Object');
      }
      if (!bol) {
        return template.replace(reg, (_match, root) => {
          const key = this.validator(info, root);
          return this.isNull(key) ? root : key;
        });
      }
      const resp = this.validator(
        info,
        template.replace(reg, (_match, root) => {
          return root;
        })
      );
      return resp;
    } catch (ex) {
      this.err(ex, info, template);
    }
    if (!bol) {
      return template;
    }
    return null;
  }

  /**
   * @template { string } N
   * @param { N } name
   */
  embedFormat(name) {
    const defFormat = {
      player: `[${this.format.hyperlink(
        '{{name}}',
        'https://www.battlemetrics.com/rcon/players?filter[search]={{EOSID}}&method=quick&redirect=1',
        'Go to BattleMetrics'
      )}] - [${this.format.hyperlink(
        '{{steamID}}',
        'https://steamcommunity.com/profiles/{{steamID}}',
        'Go to Steam Profile'
      )}]`,
      squad: '{{squadID}} : {{squadName}}',
      team: '{{teamID}} : {{teamName}}'
    };
    if ('name' in this.embedInfo.format) {
      return this.embedInfo.format[name];
    }
    if (name in defFormat) {
      return defFormat[name];
    }
    return name;
  }

  validName(info) {
    if (!this.isObj(info)) {
      return 'Undefined Player / Admin';
    }
    const obj = this.validator(info, 'name');
    if (this.isEmpty(obj) || Object.is(obj, 'name')) {
      return 'Undefined Player / Admin';
    }
    return obj;
  }

  validSquad(info) {
    if (!this.isObj(info)) {
      return 'Undefined Squad';
    }
    const format = this.embedFormat('squad');
    const obj = this.isValid(info, format, false);
    if (this.isEmpty(obj) || obj.includes('squadName') || Object.is(obj, format)) {
      return 'Unassigned Squad';
    }
    return obj;
  }

  validSteamID(info) {
    if (!this.isObj(info)) {
      return 'Undefined SteamID';
    }
    const format = this.embedFormat('player');
    const obj = this.isValid(info, format, false);
    if (this.isEmpty(obj) || Object.is(obj, format)) {
      return 'Undefined SteamID';
    }
    return obj;
  }

  validTeam(info) {
    if (!this.isObj(info)) {
      return 'Undefined Team';
    }
    const format = this.embedFormat('team');
    const obj = this.isValid(info, format, false);
    if (this.isEmpty(obj) || Object.is(obj, format)) {
      return 'Unassigned Team';
    }
    return obj;
  }

  // #region Console Logs
  dbg(...msg) {
    Logger.verbose(...msg);
  }

  err(...msg) {
    console.error(...msg);
    Logger.err(1, ...msg);
  }

  log(...msg) {
    Logger.verbose('Toolkit', 1, ...msg);
  }
  // #endregion
}
