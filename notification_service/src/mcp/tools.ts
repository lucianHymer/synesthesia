import { collectContext } from "./context.js";
import { selectPatternLocal } from "./patterns.js";
import type { UpdateStatusArgs, NotificationResponse } from "./types.js";
import type { NotificationService } from "../services/NotificationService.js";
import type { PatternLibrary } from "../patterns/PatternLibrary.js";

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

export function createUpdateStatusHandler(notificationService: NotificationService, patternLibrary: PatternLibrary) {
  return async function handleUpdateStatus(args: UpdateStatusArgs) {
    try {
      const { message, urgency = "normal" } = args;
      
      const context = await collectContext();
      
      const text = `${message}. Working on ${context.project}, branch ${context.branch}. Time: ${context.time}. ${urgency} urgency.`;
      
      const selection = await selectPatternLocal(text, patternLibrary);
      
      // Use local service instead of HTTP call
      const result = await notificationService.notify({ pattern_id: selection.pattern_id });
      
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
  };
}