import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { collectContext } from '../src/context.js';
import { selectPattern } from '../src/patterns.js';
import { handleUpdateStatus } from '../src/tools.js';

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe("LED Status Server", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TEAM2_URL = 'http://localhost:3000';
  });

  it("should collect basic context", async () => {
    const context = await collectContext();
    
    expect(context).toHaveProperty('branch');
    expect(context).toHaveProperty('project');
    expect(context).toHaveProperty('time');
    expect(context).toHaveProperty('workingDir');
    expect(typeof context.time).toBe('number');
    expect(context.time).toBeGreaterThanOrEqual(0);
    expect(context.time).toBeLessThanOrEqual(23);
  });

  it("should handle update_status tool", async () => {
    // Mock the Team 2 API response
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "success",
        pattern_used: "test_pattern",
        started_at: new Date().toISOString()
      })
    } as Response);

    const result = await handleUpdateStatus({
      message: "Tests passed",
      urgency: "normal"
    });

    expect(result.content[0].text).toContain("LED notification sent");
    expect(result.content[0].text).toContain("test_pattern");
  });

  it("should handle API failures gracefully", async () => {
    // Mock API failure
    (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
      new Error("Connection refused")
    );

    const result = await handleUpdateStatus({
      message: "Tests failed"
    });

    expect(result.content[0].text).toContain("LED notification failed");
    expect(result.content[0].text).toContain("Connection refused");
  });

  it("should select fallback patterns when Claude CLI fails", async () => {
    // Mock patterns API
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    } as Response);

    const result = await selectPattern("Build failed with errors");
    
    expect(result.pattern_id).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.reasoning).toContain("Fallback");
  });
});