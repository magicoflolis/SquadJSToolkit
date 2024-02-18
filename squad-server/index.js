import { EventEmitter } from 'events';
import axios from 'axios';
import Logger from 'core/logger';
import { SQUADJS_API_DOMAIN } from 'core/constants';
import { Layers } from './layers/index.js';
// import LogParser from './log-parser/index.js';
import LogParser from 'core/log-parser';
import Rcon from 'core/rcon';
import { SQUADJS_VERSION } from './utils/constants.js';
import fetchAdminLists from './utils/admin-lists.js';

const escStr = /[|\\{}()[\]^$+*?.]/g;
const toReg = (str) => {
  return new RegExp(`${str.replace(escStr, '\\$&')}$`);
};

export default class SquadServer extends EventEmitter {
  constructor(options = {}) {
    super();

    for (const option of ['host', 'queryPort'])
      if (!(option in options)) throw new Error(`"${option}" must be specified.`);

    this.id = options.id;
    this.options = options;

    this.webURL = options.webURL || 'https://www.battlemetrics.com/servers/squad';

    this.layerHistory = [];
    this.layerHistoryMaxLength = options.layerHistoryMaxLength || 20;

    /** @type { SquadJS.SquadServer["players"] } */
    this.players = [];

    /** @type { SquadJS.SquadServer["mapPlayers"] } */
    this.mapPlayers = new Map();
    this.teamKills = new Map();
    this.sorryMap = new Map();
    this.objMaps = new Map();

    /** @type { SquadJS.SquadServer["squads"] } */
    this.squads = [];

    /** @type { SquadJS.SquadServer["admins"] } */
    this.admins = {};
    this.adminsInAdminCam = {};

    this.plugins = [];
    this.connectors = [];

    this.setupRCON();
    this.setupLogParser();

    this.updatePlayerList = this.updatePlayerList.bind(this);
    this.updatePlayerListInterval = 1000 * 30;
    this.updatePlayerListTimeout = null;

    this.updateSquadList = this.updateSquadList.bind(this);
    this.updateSquadListInterval = 1000 * 30;
    this.updateSquadListTimeout = null;

    this.updateLayerInformation = this.updateLayerInformation.bind(this);
    this.updateLayerInformationInterval = 1000 * 30;
    this.updateLayerInformationTimeout = null;

    this.updateA2SInformation = this.updateA2SInformation.bind(this);
    this.updateA2SInformationInterval = 1000 * 30;
    this.updateA2SInformationTimeout = null;

    this.pingSquadJSAPI = this.pingSquadJSAPI.bind(this);
    this.pingSquadJSAPIInterval = 5 * 60 * 1000;
    this.pingSquadJSAPITimeout = null;

    this.addMap(
      'killSystem',
      // 'sorrySystem',
      'squadChanges',
      'chatMessages',
      'disbands',
      // 'teamKills',
      'slKits',
      'multiKills',
      'pChanges'
    );
  }

  async watch() {
    Logger.verbose(
      'SquadServer',
      1,
      `Beginning to watch ${this.options.host}:${this.options.queryPort}...`
    );

    await Layers.pull();

    this.admins = await fetchAdminLists(this.options.adminLists);

    await this.rcon.connect();
    await this.logParser.watch();

    await this.updateSquadList();
    await this.updatePlayerList();
    await this.updateLayerInformation();
    await this.updateA2SInformation();

    Logger.verbose('SquadServer', 1, `Watching ${this.serverName}...`);

    await this.pingSquadJSAPI();
  }

  async unwatch() {
    await this.rcon.disconnect();
    await this.logParser.unwatch();
  }

