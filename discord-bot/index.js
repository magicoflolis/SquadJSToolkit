import {
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  REST,
  Routes,
  WebhookClient
} from 'discord.js';
import Logger from 'core/logger';
import { loadCommands, loadEvents } from './util/loaders.js';
import { registerEvents } from './util/registerEvents.js';
import { COPYRIGHT_MESSAGE } from '../squad-server/utils/constants.js';

/**
 * @typedef { import('../squad-server').SquadJS } SquadJS
 */
/**
 * @typedef { object } embedInfo
 * @property { string | null } clan
 * @property { string } name
 * @property { string | null } iconURL
 * @property { string | null } url
 * @property { {player: string;squad: string;team: string;} } format
 */

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

const normalizeTarget = (target) => {
  if (typeof target === 'string') {
    return [target];
  }
  if (target === null) {
    return [];
  }
  if (Array.isArray(target)) {
    return target;
  }
  if (target instanceof Set) {
    return [...target];
  }
  if (target instanceof Date) {
    return [target];
  }
  if (target instanceof Map) {
    const arr = [];
    for (const [k, v] of target) {
      arr.push([k, v]);
    }
    return arr;
  }
  return Array.from(target);
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

export default class DiscordBot {
  constructor(connectorConfig) {
    this.log = this.log.bind(this);
    this.err = this.err.bind(this);

    if (typeof connectorConfig === 'string') {
      this.token = connectorConfig;
    } else if (typeof connectorConfig === 'object') {
      this.setObj(connectorConfig, this);
    } else {
      throw new Error('{ connectorConfig } is invalid / must be a type of String or Object');
    }

    if (isEmpty(this.server)) {
      /**
       * @type { SquadJS.SquadServer | null }
       */
      this.server = null;
    }
    this.embedColors = this.setObj(embedColors, this.chatColors ?? {});
    /**
     * @type { embedInfo }
     */
    this.embedInfo = this.setObj(
      {
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
      },
      this.embedDefaults ?? {}
    );

    const intents = [];
    if (Array.isArray(this.intents)) {
      for (const intent of this.intents) {
        intents.push(GatewayIntentBits[intent]);
      }
    } else {
      for (const intent of ['Guilds', 'GuildMessages', 'MessageContent']) {
        intents.push(GatewayIntentBits[intent]);
      }
    }
    this.channels = new Map();
    if (
      Boolean(this.webhook) &&
      typeof this.webhook === 'object' &&
      'id' in this.webhook &&
      'token' in this.webhook
    ) {
      this.webhook = new WebhookClient({ id: this.webhook.id, token: this.webhook.token });
    } else {
      this.webhook = null;
    }
    this.client = new Client({ intents });
    this.client.on(Events.Warn, this.log);
    this.client.on(Events.Error, this.err);
    this.init();
  }
  /**
   * @template { {} } B
   * @param { {} } objA
   * @param { B } objB
   * @returns { B }
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
  /**
   * @returns { Promise<this> }
   */
  auth() {
    return new Promise((resolve, reject) => {
      this.log('Logging in...');
      this.client.once(Events.ClientReady, (c) => {
        this.log(`Logged in as ${c.user.tag}`);
        resolve(this);
      });
      this.client.once(Events.Error, reject);
      this.client.login(this.token);
    });
  }

  loadChannels(channels = []) {
    try {
      if (!Array.isArray(channels)) {
        throw new Error('"channels" must be a typeof "Array"');
      }
      for (const obj of channels) {
        try {
          if (typeof obj === 'string') {
            if (this.client.channels.cache.has(obj)) {
              this.channels.set(obj, {
                channel: this.client.channels.cache.get(obj),
                channelID: obj
              });
            }
            continue;
          }
          if (typeof obj.channelID !== 'string') {
            throw new Error('"channelID" must be a typeof "String"', { cause: 'prepareToMount' });
          }
          if (typeof obj.label !== 'string') {
            throw new Error('"label" must be a typeof "String"', { cause: 'prepareToMount' });
          }
          this.channels.set(obj.label, {
            channel: this.client.channels.cache.get(obj.channelID),
            ...obj
          });
        } catch (ex) {
          const caused = 'cause' in ex ? `[${ex.cause}] ` : '';
          this.err(
            `${caused}Could not fetch Discord channel w/ channelID { ${JSON.stringify(obj)} }, ${
              ex.message
            }`
          );
          this.err(`${ex.stack}`);
        }
      }
    } catch (e) {
      this.err(e);
    }
    this.log(`Loaded ${this.channels.size} Discord Channels.`);
    return this.channels;
  }

  getChannels(channels = null) {
    if (!channels && isBlank(this.channels)) {
      return this.loadChannels(
        'channelIDs' in this ? this.channelIDs : 'channelID' in this ? [this.channelID] : null
      );
    }
    if (channels) {
      return this.loadChannels(channels);
    }
    return this.channels;
  }
  /**
   * sendDiscordMessage
   * @param { import('discord.js').MessageResolvable } message - Message to send to channel
   * @param { string[] | string } labels - String or Array of channel labels
   * @returns { Promise<import("discord.js").Message<true>[]> }
   */
  async sendDiscordMessage(message, labels = []) {
    const toSend = [];
    /**
     * getDiscordChannel
     * @param { string[] | string } lab - String or Array of channel labels
     * @returns { import("discord.js").TextChannel[] }
     */
    const getDiscordChannel = (lab) => {
      const cLabels = [];
      const response = [];
      try {
        if (isBlank(this.channels)) {
          this.log('Could not send Discord Message. Channels not initialized.');
          return response;
        }
        if (isEmpty(lab) && this.channels.size === 1) {
          cLabels.push('default');
        } else if (typeof lab === 'string') {
          cLabels.push(lab);
        } else {
          cLabels.push(...normalizeTarget(lab));
        }
        for (const label of cLabels) {
          if (!this.channels.has(label)) continue;
          const c = this.channels.get(label);
          if (isEmpty(c.channel)) {
            this.log('Could not get Discord channel, channel is not initialized.', label);
            break;
          }
          response.push(c.channel);
        }
      } catch (ex) {
        this.err(ex);
      }
      return response;
    };
    const getChannels = getDiscordChannel(labels);
    try {
      if (isEmpty(message)) {
        this.log('Could not send Discord Message, message is empty.');
        return;
      }
      if (isBlank(getChannels)) {
        this.log('Could not send Discord Message, channels are empty.');
        return;
      }
      if (typeof message === 'object') {
        if ('embed' in message) {
          message.embeds = message.embed;
          delete message.embed;
        }
        if ('embeds' in message) {
          const copyright = {
            text: COPYRIGHT_MESSAGE,
            icon_url: null
          };
          const addCopyright = (e) => {
            if (e instanceof EmbedBuilder) {
              if (!e.data.footer?.text.includes('SquadJS')) {
                e.setFooter(copyright);
              }
              return e;
            }
            const toEmbed = EmbedBuilder.from(e);
            if (!toEmbed.data.footer?.text.includes('SquadJS')) {
              toEmbed.setFooter(copyright);
            }
            return toEmbed;
          };
          if (!Array.isArray(message.embeds)) {
            if (message.embeds instanceof Set) {
              message.embeds = [...message.embeds];
            } else {
              message.embeds = [message.embeds];
            }
          }
          message.embeds = message.embeds.map(addCopyright);
        }
      }
      for (const channel of getChannels) {
        toSend.push(channel.send(message));
      }
    } catch (ex) {
      this.err(ex);
    }
    return Promise.all(toSend);
  }
  /**
   * @param { import("discord.js").RGBTuple | number | null } color
   * @param { Date | number | null } time
   * @param { import("discord.js").EmbedAuthorOptions | null } author
   * @param { {} } options
   * @returns { EmbedBuilder }
   */
  buildEmbed(color, time, author, options = {}) {
    const embed = new EmbedBuilder();
    if (typeof author === 'object') {
      embed.setAuthor(author);
    } else {
      options.name = author ?? this.embedInfo.name;
      const eInfo = this.setObj(this.embedInfo, options);
      embed.setAuthor({
        name: `${isEmpty(eInfo.clan) ? '' : eInfo.clan}${eInfo.name}`,
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
    if (!isEmpty(color)) {
      if (typeof color === 'string') {
        embed.setColor(color in this.embedColors ? this.embedColors[color] : color);
      } else {
        embed.setColor(color);
      }
    }
    if (isNull(time)) {
      embed.setTimestamp(new Date());
    } else if (typeof time === 'string') {
      embed.setTimestamp(new Date(time));
    } else {
      embed.setTimestamp(time);
    }
    return embed;
  }

  async init() {
    let data = [];
    try {
      const events = await loadEvents(new URL('events/', import.meta.url));
      const commands = await loadCommands(new URL('commands/', import.meta.url));
      const globalData = [...commands.values()]
        .filter((command) => {
          if ('global' in command && typeof command.global === 'boolean') {
            return command.global;
          }
          return false;
        })
        .map((command) => command.data);
      const localData = [...commands.values()]
        .filter((command) => {
          if ('global' in command && typeof command.global === 'boolean') {
            return !command.global;
          }
          return true;
        })
        .map((command) => command.data);

      registerEvents(commands, events, this);

      if (isEmpty(this.clientID)) {
        throw new Error('{ clientID } is missing / invalid - ' + this.clientID);
      }

      const reset = new REST({ version: '10' }).setToken(this.token);

      if (!isBlank(localData) && !isEmpty(this.guidID)) {
        this.log(`Started refreshing ${localData.length} application (/) commands.`);
        data = await reset
          .put(Routes.applicationGuildCommands(this.clientID, this.guidID), {
            body: localData
          })
          .catch((ex) => {
            this.err(`Failed to load Routes. Reason: ${ex.message}`, ex.stack);
          });
        this.log(`Successfully reloaded ${data.length} application (/) commands.`);
      }
      if (!isBlank(globalData)) {
        this.log(`Started refreshing ${globalData.length} application (/) commands.`);
        data = await reset
          .put(Routes.applicationCommands(this.clientID), { body: globalData })
          .catch((ex) => {
            this.err(`Failed to load Routes. Reason: ${ex.message}`, ex.stack);
          });
        this.log(`Successfully reloaded ${data.length} application (/) commands.`);
      }
    } catch (ex) {
      this.err(ex);
    }
  }

  log(...msg) {
    const arr = [];
    for (const m of msg) {
      try {
        if (typeof m === 'object') {
          arr.push(JSON.stringify(m, null, ' '));
        } else {
          arr.push(m);
        }
      } catch (ex) {
        this.err(ex);
        arr.push(m);
      }
    }
    Logger.verbose('DiscordJS', 1, ...arr);
  }

  err(...msg) {
    console.error(...msg);
    Logger.err(1, ...msg);
  }
}
