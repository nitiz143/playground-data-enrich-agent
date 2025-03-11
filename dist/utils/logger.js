"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const config_1 = require("../config");
// Logger utility to log messages with different severity levels
exports.logger = {
    // Logs an informational message
    info: (message, ...args) => {
        console.log(`[INFO] ${message}`, ...args);
    },
    // Logs an error message
    error: (message, ...args) => {
        console.error(`[ERROR] ${message}`, ...args);
    },
    // Logs a debug message if the log level is set to 'debug'
    debug: (message, ...args) => {
        if (config_1.CONFIG.LOG_LEVEL === "debug") {
            console.debug(`[DEBUG] ${message}`, ...args);
        }
    },
};