  setupRCON() {
    /** @type { SquadJS.SquadServer["rcon"] } */
    this.rcon = new Rcon({
      host: this.options.rconHost || this.options.host,
      port: this.options.rconPort,
      password: this.options.rconPassword,
      autoReconnectInterval: this.options.rconAutoReconnectInterval
    });

    this.rcon.on('CHAT_MESSAGE', async (data) => {
      data.player = await this.getPlayerBySteamID(data.steamID);
      this.emit('CHAT_MESSAGE', data);

      const command = data.message.match(/!([^ ]+) ?(.*)/);
      if (command)
        this.emit(`CHAT_COMMAND:${command[1].toLowerCase()}`, {
          ...data,
          message: command[2].trim()
        });
    });

    this.rcon.on('POSSESSED_ADMIN_CAMERA', (data) => {
      // data.player = await this.getPlayerBySteamID(data.steamID);
      data.player = this.getPlayerSteamID(data.steamID);

      this.adminsInAdminCam[data.steamID] = data.time;

      this.emit('POSSESSED_ADMIN_CAMERA', data);
    });

    this.rcon.on('UNPOSSESSED_ADMIN_CAMERA', (data) => {
      // data.player = await this.getPlayerBySteamID(data.steamID);
      data.player = this.getPlayerSteamID(data.steamID);
      if (this.adminsInAdminCam[data.steamID]) {
        data.duration = data.time.getTime() - this.adminsInAdminCam[data.steamID].getTime();
      } else {
        data.duration = 0;
      }

      delete this.adminsInAdminCam[data.steamID];

      this.emit('UNPOSSESSED_ADMIN_CAMERA', data);
    });

    this.rcon.on('RCON_ERROR', (data) => {
      this.emit('RCON_ERROR', data);
    });

    this.rcon.on('PLAYER_WARNED', async (data) => {
      data.player = await this.getPlayerByName(data.name);

      this.emit('PLAYER_WARNED', data);
    });

    this.rcon.on('PLAYER_KICKED', async (data) => {
      data.player = await this.getPlayerBySteamID(data.steamID);

      this.emit('PLAYER_KICKED', data);
    });

    this.rcon.on('PLAYER_BANNED', async (data) => {
      data.player = await this.getPlayerBySteamID(data.steamID);

      this.emit('PLAYER_BANNED', data);
    });

    this.rcon.on('SQUAD_CREATED', async (data) => {
      data.player = await this.getPlayerBySteamID(data.playerSteamID, true);
      delete data.playerName;
      delete data.playerSteamID;

      this.emit('SQUAD_CREATED', data);
    });
  }

  async restartRCON() {
    try {
      await this.rcon.disconnect();
    } catch (err) {
      Logger.verbose('SquadServer', 1, 'Failed to stop RCON instance when restarting.', err);
    }

    Logger.verbose('SquadServer', 1, 'Setting up new RCON instance...');
    this.setupRCON();
    await this.rcon.connect();
  }

