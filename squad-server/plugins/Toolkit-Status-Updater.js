import Sequelize from 'sequelize';
import { ActivityType, EmbedBuilder } from 'discord.js';
import tinygradient from 'tinygradient';
import { COPYRIGHT_MESSAGE } from '../utils/constants.js';
import ToolkitBase from './Toolkit-base.js';

const { DataTypes } = Sequelize;

export default class ToolkitStatusUpdater extends ToolkitBase {
  static get description() {
    return 'The <code>ToolkitServerStatus</code> plugin can be used to get the server status in Discord.';
  }

  static get defaultEnabled() {
    return true;
  }

  static get optionsSpecification() {
    return {
      ...ToolkitBase.optionsSpecification,
      messageStore: {
        required: true,
        description: 'Sequelize connector name.',
        connector: 'sequelize',
        default: 'sqlite'
      },
      disableSubscriptions: {
        required: false,
        description: 'Whether to allow messages to be subscribed to automatic updates.',
        default: false
      },
      command: {
        required: false,
        description: 'Command name to get message.',
        default: '!status'
      },
      updateInterval: {
        required: false,
        description: 'How frequently to update the time in Discord.',
        default: 60 * 1000
      },
      setBotStatus: {
        required: false,
        description: "Whether to update the bot's status with server information.",
        default: true
      }
    };
  }

  constructor(server, options, connectors) {
    super(server, options, connectors);

    // Setup model to store subscribed messages.
    this.SubscribedMessage = this.options.messageStore.define(
      `${this.constructor.name}_SubscribedMessage`,
      { channelID: DataTypes.STRING, messageID: DataTypes.STRING, server: DataTypes.INTEGER },
      { timestamps: false }
    );

    this.onDiscordMessage = this.onDiscordMessage.bind(this);
    this.updateMessages = this.updateMessages.bind(this);
    this.updateStatus = this.updateStatus.bind(this);
    this.updatePlayerList = this.updatePlayerList.bind(this);

    this.layer = {};
  }

  async prepareToMount() {
    await this.SubscribedMessage.sync();
  }

  async mount() {
    await super.mount();
    this.server.addListener('UPDATED_A2S_INFORMATION', this.updatePlayerList);
    this.discordClient.addListener('messageCreate', this.onDiscordMessage);
    this.updateInterval = setInterval(this.updateMessages, this.options.updateInterval);
    this.updateStatusInterval = setInterval(this.updateStatus, this.options.updateInterval);
  }

  async unmount() {
    await super.unmount();
    this.server.removeListener('UPDATED_A2S_INFORMATION', this.updatePlayerList);
    this.discordClient.removeListener('messageCreate', this.onDiscordMessage);
    clearInterval(this.updateInterval);
    clearInterval(this.updateStatusInterval);
  }

  async updatePlayerList() {
    await this.updateStatus(false)
  }

  async onDiscordMessage(message) {
    // Parse the incoming message.
    const commandMatch = message.content.match(
      new RegExp(`^${this.options.command}(?: (subscribe)| (unsubscribe) ([0-9]+) ([0-9]+))?$`, 'i')
    );

    // Stop processing the message if it does not match the command.
    if (!commandMatch) return;

    // Split message parts.
    const [subscribe, unsubscribe, channelID, messageID] = commandMatch.slice(1);

    // Handle non subscription messages.
    if (subscribe === undefined && unsubscribe === undefined) {
      this.verbose(1, 'Generating message content...');
      const generatedMessage = await this.generateMessage();
      this.verbose(1, 'Sending non-subscription message...');
      await message.channel.send(generatedMessage);
      this.verbose(1, 'Sent non-subscription message.');
      return;
    }

    // Handle subscription message.
    if (subscribe !== undefined) {
      if (this.options.disableSubscriptions) {
        await message.reply('automated updates is disabled.');
        return;
      }

      this.verbose(1, 'Generating message content...');
      const generatedMessage = await this.generateMessage();

      this.verbose(1, 'Sending subscription message...');
      const newMessage = await message.channel.send(generatedMessage);
      this.verbose(1, 'Sent subscription message.');

      // Subscribe the message for automated updates.
      const newChannelID = newMessage.channel.id;
      const newMessageID = newMessage.id;

      this.verbose(
        1,
        `Subscribing message (Channel ID: ${newChannelID}, Message ID: ${newMessageID}) to automated updates...`
      );
      await this.SubscribedMessage.create({
        channelID: newChannelID,
        messageID: newMessageID,
        server: this.server.id
      });
      this.verbose(
        1,
        `Subscribed message (Channel ID: ${newChannelID}, Message ID: ${newMessageID}) to automated updates.`
      );

      return;
    }

    // Handle unsubscription messages.
    if (unsubscribe !== undefined) {
      this.verbose(
        1,
        `Unsubscribing message (Channel ID: ${channelID}, Message ID: ${messageID}) from automated updates...`
      );
      await this.SubscribedMessage.destroy({
        where: {
          channelID: channelID,
          messageID: messageID,
          server: this.server.id
        }
      });
      this.verbose(
        1,
        `Unsubscribed message (Channel ID: ${channelID}, Message ID: ${messageID}) from automated updates.`
      );

      this.verbose(1, 'Sending acknowledgement message...');
      await message.reply('unsubscribed message from automated updates.');
      this.verbose(1, 'Sent acknowledgement message.');
    }
  }

