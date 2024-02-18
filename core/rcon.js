import { EventEmitter } from 'node:events';
import net from 'node:net';
import Logger from './logger.js';
import fs from 'fs';
import path from 'path';
const RCON_LOG_FILEPATH = 'RCON_RECEIVED_MESSAGES.log';
/** @type { import("./types/rcon").Rcon } */
export default class Rcon extends EventEmitter {
  constructor(options = {}) {
    super();
    for (const option of ['host', 'port', 'password'])
      if (!(option in options)) throw new Error(`${option} must be specified.`);
    this.host = options.host;
    this.port = options.port;
    this.password = options.password;
    this.client = null;
    this.stream = new Buffer.alloc(0);
    this.type = { auth: 0x03, command: 0x02, response: 0x00, server: 0x01 };
    this.soh = { size: 7, id: 0, type: this.type.response, body: '' };
    this.responseString = { id: 0, body: '' };
    this.connected = false;
    this.autoReconnect = false;
    this.autoReconnectDelay = options.autoReconnectDelay || 1000;
    this.connectionRetry;
    this.msgIdLow = 6;
    this.msgIdHigh = 16;
    this.specialId = 19;
    this.msgId = this.msgIdLow;
    this.passThrough = options.passThrough ? true : false;
    this.passThroughPort = options.passThroughPort || 8124;
    this.passThroughTimeOut = options.passThroughTimeOut || 60000;
    this.passThroughMaxClients = 1; //options.passThroughMaxClients || 10;
    this.passThroughChallenge = options.passThroughChallenge || options.password;
    this.dumpRconResponsesToFile = options.dumpRconResponsesToFile || false;
    this.rconClients = {};
    for (let i = 1; i <= this.passThroughMaxClients; i++) this.rconClients[`${i}`] = null;
    this.ptServer = null;

    this.steamIndex = { '76561198799344716': '00026e21ce3d43c792613bdbb6dec1ba' }; // example dtata
    this.eosIndex = { '00026e21ce3d43c792613bdbb6dec1ba': '76561198799344716' }; // example dtata

    this.rotateLogFile(RCON_LOG_FILEPATH);
  }
  processChatPacket(decodedPacket) {
    const matchChat = decodedPacket.body.match(
      /\[(ChatAll|ChatTeam|ChatSquad|ChatAdmin)] \[Online IDs:EOS: ([0-9a-f]{32}) steam: (\d{17})\] (.+?) : (.*)/
    );
    if (matchChat) {
      Logger.verbose('SquadRcon', 2, `Matched chat message: ${decodedPacket.body}`);

      this.emit('CHAT_MESSAGE', {
        raw: decodedPacket.body,
        chat: matchChat[1],
        eosID: matchChat[2],
        steamID: matchChat[3],
        name: matchChat[4],
        message: matchChat[5],
        time: new Date()
      });

      return;
    }

    const matchPossessedAdminCam = decodedPacket.body.match(
      /\[Online Ids:EOS: ([0-9a-f]{32}) steam: (\d{17})\] (.+) has possessed admin camera\./
    );
    if (matchPossessedAdminCam) {
      Logger.verbose('SquadRcon', 2, `Matched admin camera possessed: ${decodedPacket.body}`);
      this.emit('POSSESSED_ADMIN_CAMERA', {
        raw: decodedPacket.body,
        steamID: matchPossessedAdminCam[2],
        name: matchPossessedAdminCam[3],
        time: new Date()
      });

      return;
    }

    const matchUnpossessedAdminCam = decodedPacket.body.match(
      /\[Online IDs:EOS: ([0-9a-f]{32}) steam: (\d{17})\] (.+) has unpossessed admin camera\./
    );
    if (matchUnpossessedAdminCam) {
      Logger.verbose('SquadRcon', 2, `Matched admin camera possessed: ${decodedPacket.body}`);
      this.emit('UNPOSSESSED_ADMIN_CAMERA', {
        raw: decodedPacket.body,
        steamID: matchUnpossessedAdminCam[2],
        name: matchUnpossessedAdminCam[3],
        time: new Date()
      });

      return;
    }

    const matchWarn = decodedPacket.body.match(
      /Remote admin has warned player (.*)\. Message was "(.*)"/
    );
    if (matchWarn) {
      Logger.verbose('SquadRcon', 2, `Matched warn message: ${decodedPacket.body}`);

      this.emit('PLAYER_WARNED', {
        raw: decodedPacket.body,
        name: matchWarn[1],
        reason: matchWarn[2],
        time: new Date()
      });

      return;
    }

    const matchKick = decodedPacket.body.match(
      /Kicked player ([0-9]+)\. \[Online IDs= EOS: ([0-9a-f]{32}) steam: (\d{17})] (.*)/
    );
    if (matchKick) {
      Logger.verbose('SquadRcon', 2, `Matched kick message: ${decodedPacket.body}`);

      this.emit('PLAYER_KICKED', {
        raw: decodedPacket.body,
        playerID: matchKick[1],
        steamID: matchKick[3],
        name: matchKick[4],
        time: new Date()
      });

      return;
    }

    const matchSqCreated = decodedPacket.body.match(
      /(?<playerName>.+) \(Online IDs: EOS: (?<playerEOSID>[\da-f]{32})(?: steam: (?<playerSteamID>\d{17}))?\) has created Squad (?<squadID>\d+) \(Squad Name: (?<squadName>.+)\) on (?<teamName>.+)/
    );
    if (matchSqCreated) {
      Logger.verbose('SquadRcon', 2, `Matched Squad Created: ${decodedPacket.body}`);

      this.emit('SQUAD_CREATED', {
        time: new Date(),
        ...matchSqCreated.groups
      });

      return;
    }

    const matchBan = decodedPacket.body.match(
      /Banned player ([0-9]+)\. \[steamid=(.*?)\] (.*) for interval (.*)/
    );
    if (matchBan) {
      Logger.verbose('SquadRcon', 2, `Matched ban message: ${decodedPacket.body}`);

      this.emit('PLAYER_BANNED', {
        raw: decodedPacket.body,
        playerID: matchBan[1],
        steamID: matchBan[2],
        name: matchBan[3],
        interval: matchBan[4],
        time: new Date()
      });
    }
  }
  async connect() {
    return new Promise((resolve, reject) => {
      if (this.client && this.connected && !this.client.destroyed)
        return reject(new Error('Rcon.connect() Rcon already connected.'));
      this.removeAllListeners('server');
      this.removeAllListeners('auth');
      this.on('server', (pkt) => this.processChatPacket(pkt));
      this.once('auth', () => {
        Logger.verbose('RCON', 1, `Connected to: ${this.host}:${this.port}`);
        clearTimeout(this.connectionRetry);
        this.connected = true;
        if (this.passThrough) this.createServer();
        resolve();
      });
      Logger.verbose('RCON', 1, `Connecting to: ${this.host}:${this.port}`);
      this.connectionRetry = setTimeout(() => this.connect(), this.autoReconnectDelay);
      this.autoReconnect = true;
      this.client = net
        .createConnection({ port: this.port, host: this.host }, () => this.sendAuth())
        .on('data', (data) => this.onData(data))
        .on('end', () => this.onClose())
        .on('error', () => this.onNetError());
    }).catch((error) => {
      Logger.verbose('RCON', 1, `Rcon.connect() ${error}`);
    });
  }
  async disconnect() {
    return new Promise((resolve) => {
      Logger.verbose('RCON', 1, `Disconnecting from: ${this.host}:${this.port}`);
      clearTimeout(this.connectionRetry);
      this.removeAllListeners('server');
      this.removeAllListeners('auth');
      this.autoReconnect = false;
      this.client.end();
      this.connected = false;
      this.closeServer();
      resolve();
    }).catch((error) => {
      Logger.verbose('RCON', 1, `Rcon.disconnect() ${error}`);
    });
  }
  async execute(body) {
    let steamID = body.match(/\d{17}/);
    if (steamID) {
      steamID = steamID[0];
      body = body.replace(/\d{17}/, this.steamIndex[steamID]);
    }

    return new Promise((resolve, reject) => {
      if (!this.connected) return reject(new Error('Rcon not connected.'));
      if (!this.client.writable) return reject(new Error('Unable to write to node:net socket'));
      const string = String(body);
      const length = Buffer.from(string).length;
      if (length > 4154) Logger.verbose('RCON', 1, `Error occurred. Oversize, "${length}" > 4154`);
      else {
        const outputData = (data) => {
          clearTimeout(timeOut);
          resolve(data);
        };
        const timedOut = () => {
          console.warn('MISSED', listenerId);
          this.removeListener(listenerId, outputData);
          return reject(new Error('Rcon response timed out'));
        };
        if (this.msgId > this.msgIdHigh - 2) this.msgId = this.msgIdLow;
        const listenerId = `response${this.msgId}`;
        const timeOut = setTimeout(timedOut, 10000);
        this.once(listenerId, outputData);
        this.send(string, this.msgId);
        this.msgId++;
      }
    }).catch((error) => {
      Logger.verbose('RCON', 1, `Rcon.execute() ${error}`);
    });
  }
  sendAuth() {
    Logger.verbose('RCON', 1, `Sending Token to: ${this.host}:${this.port}`);
    this.client.write(this.encode(this.type.auth, 0, this.password).toString('binary'), 'binary'); //2147483647
  }
  send(body, id = 99) {
    this.write(this.type.command, id, body);
    this.write(this.type.command, id + 2);
  }
  write(type, id, body) {
    Logger.verbose(
      'RCON',
      2,
      `Writing packet with type "${type}", id "${id}" and body "${body || ''}"`
    );
    this.client.write(this.encode(type, id, body).toString('binary'), 'binary');
  }
  encode(type, id, body = '') {
    const size = Buffer.byteLength(body) + 14;
    const buffer = new Buffer.alloc(size);
    buffer.writeInt32LE(size - 4, 0);
    buffer.writeInt32LE(id, 4);
    buffer.writeInt32LE(type, 8);
    buffer.write(body, 12, size - 2, 'utf8');
    buffer.writeInt16LE(0, size - 2);
    return buffer;
  }
  onData(data) {
    Logger.verbose('RCON', 4, `Got data: ${this.bufToHexString(data)}`);
    this.stream = Buffer.concat([this.stream, data], this.stream.byteLength + data.byteLength);
    while (this.stream.byteLength >= 7) {
      const packet = this.decode();
      if (!packet) break;
      else
        Logger.verbose(
          'RCON',
          3,
          `Processing decoded packet: Size: ${packet.size}, ID: ${packet.id}, Type: ${packet.type}, Body: ${packet.body}`
        );
      this.appendToFile(RCON_LOG_FILEPATH, packet.body);

      if (packet.id > this.msgIdHigh) this.emit('responseForward_1', packet);
      else if (packet.type === this.type.response) this.onResponse(packet);
      else if (packet.type === this.type.server) this.onServer(packet);
      else if (packet.type === this.type.command) this.emit('auth');
    }
  }
  onServer(packet) {
    this.emit('server', packet);
    for (const client in this.rconClients)
      if (this.rconClients[client]) {
        this.emit(`serverForward_${this.rconClients[client].rconIdClient}`, packet.body);
      }
  }
  decode() {
    if (
      this.stream[0] === 0 &&
      this.stream[1] === 1 &&
      this.stream[2] === 0 &&
      this.stream[3] === 0 &&
      this.stream[4] === 0 &&
      this.stream[5] === 0 &&
      this.stream[6] === 0
    ) {
      this.stream = this.stream.subarray(7);
      return this.soh;
    }
    const bufSize = this.stream.readInt32LE(0);
    if (bufSize > 8192 || bufSize < 10) return this.badPacket();
    else if (bufSize <= this.stream.byteLength - 4 && this.stream.byteLength >= 12) {
      const bufId = this.stream.readInt32LE(4);
      const bufType = this.stream.readInt32LE(8);
      if (
        this.stream[bufSize + 2] !== 0 ||
        this.stream[bufSize + 3] !== 0 ||
        bufId < 0 ||
        bufType < 0 ||
        bufType > 5
      )
        return this.badPacket();
      else {
        const response = {
          size: bufSize,
          id: bufId,
          type: bufType,
          body: this.stream.toString('utf8', 12, bufSize + 2)
        };
        this.stream = this.stream.subarray(bufSize + 4);
        if (
          response.body === '' &&
          this.stream[0] === 0 &&
          this.stream[1] === 1 &&
          this.stream[2] === 0 &&
          this.stream[3] === 0 &&
          this.stream[4] === 0 &&
          this.stream[5] === 0 &&
          this.stream[6] === 0
        ) {
          this.stream = this.stream.subarray(7);
          response.body = '';
        }
        return response;
      }
    } else return null;
  }
  onResponse(packet) {
    if (packet.body === '') {
      this.emit(`response${this.responseString.id - 2}`, this.responseString.body);
      this.responseString.body = '';
    } else if (!packet.body.includes('')) {
      this.responseString.body = this.responseString.body + packet.body;
      this.responseString.id = packet.id;
    } else this.badPacket();
  }
  badPacket() {
    Logger.verbose(
      'RCON',
      1,
      `Bad packet, clearing: ${this.bufToHexString(this.stream)} Pending string: ${
        this.responseString
      }`
    );
    this.stream = Buffer.alloc(0);
    this.responseString.body = '';
    return null;
  }
  onClose() {
    Logger.verbose('RCON', 1, 'Socket closed');
    this.cleanUp();
  }
  onNetError(error) {
    Logger.verbose('RCON', 1, 'node:net error:', error);
    this.emit('RCON_ERROR', error);
    this.cleanUp();
  }
  cleanUp() {
    this.closeServer();
    this.connected = false;
    this.removeAllListeners();
    clearTimeout(this.connectionRetry);
    if (this.autoReconnect) {
      Logger.verbose('RCON', 1, `Sleeping ${this.autoReconnectDelay}ms before reconnecting`);
      this.connectionRetry = setTimeout(() => this.connect(), this.autoReconnectDelay);
    }
  }
  createServer() {
    this.ptServer = net.createServer((client) => this.onNewClient(client));
    this.ptServer.maxConnections = this.passThroughMaxClients;
    this.ptServer.on('error', (error) => this.onSerErr(error));
    this.ptServer.on('drop', () =>
      Logger.verbose(
        'RCON',
        1,
        `Pass-through Server: Max Clients Reached (${this.passThroughMaxClients}) rejecting new connection`
      )
    );
    this.ptServer.listen(this.passThroughPort, () =>
      Logger.verbose('RCON', 1, `Pass-through Server: Listening on port ${this.passThroughPort}`)
    );
  }
  closeServer() {
    for (const client in this.rconClients)
      if (this.rconClients[client]) this.rconClients[client].end();
    if (!this.ptServer) return;
    this.ptServer.close(() => this.onServerClose());
  }
  onServerClose() {
    if (!this.ptServer) return;
    this.ptServer.removeAllListeners();
    this.ptServer = null;
    Logger.verbose('RCON', 1, 'Pass-through Server: Closed');
  }
  onNewClient(client) {
    client.setTimeout(this.passThroughTimeOut);
    client.on('end', () => this.onClientEnd(client));
    client.on('error', () => this.onClientEnd(client));
    client.on('timeout', () => this.onClientTimeOut(client));
    client.on('data', (data) => this.onClientData(client, data));
    Logger.verbose('RCON', 1, 'Pass-through Server: Client connecting');
  }
  onSerErr(error) {
    this.closeServer();
    Logger.verbose('RCON', 1, `Pass-through Server: ${error}`);
  }
  onClientEnd(client) {
    if (!client.rconIdClient) return;
    this.removeAllListeners(`serverForward_${client.rconIdClient}`);
    this.removeAllListeners(`responseForward_${client.rconIdClient}`);
    this.rconClients[`${client.rconIdClient}`] = null;
    Logger.verbose('RCON', 1, `Pass-through Server: Client-${client.rconIdClient} Disconnected`);
  }
  onClientTimeOut(client) {
    client.end();
    Logger.verbose('RCON', 1, `Pass-through Server: Client-${client.rconIdClient} Timed Out`);
  }
  onClientData(client, data) {
    if (!client.rconStream) client.rconStream = new Buffer.alloc(0);
    client.rconStream = Buffer.concat(
      [client.rconStream, data],
      client.rconStream.byteLength + data.byteLength
    );
    while (client.rconStream.byteLength >= 4) {
      const packet = this.decodeClient(client);
      if (!packet) break;
      if (!client.rconHasAuthed) this.authClient(client, packet);
      else {
        if (!client.rconWheel || client.rconWheel > 20) client.rconWheel = 0;
        else client.rconWheel++;

        client.rconIdQueueNEW[`${client.rconWheel}`] = packet.id;

        const encoded = this.encode(
          packet.type,
          this.specialId + client.rconWheel,
          this.steamToEosClient(packet.body)
        ); ////////////////////////////////////////////////
        this.client.write(encoded.toString('binary'), 'binary');
        // this.client.write(this.encode(packet.type, this.specialId * client.rconIdClient).toString("binary"), "binary")
      }
    }
  }
  decodeClient(client) {
    const bufSize = client.rconStream.readInt32LE(0);
    if (bufSize <= client.rconStream.byteLength - 4) {
      const response = {
        size: bufSize,
        id: client.rconStream.readInt32LE(4),
        type: client.rconStream.readInt32LE(8),
        body: client.rconStream.toString('utf8', 12, bufSize + 2)
      };
      client.rconStream = client.rconStream.subarray(bufSize + 4);
      return response;
    } else return null;
  }
  authClient(client, packet) {
    if (packet.body !== this.passThroughChallenge) {
      client.end();
      Logger.verbose('RCON', 1, 'Pass-through Server: Client [Rejected] Password not matched');
    } else {
      client.rconHasAuthed = true;
      client.rconIdQueueNEW = {};
      for (let i = 1; i <= this.passThroughMaxClients; i++) {
        if (this.rconClients[`${i}`] === null) {
          client.rconIdClient = i;
          this.rconClients[`${i}`] = client;
          break;
        }
      }
      this.on(`serverForward_${client.rconIdClient}`, (body) =>
        client.write(this.encode(1, 0, this.eosToSteam(body)).toString('binary'), 'binary')
      );
      this.on(`responseForward_${client.rconIdClient}`, (packet) => this.onForward(client, packet));
      client.write(this.encode(0, packet.id));
      client.write(this.encode(2, packet.id));
      Logger.verbose('RCON', 1, `Pass-through Server: Client-${client.rconIdClient} Connected`);
    }
  }
  onForward(client, packet) {
    if (packet.body !== '' && packet.body !== '') {
      const int = packet.id - this.specialId;

      //console.log(client.rconIdQueueNEW);//////////////////////////////////////////////////////////////////////////////////////////

      client.write(
        this.encode(packet.type, client.rconIdQueueNEW[int], this.eosToSteam(packet.body)).toString(
          'binary'
        ),
        'binary'
      );
    } else if (packet.body != '') {
      const int = packet.id - this.specialId;
      client.write(this.encode(0, client.rconIdQueueNEW[int]).toString('binary'), 'binary');
      client.write(this.encodeSpecial(client.rconIdQueueNEW[int]).toString('binary'), 'binary');
    }
  }
  encodeSpecial(id) {
    const buffer = new Buffer.alloc(21);
    buffer.writeInt32LE(10, 0);
    buffer.writeInt32LE(id, 4);
    buffer.writeInt32LE(0, 8);
    buffer.writeInt32LE(1, 15);
    return buffer;
  }
  bufToHexString(buf) {
    return buf.toString('hex').match(/../g).join(' ');
  }
  async warn(steamID, message) {
    this.execute(`AdminWarn "${steamID}" ${message}`);
  }
  async kick(steamID, reason) {
    this.execute(`AdminKick "${steamID}" ${reason}`);
  }
  async forceTeamChange(steamID) {
    this.execute(`AdminForceTeamChange "${steamID}"`);
  }
  // 0 = Perm | 1m = 1 minute | 1d = 1 Day | 1M = 1 Month | etc...
  async ban(steamID, banLength, message) {
    await this.execute(`AdminBan "${steamID}" ${banLength} ${message}`);
  }

