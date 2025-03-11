"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaClient = void 0;
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
// Class to interact with the Ollama API
class OllamaClient {
    // Constructor to initialize the OllamaClient with base URL and model
    constructor(baseUrl = config_1.CONFIG.OLLAMA_URL || "", model = config_1.CONFIG.OLLAMA_MODEL || "") {
        // Method to generate a response from the Ollama API based on the provided prompt
        this.generate = (prompt) => __awaiter(this, void 0, void 0, function* () {
            console.log("Generating response for prompt", { prompt });
            try {
                logger_1.logger.debug("Generating response for prompt", { prompt });
                // Make a POST request to the Ollama API
                const response = yield fetch(`${this.baseUrl}/api/generate`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model: this.model,
                        prompt: prompt,
                        stream: false,
                        temperature: 0.7,
                        top_p: 0.9,
                    }),
                });
                // Check if the response is not OK
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                // Parse the response JSON
                const data = (yield response.json());
                logger_1.logger.debug("Generated response", { response: data.response });
                // Return the generated response
                return data.response;
            }
            catch (error) {
                logger_1.logger.error("Error generating response:", error);
                throw error;
            }
        });
        this.baseUrl = baseUrl;
        this.model = model;
        logger_1.logger.info(`Initializing Ollama client with model: ${model}`);
    }
}
exports.OllamaClient = OllamaClient;
