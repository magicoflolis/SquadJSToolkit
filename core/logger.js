import chalk from 'chalk';

/**
 * @typedef { import('chalk').ChalkInstance } ChalkInstance
 */

/**
 * @typedef { import('chalk').ColorName } ColorName
 */

const Logger = class {
  /**
   * @template { {verboseness: object;colors: object;includeTimestamps: boolean;} } OPTIONS
   * @param { OPTIONS } options
   */
  constructor(options = {}) {
    this.verboseness = options.verboseness ?? {};
    this.colors = options.colors ?? {};
    this.includeTimestamps = options.includeTimestamps ?? false;
  }
  /**
   * @param { string } module
   * @param { number } verboseness
   * @param { string } message
   * @param  { ...any } extras
   */
  verbose(module, verboseness, message, ...extras) {
    /**
     * @type { ChalkInstance } colorFunc
     */
    let colorFunc = chalk[this.colors[module] || 'white'];
    if (typeof colorFunc !== 'function') colorFunc = chalk.white;

    if ((this.verboseness[module] || 1) >= verboseness)
      console.log(
        `${this.includeTimestamps ? '[' + new Date().toISOString() + ']' : ''}[${colorFunc(
          module
        )}][${verboseness}] ${message}`,
        ...extras
      );
  }
  /**
   * @param { number } verboseness
   * @param { string } message
   * @param  { ...any } extras
   */
  err(verboseness, message, ...extras) {
    /**
     * @type { ChalkInstance } colorFunc
     */
    let colorFunc = chalk[this.colors['Err'] || 'redBright'];
    if (typeof colorFunc !== 'function') colorFunc = chalk.redBright;

    if ((this.verboseness['Err'] || 1) >= verboseness) {
      console.error(
        `${this.includeTimestamps ? '[' + new Date().toISOString() + ']' : ''}[${colorFunc(
          'Err'
        )}][${verboseness}] ${message}`,
        ...extras
      );
    }
  }
  /**
   * @param { string } module
   * @param { number } verboseness
   */
  setVerboseness(module, verboseness) {
    this.verboseness[module] = verboseness;
  }
  /**
   * @param { string } module
   * @param { ColorName } color
   */
  setColor(module, color) {
    this.colors[module] = color;
  }
  /**
   * @param { boolean } option
   */
  setTimeStamps(option) {
    this.includeTimestamps = option;
  }
};

export default new Logger();
