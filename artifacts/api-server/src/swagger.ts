import swaggerJSDoc from "swagger-jsdoc";

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Cat-Bot AI Platform API",
      version: "1.0.0",
      description: "Self-hosted AI backend for Cat-Bot SIM — memory, knowledge, inference, and conversation management without any external AI provider.",
      contact: {
        name: "Cat-Bot SIM",
      },
    },
    servers: [
      { url: "/api", description: "Local API Server" },
    ],
    tags: [
      { name: "Chat", description: "Core conversational AI endpoints" },
      { name: "Memory", description: "Thread memory management (short-term & long-term)" },
      { name: "Threads", description: "Conversation thread configuration" },
      { name: "Knowledge", description: "Knowledge base ingestion and retrieval" },
      { name: "Personality", description: "AI personality management and adaptation" },
      { name: "Analytics", description: "Usage metrics and conversation insights" },
      { name: "Models", description: "Inference model configuration (native/Ollama/llama.cpp/vLLM)" },
      { name: "Admin", description: "System administration and learning cycles" },
      { name: "Diagnostics", description: "System diagnostics and health monitoring" },
    ],
    components: {
      schemas: {
        ChatRequest: {
          type: "object",
          required: ["message", "threadId"],
          properties: {
            message: { type: "string", description: "User message", example: "Hello Cat-Bot!" },
            threadId: { type: "string", description: "Thread identifier", example: "thread-123" },
            userId: { type: "string", description: "Optional user identifier" },
            personalityId: { type: "string", description: "Personality profile ID", example: "catbot-default" },
            modelOverride: {
              type: "object",
              properties: {
                mode: { type: "string", enum: ["native", "ollama", "llama_cpp", "vllm", "lm_studio", "custom"] },
                modelName: { type: "string" },
                temperature: { type: "number", minimum: 0, maximum: 2 },
                maxTokens: { type: "integer", minimum: 1 },
              },
            },
          },
        },
        ChatResponse: {
          type: "object",
          properties: {
            id: { type: "string" },
            threadId: { type: "string" },
            message: { type: "string" },
            response: { type: "string" },
            model: { type: "string" },
            mode: { type: "string" },
            latencyMs: { type: "number" },
            intent: { type: "string" },
            keywords: { type: "array", items: { type: "string" } },
            confidence: { type: "number" },
            timestamp: { type: "number" },
          },
        },
        KnowledgeIngest: {
          type: "object",
          required: ["title", "content"],
          properties: {
            title: { type: "string" },
            content: { type: "string" },
            category: { type: "string", default: "general" },
            tags: { type: "array", items: { type: "string" } },
            source: { type: "string" },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
            code: { type: "string" },
            details: { type: "array", items: { type: "object" } },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJSDoc(options);
