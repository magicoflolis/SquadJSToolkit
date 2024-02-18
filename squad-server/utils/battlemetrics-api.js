import axios from 'axios';
import Logger from 'core/logger';

/**
 * @typedef { object } qBans
 * @property { { player: string; info: object; relationships: object; }[] } bans
 * @property { { active: number; expired: number; total: number; } } meta
 */

/**
 * @typedef { object } qMatch
 * @property { { BEGUID: string; player: string; names: string[]; steamID: string; } } identifiers
 * @property { { profile: object; bans: object; gameInfo: object; } } meta
 * @property { { id: string; type: 'playerFlag'; createdAt: string; updatedAt: string; icon: string; name: string; color: string; description: string; }[] } playerFlags
 */

/**
 * @typedef { object } bList
 * @property { string } [name="Default"]
 * @property { string | null } listID
 * @property { string | null } orgID
 * @property { string | null } serverID
 * @property { string | null } token
 * @property { string } UUID
 */

// #region Utils
/**
 * Object is typeof `"..."`
 * @template O
 * @param { O } obj
 * @returns { boolean }
 */
const isStr = (obj) => {
  /** @type { string } */
  const s = Object.prototype.toString.call(obj);
  return s.includes('String');
};

/**
 * Object is typeof `new URL()` or `new URLSearchParams()`
 * @template O
 * @param { O } obj
 * @returns { boolean }
 */
const isURL = (obj) => {
  /** @type { string } */
  const s = Object.prototype.toString.call(obj);
  return s.includes('String') || s.includes('URL');
};

/**
 * Object is typeof `{}`
 * @template O
 * @param { O } obj
 * @returns { boolean }
 */
const isObj = (obj) => {
  /** @type { string } */
  const s = Object.prototype.toString.call(obj);
  return s.includes('Object');
};
/**
 * Object is `null` or `undefined`
 * @template O
 * @param { O } obj - Any null or undefined
 * @returns { boolean } Returns boolean statement
 */
const isNull = (obj) => {
  return Object.is(obj, null) || Object.is(obj, undefined);
};

/**
 * Object is Blank
 * @template O
 * @param { O } obj - Any String, Array, Set, Map, or Object
 * @returns { boolean } Returns boolean statement
 */
const isBlank = (obj) => {
  return (
    (typeof obj === 'string' && Object.is(obj.trim(), '')) ||
    ((obj instanceof Set || obj instanceof Map) && Object.is(obj.size, 0)) ||
    (Array.isArray(obj) && Object.is(obj.length, 0)) ||
    (Boolean(obj) &&
      typeof obj === 'object' &&
      typeof obj?.entries !== 'function' &&
      Object.is(Object.keys(obj).length, 0))
  );
};

/**
 * Object is Empty
 * @template O
 * @param { O } obj - Any String, Array, Set, Map, null, undefined, or Object
 * @returns { boolean } Returns boolean statement
 */
const isEmpty = (obj) => {
  return isNull(obj) || isBlank(obj);
};

/**
 * @template [O={}]
 * @param { O } obj
 * @param { string } locate
 * @returns { keyof O | null }
 */
const validator = (obj = {}, locate = '') => {
  try {
    obj = obj ?? {};
    if (typeof locate !== 'string') {
      throw new Error('"locate" must be a typeof "String"');
    }
    if (!isObj(obj)) {
      throw new Error('"obj" must be a typeof "Object" (JSON Object)');
    }
    for (const [key, value] of Object.entries(obj)) {
      if (value instanceof Date) continue;
      if (key === locate) {
        return value;
      } else if (typeof value === 'object') {
        return validator(value, locate);
      }
    }
  } catch (ex) {
    console.error(ex);
  }
  return null;
};

// #endregion

/** @type { Map<string, bList> } */
const lists = new Map();
const listDef = {
  listID: null,
  orgID: null,
  serverID: null,
  token: null,
  UUID: ''
};

