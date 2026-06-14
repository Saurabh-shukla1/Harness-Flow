import OpenAI from "openai";
import { execSync } from "child_process";
import { callMcpTool, mcpToolsNames, tools } from "./tools";
import { selectModel, type ModelFlag } from "./model";
import webSerch from "./tools/web";
import { getCurrentDatetime } from "./tools/currentDatetime";
import { browserAction, browseUrl } from "./tools/browsing_tools";
import { systemPrompt } from "./prompt/system";
import { gitTool, type GitAction } from "./tools/git_actions";

export type RunAgentOptions = {
  modelFlag: ModelFlag;
  prompt: string;
};

async function runAgentLoop(
  client: OpenAI,
  model: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  signal?: AbortSignal,
): Promise<string> {
  while (true) {
    const response = await client.chat.completions.create({
      model,
      messages,
      tools,
    }, { signal });

    if (!response.choices || response.choices.length === 0) {
      throw new Error("no choices in response");
    }

    const message = response.choices[0].message;
    messages.push(message);

    const toolCalls = message.tool_calls;

    if (toolCalls && toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        const functionName =
          toolCall.type === "function" ? toolCall.function.name : "unknown";
        const args = JSON.parse(
          toolCall.type === "function" ? toolCall.function.arguments : "{}",
        );

        if (functionName === "Read_File") {
          const filePath = args.file_path;
          try {
            const content = await Bun.file(filePath).text();
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: content || "(empty file)",
            });
          } catch (e: any) {
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: `Error reading file: ${e.message}`,
            });
          }
        } else if (functionName === "Write_File") {
          const filePath = args.file_path;
          const content = args.content;
          await Bun.write(filePath, content);
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: "File written successfully.",
          });
        } else if (functionName === "Bash") {
          const command = args.command;
          try {
            const output = execSync(command, { encoding: "utf-8" });
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content:
                output || "Command executed successfully with no output.",
            });
          } catch (e: any) {
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: `Error: ${e.message}\n${e.stdout || ""}\n${e.stderr || ""}`,
            });
          }
        } else if (functionName === "Get_Current_Directory") {
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: process.cwd(),
          });
        } else if (functionName === "Web_Search" || functionName === "web_search") {
          const query = args.query;
          const depth = args.depth;
          try {
            const webSearchResults = await webSerch(query, depth);
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(webSearchResults),
            });
          } catch (e: any) {
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: `Error searching web: ${e.message}`,
            });
          }
        } else if (functionName === "Get_Current_Datetime" || functionName === "get_current_datetime") {
          try {
            const currentDatetime = await getCurrentDatetime();
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(currentDatetime),
            });
          } catch (e: any) {
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: `Error getting current datetime: ${e.message}`,
            });
          }
        } else if (functionName === "Browse_Url" || functionName === "browse_url") {
          const url = args.url;
          try {
            const content = await browseUrl(url);
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(content),
            });
          } catch (e: any) {
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: `Error browsing URL: ${e.message}`,
            });
          }
        } else if (functionName === "Browser_Action" || functionName === "browser_action") {
          const action = args.action;
          const url = args.url;
          const selector = args.selector;
          const text = args.text;
          try {
            const content = await browserAction(action, url, selector, text);
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(content),
            });
          } catch (e: any) {
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: `Error performing browser action: ${e.message}`,
            });
          }
        } else if (functionName === "Git_Action" || functionName === "git_action") {
          const { directory, ...gitParams } = args;
          try {
            const content = gitTool(gitParams as GitAction, directory);
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(content),
            });
          } catch (error: any) {
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: `Error performing git action: ${error.message || "Unknown error"}`,
            });
          }
        } else if (mcpToolsNames.has(functionName)) {
          try {
            const result = await callMcpTool(functionName, args);

            const blocks = Array.isArray(result.content) ? result.content : []

            const content = blocks.map((block) => block.type === "text" ? block.text : JSON.stringify(block),).join("\n") ?? JSON.stringify(result.content);
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: content,
            });
          } catch (error: any) {
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: `Error calling MCP tool: ${error.message || "Unknown error"}`,
            });

          }
        }
        else {
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: `Unknown function: ${functionName}`,
          });
        }
      }
    } else if (message.content) {
      return message.content;
    }
  }
}

function createClient(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const baseURL =
    process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set.");
  }

  return new OpenAI({ apiKey, baseURL });
}

export async function runAgent({ modelFlag, prompt }: RunAgentOptions): Promise<string> {
  const systemPromptText = systemPrompt;
  // Verify it loaded
  console.log("System prompt length:", systemPromptText.length);
  console.log("First 200 chars:", systemPromptText.slice(0, 200));
  if (!systemPromptText || systemPromptText.trim().length === 0) {
    throw new Error("System prompt is empty — aborting agent start.");
  }

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPromptText },
    { role: "user", content: prompt },
  ];
  return runAgentLoop(createClient(), selectModel(modelFlag)!, messages);
}

export class AgentSession {
  private readonly client: OpenAI;
  private readonly messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  private modelFlag: ModelFlag;
  private abortController: AbortController | null = null;

  constructor(modelFlag: ModelFlag) {
    this.client = createClient();
    this.modelFlag = modelFlag;

    if (!systemPrompt.trim()) {
      throw new Error("System prompt is empty — aborting agent start.");
    }
    this.messages.push({ role: "system", content: systemPrompt });
  }

  setModel(modelFlag: ModelFlag) {
    this.modelFlag = modelFlag;
  }

  abort() {
    this.abortController?.abort();
    this.abortController = null;
  }

  async send(prompt: string): Promise<string> {
    this.abortController = new AbortController();
    this.messages.push({ role: "user", content: prompt });
    return await runAgentLoop(this.client, selectModel(this.modelFlag)!, this.messages, this.abortController.signal);
  }
}
