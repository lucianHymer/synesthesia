export interface Animation {
  name: string;
  duration_ms: number;
  fps: 20;
  frames: Frame[];
  audio: AudioNote[];
}

export interface Frame {
  time_ms: number;
  leds: [number, number, number][];
}

export interface AudioNote {
  start_ms: number;
  duration_ms: number;
  frequency: number;
  voice: 0 | 1;
  waveform: "square" | "triangle" | "sawtooth" | "noise";
}

export interface PatternMetadata {
  description: string;
  tags: string[];
  typical_use: string;
  intensity: "low" | "medium" | "high";
  mood: string;
  usage_count: number;
  created_at: string;
}

export interface PatternWithMetadata {
  id: string;
  animation: Animation;
  metadata: PatternMetadata;
}

export interface NotificationRequest {
  pattern_id: string;
}

export interface NotificationResponse {
  status: "success" | "error";
  started_at?: string;
  pattern_used?: string;
  error?: "device_offline" | "pattern_not_found" | "encoding_error";
}

export interface PlayCommand {
  type: "play";
  data: string;
}

export interface PlayResponse {
  status: "playing" | "error";
  error?: "invalid_data" | "out_of_memory" | "decompression_failed";
  started_at?: string;
}