import { spawnSync, type SpawnSyncOptions } from "child_process";
import { existsSync } from "fs";
import path from "path";
import process from "process";

export interface GitActionResult {
    success: boolean;
    output?: string;
    error?: string;
}

export type GitAction =
    | { action: "status" }
    | { action: "diff"; staged?: boolean }
    | { action: "log"; branch?: string; limit?: number }
    | { action: "branch"; name?: string }
    | { action: "checkout"; branch: string }
    | { action: "merge"; branch: string }
    | { action: "rebase"; branch: string }
    | { action: "reset"; branch?: string; mode?: "soft" | "mixed" | "hard" }
    | { action: "clean" }
    | { action: "stash"; pop?: boolean }
    | { action: "tag"; name?: string }
    | { action: "push"; branch?: string }
    | { action: "pull"; branch?: string }
    | { action: "add"; files?: string[] }
    | { action: "commit"; message: string };

function isGitRepo(repoPath: string): boolean {
    return existsSync(path.join(repoPath, ".git"));
}

function runGit(args: string[], cwd: string): GitActionResult {
    const opts: SpawnSyncOptions = { cwd, encoding: "utf-8" };

    const result = spawnSync("git", args, opts);
    const stdout = (result.stdout ?? "").toString().trim();
    const stderr = (result.stderr ?? "").toString().trim();

    if (result.status === 0) {
        return { success: true, output: stdout || stderr };
    }

    return {
        success: false,
        error: stderr || stdout || result.error?.message || "Unknown error",
    };
}

export function gitTool(params: GitAction, repoPath = process.cwd()): GitActionResult {
    if (!repoPath || !isGitRepo(repoPath)) {
        return {
            success: false,
            error: `Not a git repository: ${repoPath}`,
        };
    }

    switch (params.action) {
        case "status":
            return runGit(["status"], repoPath);
        case "diff":
            return runGit(params.staged ? ["diff", "--staged"] : ["diff"], repoPath);
        case "log": {
            const limit = String(params.limit ?? 20);
            return params.branch
                ? runGit(["log", "--oneline", `-n${limit}`, params.branch], repoPath)
                : runGit(["log", "--oneline", `-n${limit}`], repoPath);
        }
        case "branch":
            return params.name
                ? runGit(["branch", params.name], repoPath)
                : runGit(["branch"], repoPath);
        case "checkout":
            return runGit(["checkout", params.branch], repoPath);
        case "merge":
            return runGit(["merge", params.branch], repoPath);
        case "rebase":
            return runGit(["rebase", params.branch], repoPath);
        case "reset": {
            const args = ["reset"];
            if (params.mode) args.push(`--${params.mode}`);
            if (params.branch) args.push(params.branch);
            return runGit(args, repoPath);
        }
        case "clean":
            return runGit(["clean", "-fd"], repoPath);
        case "stash":
            return params.pop
                ? runGit(["stash", "pop"], repoPath)
                : runGit(["stash", "push", "-m", "agent stash"], repoPath);
        case "tag":
            return params.name
                ? runGit(["tag", params.name], repoPath)
                : runGit(["tag"], repoPath);
        case "push":
            return params.branch
                ? runGit(["push", "origin", params.branch], repoPath)
                : runGit(["push"], repoPath);
        case "pull":
            return params.branch
                ? runGit(["pull", "origin", params.branch], repoPath)
                : runGit(["pull"], repoPath);
        case "add":
            return params.files && params.files.length > 0
                ? runGit(["add", ...params.files], repoPath)
                : runGit(["add", "-A"], repoPath);
        case "commit":
            if (!params.message?.trim()) {
                return { success: false, error: "message is required for commit" };
            }
            return runGit(["commit", "-m", params.message], repoPath);
        default:
            return {
                success: false,
                error: `Unknown action: ${(params as { action?: string }).action}`,
            };
    }
}
