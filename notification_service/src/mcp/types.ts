export interface Context {
  branch: string;
  project: string;
  time: number;
  workingDir: string;
}

export interface PatternSelection {
  pattern_id: string;
  confidence: number;
  reasoning: string;
}

export interface UpdateStatusArgs {
  message: string;
  urgency?: "low" | "normal" | "high" | "urgent";
}

export interface NotificationResponse {
  status: "success" | "error";
  started_at?: string;
  pattern_used?: string;
  error?: string;
}