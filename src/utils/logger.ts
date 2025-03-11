import { CONFIG } from "../config";

// Logger utility to log messages with different severity levels
export const logger = {
  // Logs an informational message
  info: (message: string, ...args: any[]): void => {
    console.log(`[INFO] ${message}`, ...args);
  },

  // Logs an error message
  error: (message: string, ...args: any[]): void => {
    console.error(`[ERROR] ${message}`, ...args);
  },

  // Logs a debug message if the log level is set to 'debug'
  debug: (message: string, ...args: any[]): void => {
    if (CONFIG.LOG_LEVEL === "debug") {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },
};