  setupLogParser() {
    this.logParser = new LogParser(
      Object.assign(this.options.ftp, {
        mode: this.options.logReaderMode,
        logDir: this.options.logDir,
        host: this.options.ftp.host || this.options.host
      })
    );

    this.logParser.on('ADMIN_BROADCAST', (data) => {
      this.emit('ADMIN_BROADCAST', data);
    });

    this.logParser.on('DEPLOYABLE_DAMAGED', async (data) => {
      data.player = await this.getPlayerByNameSuffix(data.playerSuffix);

      delete data.playerSuffix;

      this.emit('DEPLOYABLE_DAMAGED', data);
    });

    this.logParser.on('NEW_GAME', async (data) => {
      this.teamKills.clear();
      this.sorryMap.clear();
      for (const value of this.objMaps.values()) {
        if (!(value instanceof Map)) continue;
        value.clear();
      }

      data.layer = await Layers.getLayerByClassname(data.layerClassname);

      this.layerHistory.unshift({ layer: data.layer, time: data.time });
      this.layerHistory = this.layerHistory.slice(0, this.layerHistoryMaxLength);

      this.currentLayer = data.layer;
      await this.updateAdmins();
      this.emit('NEW_GAME', data);
    });

    this.logParser.on('PLAYER_CONNECTED', async (data) => {
      Logger.verbose(
        'SquadServer',
        1,
        `Player connected ${data.playerSuffix} (EOSID: ${data.eosID} SteamID: ${data.steamID} IP: ${data.ip})`
      );

      this.rcon.addIds(data.steamID, data.eosID);

      data.player = await this.getPlayerByEOSID(data.eosID);
      if (data.player) {
        data.player.suffix = data.playerSuffix;
        if (data.ip) data.player.lastIP = data.ip;
      }

      delete data.steamID;
      delete data.playerSuffix;

      this.emit('PLAYER_CONNECTED', data);
    });

    this.logParser.on('PLAYER_DISCONNECTED', async (data) => {
      data.player = await this.getPlayerByEOSID(data.eosID);

      delete data.steamID;

      this.emit('PLAYER_DISCONNECTED', data);
    });

    this.logParser.on('PLAYER_DAMAGED', async (data) => {
      data.victim = await this.getPlayerByName(data.victimName);
      data.attacker = await this.getPlayerByEOSID(data.attackerEOSID);

      if (!data.attacker.playercontroller) data.attacker.playercontroller = data.attackerController;

      if (data.victim && data.attacker) {
        if (!data.victim.playercontroller) data.victim.playercontroller = data.attackerController;

        data.teamkill =
          data.victim.teamID === data.attacker.teamID &&
          data.victim.steamID !== data.attacker.steamID;
      }

      delete data.victimName;
      delete data.attackerName;

      this.emit('PLAYER_DAMAGED', data);
    });

    this.logParser.on('PLAYER_WOUNDED', async (data) => {
      data.victim = await this.getPlayerByName(data.victimName);
      data.attacker = await this.getPlayerByEOSID(data.attackerEOSID);
      if (!data.attacker)
        data.attacker = await this.getPlayerByController(data.attackerPlayerController);

      if (data.victim && data.attacker)
        data.teamkill =
          data.victim.teamID === data.attacker.teamID &&
          data.victim.steamID !== data.attacker.steamID;

      delete data.victimName;
      delete data.attackerName;

      this.emit('PLAYER_WOUNDED', data);
      if (data.teamkill) this.emit('TEAMKILL', data);
    });

    this.logParser.on('PLAYER_DIED', async (data) => {
      data.victim = await this.getPlayerByName(data.victimName);
      data.attacker = await this.getPlayerByEOSID(data.attackerEOSID);
      if (!data.attacker)
        data.attacker = await this.getPlayerByController(data.attackerPlayerController);

      if (data.victim && data.attacker)
        data.teamkill =
          data.victim.teamID === data.attacker.teamID &&
          data.victim.steamID !== data.attacker.steamID;

      delete data.victimName;
      delete data.attackerName;

      this.emit('PLAYER_DIED', data);
    });

    this.logParser.on('PLAYER_REVIVED', async (data) => {
      data.victim = await this.getPlayerByEOSID(data.victimEOSID);
      data.attacker = await this.getPlayerByEOSID(data.attackerEOSID);
      data.reviver = await this.getPlayerByEOSID(data.reviverEOSID);

      delete data.victimName;
      delete data.attackerName;
      delete data.reviverName;

      this.emit('PLAYER_REVIVED', data);
    });

    this.logParser.on('PLAYER_POSSESS', async (data) => {
      data.player = await this.getPlayerByEOSID(data.eosID);
      if (data.player) data.player.possessClassname = data.possessClassname;

      delete data.playerSuffix;

      this.emit('PLAYER_POSSESS', data);
      // data.player = this.getPlayerSuffix(data.playerSuffix);
      // if (data.player === null) {
      //   if (data.raw.match(/PC=(.+) Pawn=/)) {
      //     const playerName = data.raw.match(/PC=(.+) Pawn=/)[1];
      //     const findPlayer = this.players.filter((item) => {
      //       const reg = toReg(playerName);
      //       return reg.test(item.name);
      //     });
      //     if (!this.isEmpty(findPlayer)) {
      //       data.player = findPlayer[0];
      //     }
      //   }
      // }
      // if (data.player) data.player.pawn = data.pawn;

      // delete data.playerSuffix;

      // this.emit('PLAYER_POSSESS', data);
    });

    this.logParser.on('PLAYER_UNPOSSESS', async (data) => {
      data.player = await this.getPlayerByEOSID(data.eosID);

      delete data.playerSuffix;

      this.emit('PLAYER_UNPOSSESS', data);
      // data.player = this.getPlayerSuffix(data.playerSuffix);
      // if (data.player === null) {
      //   if (data.raw.match(/PC=(.+) Pawn=/)) {
      //     const playerName = data.raw.match(/PC=(.+) Pawn=/)[1];
      //     const findPlayer = this.players.filter((item) => {
      //       const reg = toReg(playerName);
      //       return reg.test(item.name);
      //     });
      //     if (!this.isEmpty(findPlayer)) {
      //       data.player = findPlayer[0];
      //     }
      //   }
      // }
      // if (data.player) data.player.pawn = data.pawn;

      // delete data.raw;
      // delete data.playerSuffix;

      // this.emit('PLAYER_UNPOSSESS', data);
    });

    this.logParser.on('ROUND_ENDED', (data) => {
      this.teamKills.clear();
      this.sorryMap.clear();
      this.emit('ROUND_ENDED', data);
    });

    this.logParser.on('TICK_RATE', (data) => {
      this.emit('TICK_RATE', data);
    });
    this.logParser.on('CLIENT_EXTERNAL_ACCOUNT_INFO', (data) => {
      this.rcon.addIds(data.steamID, data.eosID);
    });
    // this.logParser.on('CLIENT_CONNECTED', (data) => {
    //   Logger.verbose("SquadServer", 1, `Client connected. Connection: ${data.connection} - SteamID: ${data.steamID}`)
    // })
    // this.logParser.on('CLIENT_LOGIN_REQUEST', (data) => {
    //   Logger.verbose("SquadServer", 1, `Login request. ChainID: ${data.chainID} - Suffix: ${data.suffix} - EOSID: ${data.eosID}`)

    // })
    // this.logParser.on('RESOLVED_EOS_ID', (data) => {
    //   Logger.verbose("SquadServer", 1, `Resolved EOSID. ChainID: ${data.chainID} - Suffix: ${data.suffix} - EOSID: ${data.eosID}`)
    // })
    // this.logParser.on('ADDING_CLIENT_CONNECTION', (data) => {
    //   Logger.verbose("SquadServer", 1, `Adding client connection`, data)
    // })
  }

