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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tools = void 0;
const perplexity_1 = require("../services/perplexity");
const hunter_1 = require("../services/hunter");
const puppeteer_1 = __importDefault(require("puppeteer"));
// Initialize API instances
const perplexity = new perplexity_1.PerplexityAPI();
const hunter = new hunter_1.HunterAPI();
// List of tools with their respective configurations
exports.tools = [
    {
        id: "perplexity_search",
        name: "Perplexity Search",
        description: "Search for company and person information",
        input: ["query"],
        output: ["search_results"],
        run: (input) => __awaiter(void 0, void 0, void 0, function* () {
            // Execute search using PerplexityAPI
            return { search_results: yield perplexity.search(input.query) };
        }),
    },
    {
        id: "hunter_email",
        name: "Hunter Email Finder",
        description: "Find professional email addresses",
        input: ["domain", "full_name"],
        output: ["email", "score"],
        run: (input) => __awaiter(void 0, void 0, void 0, function* () {
            // Execute email finding using HunterAPI
            const result = yield hunter.findEmail(input.domain, input.full_name);
            return {
                email: result.data.email,
                score: result.data.score,
            };
        }),
    },
    {
        id: "puppeteer_scraper",
        name: "Puppeteer Scraper",
        description: "Scrape web pages using Puppeteer",
        input: ["url"],
        output: ["content"],
        run: (input) => __awaiter(void 0, void 0, void 0, function* () {
            const browser = yield puppeteer_1.default.launch();
            const page = yield browser.newPage();
            yield page.goto(input.url);
            const content = yield page.content();
            yield browser.close();
            return { content };
        }),
    },
];
