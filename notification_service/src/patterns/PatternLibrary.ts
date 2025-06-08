import { PatternWithMetadata, WAVEFORMS } from "../types";

export class PatternLibrary {
  private patterns: Map<string, PatternWithMetadata> = new Map();

  constructor() {
    this.loadInitialPatterns();
  }

  getPattern(id: string): PatternWithMetadata | undefined {
    return this.patterns.get(id);
  }

  getAllPatterns(): PatternWithMetadata[] {
    return Array.from(this.patterns.values());
  }

  addPattern(pattern: PatternWithMetadata): void {
    this.patterns.set(pattern.id, pattern);
  }

  updatePattern(id: string, pattern: PatternWithMetadata): boolean {
    if (!this.patterns.has(id)) {
      return false;
    }
    this.patterns.set(id, pattern);
    return true;
  }

  deletePattern(id: string): boolean {
    return this.patterns.delete(id);
  }

  incrementUsage(id: string): void {
    const pattern = this.patterns.get(id);
    if (pattern) {
      pattern.metadata.usage_count++;
    }
  }

  searchPatterns(tags: string[]): PatternWithMetadata[] {
    return Array.from(this.patterns.values()).filter((pattern) =>
      tags.some((tag) => pattern.metadata.tags.includes(tag)),
    );
  }

  getFallbackPattern(): string {
    return "default_notification_v1";
  }

