import { EventEmitter } from 'node:events';
import net from 'net';
import SquadJS from 'core/types/rcon';

/**
 * SquadJS Events
 */
type LogEvents = [
  'ADMIN_BROADCAST',
  'DEPLOYABLE_DAMAGED',
  'CHAT_MESSAGE',
  'CHAT_COMMAND:<command message>',
  'NEW_GAME',
  'PLAYER_BANNED',
  'PLAYER_DAMAGED',
  'PLAYER_DIED',
  'PLAYER_DISCONNECTED',
  'PLAYER_CONNECTED',
  'PLAYER_KICKED',
  'PLAYER_POSSESS',
  'PLAYER_REVIVED',
  'PLAYER_SQUAD_CHANGE',
  'PLAYER_TEAM_CHANGE',
  'PLAYER_UNPOSSESS',
  'PLAYER_WARNED',
  'PLAYER_WOUNDED',
  'POSSESSED_ADMIN_CAMERA',
  'RCON_ERROR',
  'ROUND_ENDED',
  'SQUAD_CREATED',
  'TEAMKILL',
  'TICK_RATE',
  'UPDATED_A2S_INFORMATION',
  'UPDATED_PLAYER_INFORMATION',
  'UPDATED_LAYER_INFORMATION',
  'UNPOSSESSED_ADMIN_CAMERA'
];

const SERVERDATA_EXECCOMMAND = 0x02;
// const SERVERDATA_RESPONSE_VALUE = 0x00;
// const SERVERDATA_AUTH = 0x03;
// const SERVERDATA_AUTH_RESPONSE = 0x02;
// const SERVERDATA_CHAT_VALUE = 0x01;

export class Rcon extends EventEmitter {
  constructor(
    options:
      | {
          autoReconnectDelay: number | 5000;
          host: string;
          password: string;
          port: string;
        }
      | {}
  );
  processChatPacket(decodedPacket: Buffer | string): void;
  client: net.Socket;
  execute(body: string): Promise<string | Error>;
  write(type: 0x02, body: string): Promise<string | void>;
  bufToHexString(buf: Buffer): string;
  broadcast(message: string) {
    return this.execute(`AdminBroadcast ${message}`);
  }
  setFogOfWar(mode: string) {
    return this.execute(`AdminSetFogOfWar ${mode}`);
  }
  warn(steamID: SquadJSRcon.PlayerType["steamID"], message: string) {
    return this.execute(`AdminWarn "${steamID}" ${message}`);
  }
  kick(steamID: string, reason: string) {
    return this.execute(`AdminKick "${steamID}" ${reason}`);
  }
  getCurrentMap(): Promise<{ level: string | null; layer: string | null }>;
  getNextMap(): Promise<{ level: string | null; layer: string | null }>;
  getListPlayers(): Promise<PlayerType[]>;
  getSquads(): Promise<SquadType[]>;
  forceTeamChange(steamID: string): Promise<void>;
  broadcast(message: string): Promise<void>;
  ban(steamID: string, banLength: string, message: string) {
    return this.execute(`AdminBan "${steamID}" ${banLength} ${message}`);
  }
  switchTeam(steamID: string) {
    return this.execute(`AdminForceTeamChange "${steamID}"`);
  }
}
export type decodedPacket = {
  size: number;
  id: number;
  type: number;
  body: string;
};
export type SquadType = {
  squadID: string | null;
  squadName: string;
  size: string;
  locked: boolean;
  teamID: string;
  teamName: string;
  creator: {
    name: string;
    steamID: string;
    time: Date;
  };
};
export type PlayerType = {
  playerID: string;
  steamID: string;
  name: string;
  teamID: string;
  squadID: string;
  squad: SquadType;
  suffix?: string;
  isLeader: boolean;
  role: string;
};
export interface Player {
  player: PlayerType;
}

export as namespace SquadJSRcon;
