// src/server.ts
import "dotenv/config";
import { z } from "zod";
import OpenAI from "openai";

const NVIDIA_MODEL = "nvidia/usdcode-llama-3.1-70b-instruct";

const apiKey = process.env.NVIDIA_API_KEY;
if (!apiKey) {
  console.error(
    "Missing NVIDIA_API_KEY. Set it in your environment or a .env file."
  );
  process.exit(1);
}

const mcpPath = new URL(
  "../node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js",
  import.meta.url
).href;
const stdioPath = new URL(
  "../node_modules/@modelcontextprotocol/sdk/dist/esm/server/stdio.js",
  import.meta.url
).href;
const { McpServer } = (await import(mcpPath)) as any;
const { StdioServerTransport } = (await import(stdioPath)) as any;

console.error("[usdcode-mcp] Starting server...");
const server = new McpServer({ name: "usdcode-mcp", version: "0.1.0" });

server.tool(
  "get_usdcode_help",
  "Ask NVIDIA USDCode for help (Isaac Sim scripting, USD, Python/API tips).\n\nParameters: temperature (0-1, default 0.1), top_p (<=1, default 1), max_tokens (1-2048, default 1024), expert_type (auto|knowledge|code|helperfunction; default auto), stream (boolean; default false). Avoid changing temperature and top_p together.",
  {
    question: z.string().describe("Your prompt or question"),
    temperature: z
      .number()
      .optional()
      .describe("Sampling temperature (0-1). Default: 0.1"),
    top_p: z
      .number()
      .optional()
      .describe("Top-p nucleus sampling mass (<=1). Default: 1"),
    max_tokens: z
      .number()
      .int()
      .optional()
      .describe("Max tokens to generate (1-2048). Default: 1024"),
    expert_type: z
      .enum(["auto", "knowledge", "code", "helperfunction"]) // possible values per API
      .optional()
      .describe(
        "Expert to use: auto, knowledge, code, or helperfunction. Default: auto"
      ),
    stream: z
      .boolean()
      .optional()
      .describe("Stream partial deltas via SSE. Default: false"),
  },
  async (params: any) => {
    const {
      question,
      temperature = 0.1,
      top_p = 1,
      max_tokens = 1024,
      expert_type = "auto",
      stream = false,
    } = params ?? {};
    const client = new OpenAI({
      baseURL: "https://integrate.api.nvidia.com/v1",
      apiKey,
    });

    // Build common request payload
    const request = {
      model: NVIDIA_MODEL,
      messages: [{ role: "user", content: question }],
      temperature,
      top_p,
      max_tokens,
      expert_type,
    } as any;

    let text = "";
    if (stream) {
      // Handle streaming by accumulating deltas into a single string
      const s = await (client.chat.completions.create as any)({
        ...request,
        stream: true,
      });
      for await (const chunk of s as any) {
        const delta = chunk?.choices?.[0]?.delta?.content ?? "";
        if (delta) text += String(delta);
      }
      if (!text) text = "No streamed content returned by USDCode.";
    } else {
      const completion = await (client.chat.completions.create as any)(request);
      text =
        completion.choices?.[0]?.message?.content?.toString() ??
        "No content returned by USDCode.";
    }

    return {
      content: [{ type: "text", text }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[usdcode-mcp] Server connected. Waiting for MCP client...");
// Ensure the process stays alive waiting for stdio input
process.stdin.resume();
