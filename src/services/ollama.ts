import { logger } from "../utils/logger";
import { CONFIG } from "../config";
import { Generate } from "../types/definitions";

// Interface to define the structure of the response from Ollama API
interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

// Class to interact with the Ollama API
export class OllamaClient {
  private baseUrl: string;
  private model: string;

  // Constructor to initialize the OllamaClient with base URL and model
  constructor(
    baseUrl: string = CONFIG.OLLAMA_URL || "",
    model: string = CONFIG.OLLAMA_MODEL || "",
  ) {
    this.baseUrl = baseUrl;
    this.model = model;
    logger.info(`Initializing Ollama client with model: ${model}`);
  }

  // Method to generate a response from the Ollama API based on the provided prompt
  public generate: Generate = async (prompt: string) => {
    console.log("Generating response for prompt", { prompt });
    try {
      logger.debug("Generating response for prompt", { prompt });

      // Make a POST request to the Ollama API
      const response = await fetch(`${this.baseUrl}/api/generate`, {
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
      const data = (await response.json()) as OllamaResponse;
      logger.debug("Generated response", { response: data.response });

      // Return the generated response
      return data.response;
    } catch (error) {
      logger.error("Error generating response:", error);
      throw error;
    }
  };
}