  async switchTeam(steamID) {
    await this.execute(`AdminForceTeamChange "${steamID}"`);
  }

  async getCurrentMap() {
    /** @type {string} */
    const response = await this.execute('ShowCurrentMap');
    const match = response.match(/^Current level is (.*), layer is (.*)/);
    return { level: match[1] || null, layer: match[2] || null };
  }

  async getNextMap() {
    /** @type {string} */
    const response = await this.execute('ShowNextMap');
    const match = response.match(/^Next level is (.*), layer is (.*)/);
    return {
      level: match[1] !== '' ? match[1] : null,
      layer: match[2] !== 'To be voted' ? match[2] : null
    };
  }

  async getListPlayers(server) {
    /** @type {string} */
    const response = await this.execute('ListPlayers');

    const players = [];

    if (!response || response.length < 1) return players;

    for (const line of response.split('\n')) {
      const match = line.match(
        /^ID: (?<playerID>\d+) \| Online IDs: EOS: (?<EOSID>[a-f\d]{32}) (?:steam: (?<steamID>\d{17}) )?\| Name: (?<name>.+) \| Team ID: (?<teamID>\d|N\/A) \| Squad ID: (?<squadID>\d+|N\/A) \| Is Leader: (?<isLeader>True|False) \| Role: (?<role>.+)$/
      );
      if (!match) continue;

      if (server?.rcon?.addIds) server.rcon.addIds(match[3], match[2]);

      const data = match.groups;
      data.isLeader = data.isLeader === 'True';
      data.squadID = data.squadID !== 'N/A' ? data.squadID : null;

      players.push(data);
    }

    return players;
  }

