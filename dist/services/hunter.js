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
exports.HunterAPI = void 0;
const config_1 = require("../config");
class HunterAPI {
    // Constructor to initialize the API key
    constructor(apiKey = config_1.CONFIG.HUNTER_API_TOKEN) {
        this.apiKey = apiKey;
    }
    // Method to find email based on domain and full name
    findEmail(domain, fullName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Construct the URL with query parameters
                const url = new URL("https://api.hunter.io/v2/email-finder");
                url.searchParams.append("domain", domain);
                url.searchParams.append("full_name", fullName);
                url.searchParams.append("api_key", this.apiKey);
                // Fetch the response from the Hunter API
                const response = yield fetch(url.toString());
                // Check if the response is not OK
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                // Return the JSON response
                return yield response.json();
            }
            catch (error) {
                // Log and rethrow the error
                console.error("Error finding email with Hunter:", error);
                throw error;
            }
        });
    }
}
exports.HunterAPI = HunterAPI;
