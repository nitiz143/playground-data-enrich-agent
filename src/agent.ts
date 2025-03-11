import {
  Workflow,
  StartEvent,
  StopEvent,
  WorkflowEvent,
} from "@llamaindex/workflow";
import { ChromaClient } from "chromadb";
import { jsonrepair } from "jsonrepair";
import { Callable, Document, Generate } from "./types/definitions";
import { tools } from "./tools";

// Function to ensure documents are indexed in ChromaDB
async function ensureDocumentsIndexed(
  chromaClient: ChromaClient,
  documents: Document[] | undefined,
) {
  if (!documents) {
    return;
  }
  console.log("Ensuring documents are indexed in ChromaDB...");
  for (const doc of documents) {
    const collection = await chromaClient.getOrCreateCollection({
      name: "docs",
    });
    const exists = await collection.get({ ids: [doc.id] });
    if (!exists.ids.length) {
      console.log(`Indexing document with ID: ${doc.id}`);
      await collection.add({ ids: [doc.id], documents: [doc.content] });
    } else {
      console.log(`Document with ID: ${doc.id} already indexed.`);
    }
  }
}

// Interface for context data
interface ContextData {
  input: string;
  chromaClient: ChromaClient;
  instructions?: string;
  leads_data?: object;
  output_format?: string;
  buyer_industry?: string;
  seller_industry?: string;
  recommendations: object;
  toolResults: { [key: string]: any };
  extraContext: string;
  documents: Document[];
  generate: Generate;
  onComplete: Callable<object>;
  onFailed: Callable<object>;
  onEvent: Callable<object>;
  errorMessage?: string;
}

// Workflow events
export class DocumentsIndexedEvent extends WorkflowEvent<{ message: string }> {}
export class PromptExtractionEvent extends WorkflowEvent<{
  leads_data: object | undefined;
}> {}
export class ContextRetrievedEvent extends WorkflowEvent<{
  extraContext: string;
}> {}
export class RecommendationsProcessedEvent extends WorkflowEvent<{
  recommendations: string[];
}> {}
export class ToolsMatchedEvent extends WorkflowEvent<{
  matchedTools: { [recommendation: string]: string[] };
  toolResults?: { [field: string]: any };
}> {}
export class WorkflowCompletedEvent extends WorkflowEvent<{
  toolResults: { [fieldName: string]: any };
  enrichedLeadData?: any;
  summary?: string;
  unresolvedFields?: any;
}> {}
export class ErrorEvent extends WorkflowEvent<{ message: string }> {}

// Initialize workflow
const workflow = new Workflow<ContextData, ContextData, string>();

// Step 1: Ensure documents are indexed
workflow.addStep(
  {
    inputs: [StartEvent],
    outputs: [DocumentsIndexedEvent],
  },
  async (context) => {
    context.data.onEvent({ message: "Starting step 1: Encode Documents" });
    await ensureDocumentsIndexed(
      context.data.chromaClient,
      context.data.documents,
    );
    return new DocumentsIndexedEvent({
      message: "Data and instructions set and documents ensured in index",
    });
  },
);

// Step 2: Extract data from input
workflow.addStep(
  {
    inputs: [DocumentsIndexedEvent],
    outputs: [PromptExtractionEvent, ErrorEvent],
  },
  async (context) => {
    context.data.onEvent({ message: "Starting step 2: Extract Data" });

    // Generate leads data
    const leadsDataPrompt = `Given the following prompt, extract the details of the lead's data. Structure them in a clean JSON format for example: { "first_name": "Sundar", "last_name": "Pichai", "company_name": "Google" }:\n\n${context.data.input}\n\nJSON:`;
    const leadsDataResponse = await context.data.generate(leadsDataPrompt);
    console.log(leadsDataResponse);
    const leadJsonString = jsonrepair(
      leadsDataResponse?.substring(leadsDataResponse.indexOf("{")) || "{}",
    );
    context.data.leads_data = JSON.parse(leadJsonString) || {};

    // Generate instructions
    const instructionsPrompt = `Given the following prompt, determine the instructions provided in the prompt for the data enrichment agent:\n\n${context.data.input}\n\nInstructions:`;
    context.data.instructions = await context.data.generate(instructionsPrompt);

    // Generate buyer industry
    const leadIndustryPrompt = `Given the following prompt, extract the industry of the lead based on their company name, job title, and any other relevant context. If the industry is not explicitly mentioned, infer it from the company or role:\n\n${context.data.input}\n\nLeads industry:`;
    context.data.buyer_industry =
      await context.data.generate(leadIndustryPrompt);

    // Generate seller industry
    const sellerIndustryPrompt = `Given the following prompt, extract the industry related to the salesperson or the product being sold:\n\n${context.data.input}\n\nSeller industry:`;
    context.data.seller_industry =
      await context.data.generate(sellerIndustryPrompt);

    // Generate output format
    const outputFormatPrompt = `Given the following prompt, write the required output format for example JSON, CSV, Free text, YAML, etc:\n\n${context.data.input}\n\nOutput format:`;
    context.data.output_format =
      await context.data.generate(outputFormatPrompt);

    return new PromptExtractionEvent({ leads_data: context.data.leads_data });
  },
);

