"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables from a .env file into process.env
dotenv_1.default.config();
// Configuration object to store environment variables
exports.CONFIG = {
    OLLAMA_URL: process.env.OLLAMA_URL || '', // URL for Ollama service
    OLLAMA_MODEL: process.env.OLLAMA_MODEL || '', // Model name for Ollama service
    CHROMA_URL: process.env.CHROMA_URL || '', // URL for Chroma service
    PERPLEXITY_API_TOKEN: process.env.PERPLEXITY_API_TOKEN || '', // API token for Perplexity service
    HUNTER_API_TOKEN: process.env.HUNTER_API_TOKEN || '', // API token for Hunter service
    LOG_LEVEL: process.env.LOG_LEVEL || '', // Logging level
};
