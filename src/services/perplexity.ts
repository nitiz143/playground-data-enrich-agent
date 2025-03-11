import { CONFIG } from "../config";

// PerplexityAPI class to interact with the Perplexity API
export class PerplexityAPI {
  private apiKey: string;

  // Constructor to initialize the API key
  constructor(apiKey: string = CONFIG.PERPLEXITY_API_TOKEN) {
    this.apiKey = apiKey;
  }

  // Method to perform a search query using the Perplexity API
  async search(query: string): Promise<string> {
    try {
      const response = await fetch(
        "https://api.perplexity.ai/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sonar",
            messages: [{ role: "user", content: query }],
          }),
        },
      );

      // Check if the response is not ok (status code is not in the range 200-299)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Parse the JSON response
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error("Error searching with Perplexity:", error);
      throw error;
    }
  }
}
