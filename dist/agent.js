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
exports.runAgent = exports.ErrorEvent = exports.WorkflowCompletedEvent = exports.ToolsMatchedEvent = exports.RecommendationsProcessedEvent = exports.ContextRetrievedEvent = exports.PromptExtractionEvent = exports.DocumentsIndexedEvent = void 0;
const workflow_1 = require("@llamaindex/workflow");
const jsonrepair_1 = require("jsonrepair");
const tools_1 = require("./tools");
// Function to ensure documents are indexed in ChromaDB
function ensureDocumentsIndexed(chromaClient, documents) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!documents) {
            return;
        }
        console.log("Ensuring documents are indexed in ChromaDB...");
        for (const doc of documents) {
            const collection = yield chromaClient.getOrCreateCollection({
                name: "docs",
            });
            const exists = yield collection.get({ ids: [doc.id] });
            if (!exists.ids.length) {
                console.log(`Indexing document with ID: ${doc.id}`);
                yield collection.add({ ids: [doc.id], documents: [doc.content] });
            }
            else {
                console.log(`Document with ID: ${doc.id} already indexed.`);
            }
        }
    });
}
// Workflow events
class DocumentsIndexedEvent extends workflow_1.WorkflowEvent {
}
exports.DocumentsIndexedEvent = DocumentsIndexedEvent;
class PromptExtractionEvent extends workflow_1.WorkflowEvent {
}
exports.PromptExtractionEvent = PromptExtractionEvent;
class ContextRetrievedEvent extends workflow_1.WorkflowEvent {
}
exports.ContextRetrievedEvent = ContextRetrievedEvent;
class RecommendationsProcessedEvent extends workflow_1.WorkflowEvent {
}
exports.RecommendationsProcessedEvent = RecommendationsProcessedEvent;
class ToolsMatchedEvent extends workflow_1.WorkflowEvent {
}
exports.ToolsMatchedEvent = ToolsMatchedEvent;
class WorkflowCompletedEvent extends workflow_1.WorkflowEvent {
}
exports.WorkflowCompletedEvent = WorkflowCompletedEvent;
class ErrorEvent extends workflow_1.WorkflowEvent {
}
exports.ErrorEvent = ErrorEvent;
// Initialize workflow
const workflow = new workflow_1.Workflow();
// Step 1: Ensure documents are indexed
workflow.addStep({
    inputs: [workflow_1.StartEvent],
    outputs: [DocumentsIndexedEvent],
}, (context) => __awaiter(void 0, void 0, void 0, function* () {
    context.data.onEvent({ message: "Starting step 1: Encode Documents" });
    yield ensureDocumentsIndexed(context.data.chromaClient, context.data.documents);
    return new DocumentsIndexedEvent({
        message: "Data and instructions set and documents ensured in index",
    });
}));
// Step 2: Extract data from input
workflow.addStep({
    inputs: [DocumentsIndexedEvent],
    outputs: [PromptExtractionEvent, ErrorEvent],
}, (context) => __awaiter(void 0, void 0, void 0, function* () {
    context.data.onEvent({ message: "Starting step 2: Extract Data" });
    // Generate leads data
    const leadsDataPrompt = `Given the following prompt, extract the details of the lead's data. Structure them in a clean JSON format for example: { "first_name": "Joe", "last_name": "Shmoe", "key": "value" }:\n\n${context.data.input}\n\nJSON:`;
    const leadsDataResponse = yield context.data.generate(leadsDataPrompt);
    console.log(leadsDataResponse);
    const leadJsonString = (0, jsonrepair_1.jsonrepair)((leadsDataResponse === null || leadsDataResponse === void 0 ? void 0 : leadsDataResponse.substring(leadsDataResponse.indexOf("{"))) || "{}");
    context.data.leads_data = JSON.parse(leadJsonString) || {};
    // Generate instructions
    const instructionsPrompt = `Given the following prompt, determine the instructions provided in the prompt for the data enrichment agent:\n\n${context.data.input}\n\nInstructions:`;
    context.data.instructions = yield context.data.generate(instructionsPrompt);
    // Generate buyer industry
    const leadIndustryPrompt = `Given the following prompt, extract the industry of the lead based on their company name, job title, and any other relevant context. If the industry is not explicitly mentioned, infer it from the company or role:\n\n${context.data.input}\n\nLeads industry:`;
    context.data.buyer_industry =
        yield context.data.generate(leadIndustryPrompt);
    // Generate seller industry
    const sellerIndustryPrompt = `Given the following prompt, extract the industry related to the salesperson or the product being sold:\n\n${context.data.input}\n\nSeller industry:`;
    context.data.seller_industry =
        yield context.data.generate(sellerIndustryPrompt);
    // Generate output format
    const outputFormatPrompt = `Given the following prompt, write the required output format for example JSON, CSV, Free text, YAML, etc:\n\n${context.data.input}\n\nOutput format:`;
    context.data.output_format =
        yield context.data.generate(outputFormatPrompt);
    return new PromptExtractionEvent({ leads_data: context.data.leads_data });
}));
// Step 3: Retrieve context from ChromaDB
workflow.addStep({
    inputs: [PromptExtractionEvent],
    outputs: [ContextRetrievedEvent],
}, (context) => __awaiter(void 0, void 0, void 0, function* () {
    context.data.onEvent({ message: "Starting step 3: Retrieve Context" });
    const queryTexts = `Data enrichment for leads in: ${context.data.buyer_industry} and sellers in: ${context.data.seller_industry}`;
    const collection = yield context.data.chromaClient.getOrCreateCollection({
        name: "docs",
    });
    const searchResults = yield collection.query({ queryTexts: [queryTexts] });
    const extraContext = searchResults.documents.flat().join("\n");
    return new ContextRetrievedEvent({ extraContext });
}));
// Step 4: Process recommendations
workflow.addStep({
    inputs: [ContextRetrievedEvent],
    outputs: [RecommendationsProcessedEvent, ErrorEvent],
}, (context, event) => __awaiter(void 0, void 0, void 0, function* () {
    const extraContent = event.data.extraContext;
    context.data.onEvent({
        message: "Starting step 4: Process Recommendations",
    });
    const keys = Object.keys(context.data.leads_data || {});
    // Generate recommendations
    const enrichedPrompt = `
      Given the following details:
      * Lead's existing data keys: ${keys}
      * Seller's instructions: ${context.data.instructions}
      * Extra context for enrichment (industry standards, knowledge base):
      ${extraContent}

      Analyze the seller's instructions and determine what additional data fields are
      required to fully satisfy the request. Identify missing lead attributes that need to
      be enriched using available tools, such as company details, technology stack,
      financial data, decision-makers, etc.
      Output a structured JSON object containing a list of required fields categorized
      under relevant sections (e.g., contact details, company insights, sales intelligence,
      competitive analysis). The format should be:
      {
        "contact_details": ["email", "phone_number", "LinkedIn", "Twitter",
        "personal_website", "job_title"],
        "company_insights": ["company_size", "industry", "annual_revenue",
        "headquarters_location", "subsidiaries", "funding_rounds"],
        "sales_intelligence": ["buying_signals", "decision_makers", "budget_estimate",
        "partnerships", "recent_news", "customer_base"],
        "technology_stack": ["CRM_used", "cloud_provider", "security_tools",
        "marketing_automation", "ERP_system", "AI_tools"],
        "financial_data": ["revenue_growth", "profit_margin", "funding_status",
        "debt_ratio", "valuation", "stock_price"],
        "social_presence": ["Twitter_followers", "LinkedIn_followers",
        "social_engagement", "Glassdoor_reviews", "PR_mentions"],
        "geographical_data": ["office_locations", "market_presence", "expansion_plans",
        "regional_sales"],
        "customer_profile": ["target_industry", "ideal_customer_profile",
        "customer_lifetime_value", "retention_rate"],
        "legal_compliance": ["GDPR_compliance", "regulatory_certifications",
        "litigation_history", "trademarks"],
        "employee_insights": ["employee_count", "hiring_trends", "key_personnel",
        "employee_satisfaction", "average_tenure"],
        "competitive_landscape": ["top_competitors", "market_share", "differentiators",
        "pricing_strategy"],
        "operational_metrics": ["supply_chain_efficiency", "production_capacity",
        "logistics_network", "inventory_turnover"],
        "partnerships_affiliations": ["strategic_partners", "resellers",
        "channel_partners", "investment_affiliations"]
      }
      Only include the keys that are relevant to the seller's instructions and the given
      industry context.
      Result JSON:`;
    const response = yield context.data.generate(enrichedPrompt);
    console.log(response);
    const recommendations = (0, jsonrepair_1.jsonrepair)((response === null || response === void 0 ? void 0 : response.substring(response.indexOf("{"))) || "{}");
    context.data.recommendations = JSON.parse(recommendations) || {};
    return new RecommendationsProcessedEvent({ recommendations: [] });
}));
// Step 5: Match tools to recommendations
workflow.addStep({
    inputs: [RecommendationsProcessedEvent],
    outputs: [ToolsMatchedEvent],
}, (context) => __awaiter(void 0, void 0, void 0, function* () {
    context.data.onEvent({ message: "Starting step 5: Match Tools" });
    const matchedTools = {};
    // for (const [category, fields] of Object.entries(context.data.recommendations)) {
    //   for (const field of fields as string[]) {
    //   }
    // }
    // Generate tool matching
    const suggestedToolPrompt = `
    Given the following data:
    1. Lead's existing data:
    ${JSON.stringify(context.data.leads_data, null, 2)}
    2. List of fields to research:
    ${JSON.stringify(context.data.recommendations, null, 2)}
    3. Available tools with input/output mappings:
    ${JSON.stringify(tools_1.tools, null, 2)}
    
    Determine the next missing field that should be researched to satisfy the
    broader goal of enriching this lead's profile. Select the most relevant tool that can
    retrieve the missing field based on the lead's available data and the tool’s input
    requirements.
    
    Output a JSON object in the following format:
    {
      "next_field_to_find": "<missing_field>",
      "selected_tool": "<tool_id>",
      "tool_name": "<tool_name>",
      "tool_description": "<tool_description>",
      "parameters": {
      "<input_key>": "<value_from_lead_data>"
      }
    }
    
    Example Output:
    If the lead data contains "first_name": "Roy", "last_name": "Ganor", "company":
    "Nestbox.ai", but no email is available, the AI may return:
    {
      "next_field_to_find": "email",
      "selected_tool": "rocketreach",
      "tool_name": "RocketReach API",
      "tool_description": "A tool to find professional contact information.",
      "parameters": {
      "name": "Roy Ganor",
      "company": "Nestbox.ai"
      }
    }
    Output:`;
    const response = yield context.data.generate(suggestedToolPrompt);
    return new ToolsMatchedEvent({ matchedTools });
}));
// Step 6: Complete workflow
workflow.addStep({
    inputs: [ToolsMatchedEvent],
    outputs: [WorkflowCompletedEvent],
}, (context) => __awaiter(void 0, void 0, void 0, function* () {
    const toolResults = {
        email: { email: "joe@email.com" },
    };
    return new WorkflowCompletedEvent({ toolResults });
}));
// Step 7: Stop workflow
workflow.addStep({
    inputs: [WorkflowCompletedEvent],
    outputs: [workflow_1.StopEvent],
}, (context) => __awaiter(void 0, void 0, void 0, function* () {
    if (context.data.onComplete) {
        context.data.onComplete(context.data);
    }
    return new workflow_1.StopEvent("Workflow completed successfully.");
}));
// Error handling step
workflow.addStep({
    inputs: [ErrorEvent],
    outputs: [WorkflowCompletedEvent],
}, (context, event) => __awaiter(void 0, void 0, void 0, function* () {
    context.data.errorMessage = event.data.message;
    return new WorkflowCompletedEvent({
        toolResults: context.data.toolResults,
    });
}));
// Function to run the agent
const runAgent = (input, chromaClient, llmGenerate, onComplete, onFailed, onEvent) => __awaiter(void 0, void 0, void 0, function* () {
    const contextData = {
        input,
        chromaClient,
        generate: llmGenerate,
        onComplete,
        onFailed,
        onEvent,
        documents: [
            {
                id: "doc1",
                content: "TechCorp is a leading technology company specializing in software development.",
            },
            {
                id: "doc2",
                content: "BizCo provides marketing solutions for mid-size businesses worldwide.",
            },
        ],
        recommendations: [],
        toolResults: {},
        extraContext: "",
    };
    const startEvent = new workflow_1.StartEvent(contextData);
    try {
        yield workflow.run(startEvent, contextData);
    }
    catch (error) {
        console.error('Error running workflow:', error);
        if (contextData.onFailed) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            contextData.onFailed({ message: errorMessage });
        }
    }
});
exports.runAgent = runAgent;
