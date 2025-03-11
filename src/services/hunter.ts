import { CONFIG } from "../config";

export class HunterAPI {
  private apiKey: string;

  // Constructor to initialize the API key
  constructor(apiKey: string = CONFIG.HUNTER_API_TOKEN) {
    this.apiKey = apiKey;
  }

  // Method to find email based on domain and full name
  async findEmail(domain: string, fullName: string): Promise<any> {
    try {
      // Construct the URL with query parameters
      const url = new URL("https://api.hunter.io/v2/email-finder");
      url.searchParams.append("domain", domain);
      url.searchParams.append("full_name", fullName);
      url.searchParams.append("api_key", this.apiKey);

      // Fetch the response from the Hunter API
      const response = await fetch(url.toString());

      // Check if the response is not OK
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Return the JSON response
      return await response.json();
    } catch (error) {
      // Log and rethrow the error
      console.error("Error finding email with Hunter:", error);
      throw error;
    }
  }
}
