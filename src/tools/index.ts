import { PerplexityAPI } from "../services/perplexity";
import { HunterAPI } from "../services/hunter";
import puppeteer from 'puppeteer';
import { HTMLReader } from "@llamaindex/readers/html";
import { VectorStoreIndex } from "llamaindex";
import { htmlToText } from 'html-to-text';

// Interface for tool manifest
export interface ToolManifest {
  id: string;
  name: string;
  description: string;
  input: string[];
  output: string[];
  run: (input: any) => Promise<any>;
}

// Initialize API instances
const perplexity = new PerplexityAPI();
const hunter = new HunterAPI();

const htmlReader = new HTMLReader();

// List of tools with their respective configurations
export const tools: ToolManifest[] = [
  {
    id: "perplexity_search",
    name: "Perplexity Search",
    description: "Search for company and person information",
    input: ["query"],
    output: ["search_results"],
    run: async (input: { query: string }) => {
      console.log('Executing Perplexity search with query:', input.query);
      // Execute search using PerplexityAPI
      return { search_results: await perplexity.search(input.query) };
    },
  },
  {
    id: "hunter_email",
    name: "Hunter Email Finder",
    description: "Find professional email addresses",
    input: ["domain", "full_name"],
    output: ["email", "score"],
    run: async (input: { domain: string; full_name: string }) => {
      console.log('Executing Hunter email finder with domain:', input.domain, 'and full name:', input.full_name);
      // Execute email finding using HunterAPI
      const result = await hunter.findEmail(input.domain, input.full_name);
      return {
        email: result.data.email,
        score: result.data.score,
      };
    },
  },
  {
    id: "puppeteer_scraper",
    name: "Puppeteer Scraper",
    description: "Scrape web pages using Puppeteer",
    input: ["url", "query"],
    output: ["content", "query_response", "text_content"],
    run: async (input: { 
      url: string; 
      query?: string; 
      timeout?: number; 
      waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2'
    }) => {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      try {
        const page = await browser.newPage();
        
        // Set a default timeout or use provided timeout
        await page.setDefaultTimeout(input.timeout || 30000);

        // Navigate with configurable wait condition
        await page.goto(input.url, {
          waitUntil: input.waitUntil || 'networkidle2',
          timeout: input.timeout || 30000
        });

        // Wait for network to be idle and potential dynamic content to load
        await page.waitForNetworkIdle({ 
          idleTime: 500, 
          timeout: input.timeout || 10000 
        });

        // Extract full page content
        const content = await page.content();

        // Convert HTML to plain text
        const textContent = htmlToText(content, {
          wordwrap: 130,
          baseElements: {
            selectors: [
              'body',
              'article',
              'main',
              'div.content',
              'section'
            ]
          },
          preserveNewlines: true,
      });
      const sentences = textContent.match(/[^.!?]+[.!?]+/g) || [];
  

        // Close browser to free up resources
        await browser.close();

        // If no query is provided, return just the content
        if (!input.query) {
          return {
            content,
            text_content: textContent
          };
        }

        const documents = sentences.map((sentence, index) => ({
          text: sentence.trim(),
          metadata: { index } // Optional: Add metadata for context
        }));

        // Parse and index content for querying
        const vectorStoreDocuments = await VectorStoreIndex.fromDocuments(documents);
        const queryEngine = vectorStoreDocuments.asQueryEngine();

        // Run the query
        const response = await queryEngine.query({ 
          query: input.query 
        });

        return {
          content,
          text_content: textContent,
          query_response: response.toString(),
        };
      } catch (error) {
        // Ensure browser is closed even if an error occurs
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Ensure browser is closed even if an error occurs
        await browser.close();
        
        // Throw or handle the error appropriately
        throw new Error(`Puppeteer scraping failed: ${errorMessage}`);
      }
    },
  },
];
