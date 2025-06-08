import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import type { Context } from "./types.js";

const execAsync = promisify(exec);

export async function collectContext(): Promise<Context> {
  const [branch, project] = await Promise.all([
    getBranch().catch(() => "unknown"),
    getProject().catch(() => "unknown-project")
  ]);

  return {
    branch,
    project,
    time: new Date().getHours(),
    workingDir: process.cwd()
  };
}

async function getBranch(): Promise<string> {
  const { stdout } = await execAsync("git rev-parse --abbrev-ref HEAD");
  return stdout.trim();
}

async function getProject(): Promise<string> {
  try {
    const pkg = await fs.readFile("package.json", "utf-8");
    return JSON.parse(pkg).name;
  } catch {
    return process.cwd().split("/").pop() || "unknown-project";
  }
}