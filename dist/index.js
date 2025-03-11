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
const chromadb_1 = require("chromadb");
const ollama_1 = require("./services/ollama");
const agent_1 = require("./agent");
const config_1 = require("./config");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // Initialize ChromaClient with the provided URL from the configuration
        const chromaClient = new chromadb_1.ChromaClient({ path: config_1.CONFIG.CHROMA_URL });
        // Initialize OllamaClient with the provided URL and model from the configuration
        const ollamaClient = new ollama_1.OllamaClient(config_1.CONFIG.OLLAMA_URL, config_1.CONFIG.OLLAMA_MODEL);
        try {
            // Run the agent with the specified parameters
            yield (0, agent_1.runAgent)("Find information about Jane Smith who works at TechCorp", // Query
            chromaClient, // ChromaClient instance
            ollamaClient.generate, // OllamaClient generate method
            (data) => console.log("Workflow completed:", data), // Success callback
            (error) => console.error("Workflow failed:", error), // Error callback
            (event) => console.log("Event:", event));
        }
        catch (error) {
            // Log any errors that occur during the execution of the agent
            console.error("Error running agent:", error);
        }
    });
}
// Run the main function to start the agent
main();
