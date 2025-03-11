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
exports.PerplexityAPI = void 0;
const config_1 = require("../config");
// PerplexityAPI class to interact with the Perplexity API
class PerplexityAPI {
    // Constructor to initialize the API key
    constructor(apiKey = config_1.CONFIG.PERPLEXITY_API_TOKEN) {
        this.apiKey = apiKey;
    }
    // Method to perform a search query using the Perplexity API
    search(query) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch("https://api.perplexity.ai/chat/completions", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model: "mistral-7b-instruct",
                        messages: [{ role: "user", content: query }],
                    }),
                });
                // Check if the response is not ok (status code is not in the range 200-299)
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                // Parse the JSON response
                const data = yield response.json();
                return data.choices[0].message.content;
            }
            catch (error) {
                console.error("Error searching with Perplexity:", error);
                throw error;
            }
        });
    }
}
exports.PerplexityAPI = PerplexityAPI;
