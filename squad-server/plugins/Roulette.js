import ToolkitBase from './Toolkit-base.js';

const playerPoints = new Map();
const playerResets = new Map();

export default class Roulette extends ToolkitBase {
  static get description() {
    return 'Gamble your ❤️ out in-game with our Roulette mini-game!';
  }

  static get defaultEnabled() {
    return true;
  }

  static get optionsSpecification() {
    return {
      ...ToolkitBase.optionsSpecification,
      color: {
        required: false,
        description: 'The color of the embeds.',
        default: 16761867
      }
    };
  }

  constructor(server, options, connectors) {
    super(server, options, connectors);

    this.chatCMD = this.chatCMD.bind(this);
    this.clearPoints = this.clearPoints.bind(this);
  }

  async mount() {
    this.addListener('CHAT_COMMAND:roulette', this.chatCMD);
    this.addListener('ROUND_ENDED', this.clearPoints);
  }

  async chatCMD(data) {
    const { message, player } = data;
    const { steamID } = player;
    // if(Object.is(data.chat,'ChatSquad')) {
    //   await this.warn('Only works in Squad Chat');
    //   return false;
    // };
    // if(this.server.players.length > 5 && this.server.players.length < 50) {
    //   return await this.warn(steamID, 'ONLY active during seeding!')
    // };
    if (!playerPoints.has(steamID)) {
      playerPoints.set(steamID, 1000);
      await this.warn(steamID, `Hello ${player.name}, you start off with 1,000 points!`);
      await this.delay(5000);
      // await this.warn(steamID, '✯ POINTS ARE CLEARED AFTER SEEDING ✯');
      // await this.delay(5000);
    }
    const points = playerPoints.get(steamID);
    if (this.isEmpty(message)) {
      await this.warn(steamID, 'Layout: <points to bet> <times to repeat>');
      await this.delay(500);
      return await this.warn(steamID, `Points: ${points}`);
    }
    if (message === 'reset') {
      const getResets = async () => {
        if (!playerPoints.has(steamID)) {
          playerResets.set(steamID, 1);
          return true;
        }
        const resets = playerResets.get(steamID);
        if (resets >= 3) {
          await this.warn(steamID, 'You have run out of Resets for this Layer!');
          return false;
        }
        playerResets.set(steamID, resets + 1);
        return true;
      };
      if (points <= 0 || points <= 49) {
        const gresets = await getResets();
        if (gresets === false) {
          return false;
        }
        playerPoints.set(steamID, 1000);
        await this.warn(steamID, 'Your points have been reset!');
        await this.delay(1000);
        return await this.warn(steamID, `Points: ${playerPoints.get(steamID)}`);
      }
      await this.warn(steamID, "Nice try, but that's not gonna work.");
      await this.delay(1000);
      return await this.warn(steamID, `Points: ${points}`);
    }
    const msgs = message.split(' ');
    const pp = parseInt(msgs[0]);
    const betRepeater = async () => {
      const nPoints = playerPoints.get(steamID);
      if (nPoints <= 0) {
        await this.warn(steamID, 'OOF your all out of points!');
        await this.delay(500);
        await this.warn(steamID, `Points: ${nPoints}`);
        return false;
      } else if (pp < 50) {
        await this.warn(steamID, 'Minimum bet is 50 points.');
        await this.delay(500);
        await this.warn(steamID, `Points: ${nPoints}`);
        return false;
      } else if (nPoints - pp < 0 || pp > nPoints) {
        await this.warn(steamID, 'Invalid, not enough points!');
        await this.delay(500);
        await this.warn(steamID, `Points: ${nPoints}`);
        return false;
      }
      const getRandomArbitrary = (min, max) => {
        return Math.floor(Math.random() * (max - min) + min);
      };
      const ranPick = (obj) => obj[Math.floor(Math.random() * obj.length)];
      const losses = [
        'CONGRATS on losing',
        'FeelsBadMan',
        'OOF',
        'Hey guess what',
        `Damn ${player.name}`,
        'Wow',
        'NICE',
        'YEAH',
        'OMG',
        '<3',
        'YOU WON jk',
        '!roulette err I mean',
        "I'm broke",
        'FUCK',
        'SHIT',
        'DAMMIT',
        'COME ON',
        'hi :)'
      ];
      const wins = ['CONGRATS', 'FeelsGoodMan', 'WOW', 'NICE', 'YEAH', 'OMG', 'HOLY SHIT'];
      const common = getRandomArbitrary(1, 8); // 3
      const rare = getRandomArbitrary(1, 15); // 2
      const epic = getRandomArbitrary(1, 100); // 4
      const legendary = getRandomArbitrary(1, 10000); // 9
      let finalCount = nPoints - pp;
      let finalMsg = `✯ ${ranPick(losses)} -${pp} points ✯`;
      if (epic === 4 && legendary === 9) {
        if (rare === 2) {
          finalMsg = `✯ ${ranPick(wins)} YOU WON +${pp + 1000000} POINTS! ✯`;
          finalCount = playerPoints.get(steamID) + pp + 1000000;
          await this.broadcast(`✯ ${player.name} JUST WON THE JACKPOT OF +1,000,000 POINTS! ✯`);
          await this.sendDiscordMessage(
            {
              content: `✯ \`\`${player.name}\`\` JUST WON THE JACKPOT OF +1,000,000 POINTS ✯\n\nTotal: ${finalCount}`
            },
            'gamba'
          );
          return;
        };
        if (common === 3 && rare === 2) {
          finalMsg = `✯ ${ranPick(wins)} YOU WON +${pp + 1000000000} POINTS! ✯`;
          finalCount = playerPoints.get(steamID) + pp + 1000000;
          await this.broadcast(
            `✯ \`\`${player.name}\`\` JUST WON THE MEGA JACKPOT OF +1,000,000,000 POINTS! ✯`
          );
          await this.sendDiscordMessage(
            {
              content: `✯ \`\`${player.name}\`\` JUST WON THE MEGA JACKPOT OF +1,000,000,000 POINTS ✯\n\nTotal: ${finalCount}`
            },
            'gamba'
          );
          return;
        }
        finalMsg = `✯ ${ranPick(wins)} YOU WON +${pp + 50000} POINTS! ✯`;
        finalCount = playerPoints.get(steamID) + pp + 50000;
        await this.broadcast(`✯ ${player.name} JUST WON +50,000 POINTS! ✯`);
        await this.sendDiscordMessage(
          {
            content: `✯ \`\`${player.name}\`\` JUST WON +50,000 POINTS ✯\n\nTotal: ${finalCount}`
          },
          'gamba'
        );
      } else if (common === 3) {
        finalMsg = `✯ ${ranPick(wins)} YOU WON +${pp + 50} POINTS! ✯`;
        finalCount = playerPoints.get(steamID) + pp + 50;
      } else if (rare === 2) {
        finalMsg = `✯ ${ranPick(wins)} YOU WON +${pp + 100} POINTS! ✯`;
        finalCount = playerPoints.get(steamID) + pp + 100;
      } else if (epic === 4) {
        finalMsg = `✯ ${ranPick(wins)} YOU WON +${pp + 1000} POINTS! ✯`;
        finalCount = playerPoints.get(steamID) + pp + 1000;
      } else if (legendary === 9) {
        finalMsg = `✯ ${ranPick(wins)} YOU WON +${pp + 10000} POINTS! ✯`;
        finalCount = playerPoints.get(steamID) + pp + 10000;
        await this.broadcast(`✯ \`\`${player.name}\`\` JUST WON +10,000 POINTS! ✯`);
        await this.sendDiscordMessage(
          {
            content: `✯ \`\`${player.name}\`\` JUST WON +10,000 POINTS ✯\n\nTotal: ${finalCount}`
          },
          'gamba'
        );
      }
      if (finalCount < 0) {
        playerPoints.set(steamID, 0);
        await this.warn(steamID, 'Ouch your out of points!');
        await this.delay(500);
        await this.warn(steamID, `Points: ${finalCount}`);
        return false;
      }
      playerPoints.set(steamID, finalCount);
      await this.warn(steamID, finalMsg);
      await this.delay(500);
      return await this.warn(steamID, `Points: ${finalCount}`);
    };
    if (this.isEmpty(msgs[0])) {
      await this.warn(steamID, '!roulette <points to bet> <repeat X amount of times>');
      await this.delay(500);
      return await this.warn(steamID, `Points: ${points}`);
    }
    let rounds = parseInt(msgs[1]);
    if (this.isEmpty(msgs[1])) {
      rounds = 1;
    }
    for (let i = 0; i < rounds; i++) {
      const isPlaying = await this.server.getPlayerBySteamID(steamID);
      if (this.isEmpty(isPlaying)) {
        break;
      }
      const bets = await betRepeater();
      if (bets === false) {
        break;
      }
      await this.delay(6000);
    }
  }

  async clearPoints() {
    if (playerResets.size !== 0) {
      playerResets.clear();
    }
    if (playerPoints.size === 0) {
      return;
    }
    for (const [key, value] of playerPoints) {
      const isPlaying = await this.server.getPlayerBySteamID(key);
      if (this.isEmpty(isPlaying)) {
        continue;
      }
      await this.warn(key, `Your ${value} points & resets will be cleared.`);
    }
    return playerPoints.clear();
  }
}
