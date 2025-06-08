// Waveform constants for better DX
export const WAVEFORMS = {
  SQUARE: 0,
  TRIANGLE: 1,
  SAWTOOTH: 2,
  NOISE: 3
} as const;

export type WaveformType = typeof WAVEFORMS[keyof typeof WAVEFORMS];

// RGB type for better readability
export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface Frame {
  timeMs: number;
  leds: RGB[];
}

export interface AudioNote {
  startMs: number;
  durationMs: number;
  frequencyHz: number;
  voice: 0 | 1;
  waveform: WaveformType;
}

export interface Animation {
  durationMs: number;
  frames: Frame[];
  audioNotes: AudioNote[];
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