export default class BattleMetrics {
  /** @param { { BanLists: bList[] } } options */
  constructor(options) {
    if (typeof options !== 'object') throw new Error('"options" must be a typeof "Object" (JSON Object)');

    // #region Binders
    this.log = this.log.bind(this);
    this.err = this.err.bind(this);
    this.req = this.req.bind(this);
    this.makeID = this.makeID.bind(this);
    // #endregion

    /** @type { Map<string, qMatch> } */
    this.qmPlayers = new Map();
    this.BanLists = options.BanLists ?? [];
    this.listID = null;
    this.orgID = null;
    this.serverID = null;
    this.token = null;
    this.UUID = '';

    this.setDefault(options);
  }
  /**
   * @template { bList } B
   * @param { B } opt
   * @returns { Map<string, B> }
   */
  setDefault(opt) {
    // this.listID = opt.listID ?? null;
    // this.orgID = opt.orgID ?? null;
    // this.serverID = opt.serverID ?? null;
    // this.token = opt.token ?? null;
    // this.UUID = opt.UUID ?? '';
    // listDef.listID = opt.listID ?? null;
    // listDef.orgID = opt.orgID ?? null;
    // listDef.serverID = opt.serverID ?? null;
    // listDef.token = opt.token ?? null;
    // listDef.UUID = opt.UUID ?? '';

    for (const param of ['listID', 'orgID', 'serverID', 'token', 'UUID']) {
      this[param] = opt[param] ?? null;
      listDef[param] = opt[param] ?? null;
    }

    lists.set('default', {
      name: 'default',
      ...listDef
    });
    return this.loadLists(this.BanLists, true);
  }
  /**
   * @template { bList } B
   * @param { B[] } BanLists
   * @param { boolean } force
   * @returns { Map<string, B> }
   */
  loadLists(BanLists = [], force = false) {
    try {
      if (!Array.isArray(BanLists)) throw new Error('"BanLists" must be a typeof "Array"');
      for (const obj of BanLists) {
        try {
          if (!isObj(obj)) throw new Error('Must be a typeof "Object" (JSON Object)');
          if (!isStr(obj.name)) throw new Error('"name" must be a typeof "String"');
          if (!force && lists.has(obj.name)) throw new Error(`"${obj.name}" already exists, skipping...`);
          const o = this.setObj(listDef, obj);
          lists.set(obj.name, o);
        } catch (ex) {
          this.err(ex);
        }
      }
    } catch (e) {
      this.err(e);
    }
    this.log(`Loaded ${lists.size} Ban Lists`);
    return lists;
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
   * Make an HTTP request to the BattleMetrics API server
   * @param { string } url - Is the server URL that will be used for the request
   * @param { import('axios').Method } method - Is the request method to be used when making the request
   * @param { import('axios').ResponseType } responseType - Indicates the type of data that the server will respond with
   * @param { import('axios').AxiosRequestConfig } extra - Extra config options for making requests
   * @returns { Promise<null | any> }
   */
  async req(url = '', method = 'get', responseType = 'json', extra = {}) {
    let response = null;
    try {
      if (!isURL(url) || !isStr(url))
        throw new Error('"url" field must be a typeof "String" or "URL"');
      if (!isStr(method)) throw new Error('"method" field must be a typeof "String"');
      if (!isStr(responseType)) throw new Error('"responseType" field must be a typeof "String"');
      if (!isObj(extra)) throw new Error('"extra" field must be a typeof "Object" (JSON Object)');
      if (isEmpty(url)) throw new Error('"url" field is empty');
      const config = {
        // `url` is the server URL that will be used for the request
        url,
        // `method` is the request method to be used when making the request
        method,
        // `baseURL` will be prepended to `url` unless `url` is absolute.
        // It can be convenient to set `baseURL` for an instance of axios to pass relative URLs
        // to methods of that instance.
        baseURL: 'https://api.battlemetrics.com',
        // `headers` are custom headers to be sent
        headers: {
          Authorization: 'Bearer ' + this.token
        },
        // `responseType` indicates the type of data that the server will respond with
        // options are: 'arraybuffer', 'document', 'json', 'text', 'stream'
        responseType
      };
      if (extra.data) {
        Object.assign(config, {
          data: {
            data: extra.data
          }
        });
        delete extra.data;
      }
      const reqConfig = this.setObj(config, extra);
      Object.assign(config, reqConfig);
      const { data } = await axios(config);
      response = data;
      // const resp = await axios(config);
      // response = resp.data;
    } catch (ex) {
      if (ex.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        this.err('[HTTP request]', 'ex.response.data', JSON.stringify(ex.response.data));
        this.err('[HTTP request]', 'ex.response.status', ex.response.status);
        this.err('[HTTP request]', 'ex.response.headers', ex.response.headers);
      } else if (ex.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        this.err('[HTTP request]', ex.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        this.err('[HTTP request]', ex.message);
      }
      this.err('[HTTP request]', 'Config', ex.config);
    }
    return response;
  }
  /**
   * Lookup bans by PlayerID: `https://www.battlemetrics.com/rcon/bans`
   * @param { string } player - PlayerID: `https://www.battlemetrics.com/rcon/players/playerID`
   * @param { boolean } format - Whether response is formatted
   * @returns { Promise<qBans> }
   */
  async lookupBans(player, format = true) {
    const resp = {
      bans: [],
      meta: {
        active: 0,
        expired: 0,
        total: 0
      }
    };
    try {
      if (typeof player !== 'string') {
        throw new Error('[lookupBans] Invalid player');
      }
      if (player.length === 0) {
        throw new Error('[lookupBans] Player string empty');
      }
      const grabBM = await this.req(
        `/bans?sort=-timestamp&filter[player]=${player}&filter[expired]=true`
      );
      if (format) {
        return {
          bans:
            grabBM.data
              .filter((item) => item.type === 'ban')
              .map((item) => {
                return {
                  player: item.meta.player,
                  info: item.attributes,
                  relationships: item.relationships
                };
              }) ?? [],
          meta: grabBM.meta
        };
      }
      return grabBM;
    } catch (ex) {
      this.err(ex);
    }
    return format ? resp : {};
  }
  /**
   * Quickly match by Steam64ID: `https://www.battlemetrics.com/players/quick-match`
   * @param { string } steamID - Players Steam64ID
   * @param { boolean } format - Whether response is formatted
   * @param { boolean } force - Whether to use internal cache or fetch from URL
   * @returns { Promise<qMatch> }
   */
  async quickMatch(steamID, format = true, force = false) {
    try {
      if (typeof steamID !== 'string') {
        throw new Error('[quickMatch] Invalid SteamID');
      }
      if (steamID.length === 0) {
        throw new Error('[quickMatch] steamID string empty');
      }
      if (this.qmPlayers.has(steamID) && format && !force) {
        return this.qmPlayers.get(steamID);
      }
      const grabBM = await this.req(
        '/players/quick-match?page[size]=100&fields[identifier]=type,identifier,lastSeen,metadata&filter[public]=false&filter[playerFlags]=&include=identifier,flagPlayer,playerFlag,player',
        'post',
        'json',
        {
          data: [
            {
              attributes: {
                identifier: steamID,
                type: 'steamID'
              },
              type: 'identifier'
            }
          ]
        }
      );
      if (format) {
        const respObj = {
          identifiers: {
            BEGUID: isEmpty(grabBM.included)
              ? ''
              : grabBM.included
                  .filter((item) => item.type === 'identifier' && item.attributes.type === 'BEGUID')
                  .map((item) => item.attributes.identifier)
                  .join(' '),
            player: isEmpty(grabBM.included)
              ? ''
              : grabBM.included
                  .filter(
                    (item) => item.type === 'player' && item.attributes.positiveMatch === true
                  )
                  .map((item) => item.id)
                  .join(' '),
            names: isEmpty(grabBM.included)
              ? ''
              : grabBM.included
                  .filter((item) => item.type === 'identifier' && item.attributes.type === 'name')
                  .map((item) => item.attributes.identifier),
            steamID
          },
          metadata: isEmpty(grabBM.data)
            ? {}
            : grabBM.data
                .filter((item) => item.type === 'identifier' && item.attributes.metadata)
                .map((item) => item.attributes.metadata)[0],
          playerFlags: isEmpty(grabBM.included)
            ? []
            : grabBM.included
                .filter((item) => item.type === 'playerFlag' && item.id)
                .map((item) => {
                  return {
                    id: item.id,
                    type: item.type,
                    ...item.attributes
                  };
                })
        };
        this.qmPlayers.set(steamID, respObj);
        return respObj;
      }
      return grabBM;
    } catch (ex) {
      this.err(ex);
    }
    return null;
  }
  /**
   * Make a 14 character UUID
   * @param { string } str
   * @returns { string }
   */
  makeID(str = '') {
    if (!isStr(str)) {
      this.err(`"${str}" must be a typeof "String"`);
      str = '';
    }
    if (str.length > 14) {
      this.err(`"${str}" must be less than 14 characters`);
      str = '';
    }
    const stringTemplate = ',';
    let d = new Date().getTime();
    let d2 =
      (typeof performance !== 'undefined' && performance.now && performance.now() * 1000) || 0;
    while (str.length < 14) {
      str += stringTemplate;
    }
    return str
      .replace(new RegExp(`[${stringTemplate}]`, 'g'), (c) => {
        let r = Math.random() * 16;
        if (d > 0) {
          r = (d + r) % 16 | 0;
          d = Math.floor(d / 16);
        } else {
          r = (d2 + r) % 16 | 0;
          d2 = Math.floor(d2 / 16);
        }
        return (c === stringTemplate ? r : (r & 0x7) | 0x8).toString(16);
      })
      .toUpperCase();
  }
  /**
   * @param { null | string } expires
   * @param { boolean } forDiscord
   * @returns
   */
  getExpires(expires = null, forDiscord = false) {
    if (typeof expires !== 'string') {
      if (forDiscord) {
        return 'Perm';
      }
      return null;
    }
    const dtNow = new Date();
    const num = expires.match(/\d+/);
    let dt = null;
    if (expires.match(/\d+d/i)) {
      dtNow.setDate(dtNow.getDate() + Number(num[0]));
      dt = dtNow.toISOString();
    } else if (expires.match(/\d+h/i)) {
      dtNow.setHours(dtNow.getHours() + Number(num[0]));
      dt = dtNow.toISOString();
    }
    return dt;
  }
  /**
   * Add player to a Ban List
   * @param { {} } info - Object MUST contain `{ steamID: string }`
   * @param { string } reason - Ban reason
   * @param { null | Date | string } expires - Ban expire date
   * @param { string | "{{expires}} | {{reason}}" } reasonStr - Ban reason for BattleMetrics
   * @param { string | "default" } banlist - Cached ban list to use
   * @returns { Promise<object> }
   */
  async addToBanList(
    info = {},
    reason = '',
    expires = null,
    reasonStr = '{{reason}} | {{timeLeft}}',
    banlist = 'default'
  ) {
    if (lists.has(banlist)) {
      this.log('Using ban list:', banlist);
    } else {
      this.log(`[FALLBACK] Using "default" ban list, "${banlist}" not found!`);
    }

    const resp = {};
    const banListType = lists.has(banlist) ? banlist : 'default';
    const listData = lists.get(banListType) ?? this;
    const formatExpires = isNull(expires) ? 'Perm' : expires;
    const formatReason = isEmpty(reason) ? 'Unknown' : reason;

    try {
      const attributes = {
        reason: reasonStr.replace(/\{\{(.*?)\}\}/g, (_match, root) => {
          if (/reason/.test(root)) {
            return formatReason;
          }
          return `{{${root}}}`;
        }),
        note: info.note ?? null,
        expires: this.getExpires(expires),
        identifiers: [],
        autoAddEnabled: info.autoAddEnabled ?? false,
        nativeEnabled: info.nativeEnabled ?? null,
        orgWide: info.orgWide ?? true
      };
      const relationships = {
        server: {
          data: {
            type: 'server',
            id: listData.serverID
          }
        },
        organization: {
          data: {
            type: 'organization',
            id: listData.orgID
          }
        },
        user: {
          data: {
            type: 'user',
            id: listData.orgID
          }
        },
        banList: {
          data: {
            type: 'banList',
            id: listData.listID
          }
        }
      };
      const uid = this.makeID(listData.UUID);

      const EOSID = validator(info, 'EOSID');
      if (isStr(EOSID)) {
        attributes.identifiers.push({
          type: 'eosID',
          identifier: EOSID,
          manual: true
        });
      }
      const lastIP = validator(info, 'lastIP');
      if (isStr(lastIP) && /^[A-Za-z0-9.:%]+$/.test(lastIP)) {
        attributes.identifiers.push({
          type: 'ip',
          identifier: lastIP,
          manual: true
        });
      }
      const steamID = validator(info, 'steamID');
      if (isStr(steamID) && /^\d{17}$/.test(steamID)) {
        attributes.identifiers.push({
          type: 'steamID',
          identifier: steamID,
          manual: true
        });
        const playerInfo = await this.quickMatch(steamID);
        const { player } = playerInfo.identifiers;
        if (player) {
          Object.assign(relationships, {
            player: {
              data: {
                id: player,
                type: 'player'
              }
            }
          });
        }
      }

      // const playerInfo = await this.quickMatch(steamID);
      // const { BEGUID, player } = playerInfo.identifiers;
      // if (player) {
      //   Object.assign(relationships, {
      //     player: {
      //       data: {
      //         id: player,
      //         type: 'player'
      //       }
      //     }
      //   });
      // }
      //
      // if (typeof BEGUID === 'string' && && /^[A-z0-9]{32}$/.test(BEGUID)) {
      //   attributes.identifiers.push({
      //     type: 'BEGUID',
      //     identifier: BEGUID,
      //     manual: true
      //   });
      // }
      if (!('BAN_ID' in info)) {
        attributes.uid = uid;
        attributes.timestamp = (info.time ?? new Date()).toISOString();
      }
      const grabBM = await this.req(
        'BAN_ID' in info ? `/bans/${info.BAN_ID}` : '/bans',
        'BAN_ID' in info ? 'patch' : 'post',
        'json',
        {
          headers: {
            'Content-Type': 'application/json'
          },
          data: {
            attributes,
            relationships,
            type: 'ban'
          }
        }
      );
      if (grabBM) {
        const respInfo = grabBM.data;
        Object.assign(resp, {
          id: respInfo.id || respInfo.attributes.id,
          banInfo: respInfo,
          UUID: uid || respInfo.attributes.uid,
          reason: 'reason' in respInfo.attributes ? respInfo.attributes.reason : null,
          steamID
        });
      }
    } catch (ex) {
      this.err(ex);
    }
    Object.assign(resp, {
      exp: this.getExpires(expires, true),
      formatExpires,
      formatReason: reasonStr.replace(/\{\{(.*?)\}\}/g, (_match, root) => {
        if (/expires|timeLeft/.test(root)) {
          return formatExpires;
        } else if (/reason/.test(root)) {
          return formatReason;
        }
        return `{{${root}}}`;
      }),
      listData
    });
    return resp;
  }
  /**
   * Fetch a Ban List
   * @param { string } url
   * @param { string | "default" } banlist
   * @returns { Promise<any> }
   */
  async getBanList(url, banlist = 'default') {
    try {
      const { listID } = lists.get(banlist ?? 'default');
      if (isEmpty(listID)) throw new Error('"listID" is empty or invalid');
      if (isEmpty(url)) {
        url = `/bans?page[size]=100&sort=-timestamp&include=server,user,player,organization&fields[server]=name&fields[player]=name&fields[user]=nickname&filter[expired]=false&filter[banList]=${listID}&fields[banExemption]=reason`;
      }
      const resp = await this.req(url);
      return resp;
    } catch (ex) {
      this.err(ex);
    }
    return null;
  }

  /**
   * Transforms banList Map to JSON format
   * @template { Map<string, bList> } T
   * @param { T } data
   * @returns { null | T{} }
   */
  toJSON(data) {
    if (isEmpty(data)) {
      return null;
    }
    const obj = {};
    for (const [k, v] of data) {
      obj[k] = v;
    }
    return obj;
  }

  /**
   * Transforms banList Map to an Array
   * @template { Map<string, bList> } T
   * @param { T } data
   * @returns { null | T[][] }
   */
  toArray(data) {
    if (isEmpty(data)) {
      return null;
    }
    const obj = [];
    for (const [k, v] of data) {
      obj.push([k, v]);
    }
    return obj;
  }

  log(...msg) {
    const arr = [];
    for (const m of msg) {
      try {
        if (m instanceof Error) {
          arr.push(m.stack);
          arr.push(m.message);
        } else if (Array.isArray(m)) {
          arr.push(JSON.stringify(m, null, ' '));
        } else if (m instanceof Set) {
          arr.push(JSON.stringify([...m], null, ' '));
        } else if (m instanceof Map) {
          const obj = {};
          for (const [k, v] of m) {
            obj[k] = v;
          }
          arr.push(JSON.stringify(obj, null, ' '));
        } else if (isObj(m)) {
          arr.push(JSON.stringify(m, null, ' '));
        } else {
          arr.push(m);
        }
      } catch (ex) {
        console.error(ex);
        arr.push(m);
      }
    }
    Logger.verbose('BattleMetrics', 1, ...arr);
  }

  err(...msg) {
    const arr = [];
    for (const m of msg) {
      try {
        if (m instanceof Error) {
          arr.push(m.stack);
          arr.push(m.message);
        } else if (Array.isArray(m)) {
          arr.push(JSON.stringify(m, null, ' '));
        } else if (m instanceof Set) {
          arr.push(JSON.stringify([...m], null, ' '));
        } else if (m instanceof Map) {
          const obj = {};
          for (const [k, v] of m) {
            obj[k] = v;
          }
          arr.push(JSON.stringify(obj, null, ' '));
        } else if (isObj(m)) {
          arr.push(JSON.stringify(m, null, ' '));
        } else {
          arr.push(m);
        }
      } catch (ex) {
        console.error(ex);
        arr.push(m);
      }
    }
    console.error('BattleMetrics', ...msg);
    Logger.verbose('BattleMetrics', 1, ...arr);
  }
}
