import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import type { PatternSelection } from "./types.js";
import type { PatternLibrary } from "../patterns/PatternLibrary.js";

const execAsync = promisify(exec);

const patternCache = new Map<string, PatternSelection>();
let cachedPatterns: any[] | null = null;

export async function selectPattern(text: string): Promise<PatternSelection> {
  if (patternCache.has(text)) {
    return patternCache.get(text)!;
  }

  if (!cachedPatterns) {
    try {
      const response = await fetch(`${process.env.TEAM2_URL}/api/patterns`);
      cachedPatterns = await response.json() as any[];
    } catch (error) {
      console.warn("Failed to fetch patterns from Team 2, using fallback");
      cachedPatterns = [];
    }
  }

  try {
    const prompt = `Select the best LED pattern for this context: "${text}"

Available patterns:
${cachedPatterns!.map(p => `- ${p.metadata.id}: ${p.metadata.description}`).join("\n")}

Respond with just the pattern_id.`;

    const tempFile = `/tmp/pattern-prompt-${Date.now()}.txt`;
    await fs.writeFile(tempFile, prompt);

    const { stdout } = await execAsync(`claude-code -p "${tempFile}"`);
    const patternId = stdout.trim();

    await fs.unlink(tempFile);

    const result: PatternSelection = {
      pattern_id: patternId,
      confidence: 0.8,
      reasoning: "Claude CLI selection"
    };

    patternCache.set(text, result);
    setTimeout(() => patternCache.delete(text), 5 * 60 * 1000);

    return result;
  } catch (error) {
    console.warn("Claude selection failed, using fallback:", error);
    const fallbackResult: PatternSelection = {
      pattern_id: text.toLowerCase().includes("error") || text.toLowerCase().includes("fail") ? "error_pulse" : "success_gentle",
      confidence: 0.5,
      reasoning: "Fallback selection due to Claude CLI failure"
    };
    
    return fallbackResult;
  }
}

export async function selectPatternLocal(text: string, patternLibrary: PatternLibrary): Promise<PatternSelection> {
  if (patternCache.has(text)) {
    return patternCache.get(text)!;
  }

  const patterns = patternLibrary.getAllPatterns();

  try {
    const prompt = `Select the best LED pattern for this context: "${text}"

Available patterns:
${patterns.map(p => `- ${p.metadata.id}: ${p.metadata.description}`).join("\n")}

Respond with just the pattern_id.`;

    const tempFile = `/tmp/pattern-prompt-${Date.now()}.txt`;
    await fs.writeFile(tempFile, prompt);

    const { stdout } = await execAsync(`claude-code -p "${tempFile}"`);
    const patternId = stdout.trim();

    await fs.unlink(tempFile);

    const result: PatternSelection = {
      pattern_id: patternId,
      confidence: 0.8,
      reasoning: "Claude CLI selection"
    };

    patternCache.set(text, result);
    setTimeout(() => patternCache.delete(text), 5 * 60 * 1000);

    return result;
  } catch (error) {
    console.warn("Claude selection failed, using fallback:", error);
    const fallbackResult: PatternSelection = {
      pattern_id: text.toLowerCase().includes("error") || text.toLowerCase().includes("fail") ? "error_prominent_v1" : "gentle_success_v3",
      confidence: 0.5,
      reasoning: "Fallback selection due to Claude CLI failure"
    };
    
    return fallbackResult;
  }
}