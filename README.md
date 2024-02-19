# SquadJS-Toolkit

> **(UNDER CONSTRUCTION)** - Extends SquadJS functionality

## **About**

> This `README.md` is a copy paste of SquadJS readme so expect similarities.

Due to creating this [script](https://github.com/magicoflolis/Magic-PH) long ago, my org & I have parted ways, so I have decided to open source my SquadJS code after 2 years of being apart of the Squad community.

<br>

## **Prerequisites**

* [SquadJS](https://github.com/Team-Silver-Sphere/SquadJS) (v4.0.1) - [Download](https://github.com/Team-Silver-Sphere/SquadJS/releases/latest)
* Git
* [Node.js](https://nodejs.org/en/) (18.16.1+) - [Download](https://nodejs.org/en/)
* [Yarn](https://yarnpkg.com/) (Version 3.6.1+) - [Download](https://yarnpkg.com/getting-started/install)

### **Upgrading SquadJS**

1. Download & extract [SquadJS](https://github.com/fantinodavide/SquadJS/tree/master?tab=readme-ov-file#using-squadjs).
2. Overwrite SquadJS contents.
3. Run `npm install -g yarn` to update the global yarn version to latest v1.
4. Run `yarn set version berry` to enable v2.
5. Run `yarn config set nodeLinker node-modules`.
6. Run `yarn install` to migrate the lockfile.

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
    "...": "...",
    "webURL": "https://www.battlemetrics.com/servers/squad/YOUR_SQUAD_SERVER"
  },
  ```

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

* `BanLists` - Array of Ban Lists to use, can be an empty Array!
* `BanLists:name` - A name to use
* `BanLists:listID` - A Ban List ID
* `BanLists:UUID` - (OPTIONAL) A UUID to use when creating bans, can be an empty string.
* `listID` - Default Ban List ID to use
* `orgID` - BattleMetrics Org ID
* `serverID` - BattleMetrics Server ID
* `token` - BattleMetrics Token
* `UUID` - A default UUID to use when creating bans, can be an empty string.

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
