import BasePlugin from './base-plugin.js';
import * as DiscordJS from 'discord.js';
import {
  bold,
  channelMention,
  codeBlock,
  hideLinkEmbed,
  hyperlink,
  inlineCode,
  roleMention,
  time,
  userMention
} from 'discord.js';

declare const optionsSpecifications: {
  readonly Staff: {
    readonly Admin: {
      readonly perms?: string[];
      readonly steamIDs?: string[];
      readonly userIDs?: string[];
    };
    readonly BaseAdmin: {
      readonly perms?: string[];
      readonly steamIDs?: string[];
      readonly userIDs?: string[];
    };
    readonly Owner: {
      readonly perms?: string[];
      readonly steamIDs?: string[];
      readonly userIDs?: string[];
    };
    readonly Dev: {
      readonly perms?: string[];
      readonly steamIDs?: string[];
      readonly userIDs?: string[];
    };
  };
};

/**
 * The possible {@link optionsSpecifications} values.
 */
type optionsSpecificationsString =
  (typeof optionsSpecifications)[keyof typeof optionsSpecifications];

export { optionsSpecification, optionsSpecificationsString };

/**
 * Base for all Toolkit plugins
 */
export class ToolkitBase extends BasePlugin {
  public format = {
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
  public toDate(str: string | string[] | Date | Date[]): Date[];
  public buildButton(
    CustomId: string,
    Label: string,
    style: DiscordJS.ButtonStyle | 'Primary' = 'Primary',
    link: string
  ): DiscordJS.ButtonBuilder;
  public buildEmbed(
    color: DiscordJS.RGBTuple | number | null,
    time: Date | number | null,
    author: DiscordJS.EmbedAuthorOptions | null,
    options: {} = {}
  ): DiscordJS.EmbedBuilder;
  public objEmbed<EB extends DiscordJS.EmbedBuilder, FA extends DiscordJS.MessagePayload['files']>(
    embed: EB | EB[] | Set<EB>
  ): { embeds: EB[]; files: FA[] };
  public formatRow<BB extends DiscordJS.ButtonBuilder>(
    buttons: BB[]
  ): { components: DiscordJS.ActionRowBuilder<BB>[] };

  public setObj<A extends object, B extends object>(objA: A = {}, objB: B = {}): B;

  public async broadcast(msg: string): Promise<void>;
  public getDND(steamID: SquadJSRcon.PlayerType['steamID'], type: 'warning' | 'ping' = 'warning'): boolean;
  public async warn(
    steamID: SquadJSRcon.PlayerType['steamID'] | SquadJSRcon.PlayerType['steamID'][],
    msg: string | string[],
    type: 'warning' | 'ping' = 'warning',
    force: boolean = false
  ): Promise<undefined | void>;
  public onlineStaff(type: 'isAdmin' | 'isOwner' | 'isDev' = 'isAdmin'): SquadJSRcon.PlayerType[];
  /**
   * setTimeout w/ Promise
   * @param { number | 5000} timeout - Delay in milliseconds
   * @returns { Promise<void> } Promise object
   */
  public delay(timeout: number | 5000 = 5000): Promise<void>;
  public normalizeTarget<T>(target: T): T[];
  /**
   * Object is `Function`
   */
  public isFunc<O>(obj: O): boolean;
  /**
   * Object is typeof `{}`
   */
  public isObj<O>(obj: O): boolean;
  /**
   * Object is typeof `new Set()` or `new Map()`
   */
  public isSM<O>(obj: O): boolean;
  /**
   * Object is typeof `""`
   */
  public isStr<O>(obj: O): boolean;
  /**
   * Object is `null` or `undefined`
   */
  public isNull<O>(obj: O): boolean;

  /**
   * Object is Blank
   */
  public isBlank<O>(obj: O): boolean;

  /**
   * Object is Empty
   */
  public isEmpty<O>(obj: O): boolean;

  /**
   * @example <caption>Example usage</caption>
   * this.isValid(info, '{{steamID}}'); // Returns '76774190522813645'
   * this.isValid(info, 'steamID'); // Returns '76774190522813645'
   * this.isValid(info.squadID, '{{steamID}}'); // Returns '{{steamID}}'
   * this.isValid(info.squadID, 'steamID'); // Returns false
   */
  public isValid<O extends object>(
    info: O = {},
    template: string = '',
    bol: boolean = true
  ): keyof O | null;

  public embedFormat<N extends string>(name: N): any;
}


export as namespace TKTypes;
