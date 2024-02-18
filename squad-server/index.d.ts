import { EventEmitter } from 'node:events';
import SquadJSRcon from 'core/types/rcon';
import DiscordBot from 'discord-bot';
import BattleMetrics from './utils/battlemetrics-api.js';

declare namespace logParser {
  export interface Base {
    raw: string;
    time: Date;
    chainID: string;
    steamID: string;
  }
  export interface ADMIN_CAMERA extends Base {
    name: string;
    duration?: number;
    player: SquadJSRcon.PlayerType;
  }
  export interface CHAT_MESSAGE extends Base {
    chat: string;
    name: string;
    message: string;
  }
  export interface PLAYER_CONNECTED extends Base {
    player: SquadJSRcon.PlayerType;
  }
  export interface PLAYER_DISCONNECTED extends Base {
    playerController: string;
  }
  export interface SQUAD_CREATED extends Base {
    squadID: string;
    squadName: string;
    player: SquadJSRcon.PlayerType;
  }
}

interface SquadOptions {
  id: number;
  options: SquadOptions | {};
  layerHistory: any[];
  layerHistoryMaxLength: number | 20;
  host: string;
  queryPort: string;
}

declare const Admins: {
  readonly [key: SquadJSRcon.PlayerType['steamID']]: {
    balance?: boolean;
    ban?: boolean;
    cameraman?: boolean;
    canseeadminchat?: boolean;
    changemap?: boolean;
    chat?: boolean;
    cheat?: boolean;
    clientdemos?: boolean;
    config?: boolean;
    debug?: boolean;
    demos?: boolean;
    featuretest?: boolean;
    forceteamchange?: boolean;
    immune?: boolean;
    kick?: boolean;
    manageserver?: boolean;
    pause?: boolean;
    private?: boolean;
    reserve?: boolean;
    startvote?: boolean;
    teamchange?: boolean;
  };
};

type AdminsString = (typeof Admins)[keyof typeof Admins];

/**
 * The Squad Server
 */
class SquadServer extends EventEmitter {
  constructor(options: SquadOptions);
  readonly webURL: string;
  readonly admins: typeof Admins;
  readonly players: SquadJSRcon.PlayerType[];
  mapPlayers: Map<SquadJSRcon.PlayerType['steamID'], SquadJSRcon.PlayerType>;
  teamKills: Map<SquadJSRcon.PlayerType['steamID'], SquadJSRcon.PlayerType>;
  objMaps: Map<string, Map<string, any>>;
  readonly squads: SquadJSRcon.SquadType[];
  readonly rcon: SquadJSRcon.Rcon;
  readonly DiscordBot: DiscordBot;
  readonly BM: BattleMetrics;
  // readonly rcon: keyof SquadJSRcon.Rcon;
  watch(): Promise<void>;
  unwatch(): Promise<void>;
  setupRCON(): void;
  restartRCON(): Promise<void>;
  setupLogParser(): void;
  restartLogParser(): Promise<void>;
  getAdminPermsBySteamID<S extends string>(steamID?: S): Admins[S] | undefined;
  getAdminsWithPermission<P extends keyof AdminsString>(perm?: P): SquadJSRcon.PlayerType['steamID'][];
  updateAdmins(): Promise<void>;
  updatePlayerList(): Promise<void>;
  updateSquadList(): Promise<void>;
  updateLayerInformation(): Promise<void>;
  updateA2SInformation(): Promise<void>;
  getPlayerByCondition(
    condition: string,
    forceUpdate?: boolean,
    retry?: boolean
  ): Promise<SquadJSRcon.PlayerType | null>;
  getSquadByCondition(
    condition: string,
    forceUpdate?: boolean,
    retry?: boolean
  ): Promise<SquadJSRcon.SquadType | null>;
  getSquadByID(squadID: string, teamID: string): Promise<SquadJSRcon.SquadType>;
  getPlayerBySteamID(steamID?: string, forceUpdate?: boolean): Promise<SquadJSRcon.PlayerType>;
  getPlayerByName(name: string, forceUpdate?: boolean): Promise<SquadJSRcon.PlayerType>;
  getPlayerByNameSuffix(suffix: string, forceUpdate?: boolean): Promise<object | null>;
  pingSquadJSAPI(): Promise<void>;
  /**
   * Create Object Maps
   */
  public addMap<S extends string>(...maps: S): S | S[];
}
// declare module 'core/logger';

export as namespace SquadJS;