  private loadInitialPatterns(): void {
    const patterns: PatternWithMetadata[] = [
      {
        id: "gentle_success_v1",
        animation: {
          durationMs: 3000,
          frames: [
            { timeMs: 0, leds: Array(20).fill({ r: 0, g: 0, b: 0 }) },
            { timeMs: 1500, leds: Array(20).fill({ r: 0, g: 255, b: 100 }) },
            { timeMs: 3000, leds: Array(20).fill({ r: 0, g: 64, b: 0 }) },
          ],
          audioNotes: [
            {
              startMs: 0,
              durationMs: 200,
              frequencyHz: 523,
              voice: 0,
              waveform: WAVEFORMS.SQUARE,
            },
            {
              startMs: 200,
              durationMs: 300,
              frequencyHz: 659,
              voice: 0,
              waveform: WAVEFORMS.SQUARE,
            },
          ],
        },
        metadata: {
          description: "Soft green fade with pleasant ascending chimes",
          tags: ["success", "gentle", "celebration", "green", "calm"],
          typical_use: "test passes, build success, minor achievements",
          intensity: "low",
          mood: "quietly celebratory",
          usage_count: 0,
          created_at: "2025-06-06T10:00:00Z",
        },
      },
      {
        id: "urgent_alert_v1",
        animation: {
          durationMs: 2000,
          frames: [
            { timeMs: 0, leds: Array(20).fill({ r: 255, g: 0, b: 0 }) },
            { timeMs: 500, leds: Array(20).fill({ r: 0, g: 0, b: 0 }) },
            { timeMs: 1000, leds: Array(20).fill({ r: 255, g: 0, b: 0 }) },
            { timeMs: 1500, leds: Array(20).fill({ r: 0, g: 0, b: 0 }) },
            { timeMs: 2000, leds: Array(20).fill({ r: 255, g: 0, b: 0 }) },
          ],
          audioNotes: [
            {
              startMs: 0,
              durationMs: 200,
              frequencyHz: 880,
              voice: 0,
              waveform: WAVEFORMS.SQUARE,
            },
            {
              startMs: 1000,
              durationMs: 200,
              frequencyHz: 880,
              voice: 0,
              waveform: WAVEFORMS.SQUARE,
            },
          ],
        },
        metadata: {
          description: "Bright red flashing with urgent beeps",
          tags: ["error", "urgent", "alert", "red", "critical"],
          typical_use: "build failures, critical errors, security alerts",
          intensity: "high",
          mood: "urgent alarm",
          usage_count: 0,
          created_at: "2025-06-06T10:05:00Z",
        },
      },
      {
        id: "celebration_milestone_v1",
        animation: {
          
          durationMs: 5000,
          
          frames: [
            { timeMs: 0, leds: Array(20).fill({ r: 255, g: 255, b: 0 }) },
            { timeMs: 1000, leds: Array(20).fill({ r: 255, g: 0, b: 255 }) },
            { timeMs: 2000, leds: Array(20).fill({ r: 0, g: 255, b: 255 }) },
            { timeMs: 3000, leds: Array(20).fill({ r: 255, g: 165, b: 0 }) },
            { timeMs: 4000, leds: Array(20).fill({ r: 255, g: 255, b: 255 }) },
            { timeMs: 5000, leds: Array(20).fill({ r: 0, g: 255, b: 0 }) },
          ],
          audioNotes: [
            {
              startMs: 0,
              durationMs: 500,
              frequencyHz: 523,
              voice: 0,
              waveform: WAVEFORMS.SQUARE,
            },
            {
              startMs: 500,
              durationMs: 500,
              frequencyHz: 659,
              voice: 0,
              waveform: WAVEFORMS.SQUARE,
            },
            {
              startMs: 1000,
              durationMs: 500,
              frequencyHz: 784,
              voice: 0,
              waveform: WAVEFORMS.SQUARE,
            },
            {
              startMs: 1500,
              durationMs: 1000,
              frequencyHz: 1047,
              voice: 0,
              waveform: WAVEFORMS.SQUARE,
            },
          ],
        },
        metadata: {
          description: "Rainbow colors with ascending victory melody",
          tags: [
            "celebration",
            "milestone",
            "achievement",
            "rainbow",
            "victory",
          ],
          typical_use:
            "major releases, project completion, significant achievements",
          intensity: "high",
          mood: "triumphant celebration",
          usage_count: 0,
          created_at: "2025-06-06T10:10:00Z",
        },
      },
      {
        id: "default_notification_v1",
        animation: {
          
          durationMs: 1000,
          
          frames: [
            { timeMs: 0, leds: Array(20).fill({ r: 0, g: 0, b: 255 }) },
            { timeMs: 500, leds: Array(20).fill({ r: 0, g: 0, b: 128 }) },
            { timeMs: 1000, leds: Array(20).fill({ r: 0, g: 0, b: 0 }) },
          ],
          audioNotes: [
            {
              startMs: 0,
              durationMs: 300,
              frequencyHz: 440,
              voice: 0,
              waveform: WAVEFORMS.SQUARE,
            },
          ],
        },
        metadata: {
          description: "Simple blue fade with single tone",
          tags: ["default", "neutral", "blue", "simple"],
          typical_use: "fallback notification when specific pattern not found",
          intensity: "medium",
          mood: "neutral",
          usage_count: 0,
          created_at: "2025-06-06T10:15:00Z",
        },
      },
      {
        id: "warning_attention_v1",
        animation: {
          
          durationMs: 2500,
          
          frames: [
            { timeMs: 0, leds: Array(20).fill({ r: 255, g: 165, b: 0 }) },
            { timeMs: 1000, leds: Array(20).fill({ r: 255, g: 255, b: 0 }) },
            { timeMs: 2000, leds: Array(20).fill({ r: 255, g: 165, b: 0 }) },
            { timeMs: 2500, leds: Array(20).fill({ r: 200, g: 100, b: 0 }) },
          ],
          audioNotes: [
            {
              startMs: 0,
              durationMs: 400,
              frequencyHz: 698,
              voice: 0,
              waveform: WAVEFORMS.SQUARE,
            },
            {
              startMs: 1000,
              durationMs: 400,
              frequencyHz: 740,
              voice: 0,
              waveform: WAVEFORMS.SQUARE,
            },
          ],
        },
        metadata: {
          description: "Orange warning glow with attention tones",
          tags: ["warning", "attention", "orange", "caution"],
          typical_use: "warnings, deprecation notices, important updates",
          intensity: "medium",
          mood: "cautionary",
          usage_count: 0,
          created_at: "2025-06-06T10:20:00Z",
        },
      },
      {
        id: "info_subtle_v1",
        animation: {
          
          durationMs: 1500,
          
          frames: [
            { timeMs: 0, leds: Array(20).fill({ r: 0, g: 100, b: 200 }) },
            { timeMs: 750, leds: Array(20).fill({ r: 0, g: 150, b: 255 }) },
            { timeMs: 1500, leds: Array(20).fill({ r: 0, g: 50, b: 100 }) },
          ],
          audioNotes: [
            {
              startMs: 0,
              durationMs: 200,
              frequencyHz: 349,
              voice: 0,
              waveform: WAVEFORMS.SQUARE,
            },
          ],
        },
        metadata: {
          description: "Gentle blue pulse with soft chime",
          tags: ["info", "subtle", "blue", "notification"],
          typical_use:
            "information messages, status updates, general notifications",
          intensity: "low",
          mood: "informative",
          usage_count: 0,
          created_at: "2025-06-06T10:25:00Z",
        },
      },
      {
        id: "progress_building_v1",
        animation: {
          
          durationMs: 4000,
          
          frames: [
            { timeMs: 0, leds: Array(20).fill({ r: 100, g: 0, b: 100 }) },
            { timeMs: 1000, leds: Array(20).fill({ r: 150, g: 0, b: 150 }) },
            { timeMs: 2000, leds: Array(20).fill({ r: 200, g: 0, b: 200 }) },
            { timeMs: 3000, leds: Array(20).fill({ r: 255, g: 0, b: 255 }) },
            { timeMs: 4000, leds: Array(20).fill({ r: 150, g: 0, b: 150 }) },
          ],
          audioNotes: [
            {
              startMs: 0,
              durationMs: 100,
              frequencyHz: 293,
              voice: 0,
              waveform: WAVEFORMS.SQUARE,
            },
            {
              startMs: 1000,
              durationMs: 100,
              frequencyHz: 330,
              voice: 0,
              waveform: WAVEFORMS.SQUARE,
            },
            {
              startMs: 2000,
              durationMs: 100,
              frequencyHz: 370,
              voice: 0,
              waveform: WAVEFORMS.SQUARE,
            },
            {
              startMs: 3000,
              durationMs: 100,
              frequencyHz: 392,
              voice: 0,
              waveform: WAVEFORMS.SQUARE,
            },
          ],
        },
        metadata: {
          description: "Purple gradient build-up with ascending tones",
          tags: ["progress", "building", "purple", "gradual"],
          typical_use: "compilation progress, build processes, loading states",
          intensity: "medium",
          mood: "progressive",
          usage_count: 0,
          created_at: "2025-06-06T10:30:00Z",
        },
      },
      {
        id: "calm_waiting_v1",
        animation: {
          
          durationMs: 6000,
          
          frames: [
            { timeMs: 0, leds: Array(20).fill({ r: 0, g: 255, b: 255 }) },
            { timeMs: 2000, leds: Array(20).fill({ r: 0, g: 200, b: 200 }) },
            { timeMs: 4000, leds: Array(20).fill({ r: 0, g: 255, b: 255 }) },
            { timeMs: 6000, leds: Array(20).fill({ r: 0, g: 150, b: 150 }) },
          ],
          audioNotes: [],
        },
        metadata: {
          description: "Gentle cyan breathing pattern, no audio",
          tags: ["waiting", "calm", "cyan", "breathing", "silent"],
          typical_use:
            "long-running processes, waiting states, background tasks",
          intensity: "low",
          mood: "patient",
          usage_count: 0,
          created_at: "2025-06-06T10:35:00Z",
        },
      },
      {
        id: "error_prominent_v1",
        animation: {
          
          durationMs: 1800,
          
          frames: [
            { timeMs: 0, leds: Array(20).fill({ r: 255, g: 50, b: 50 }) },
            { timeMs: 600, leds: Array(20).fill({ r: 200, g: 0, b: 0 }) },
            { timeMs: 1200, leds: Array(20).fill({ r: 255, g: 50, b: 50 }) },
            { timeMs: 1800, leds: Array(20).fill({ r: 150, g: 0, b: 0 }) },
          ],
          audioNotes: [
            {
              startMs: 0,
              durationMs: 300,
              frequencyHz: 220,
              voice: 0,
              waveform: WAVEFORMS.SQUARE,
            },
            {
              startMs: 0,
              durationMs: 300,
              frequencyHz: 233,
              voice: 1,
              waveform: WAVEFORMS.SQUARE,
            },
          ],
        },
        metadata: {
          description: "Red error flash with dissonant low tones",
          tags: ["error", "prominent", "red", "failure"],
          typical_use: "test failures, compilation errors, general errors",
          intensity: "high",
          mood: "alert",
          usage_count: 0,
          created_at: "2025-06-06T10:40:00Z",
        },
      },
      {
        id: "success_dramatic_v1",
        animation: {
          
          durationMs: 3500,
          
          frames: [
            { timeMs: 0, leds: Array(20).fill({ r: 0, g: 0, b: 0 }) },
            { timeMs: 500, leds: Array(20).fill({ r: 0, g: 255, b: 0 }) },
            { timeMs: 1500, leds: Array(20).fill({ r: 255, g: 255, b: 255 }) },
            { timeMs: 2500, leds: Array(20).fill({ r: 0, g: 255, b: 0 }) },
            { timeMs: 3500, leds: Array(20).fill({ r: 0, g: 150, b: 0 }) },
          ],
          audioNotes: [
            {
              startMs: 500,
              durationMs: 200,
              frequencyHz: 523,
              voice: 0,
              waveform: WAVEFORMS.SQUARE,
            },
            {
              startMs: 700,
              durationMs: 200,
              frequencyHz: 659,
              voice: 0,
              waveform: WAVEFORMS.SQUARE,
            },
            {
              startMs: 900,
              durationMs: 200,
              frequencyHz: 784,
              voice: 0,
              waveform: WAVEFORMS.SQUARE,
            },
            {
              startMs: 1100,
              durationMs: 400,
              frequencyHz: 1047,
              voice: 0,
              waveform: WAVEFORMS.SQUARE,
            },
          ],
        },
        metadata: {
          description: "Dramatic green flash with ascending victory fanfare",
          tags: ["success", "dramatic", "green", "fanfare", "victory"],
          typical_use:
            "major test suite passes, successful deployments, big wins",
          intensity: "high",
          mood: "triumphant",
          usage_count: 0,
          created_at: "2025-06-06T10:45:00Z",
        },
      },
    ];

    patterns.forEach((pattern) => this.addPattern(pattern));
  }
}

