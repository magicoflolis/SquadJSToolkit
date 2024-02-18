# SquadJS-Toolkit

> **(UNDER CONSTRUCTION)** - Extends SquadJS functionality

## **About**

> This `README.md` is a copy paste of SquadJS readme so expect similarities.

Due to creating this [script](https://github.com/magicoflolis/Magic-PH) long ago, my org & I have parted ways, so I have decided to open source my SquadJS code after 2 years of being apart of the Squad community.

## TODO

* Add `Apology System`
* Add `Auto Teamkilll & Disconnect System`
* Add `Roulette Trigger`
* Add `Reworked Status Updater`
* Add `Reworked cbl-info.js`
* Add `Toolkit-Triggers.js`
* Add `Modified server-restarter.js`
* Add `Toolkit-admin-request.js`

<br>

## **Prerequisites**

* [SquadJS](https://github.com/Team-Silver-Sphere/SquadJS) (v4.0.1) - [Download](https://github.com/Team-Silver-Sphere/SquadJS/releases/latest)
* Git
* [Node.js](https://nodejs.org/en/) (18.16.1+) - [Download](https://nodejs.org/en/)
* [Yarn](https://yarnpkg.com/) (Version 3.6.1+) - [Download](https://yarnpkg.com/getting-started/install)

### **Upgrading SquadJS**

1. Run `npm install -g yarn` to update the global yarn version to latest v1.
2. Run `yarn set version berry` to enable v2.
3. Run `yarn config set nodeLinker node-modules`.
4. Run `yarn install` to migrate the lockfile.

Single line code:

```bash
npm install -g yarn && yarn set version berry && yarn config set nodeLinker node-modules && yarn install
```

<br>

## **Configuring SquadJS**

SquadJS can be configured via a JSON configuration file which, by default, is located in the SquadJS and is named [config.json](./config.json).

The config file needs to be valid JSON syntax. If an error is thrown saying the config cannot be parsed then try putting the config into a JSON syntax checker (there's plenty to choose from that can be found via Google).

<details>
  <summary>Server</summary>

## Server Configuration

The following section of the configuration contains information about your Squad server.

  ```json
  "server": {
    "id": 1,
    "host": "xxx.xxx.xxx.xxx",
    "queryPort": 27165,
    "rconPort": 21114,
    "rconPassword": "password",
    "rconPassThrough": true,
    "rconPassThroughPort": 8124,
    "dumpRconResponsesToFile": false,
    "logReaderMode": "tail",
    "logDir": "C:/path/to/squad/log/folder",
    "ftp":{
      "port": 21,
      "user": "FTP Username",
      "password": "FTP Password",
      "useListForSize": false
    },
    "adminLists": [
      {
        "type": "local",
        "source": "C:/Users/Administrator/Desktop/Servers/sq_arty_party/SquadGame/ServerConfig/Admins.cfg",
      },
      {
        "type": "remote",
        "source": "http://yourWebsite.com/Server1/Admins.cfg",
      }
    ],
    "webURL": "https://www.battlemetrics.com/servers/squad/YOUR_SQUAD_SERVER"
  },
  ```

* `id` - An integer ID to uniquely identify the server.
* `host` - The IP of the server.
* `queryPort` - The query port of the server.
* `rconPort` - The RCON port of the server.
* `rconPassword` - The RCON password of the server.
* `logReaderMode` - `tail` will read from a local log file. `ftp` will read from a remote log file using the FTP protocol.
* `logDir` - The folder where your Squad logs are saved. Most likely will be `C:/servers/squad_server/SquadGame/Saved/Logs`.
* `ftp:port` - The FTP port of the server. Only required for `ftp` `logReaderMode`.
* `ftp:user` - The FTP user of the server. Only required for `ftp` `logReaderMode`.
* `ftp:password` - The FTP password of the server. Only required for `ftp` `logReaderMode`.
* `adminLists` - Sources for identifying an admins on the server, either remote or local.
* `webURL` - Your Squad servers website or BattleMetrics page.

  ---

</details>

<details>
  <summary>Connectors</summary>

## Connector Configuration

**Discord:**

Connects to Discord via `discord.js`.

```json
{
  "discord": {
    "clientID": "Discord Application ID",
    "guidID": "Discord Server ID",
    "token": "Discord Login Token",
    "intents": ["Guilds", "GuildMessages", "MessageContent"],
    "channelIDs": [
      {
        "label": "Channel Name",
        "channelID": "Chanel ID"
      }
    ],
    "embedDefaults": {
      "clan": "[SquadJS] ",
      "name": "Cerberus",
      "iconURL": "https://i.imgur.com/HHEX79K.png",
      "url": "https://www.battlemetrics.com/servers/squad",
      "format": {
        "player": "[[{{name}}](https://www.battlemetrics.com/rcon/players?filter[search]={{EOSID}}&method=quick&redirect=1 'Go to BattleMetrics')] - [[{{steamID}}](https://steamcommunity.com/profiles/{{steamID}} 'Go to Steam Profile')]",
        "squad": "{{squadID}} : {{squadName}}",
        "team": "{{teamID}} : {{teamName}}"
      }
    },
    "webhook": {
      "id": "Webhook ID",
      "token": "Webhook Token"
    }
  }
}
```

* `clientID` - Your discord bots ID
* `guidID` - Your discord server ID
* `token` - Your discord bots "Reset Token"
* `intents` - Your discord bots intents, see [Gateway Intents](https://discordjs.guide/popular-topics/intents.html#privileged-intents)
* `channelIDs` - An array of channels you would like to use.
* `channelIDs:label` - A label to use when calling `sendDiscordMessage(message, {{LABELS}})`, example `sendDiscordMessage('My discord message', 'admin-alerts')`
* `channelIDs:channelID` - Discord Channel ID
* `embedDefaults` - The default layout for embed messages, see [Embeds](https://discordjs.guide/popular-topics/embeds.html)
* `embedDefaults:clan` - Your server clan, can be an empty string.
* `embedDefaults:name` - Embeded message title, can be an empty string.
* `embedDefaults:iconURL` - Embeded message iconURL, can be `null`.
* `embedDefaults:url` - Embeded message URL, can be `null`.
* `embedDefaults:format` - Embeded message fields, will convert player data.
* `embedDefaults:format:player` - Player string.
* `embedDefaults:format:squad` - Player squad string.
* `embedDefaults:format:team` - Team string.
* `webhook` - Optional, see [Webhooks](https://discordjs.guide/popular-topics/webhooks.html#webhooks)
* `webhook:id` - Enter the ID part of `https://discord.com/api/webhooks/{{ID}}/token`
* `webhook:token` - Enter the TOKEN part of `https://discord.com/api/webhooks/id/{{TOKEN}}`

**BattleMetrics:**

Connects to the BattleMetrics API.

```json
{
  "BattleMetrics": {
    "BanLists": [
      {
        "name": "Ban List Name",
        "listID": "Ban List ID",
        "UUID": "Ban List UUID"
      }
    ],
    "listID": "Ban List ID",
    "orgID": "Org ID",
    "serverID": "Server ID",
    "token": "BattleMetrics Token",
    "UUID": "OWI"
  }
}
```

 ---
</details>

<details>
  <summary>Verboseness</summary>

## Console Output Configuration

The `logger` section configures how verbose a module of SquadJS will be as well as the displayed color.

```json
    "logger": {
      "verboseness": {
        "SquadServer": 1,
        "LogParser": 1,
        "RCON": 1
      },
      "colors": {
        "Toolkit": "cyanBright",
        "DiscordJS": "cyanBright",
        "Err": "redBright",
        "SquadServer": "yellowBright",
        "SquadServerFactory": "yellowBright",
        "LogParser": "blueBright",
        "RCON": "redBright"
      }
    }
```

The larger the number set in the `verboseness` section for a specified module the more it will print to the console.

  ---
</details>

<details>
  <summary>Plugins</summary>

## Toolkit Plugins

**Profanity Filter:**

```json
{
  "plugin": "ToolkitProfanity",
  "enabled": true,
  "bmClient": "BattleMetrics",
  "discordClient": "discord",
  "Ban": {
    "note": "Banned by Cerberus System",
    "reason": "{{reason}} | {{timeLeft}}"
  },
  "embedInfo": {
    "clan": "[SquadJS] ",
    "name": "Cerberus",
    "iconURL": "https://i.imgur.com/HHEX79K.png",
    "url": "https://www.battlemetrics.com/servers/squad",
    "format": {
      "player": "[[{{name}}](https://www.battlemetrics.com/rcon/players?filter[search]={{EOSID}}&method=quick&redirect=1 'Go to BattleMetrics')] - [[{{steamID}}](https://steamcommunity.com/profiles/{{steamID}} 'Go to Steam Profile')]",
      "squad": "{{squadID}} : {{squadName}}",
      "team": "{{teamID}} : {{teamName}}"
    }
  },
  "ignoreChats": []
}
```

* `bmClient` - Name of the BattleMetrics connector.
* `discordClient` - Name of the Discord connector.
* `Ban:note` - Added to the beginning of ban notes.
* `Ban:reason` - Default ban reason.
* `embedInfo` - Overwrites `discord:embedDefaults`.
* `ignoreChats` - Ignore certain chats.

  ---
</details>
