// Players with 10 risk rating have limited teamkills before being auto kicked 
// Auto kick players banned for cheating or hacking
import GraphQLRequest from 'graphql-request';

import ToolkitBase from './Toolkit-base.js';

const { request, gql } = GraphQLRequest;

export default class CBLInfo extends ToolkitBase {
  static get description() {
    return (
      'The <code>CBLInfo</code> plugin alerts admins when a harmful player is detected joining their server based ' +
      'on data from the <a href="https://communitybanlist.com/">Community Ban List</a>.'
    );
  }

  static get defaultEnabled() {
    return true;
  }

  static get optionsSpecification() {
    return {
      ...ToolkitBase.optionsSpecification,
      threshold: {
        required: false,
        description:
          'Admins will be alerted when a player has this or more reputation points. For more information on ' +
          'reputation points, see the ' +
          '<a href="https://communitybanlist.com/faq">Community Ban List\'s FAQ</a>',
        default: 6
      }
    };
  }

  constructor(server, options, connectors) {
    super(server, options, connectors);

    this.onPlayerConnected = this.onPlayerConnected.bind(this);
  }

  async mount() {
    this.server.on('PLAYER_CONNECTED', this.onPlayerConnected);
  }
  /**
   * @param {import('../../squad-server').logParser.PLAYER_CONNECTED} info
   */
  async onPlayerConnected(info) {
    const { player } = info;
    const steamID = this.validator(player, 'steamID');
    const playerName = this.validName(player);
    if (typeof steamID !== 'string') {
      return;
    }
    if (typeof playerName !== 'string') {
      return;
    }
    try {
      const data = await request(
        'https://communitybanlist.com/graphql',
        gql`
          query Search($id: String!) {
            steamUser(id: $id) {
              id
              name
              avatarFull
              reputationPoints
              riskRating
              reputationRank
              lastRefreshedInfo
              lastRefreshedReputationPoints
              lastRefreshedReputationRank
              activeBans: bans(orderBy: "created", orderDirection: DESC, expired: false) {
                edges {
                  cursor
                  node {
                    id
                  }
                }
              }
              expiredBans: bans(orderBy: "created", orderDirection: DESC, expired: true) {
                edges {
                  cursor
                  node {
                    id
                  }
                }
              }
            }
          }
        `,
        { id: steamID }
      );

      if (!data.steamUser) {
        this.verbose(
          2,
          `Player ${playerName} (Steam ID: ${steamID}) is not listed in the Community Ban List.`
        );
        return;
      }

      if (data.steamUser.reputationPoints < this.options.threshold) {
        this.verbose(
          2,
          `Player ${playerName} (Steam ID: ${steamID}) has a reputation below the threshold.`
        );
        return;
      }

      for (const edges of [data.steamUser.expiredBans.edges, data.steamUser.activeBans.edges]) {
        for (const bans of edges) {
          const reason = (bans.node.reason ?? '').toLowerCase();
          if ( /cheat|hack|exploit|glitch/.test(reason) ) {
            await this.server.rcon.kick(steamID, `CBL Sync | ${bans.node.reason} | ${bans.node.banList.name}`);
          }
        }
      }

      const riskRequirement = parseInt(data.steamUser.riskRating) === 10 && parseInt(data.steamUser.reputationRank) <= 500;
      if (!riskRequirement) return;
      await this.server.rcon.kick(steamID, `[SYSTEM] Cerberus (RISK RATING TOO HIGH) ${data.steamUser.riskRating}/10`);

      this.server.mapPlayers.set(steamID, data.steamUser.riskRating);

      const discordMsg = {};
      const CBLBtn = this.buildButton(
        null,
        'View CBL',
        'Link',
        `https://communitybanlist.com/search/${steamID}`
      );
      const BattleMetricsBtn = this.createBtn(steamID);
      Object.assign(discordMsg, this.formatRow([CBLBtn, BattleMetricsBtn]));
      const embed = this.buildEmbed('#ffc40b', null, {
        name: 'Community Ban List',
        iconURL: 'https://communitybanlist.com/static/media/cbl-logo.caf6584e.png',
        url: 'https://communitybanlist.com/'
      }, {
        desc: `[${data.steamUser.name}](https://communitybanlist.com/search/${steamID}) has ${data.steamUser.reputationPoints} reputation points on the Community Ban List and is therefore a potentially harmful player.`,
        title: `${data.steamUser.name} is a potentially harmful player!`
      })
      .setThumbnail(data.steamUser.avatarFull)
      .addFields(
        {
          name: 'Reputation Points',
          value: `${data.steamUser.reputationPoints} (${
            data.steamUser.reputationPointsMonthChange || 0
          } from this month)`,
          inline: true
        },
        {
          name: 'Risk Rating',
          value: `${data.steamUser.riskRating} / 10`,
          inline: true
        },
        {
          name: 'Reputation Rank',
          value: `#${data.steamUser.reputationRank}`,
          inline: true
        },
        {
          name: 'Active Bans',
          value: `${data.steamUser.activeBans.edges.length}`,
          inline: true
        },
        {
          name: 'Expired Bans',
          value: `${data.steamUser.expiredBans.edges.length}`,
          inline: true
        }
      )
      .setFooter({ text: 'Powered by SquadJS and the Community Ban List', iconURL: null });
      Object.assign(discordMsg, this.objEmbed(embed));
      await this.sendDiscordMessage(discordMsg, 'admin-alerts');
      await this.msgAdmins(`Cerberus (Keep an eye on ${data.steamUser.name}) ${data.steamUser.riskRating} / 10`);
      await this.warn(steamID, `Cerberus (U HAVE A HIGH RISK RATING ON Community Ban List) ${data.steamUser.riskRating} / 10`);
      await this.delay(1000);
      await this.warn(steamID, "Cerberus (AS LONG AS U DON'T BREAK OUR RULES UR WELCOME TO PLAY ON HERE)");
      await this.delay(2500);
      await this.warn(steamID, 'Magic (You are now being monitored by Cerberus)');
    } catch (ex) {
      this.err(`Failed to fetch Community Ban List data for player ${playerName} (Steam ID: ${steamID}): `);
      this.err(ex.message);
      this.err(ex.stack);
    }
  }
}
