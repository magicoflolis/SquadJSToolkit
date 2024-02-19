// ORIGINAL PLUGIN BY https://github.com/fantinodavide
// MODIFIED TO WORK WITH discord.js v14

import ToolkitBase from './Toolkit-base.js';
import { AttachmentBuilder } from 'discord.js';
import path from 'path';
import { createGzip } from 'zlib';
import { pipeline } from 'stream';
import fs from 'fs';

export default class ServerRestarter extends ToolkitBase {
  static get description() {
    return '';
  }

  static get defaultEnabled() {
    return true;
  }

  static get optionsSpecification() {
    return {
      ...ToolkitBase.optionsSpecification,
      intervalCheckMinutes: {
        required: false,
        description: 'time between every check',
        default: 60
      }
    };
  }

  constructor(server, options, connectors) {
    super(server, options, connectors);
    this.restartCheck = this.restartCheck.bind(this);
    this.waitAndRestartCheck = this.waitAndRestartCheck.bind(this);
    this.doRestart = this.doRestart.bind(this);
    this.deleteOldMessages = this.deleteOldMessages.bind(this);

    this.lastRestartTime = Date.now();
  }

  async mount() {
    // this.verbose(1, 'Server Logs', path.join(this.server.options.logDir, 'SquadGame.log'))

    // this.doRestart();
    // this.restartCheck()

    // this.deleteOldMessages()

    this.waitAndRestartCheck(60, false);
    setInterval(this.restartCheck, this.options.intervalCheckMinutes * 60 * 1000);
    this.server.on('PLAYER_DISCONNECTED', () => {
      this.waitAndRestartCheck(60);
    });
  }

  async unmount() {}

  async deleteOldMessages(minHoursOld = 2) {
    const channelLabel = 'cerberus';
    if (!this.DiscordBot.channels.has(channelLabel)) return;
    const channelID = this.DiscordBot.channels.get(channelLabel);
    /** @type { import("discord.js").TextChannel } */
    const channel = this.discordClient.channels.cache.get(channelID);
    const channelMessages = await channel.messages.fetch({ limit: 100 });
    // const recentMessagesInChannel = Array.from(channelMessages).map((mSet) => mSet[1]);
    // const messagesToBeDeleted = recentMessagesInChannel.filter(
    //   (m, i, arr) =>
    //     Date.now() - m.createdTimestamp > 1000 * 60 * 60 * minHoursOld &&
    //     m.attachments.size == 0 &&
    //     arr[i - 1]?.attachments.size == 0
    // );
    const messagesToBeDeleted = channelMessages.filter((message, i, arr) => {
      const isBot = message.author.id === this.discordClient.user.id;
      // return isBot && message.embeds.length > 0
      return (
        isBot &&
        Date.now() - message.createdTimestamp > 1000 * 60 * 60 * minHoursOld &&
        message.attachments.size == 0 &&
        arr[i - 1]?.attachments.size == 0
      );
    });

    // this.verbose(1, 'All messages in channel', recentMessagesInChannel)
    // this.verbose(1, 'All messages in channel', messagesToBeDeleted.map((m, i, arr) => `\n ID:${m.id}|${((Date.now() - m.createdTimestamp) / 1000 / 60 / 60).toFixed(2)}h`).join(''))
    // this.verbose(1, 'Deleting old messages')
    this.verbose(1, 'Deleting old messages');
    for (const msg of messagesToBeDeleted.values()) {
      // m.edit({ content: 'Deleted', embeds: m.embeds })
      this.verbose(1, 'Deleting message', msg.id);
      msg.delete();
    }
    // this.verbose(1, 'All messages in channel', messagesToBeDeleted.map((m, i, arr) => `\nID:${m.id}|Embed:${m.embeds?.length > 0 ? 'Yes' : 'No'}|Files:${m.attachments.size}|NextMsgFiles:${arr[ i + 1 ]?.attachments.size}`).join(''))
    // setTimeout(() => {
    //     messagesToBeDeleted.forEach((m) => {
    //         m.edit({ content: '' })
    //         this.verbose(1, 'Restoring message', m.id, m.content)
    //     })
    // }, 2000)
  }

  waitAndRestartCheck(seconds = 60, avoidDiscordMessage = true) {
    setTimeout(() => {
      this.restartCheck(avoidDiscordMessage);
    }, seconds * 1000);
  }

  restartCheck(avoidDiscordMessage = false) {
    // if (Date.now() - this.lastRestartCheck < this.options.intervalCheckMinutes * 60 * 1000) return;

    const restarting = this.server.a2sPlayerCount < 1;

    if (!avoidDiscordMessage && !restarting) this.discordLogRestart(restarting);

    this.verbose(1, 'Restarting server?', restarting);

    if (!restarting) return;

    this.doRestart(!avoidDiscordMessage);
    // if (!skipNewCall) setTimeout(this.restartCheck, this.options.intervalCheckMinutes * 60 * 1000)
  }

  async doRestart(sendDiscordMessage = true) {
    if (Date.now() - this.lastRestartTime < 300_000) return;

    this.lastRestartTime = Date.now();

    const logsFilePath = path.join(this.server.options.logDir, 'SquadGame.log');
    const gzFileName = path.basename(logsFilePath) + '.gz';
    const logFileSize = fs.statSync(logsFilePath).size / 1024 / 1024;

    if (logFileSize > 5) {
      const source = fs.createReadStream(logsFilePath);
      const gzip = createGzip();

      pipeline(
        source,
        gzip,
        async (data) => {
          try {
            await this.discordLogRestart(true, { buffer: data, fileName: gzFileName });
          } catch (err) {
            this.verbose(1, 'Could not send discord message. Error: ', err);
          }
        },
        async (err) => {
          if (err) {
            console.error('An error occurred:', err);
            process.exitCode = 1;
          }
        }
      );
    } else if (sendDiscordMessage) {
      await this.discordLogRestart(true).catch((err) => {
        console.error('An error occurred:', err);
      });
    }
    await this.server.rcon.execute('AdminKillServer 1');
  }

  async discordLogRestart(restartStatus, logs) {
    if (!restartStatus) return;

    const discordMsg = {};
    const embed = this.buildEmbed(
      restartStatus ? [0, 255, 0] : [255, 0, 0],
      new Date(),
      {
        name: 'Server Restarter',
        iconURL: undefined,
        url: this.webURL
      }
    )
      .addFields(
        {
          name: 'Name',
          value: `\`\`\`\n${this.server.serverName ?? 'Loading Server Info...'}\n\`\`\``,
          inline: false
        },
        {
          name: 'Status',
          value: `***${restartStatus ? 'RESTARTED' : 'NOT RESTARTED'}***`,
          inline: false
        }
      );
    Object.assign(discordMsg, this.objEmbed(embed));
    await this.sendDiscordMessage(discordMsg, 'cerberus');

    if (logs) {
      const file = new AttachmentBuilder(logs.buffer, { name: logs.fileName });
      await this.sendDiscordMessage(
        {
          files: [file]
        },
        'cerberus'
      );
    }

    // this.deleteOldMessages();
  }
}