  async restartLogParser() {
    try {
      await this.logParser.unwatch();
    } catch (err) {
      Logger.verbose('SquadServer', 1, 'Failed to stop LogParser instance when restarting.', err);
    }

    Logger.verbose('SquadServer', 1, 'Setting up new LogParser instance...');
    this.setupLogParser();
    await this.logParser.watch();
  }

  getPlayerSteamID(player) {
    let str;
    try {
      if (this.isStr(player)) {
        str = player;
      } else {
        str =
          this.validator(player, 'steamID') ||
          this.validator(player, 'playerSteamID') ||
          'INVALID_STEAMID';
      }
      // this.players.find((player) => player.steamID === str)
      for (const player of this.players) {
        if (player.steamID === str) {
          return player;
        }
      }
    } catch (ex) {
      Logger.err(1, '[getPlayerSteamID]', ex);
    }
    return null;
  }

  getPlayerSuffix(suffix) {
    let str;
    try {
      if (this.isStr(suffix)) {
        str = suffix;
      } else {
        str = this.validator(suffix, 'playerSuffix') || 'INVALID';
      }
      for (const player of this.players) {
        const reg = toReg(str);
        if (reg.test(player.suffix)) {
          return player;
        }
      }
    } catch (ex) {
      Logger.err(1, '[getPlayerNameSuffix]', ex);
    }
    return null;
  }

  getPlayerName(name) {
    let str;
    try {
      if (this.isStr(name)) {
        str = name;
      } else {
        str = this.validator(name, 'name') || this.validator(name, 'playerName') || 'INVALID';
      }
      for (const player of this.players) {
        const reg = toReg(str);
        if (reg.test(player.name)) {
          return player;
        }
      }
    } catch (ex) {
      Logger.err(1, '[getPlayerName]', ex);
    }
    return null;
  }

  getPlayerController(controller) {
    try {
      const str = this.isStr(controller)
        ? controller
        : this.validator(controller, 'playercontroller') || 'INVALID';
      return this.players.find((item) => item.playercontroller === str) ?? null;
    } catch (ex) {
      Logger.err(1, '[getPlayerController]', ex);
    }
    return null;
  }

  getAdminPermsBySteamID(steamID) {
    return this.admins[steamID];
  }

  getAdminsWithPermission(perm) {
    const ret = [];
    for (const [steamID, perms] of Object.entries(this.admins)) {
      if (perm in perms) ret.push(steamID);
    }
    return ret;
  }

  async updateAdmins() {
    this.admins = await fetchAdminLists(this.options.adminLists);
  }