  async updateMessages() {
    this.verbose(1, 'Generating message content for update...');
    // Generate the new message.
    const generatedMessage = await this.generateMessage();

    // Get subscribed messages.
    const subscribedMessages = await this.SubscribedMessage.findAll({
      where: { server: this.server.id }
    });

    // Update each message.
    this.verbose(1, `Updating ${subscribedMessages.length} messages...`);
    for (const subscribedMessage of subscribedMessages) {
      const { channelID, messageID } = subscribedMessage;

      try {
        this.verbose(1, `Getting message (Channel ID: ${channelID}, Message ID: ${messageID})...`);
        /** @type { import('discord.js').TextChannel } */
        const channel = this.discordClient.channels.cache.get(channelID);
        const message = await channel.messages.fetch(messageID);

        this.verbose(1, `Updating message (Channel ID: ${channelID}, Message ID: ${messageID})...`);
        await message.edit(generatedMessage);
        this.verbose(1, `Updated message (Channel ID: ${channelID}, Message ID: ${messageID}).`);
      } catch (err) {
        if (err.code === 10008) {
          this.verbose(
            1,
            `Message (Channel ID: ${channelID}, Message ID: ${messageID}) was deleted. Removing from automated updates...`
          );
          await subscribedMessage.destroy();
        } else if (err.code === 500 && this.server.players.length > 50) {
          this.server.rcon.execute('AdminPauseMatch');
					this.server.rcon.broadcast('Error in internal systems pausing the match');
        } else {
					this.verbose(
            1,
            `Message (Channel ID: ${channelID}, Message ID: ${messageID}) could not be updated: `,
            err
          );
				}
      }
    }
  }

  async getCurrent() {
    const currentMap = this.server.currentLayer ? this.server.currentLayer.name : (await this.server.rcon.getCurrentMap()).layer || 'Unknown';
    if (typeof currentMap === 'string') {
      if (currentMap.match(/jensen's training range/i)) {
        return {
          name: "Jensen's Training Range",
          preview:
            'https://static.wikia.nocookie.net/squad_gamepedia/images/3/3b/Jensens_Range_Minimap_7.jpg/revision/latest'
        };
      }
    }
    // https://raw.githubusercontent.com/mahtoid/SquadMaps/master/img/maps/webp/
    // https://raw.githubusercontent.com/mahtoid/SquadMaps/master/img/maps/full_size/
    return {
      name: currentMap ?? 'Unknown Layer',
      preview: this.server.currentLayer ? `https://squad-data.nyc3.cdn.digitaloceanspaces.com/main/${this.server.currentLayer.layerid}.jpg` : undefined
    };
  }

  async generateMessage() {
    try {
      // Set player embed field.
      let players = '';

      players += `${this.server.a2sPlayerCount}`;
      if (this.server.publicQueue + this.server.reserveQueue > 0)
        players += ` (+${this.server.publicQueue + this.server.reserveQueue})`;

      players += ` / ${this.server.publicSlots}`;
      if (this.server.reserveSlots > 0) players += ` (+${this.server.reserveSlots})`;

      const adminchat = this.server.getAdminsWithPermission('canseeadminchat');
      const admins = this.server.players.filter((player) => {
        if (this.isNull(player.steamID)) {
          return false;
        }
        return adminchat.includes(player.steamID);
      });

      const currentLayer = await this.getCurrent();
      const embed = new EmbedBuilder()
        .setAuthor({
          name: 'Server Status',
          iconURL: 'https://i.imgur.com/HHEX79K.png',
          url: this.webURL
        })
        .setDescription(
          this.server.players.length >= 50
            ? 'We are LIVE, come join us!'
            : this.server.players.length > 5 && this.server.players.length < 50
            ? 'We are SEEDING, come join us!'
            : 'Waiting for more players...'
        )
        .addFields(
          {
            name: 'Players',
            value: players,
            inline: true
          },
          {
            name: 'Admins',
            value: `${admins.length} (+Cerberus System)`,
            inline: true
          },
          {
            name: 'Name',
            value: `\`\`\`\n${this.server.serverName ?? 'Loading Server Info...'}\n\`\`\``
          },
          {
            name: 'Current Layer',
            value: `\`\`\`\n${currentLayer.name}\n\`\`\``,
            inline: true
          },
          {
            name: 'Next Layer',
            value: `\`\`\`\n${
              this.server.nextLayer?.name ||
              (this.server.nextLayerToBeVoted ? 'To be voted' : 'Unknown')
            }\n\`\`\``,
            inline: true
          }
        )
        // Set layer image.
        .setImage(currentLayer.preview)
        // Set timestamp.
        .setTimestamp(new Date())
        // Set footer.
        .setFooter({
          text: COPYRIGHT_MESSAGE,
          iconURL: null
        })
        // Set gradient embed color.
        .setColor(
          parseInt(
            tinygradient([
              { color: '#ff0000', pos: 0 },
              { color: '#ffff00', pos: 0.5 },
              { color: '#00ff00', pos: 1 }
            ])
              .rgbAt(
                this.server.a2sPlayerCount / (this.server.publicSlots + this.server.reserveSlots)
              )
              .toHex(),
            16
          )
        );
      return {
        embeds: [embed]
      };
    } catch (ex) {
      console.error(ex);
    }
  }

  async updateStatus(updateLayer = true) {
    if (!this.options.setBotStatus) return;
    if (this.isEmpty(this.layer)) {
      this.layer = await this.getCurrent();
    }
    if (updateLayer) {
      const currentLayer = await this.getCurrent();
      if (this.layer !== currentLayer) {
        this.layer = currentLayer;
      }
    };
    this.discordClient.user.setPresence({
      activities: [
        {
          name: 'Server Status',
          state: `(${this.server.a2sPlayerCount}/${this.server.publicSlots}) ${this.layer?.name || 'Unknown Layer'}`,
          type: ActivityType.Custom
        }
      ],
      status: 'online'
    });
  }
}