  async getSquads() {
    /** @type {string} */
    const responseSquad = await this.execute('ListSquads');

    const squads = [];
    let teamName;
    let teamID;

    if (!responseSquad || responseSquad.length < 1) return squads;

    for (const line of responseSquad.split('\n')) {
      const match = line.match(
        /ID: (\d+) \| Name: (.+) \| Size: (\d+) \| Locked: (True|False) \| Creator Name: (.+) \| Creator Online IDs: EOS: ([a-f\d]{32}) steam: (\d{17})/
      );
      const matchSide = line.match(/Team ID: (\d) \((.+)\)/);
      if (matchSide) {
        teamID = matchSide[1];
        teamName = matchSide[2];
      }
      if (!match) continue;
      squads.push({
        squadID: match[1],
        squadName: match[2],
        size: match[3],
        locked: match[4],
        creatorName: match[5],
        creatorEOSID: match[6],
        creatorSteamID: match[7],
        teamID: teamID,
        teamName: teamName,
        creator: {
          name: match[5],
          steamID: match[7],
          EOSID: match[6],
        }
      });
    }

    return squads;
  }

  async broadcast(message) {
    await this.execute(`AdminBroadcast ${message}`);
  }

  async setFogOfWar(mode) {
    await this.execute(`AdminSetFogOfWar ${mode}`);
  }
  addIds(steamId, eosId) {
    this.steamIndex[steamId] = eosId; // { "76561198799344716": "00026e21ce3d43c792613bdbb6dec1ba" };
    this.eosIndex[eosId] = steamId;
  }