  // #region updatePlayerList
  async updatePlayerList() {
    if (this.updatePlayerListTimeout) clearTimeout(this.updatePlayerListTimeout);

    Logger.verbose('SquadServer', 1, 'Updating player list...');

    try {
      const oldPlayerInfo = {};
      // for (const player of this.players) {
      //   oldPlayerInfo[player.steamID] = player;
      // }
      let i = this.players.length;
      while (i--) {
        const player = this.players[i];
        oldPlayerInfo[player.steamID] = player;
      }

      const players = [];

      for (const player of await this.rcon.getListPlayers(this)) {
        const pData = {
          ...oldPlayerInfo[player.steamID],
          ...player,
          playercontroller: this.logParser.eventStore.players[player.steamID]
            ? this.logParser.eventStore.players[player.steamID].controller
            : null,
          squad: await this.getSquadByID(player.teamID, player.squadID)
        };
        players.push(pData);
      }
      this.players = players;

      for (const player of this.players) {
        if (this.isNull(oldPlayerInfo[player.steamID])) continue;
        // if (typeof oldPlayerInfo[player.steamID] === 'undefined') continue;
        if (player.role !== oldPlayerInfo[player.steamID].role)
          this.emit('PLAYER_ROLE_CHANGE', {
            player,
            oldRole: oldPlayerInfo[player.steamID].role,
            newRole: player.role
          });
        if (player.teamID !== oldPlayerInfo[player.steamID].teamID)
          this.emit('PLAYER_TEAM_CHANGE', {
            player,
            oldTeamID: oldPlayerInfo[player.steamID].teamID,
            newTeamID: player.teamID
          });
        if (player.squadID !== oldPlayerInfo[player.steamID].squadID)
          this.emit('PLAYER_SQUAD_CHANGE', {
            player,
            oldSquadID: oldPlayerInfo[player.steamID].squadID,
            newSquadID: player.squadID
          });
      }

      this.emit('UPDATED_PLAYER_INFORMATION');
    } catch (err) {
      Logger.verbose('SquadServer', 1, 'Failed to update player list.', err);
    }

    Logger.verbose('SquadServer', 1, 'Updated player list.');

    this.updatePlayerListTimeout = setTimeout(this.updatePlayerList, this.updatePlayerListInterval);
  }
  // #endregion

  // #region updateSquadList
  async updateSquadList() {
    if (this.updateSquadListTimeout) clearTimeout(this.updateSquadListTimeout);

    Logger.verbose('SquadServer', 1, 'Updating squad list...');

    try {
      this.squads = await this.rcon.getSquads();
    } catch (err) {
      Logger.verbose('SquadServer', 1, 'Failed to update squad list.', err);
    }

    Logger.verbose('SquadServer', 1, 'Updated squad list.');

    this.updateSquadListTimeout = setTimeout(this.updateSquadList, this.updateSquadListInterval);
  }
  // #endregion

  async updateLayerInformation() {
    if (this.updateLayerInformationTimeout) clearTimeout(this.updateLayerInformationTimeout);

    Logger.verbose('SquadServer', 1, 'Updating layer information...');

    try {
      const currentMap = await this.rcon.getCurrentMap();
      const nextMap = await this.rcon.getNextMap();
      const nextMapToBeVoted = nextMap.layer === 'To be voted';

      const currentLayer = await Layers.getLayerByName(currentMap.layer);
      const nextLayer = nextMapToBeVoted ? null : await Layers.getLayerByName(nextMap.layer);

      if (this.layerHistory.length === 0) {
        this.layerHistory.unshift({ layer: currentLayer, time: Date.now() });
        this.layerHistory = this.layerHistory.slice(0, this.layerHistoryMaxLength);
      }

      this.currentLayer = currentLayer;
      this.nextLayer = nextLayer;
      this.nextLayerToBeVoted = nextMapToBeVoted;

      this.emit('UPDATED_LAYER_INFORMATION');
    } catch (err) {
      Logger.verbose('SquadServer', 1, 'Failed to update layer information.', err);
    }

    Logger.verbose('SquadServer', 1, 'Updated layer information.');

    this.updateLayerInformationTimeout = setTimeout(
      this.updateLayerInformation,
      this.updateLayerInformationInterval
    );
  }

  updateA2SInformation() {
    return this.updateServerInformation();
  }

