
export default {
  regex:
  /^\[([0-9.:-]+)]\[([ 0-9]*)]LogSquadTrace: \[DedicatedServer\]ChangeState\(\): PC=(.+) OldState=(.+) NewState=(.+)/,
  onMatch: (args, logParser) => {
    const data = {
      raw: args[0],
      time: args[1],
      chainID: args[2],
      playerSuffix: args[3],
      oldState: args[4],
      newState: args[5]
    };
    logParser.emit('STATE_CHANGE', data);
  }
};