  removeIds(eosId) {
    // clean up ids on leave
  }

  steamToEosClient(body) {
    //assume client does not send more than 1 steamId per msg
    const m = body.match(/[0-9]{17}/);
    if (m && m[1] in this.steamIndex) return body.replaceAll(`${m[0]}`, this.steamIndex[m[0]]);
    return body;
  }

  eosToSteam(body) {
    //split body to lines for matching (1 steamId per line)
    const lines = body.split('\n');
    const nBody = [];
    for (const line of lines) nBody.push(this.matchRcon(line));
    return nBody.join('\n');
  }

  matchRcon(line) {
    for (const r of defs) {
      const match = line.match(r.regex);
      if (match && (match.groups.eosId in this.eosIndex || match.groups.steamId)) {
        return r.rep(
          line,
          match.groups.steamId || this.eosIndex[match.groups.eosId],
          match.groups.eosId
        );
      }
    }
    return line;
  }

  appendToFile(filePath, content) {
    if (!this.dumpRconResponsesToFile) return;
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.appendFile(filePath, content + '\n', (err) => {
      if (err) throw err;
    });
  }
  rotateLogFile(logFile) {
    if (!this.dumpRconResponsesToFile) return;
    if (fs.existsSync(logFile)) {
      const ext = path.extname(logFile);
      const base = path.basename(logFile, ext);
      const dir = path.dirname(logFile);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const newFile = path.join(dir, `${base}_${timestamp}${ext}`);

      fs.renameSync(logFile, newFile);
    }
  }
}
const defs = [
  //strict matching to avoid 'name as steamId errors'
  {
    regex:
      /^ID: [0-9]+ \| Online IDs: EOS: (?<eosId>[0-9a-f]{32}) steam: (?<steamId>\d{17}) \| Name: .+ \| Team ID: (1|2|N\/A) \| Squad ID: ([0-9]+|N\/A) \| Is Leader: (True|False|N\/A) \| Role: .+$/,
    rep: (line, steamId, eosId) => {
      return line.replace(
        /\| Online IDs: EOS: [\w\d]{32} steam: \d{17} \|/,
        `| SteamID: ${steamId} |`
      );
    }
  },
  {
    regex:
      /^ID: (?<Id>[0-9]+) \| Online IDs: EOS: (?<eosId>[0-9a-f]{32}) steam: (?<steamId>\d{17}) \| Since Disconnect: (?<SinceDc>.+) \| Name: (?<name>.+)$/,
    rep: (line, steamId, eosId) => {
      return line.replace(
        /Online IDs: EOS: (?<eosId>[0-9a-f]{32}) steam: (?<steamId>\d{17})/,
        `SteamID: ${steamId}`
      );
    }
  },
  {
    regex:
      /^ID: (?<sqdId>[0-9]+) \| Name: (?<sqdName>.+) \| Size: (?<sqdSize>[0-9]) \| Locked: (?<locked>True|False) \| Creator Name: (?<creatorName>.+) \| Creator Online IDs: EOS: (?<eosID>[\d\w]{32}) steam: (?<steamId>\d{17})/,
    rep: (line, steamId, eosId) => {
      console.log(line, steamId, eosId);
      const ret = line.replace(
        /\| Creator Online IDs: EOS: [\w\d]{32} steam: \d{17}/,
        `| Creator Steam ID: ${steamId}`
      );
      return ret;
    }
  },
  {
    regex:
      /^Forced team change for player (?<id>[0-9]+). \[Online IDs= EOS: (?<eosId>[0-9a-f]{32}) steam: (?<steamId>\d{17})] (.+)/,
    rep: (line, steamId, eosId) => {
      return line.replace(
        /Online IDs= EOS: (?<eosId>[0-9a-f]{32}) steam: (?<steamId>\d{17})/,
        `steamid=${steamId}`
      );
    }
  },

  {
    regex: /^Could not find player (?<eosId>[0-9a-f]{32})/,
    rep: (line, steamId, eosId) => {
      return line.replace(`Could not find player ${eosId}`, `Could not find player ${steamId}`);
    }
  },

  {
    regex:
      /^\[Chat(All|Team|Squad|Admin)] \[Online IDs:EOS: (?<eosId>[\d\w]{32}) steam: (?<steamId>\d{17})] (?<name>.+) : (?<msg>.+)/,
    rep: (line, steamId, eosId) => {
      return line.replace(/Online IDs:EOS: [\d\w]{32} steam: \d{17}/, `SteamID:${steamId}`);
    }
  },
  {
    regex:
      /^(?<name>.+) \(Online IDs: EOS: (?<eosId>[0-9a-f]{32}) steam: (?<steamId>\d+)\) has created Squad (?<squadNum>[0-9]+) \(Squad Name: (?<squadName>.+)\) on (?<teamName>.+)/,
    rep: (line, steamId, eosId) => {
      return line.replace(
        /Online IDs: EOS: (?<eosId>[0-9a-f]{32}) steam: (?<steamId>\d+)/,
        `Steam ID: ${steamId}`
      );
    }
  },
  {
    regex:
      /^Kicked player (?<Id>[0-9]+). \[Online IDs= EOS: (?<eosId>[0-9a-f]{32}) steam: (?<steamId>\d{17})] (?<name>.+)/,
    rep: (line, steamId, eosId) => {
      return line.replace(
        /Online IDs= EOS: (?<eosId>[0-9a-f]{32}) steam: (?<steamId>\d{17})/,
        `steamid=${steamId}`
      );
    }
  },

  {
    regex: /^ERROR: Unable to find player with name or id \((?<eosId>[0-9a-f]{32})\)$/,
    rep: (line, steamId, eosId) => {
      return line.replace(`name or id (${eosId})`, `name or id (${steamId})`);
    }
  },
  {
    regex:
      /^\[Online I(d|D)s:EOS: (?<eosId>[0-9a-f]{32}) steam: (?<steamId>)\d{17}] (?<name>.+) has (un)?possessed admin camera\./,
    rep: (line, steamId, eosId) => {
      return line.replace(/Online I(d|D)s:EOS: [\w\d]{32} steam: \d{17}/, `SteamID:${steamId}`);
    }
  }
];
