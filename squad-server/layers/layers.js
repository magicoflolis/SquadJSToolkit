import axios from 'axios';

import Logger from 'core/logger';

// import Layer from './layer.js';

class Layers {
  constructor() {
    this.layers = [];

    this.pulled = false;
  }

  addLayer(data) {
    const layer = {
      name: data.Name,
      classname: data.levelName,
      layerid: data.rawName,
      map: {
        name: data.mapName
      },
      gamemode: data.gamemode,
      gamemodeType: data.type,
      version: data.layerVersion,
      size: data.mapSize,
      sizeType: data.mapSizeType,
      numberOfCapturePoints: parseInt(data.capturePoints),
      lighting: {
        name: data.lighting,
        classname: data.lightingLevel
      },
      teams: []
    };
    for (const t of ['team1', 'team2']) {
      layer.teams.push({
        faction: data[t].faction,
        name: data[t].teamSetupName,
        tickets: data[t].tickets,
        commander: data[t].commander,
        vehicles: (data[t].vehicles || []).map((vehicle) => ({
          name: vehicle.type,
          classname: vehicle.rawType,
          count: vehicle.count,
          spawnDelay: vehicle.delay,
          respawnDelay: vehicle.respawnTime,
          icon: vehicle.icon,
          spawnerSize: vehicle.spawner_Size
        })),
        numberOfTanks: (data[t].vehicles || []).filter((v) => {
          return v.icon.match(/_tank/);
        }).length,
        numberOfHelicopters: (data[t].vehicles || []).filter((v) => {
          return v.icon.match(/helo/);
        }).length
      });
    }
    this.layers.push(layer);
    return layer;
  }

  async pull(force = false) {
    if (this.pulled && !force) {
      Logger.verbose('Layers', 2, 'Already pulled layers.');
      return this.layers;
    }
    if (force) Logger.verbose('Layers', 1, 'Forcing update to layer information...');

    this.layers.length = 0; // this.layers = [];

    Logger.verbose('Layers', 1, 'Pulling layers...');
    const response = await axios.get(
      'https://raw.githubusercontent.com/Squad-Wiki/squad-wiki-pipeline-map-data/master/completed_output/_Current%20Version/finished.json'
    );

    for (const layer of response.data.Maps) {
      this.addLayer(layer);
      // this.layers.push(new Layer(layer));
    }

    Logger.verbose('Layers', 1, `Pulled ${this.layers.length} layers.`);

    this.pulled = true;

    return this.layers;
  }

  async getLayerByCondition(condition) {
    await this.pull();

    const matches = this.layers.filter(condition);
    if (matches.length === 0) {
      return null;
    }

    return matches[0];
  }

  getLayerByName(name) {
    return this.getLayerByCondition((layer) => layer.name === name);
  }

  getLayerByClassname(classname) {
    return this.getLayerByCondition((layer) => layer.classname === classname);
  }
}

export default new Layers();
