import * as chalk from 'chalk';

// export interface Logger {
//   verbose(module: string, verboseness: number, message: string, ...extras): void;
//   err(verboseness: number, message: string, ...extras): void;
//   setVerboseness(module: string, verboseness: number): void;
//   setColor(module: string, color: chalk.ColorName): void;
//   setTimeStamps(option: boolean): void;
// };
/**
 * Test Message
 */
export class Logger {
  constructor(options?: {
    verboseness: object;
    colors: object;
    includeTimestamps: boolean;
  });
  verbose(module: string, verboseness: number, message: string, ...extras): void;
  err(verboseness: number, message: string, ...extras): void;
  setVerboseness(module: string, verboseness: number): void;
  setColor(module: string, color: chalk.ColorName): void;
  setTimeStamps(option: boolean): void;
};

// export as namespace Logger;
