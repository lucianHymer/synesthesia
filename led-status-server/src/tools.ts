import { collectContext } from "./context.js";
import { selectPattern } from "./patterns.js";
import type { UpdateStatusArgs, NotificationResponse } from "./types.js";

export const updateStatusTool = {
  name: "update_status",
  description: "Report a development event for visual LED notification",
  inputSchema: {
    type: "object",
    properties: {
      message: { 
        type: "string",
        description: "Natural language description of what happened"
      },
      urgency: { 
        type: "string", 
        enum: ["low", "normal", "high", "urgent"],
        description: "Urgency level of the notification",
        default: "normal"
      }
    },
    required: ["message"]
  }
};

export async function handleUpdateStatus(args: UpdateStatusArgs) {
  try {
    const { message, urgency = "normal" } = args;
    
    const context = await collectContext();
    
    const text = `${message}. Working on ${context.project}, branch ${context.branch}. Time: ${context.time}. ${urgency} urgency.`;
    
    const selection = await selectPattern(text);
    
    const response = await fetch(`${process.env.TEAM2_URL}/api/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        text,
        pattern_id: selection.pattern_id
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result: NotificationResponse = await response.json();
    
    return {
      content: [{
        type: "text",
        text: `✅ LED notification sent: ${result.pattern_used || selection.pattern_id} (confidence: ${Math.round(selection.confidence * 100)}%)`
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: "text", 
        text: `❌ LED notification failed: ${error.message}`
      }]
    };
  }
}