// Step 3: Retrieve context from ChromaDB
workflow.addStep(
  {
    inputs: [PromptExtractionEvent],
    outputs: [ContextRetrievedEvent],
  },
  async (context) => {
    context.data.onEvent({ message: "Starting step 3: Retrieve Context" });
    const queryTexts = `Data enrichment for leads in: ${context.data.buyer_industry} and sellers in: ${context.data.seller_industry}`;
    const collection = await context.data.chromaClient.getOrCreateCollection({
      name: "docs",
    });
    const searchResults = await collection.query({ queryTexts: [queryTexts] });
    const extraContext = searchResults.documents.flat().join("\n");
    return new ContextRetrievedEvent({ extraContext });
  },
);

// Step 4: Process recommendations
workflow.addStep(
  {
    inputs: [ContextRetrievedEvent],
    outputs: [RecommendationsProcessedEvent, ErrorEvent],
  },
  async (context, event: ContextRetrievedEvent) => {
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

    const response = await context.data.generate(enrichedPrompt);
    console.log(response);
    const recommendations = jsonrepair(
      response?.substring(response.indexOf("{")) || "{}",
    );
    context.data.recommendations = JSON.parse(recommendations) || {};

    return new RecommendationsProcessedEvent({ recommendations: [] });
  },
);
//step 5
workflow.addStep(
  {
    inputs: [RecommendationsProcessedEvent],
    outputs: [ToolsMatchedEvent],
  },
  async (context) => {
    context.data.onEvent({ message: "Starting step 5: Match Tools with Enhanced Retrieval" });
    const matchedTools: { [recommendation: string]: string[] } = {};
    const toolResults: { [field: string]: any } = {};
    
    // Extract all field names from all categories in recommendations
    const allFields: string[] = [];
    Object.values(context.data.recommendations).forEach((fields: any) => {
      if (Array.isArray(fields)) {
        fields.forEach((field) => allFields.push(field));
      }
    });
    
    // Create a copy of the lead data that will be updated as we go
    let currentLeadData = { ...context.data.leads_data };
    
    // Enhanced retrieval strategy with multiple attempts and fallback mechanisms
    const MAX_ATTEMPTS = 3;
    const FALLBACK_STRATEGIES = [
      'broaden_search',
      'use_alternative_tool',
      'partial_match',
      'manual_research'
    ];
    
    // Process each field sequentially with enhanced error handling
    for (const field of allFields) {
      // Skip fields that are already in the lead data
      if (field in currentLeadData) {
        context.data.onEvent({ 
          message: `Field ${field} already exists in lead data, skipping`
        });
        continue;
      }
      
      let retrievalSuccess = false;
      let attempts = 0;
      
      while (!retrievalSuccess && attempts < MAX_ATTEMPTS) {
        attempts++;
        
        const suggestedToolPrompt = `
        Iteration ${attempts} of finding "${field}"
        
        Given the following data:
        1. Lead's existing data:
        ${JSON.stringify(currentLeadData, null, 2)}
        2. Next field to find: "${field}"
        3. Available tools with input/output mappings:
        ${JSON.stringify(tools, null, 2)}
        4. Current fallback strategy: ${FALLBACK_STRATEGIES[attempts - 1] || 'default'}
        
        Determine the most suitable tool to retrieve information about "${field}". 
        If previous attempts failed, adjust your strategy:
        - Consider broadening search parameters
        - Look for alternative data sources
        - Accept partial or approximate matches
        
        Output a JSON object with your strategy:
        {
          "next_field_to_find": "${field}",
          "selected_tool": "<tool_id>",
          "fallback_strategy": "<strategy>",
          "modified_parameters": {
            "<input_key>": "<modified_value>"
          }
        }`;

        try {
          const response = await context.data.generate(suggestedToolPrompt);
          
          // Parse the AI's response to get the recommended tool and parameters
          const jsonResponse = response.substring(response.indexOf('{'));
          const trimmedJsonResponse = jsonResponse.substring(0, jsonResponse.lastIndexOf('}') + 1);
          const recommendation = JSON.parse(jsonrepair(trimmedJsonResponse));
          
          // Find the selected tool from our tools array
          const selectedTool = tools.find(tool => tool.id === recommendation.selected_tool);
          
          if (selectedTool) {
            context.data.onEvent({ 
              message: `Attempt ${attempts}: Executing tool to find ${field}`
            });
            
            // Execute the tool with the modified/fallback parameters
            const result = await selectedTool.run(recommendation.modified_parameters || {});
            
            // Validate the result (add your validation logic)
            if (result && Object.keys(result).length > 0) {
              toolResults[field] = result;
              matchedTools[field] = [recommendation.selected_tool];
              (currentLeadData as any)[field] = result;
              retrievalSuccess = true;
              
              context.data.onEvent({ 
                message: `Successfully obtained ${field} on attempt ${attempts}`,
                result: result
              });
            } else {
              context.data.onEvent({
                message: `Attempt ${attempts} failed to retrieve meaningful data for ${field}`
              });
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          context.data.onEvent({ 
            message: `Attempt ${attempts} error processing field ${field}: ${errorMessage}`,
            error: error
          });
        }
      }
      
      // If all attempts fail, mark the field as unresolved
      if (!retrievalSuccess) {
        context.data.onEvent({
          message: `CRITICAL: Could not retrieve data for field ${field} after ${MAX_ATTEMPTS} attempts`
        });
        toolResults[field] = { status: 'unresolved', reason: 'Maximum retrieval attempts exhausted' };
      }
    }
    
    // Store the complete tool results in the context data
    context.data.toolResults = toolResults;
    
    return new ToolsMatchedEvent({ matchedTools, toolResults });
  },
);


// Step 6: Complete workflow with comprehensive enriched data
workflow.addStep(
  {
    inputs: [ToolsMatchedEvent],
    outputs: [WorkflowCompletedEvent],
  },
  async (context, event) => {
    const toolResults = event.data.toolResults || {};
    
    // Identify unresolved fields
    const unresolvedFields = Object.entries(toolResults)
      .filter(([_, result]) => result.status === 'unresolved')
      .map(([field, _]) => field);
    
    // Merge the new data into the lead's profile
    const enrichedLeadData = {
      ...context.data.leads_data,
      ...Object.entries(toolResults)
        .filter(([_, result]) => result.status !== 'unresolved')
        .reduce<Record<string, any>>((acc, [field, result]) => {
          acc[field] = result;
          return acc;
        }, {})
    };
    
    // Generate a comprehensive summary with unresolved field handling
    const summaryPrompt = `
    Data Enrichment Report:
    1. Original lead data: ${JSON.stringify(context.data.leads_data, null, 2)}
    2. Enriched lead data: ${JSON.stringify(enrichedLeadData, null, 2)}
    3. Unresolved fields: ${JSON.stringify(unresolvedFields)}
    4. Output format requested: ${context.data.output_format || "JSON"}
    
    Create a detailed summary that includes:
    - Successfully enriched fields
    - Unresolved fields and potential reasons
    - Recommendations for manual research
    - Confidence level of the enrichment process
    
    Comprehensive Summary:`;
    
    let enrichmentSummary;
    try {
      enrichmentSummary = await context.data.generate(summaryPrompt);
    } catch (error) {
      enrichmentSummary = "Error generating summary: " + String(error);
    }
    
    return new WorkflowCompletedEvent({ 
      toolResults, 
      enrichedLeadData,
      summary: enrichmentSummary,
      unresolvedFields: unresolvedFields
    });
  },
);
// Step 7: Stop workflow
workflow.addStep(
  {
    inputs: [WorkflowCompletedEvent],
    outputs: [StopEvent],
  },
  async (context) => {
    if (context.data.onComplete) {
      context.data.onComplete(context.data);
    }
    return new StopEvent("Workflow completed successfully.");
  },
);

// Error handling step
workflow.addStep(
  {
    inputs: [ErrorEvent],
    outputs: [WorkflowCompletedEvent],
  },
  async (context, event) => {
    context.data.errorMessage = event.data.message;
    return new WorkflowCompletedEvent({
      toolResults: context.data.toolResults,
    });
  },
);

// Function to run the agent
export const runAgent = async (
  input: string,
  chromaClient: ChromaClient,
  llmGenerate: Generate,
  onComplete: Callable<object>,
  onFailed: Callable<object>,
  onEvent: Callable<object>,
) => {
  const contextData: ContextData = {
    input,
    chromaClient,
    generate: llmGenerate,
    onComplete,
    onFailed,
    onEvent,
    documents: [
      {
        id: "doc1",
        content:
          "TechCorp is a leading technology company specializing in software development.",
      },
      {
        id: "doc2",
        content:
          "BizCo provides marketing solutions for mid-size businesses worldwide.",
      },
    ],
    recommendations: [],
    toolResults: {},
    extraContext: "",
  };

  const startEvent = new StartEvent(contextData);
  try {
    await workflow.run(startEvent, contextData);
  } catch (error) {
    console.error('Error running workflow:', error);
    if (contextData.onFailed) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      contextData.onFailed({ message: errorMessage });
    }
  }
};
