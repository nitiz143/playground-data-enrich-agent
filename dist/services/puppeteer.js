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
exports.PuppeteerService = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
class PuppeteerService {
    constructor() {
        this.browser = null;
    }
    // Method to launch the browser
    launchBrowser() {
        return __awaiter(this, void 0, void 0, function* () {
            this.browser = yield puppeteer_1.default.launch();
        });
    }
    // Method to close the browser
    closeBrowser() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.browser) {
                yield this.browser.close();
                this.browser = null;
            }
        });
    }
    // Method to perform actions on a page
    performActions() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.browser) {
                throw new Error("Browser is not launched");
            }
            const page = yield this.browser.newPage();
            // Navigate the page to a URL.
            yield page.goto('https://developer.chrome.com/');
            // Set screen size.
            yield page.setViewport({ width: 1080, height: 1024 });
            // Type into search box.
            yield page.type('.devsite-search-field', 'automate beyond recorder');
            // Wait and click on first result.
            yield page.waitForSelector('.devsite-result-item-link');
            yield page.click('.devsite-result-item-link');
            // Locate the full title with a unique string.
            yield page.waitForSelector('text/Customize and automate');
            const fullTitle = yield page.$eval('text/Customize and automate', el => el.textContent);
            // Print the full title.
            console.log('The title of this blog post is "%s".', fullTitle);
            yield page.close();
        });
    }
}
exports.PuppeteerService = PuppeteerService;