  async updateServerInformation() {
    if (this.updateA2SInformationTimeout) clearTimeout(this.updateA2SInformationTimeout);

    Logger.verbose('SquadServer', 1, 'Updating server information...');

    try {
      const rawData = await this.rcon.execute('ShowServerInfo');
      Logger.verbose('SquadServer', 3, 'Server information raw data', rawData);
      const data = JSON.parse(rawData);
      Logger.verbose('SquadServer', 2, 'Server information data', JSON.data);

      const info = {
        raw: data,
        serverName: data.ServerName_s,

        maxPlayers: parseInt(data.MaxPlayers),
        publicQueueLimit: parseInt(data.PublicQueueLimit_I),
        reserveSlots: parseInt(data.PlayerReserveCount_I),

        playerCount: parseInt(data.PlayerCount_I),
        a2sPlayerCount: parseInt(data.PlayerCount_I),
        publicQueue: parseInt(data.PublicQueue_I),
        reserveQueue: parseInt(data.ReservedQueue_I),

        currentLayer: data.MapName_s,
        nextLayer: data.NextLayer_s,

        teamOne: data.TeamOne_s?.replace(new RegExp(data.MapName_s, 'i'), '') || '',
        teamTwo: data.TeamTwo_s?.replace(new RegExp(data.MapName_s, 'i'), '') || '',

        matchTimeout: parseFloat(data.MatchTimeout_d),
        matchStartTime: this.getMatchStartTimeByPlaytime(data.PLAYTIME_I),
        gameVersion: data.GameVersion_s
      };

      this.serverName = info.serverName;

      this.maxPlayers = info.maxPlayers;
      this.publicSlots = info.maxPlayers - info.reserveSlots;
      this.reserveSlots = info.reserveSlots;

      this.a2sPlayerCount = info.playerCount;
      this.playerCount = info.playerCount;
      this.publicQueue = info.publicQueue;
      this.reserveQueue = info.reserveQueue;

      this.matchTimeout = info.matchTimeout;
      this.matchStartTime = info.matchStartTime;
      this.gameVersion = info.gameVersion;

      if (!this.currentLayer) this.currentLayer = Layers.getLayerByClassname(info.currentLayer);
      if (!this.nextLayer) this.nextLayer = Layers.getLayerByClassname(info.nextLayer);

      this.emit('UPDATED_A2S_INFORMATION', info);
      this.emit('UPDATED_SERVER_INFORMATION', info);
    } catch (err) {
      Logger.verbose('SquadServer', 1, 'Failed to update server information.', err);
    }

    Logger.verbose('SquadServer', 1, 'Updated server information.');

    this.updateA2SInformationTimeout = setTimeout(
      this.updateA2SInformation,
      this.updateA2SInformationInterval
    );
  }

  async getPlayerByCondition(condition, forceUpdate = false, retry = true) {
    let matches;

    if (!forceUpdate) {
      matches = this.players.filter(condition);
      if (matches.length === 1) return matches[0];

      if (!retry) return null;
    }

    await this.updatePlayerList();

    matches = this.players.filter(condition);
    if (matches.length === 1) return matches[0];

    return null;
  }

  async getSquadByCondition(condition, forceUpdate = false, retry = true) {
    let matches;

    if (!forceUpdate) {
      matches = this.squads.filter(condition);
      if (matches.length === 1) return matches[0];

      if (!retry) return null;
    }

    await this.updateSquadList();

    matches = this.squads.filter(condition);
    if (matches.length === 1) return matches[0];

    return null;
  }

  async getSquadByID(teamID, squadID) {
    if (squadID === null) return null;
    return this.getSquadByCondition(
      (squad) => squad.teamID === teamID && squad.squadID === squadID
    );
  }

  async getPlayerBySteamID(steamID, forceUpdate) {
    return this.getPlayerByCondition((player) => player.steamID === steamID, forceUpdate);
  }

  async getPlayerByEOSID(eosID, forceUpdate) {
    return this.getPlayerByCondition((player) => player.EOSID === eosID, forceUpdate);
  }

  async getPlayerByName(name, forceUpdate) {
    return this.getPlayerByCondition((player) => player.name === name, forceUpdate);
  }

