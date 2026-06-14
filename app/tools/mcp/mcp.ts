import { Client } from "@modelcontextprotocol/sdk/client";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { stat } from "node:fs/promises";

type McpServerConfig = {
    command: string;
    args?: string[];
    env?: Record<string, string>;
    cwd?: string;
};

type McpConfig = {
    mcpServers?: Record<string, McpServerConfig>;
};

export type McpRegistry = {
    tools: Tool[];
    toolNames: Set<string>;
    callTool: (name: string, args: Record<string, unknown>) => ReturnType<Client["callTool"]>;
};

let mcpRegistry: McpRegistry | null = null;

function resolveConfigValue(value: string): string {
    return value.replace(/\$\{workspace\}/g, process.cwd());
}

function resolveServerConfig(config: McpServerConfig): McpServerConfig {
    return {
        ...config,
        args: config.args?.map(resolveConfigValue),
        env: config.env
            ? Object.fromEntries(
                Object.entries(config.env).map(([key, val]) => [key, resolveConfigValue(val)]),
            )
            : undefined,
        cwd: config.cwd ? resolveConfigValue(config.cwd) : undefined,
    };
}

function isPathArg(arg: string): boolean {
    return !arg.startsWith("-") && !/^@[\w-]+\/[\w@/.-]+$/.test(arg);
}

async function validateServerPaths(serverName: string, config: McpServerConfig): Promise<boolean> {
    const paths = [
        ...(config.cwd ? [config.cwd] : []),
        ...(config.args?.filter(isPathArg) ?? []),
    ];

    for (const dir of paths) {
        try {
            const info = await stat(dir);
            if (!info.isDirectory()) {
                console.error(`MCP server "${serverName}": not a directory: ${dir}`);
                return false;
            }
        } catch {
            console.error(`MCP server "${serverName}": directory does not exist: ${dir}`);
            return false;
        }
    }

    return true;
}

function resolveServerCommand(config: McpServerConfig): { command: string; args: string[] } {
    const args = config.args ?? [];

    if (process.platform === "win32" && config.command === "npx") {
        // npx shims in PATH are unreliable when spawned from Bun on Windows.
        const packageArgs = args[0] === "-y" ? args.slice(1) : args;
        return {
            command: "npm.cmd",
            args: ["exec", "--yes", "--", ...packageArgs],
        };
    }

    return { command: config.command, args };
}

function createTransport(config: McpServerConfig) {
    const { command, args } = resolveServerCommand(config);

    return new StdioClientTransport({
        command,
        args,
        env: config.env,
        cwd: config.cwd,
    });
}

async function loadMcpConfig(): Promise<McpConfig> {
    const configPath = `${import.meta.dir}/mcp.json`;
    const file = Bun.file(configPath);

    if (!(await file.exists())) {
        return { mcpServers: {} };
    }

    return await file.json() as McpConfig;
}

export async function initMcp(): Promise<McpRegistry> {
    if (mcpRegistry) return mcpRegistry;

    const config = await loadMcpConfig();
    const servers = config.mcpServers ?? {};
    const tools: Tool[] = [];
    const toolNames = new Set<string>();
    const toolToClient = new Map<string, Client>();

    for (const [serverName, serverConfig] of Object.entries(servers)) {
        const resolvedConfig = resolveServerConfig(serverConfig);

        if (!(await validateServerPaths(serverName, resolvedConfig))) {
            continue;
        }

        const transport = createTransport(resolvedConfig);
        const client = new Client(
            { name: `mcp-${serverName}`, version: "1.0.0" },
            { capabilities: {} },
        );

        try {
            await client.connect(transport);
        } catch (error) {
            console.error(`Failed to connect MCP server "${serverName}":`, error);
            continue;
        }

        const { tools: serverTools } = await client.listTools();
        console.log(`MCP server "${serverName}" tools:`, serverTools.map((tool) => tool.name));

        for (const tool of serverTools) {
            if (toolToClient.has(tool.name)) {
                console.warn(
                    `MCP tool "${tool.name}" from server "${serverName}" overrides an earlier definition`,
                );
            }

            toolToClient.set(tool.name, client);
            toolNames.add(tool.name);
            tools.push(tool);
        }
    }

    mcpRegistry = {
        tools,
        toolNames,
        callTool: (name, args) => {
            const client = toolToClient.get(name);
            if (!client) {
                throw new Error(`Unknown MCP tool: ${name}`);
            }

            return client.callTool({ name, arguments: args });
        },
    };

    return mcpRegistry;
}
