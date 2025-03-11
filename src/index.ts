import { ChromaClient } from "chromadb";
import { OllamaClient } from "./services/ollama";
import { runAgent } from "./agent";
import { CONFIG } from "./config";

async function main() {
  // Initialize ChromaClient with the provided URL from the configuration
  const chromaClient = new ChromaClient({ path: CONFIG.CHROMA_URL });

  // Initialize OllamaClient with the provided URL and model from the configuration
  const ollamaClient = new OllamaClient(CONFIG.OLLAMA_URL, CONFIG.OLLAMA_MODEL);

  try {
    // Run the agent with the specified parameters
    await runAgent(
      "Find information about Sundar Pichai who works at Google", // Query
      chromaClient, // ChromaClient instance
      ollamaClient.generate, // OllamaClient generate method
      (data) => console.log("Workflow completed:", data), // Success callback
      (error) => console.error("Workflow failed:", error), // Error callback
      (event) => console.log("Event:", event), // Event callback
    );
  } catch (error) {
    // Log any errors that occur during the execution of the agent
    console.error("Error running agent:", error);
  }
}

// Run the main function to start the agent
main();