  async getPlayerByNameSuffix(suffix, forceUpdate) {
    return this.getPlayerByCondition((player) => player.suffix === suffix, forceUpdate, false);
  }

  async getPlayerByController(controller, forceUpdate) {
    return this.getPlayerByCondition(
      (player) => player.playercontroller === controller,
      forceUpdate
    );
  }

  async pingSquadJSAPI() {
    if (this.pingSquadJSAPITimeout) clearTimeout(this.pingSquadJSAPITimeout);

    Logger.verbose('SquadServer', 1, 'Pinging SquadJS API...');

    const payload = {
      // Send information about the server.
      server: {
        host: this.options.host,
        queryPort: this.options.queryPort,

        name: this.serverName,
        playerCount: this.a2sPlayerCount + this.publicQueue + this.reserveQueue
      },

      // Send information about SquadJS.
      squadjs: {
        version: SQUADJS_VERSION,
        logReaderMode: this.options.logReaderMode,

        // Send the plugin config so we can see what plugins they're using (none of the config is sensitive).
        plugins: this.plugins.map((plugin) => ({
          ...plugin.rawOptions,
          plugin: plugin.constructor.name
        }))
      }
    };

    try {
      const { data } = await axios.post(SQUADJS_API_DOMAIN + '/api/v1/ping', payload);

      if (data.error)
        Logger.verbose(
          'SquadServer',
          1,
          `Successfully pinged the SquadJS API. Got back error: ${data.error}`
        );
      else
        Logger.verbose(
          'SquadServer',
          1,
          `Successfully pinged the SquadJS API. Got back message: ${data.message}`
        );
    } catch (err) {
      Logger.verbose('SquadServer', 1, 'Failed to ping the SquadJS API: ', err.message);
    }

    this.pingSquadJSAPITimeout = setTimeout(this.pingSquadJSAPI, this.pingSquadJSAPIInterval);
  }

  getMatchStartTimeByPlaytime(playtime) {
    return new Date(Date.now() - +playtime * 1000);
  }

  validator(obj, locate) {
    try {
      obj = obj || {};
      if (typeof locate !== 'string') {
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
      Logger.err(ex);
    }
    return null;
  }

  /**
   * @param {object} info - Root object
   * @param {string} template - String template
   * @returns {object|null} Returns boolean or value of template if valid
   * @example <caption>Example usage</caption>
   * this.isValid(info, '<steamID>'); // Returns '76774190522813645'
   * this.isValid(info.squadID, '<steamID>'); // Returns false
   */
  isValid(info, template) {
    try {
      if (typeof template !== 'string') {
        throw new Error('{ template } needs to be a type of String');
      }
      if (!this.isObj(info)) {
        throw new Error('{ info } needs to be a type of Object');
      }
      const resp = this.validator(
        info,
        template.replace(/<([\w]+)>/g, (_match, root) => {
          return root;
        })
      );
      return resp;
    } catch (ex) {
      Logger.err(ex, info, template);
    }
    return null;
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
    /** @type { string } */
    const s = Object.prototype.toString.call(obj);
    return s.includes('Null') || s.includes('Undefined');
  }

  /**
   * Object is Blank
   * @template O
   * @param { O } obj - String, Array, Set, Map, or Object
   * @returns { boolean } Returns if statement true or false
   */
  isBlank(obj) {
    return (
      (this.isStr(obj) && Object.is(obj.trim(), '')) ||
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
   * @template { string } S
   * @param { ...S } maps
   * @returns { S | S[] }
   */
  addMap(...maps) {
    const resp = [];
    for (const key of maps) {
      if (this.objMaps.has(key)) {
        return this.objMaps.get(key);
      }
      this.objMaps.set(key, new Map());
      resp.push(this.objMaps.get(key));
    }
    return resp.length >= 2 ? resp : resp[0];
  }
  // addMap(arr = []) {
  //   if (this.isEmpty(arr)) return arr;
  //   const resp = [];
  //   for (const k of this.normalizeTarget(arr)) {
  //     const key = Array.isArray(k) ? k[0] : k;
  //     if (this.objMaps.has(key)) {
  //       return this.objMaps.get(k);
  //     }
  //     this.objMaps.set(key, new Map());
  //     resp.push(this.objMaps.get(key));
  //   }
  //   return resp.length >= 2 ? resp : resp[0];
  // }
}
