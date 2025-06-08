import { PatternWithMetadata } from "../types";

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
    this.patterns.set(pattern.metadata.id, pattern);
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
        animation: {
          name: "gentle_success_v1",
          duration_ms: 3000,
          fps: 20,
          frames: [
            { time_ms: 0, leds: Array(20).fill([0, 0, 0]) },
            { time_ms: 1500, leds: Array(20).fill([0, 255, 100]) },
            { time_ms: 3000, leds: Array(20).fill([0, 64, 0]) },
          ],
          audio: [
            {
              start_ms: 0,
              duration_ms: 200,
              frequency: 523,
              voice: 0,
              waveform: "square",
            },
            {
              start_ms: 200,
              duration_ms: 300,
              frequency: 659,
              voice: 0,
              waveform: "square",
            },
          ],
        },
        metadata: {
          id: "gentle_success_v1",
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
        animation: {
          name: "urgent_alert_v1",
          duration_ms: 2000,
          fps: 20,
          frames: [
            { time_ms: 0, leds: Array(20).fill([255, 0, 0]) },
            { time_ms: 500, leds: Array(20).fill([0, 0, 0]) },
            { time_ms: 1000, leds: Array(20).fill([255, 0, 0]) },
            { time_ms: 1500, leds: Array(20).fill([0, 0, 0]) },
            { time_ms: 2000, leds: Array(20).fill([255, 0, 0]) },
          ],
          audio: [
            {
              start_ms: 0,
              duration_ms: 200,
              frequency: 880,
              voice: 0,
              waveform: "square",
            },
            {
              start_ms: 1000,
              duration_ms: 200,
              frequency: 880,
              voice: 0,
              waveform: "square",
            },
          ],
        },
        metadata: {
          id: "urgent_alert_v1",
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
        animation: {
          name: "celebration_milestone_v1",
          duration_ms: 5000,
          fps: 20,
          frames: [
            { time_ms: 0, leds: Array(20).fill([255, 255, 0]) },
            { time_ms: 1000, leds: Array(20).fill([255, 0, 255]) },
            { time_ms: 2000, leds: Array(20).fill([0, 255, 255]) },
            { time_ms: 3000, leds: Array(20).fill([255, 165, 0]) },
            { time_ms: 4000, leds: Array(20).fill([255, 255, 255]) },
            { time_ms: 5000, leds: Array(20).fill([0, 255, 0]) },
          ],
          audio: [
            {
              start_ms: 0,
              duration_ms: 500,
              frequency: 523,
              voice: 0,
              waveform: "square",
            },
            {
              start_ms: 500,
              duration_ms: 500,
              frequency: 659,
              voice: 0,
              waveform: "square",
            },
            {
              start_ms: 1000,
              duration_ms: 500,
              frequency: 784,
              voice: 0,
              waveform: "square",
            },
            {
              start_ms: 1500,
              duration_ms: 1000,
              frequency: 1047,
              voice: 0,
              waveform: "square",
            },
          ],
        },
        metadata: {
          id: "celebration_milestone_v1",
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
        animation: {
          name: "default_notification_v1",
          duration_ms: 1000,
          fps: 20,
          frames: [
            { time_ms: 0, leds: Array(20).fill([0, 0, 255]) },
            { time_ms: 500, leds: Array(20).fill([0, 0, 128]) },
            { time_ms: 1000, leds: Array(20).fill([0, 0, 0]) },
          ],
          audio: [
            {
              start_ms: 0,
              duration_ms: 300,
              frequency: 440,
              voice: 0,
              waveform: "square",
            },
          ],
        },
        metadata: {
          id: "default_notification_v1",
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
        animation: {
          name: "warning_attention_v1",
          duration_ms: 2500,
          fps: 20,
          frames: [
            { time_ms: 0, leds: Array(20).fill([255, 165, 0]) },
            { time_ms: 1000, leds: Array(20).fill([255, 255, 0]) },
            { time_ms: 2000, leds: Array(20).fill([255, 165, 0]) },
            { time_ms: 2500, leds: Array(20).fill([200, 100, 0]) },
          ],
          audio: [
            {
              start_ms: 0,
              duration_ms: 400,
              frequency: 698,
              voice: 0,
              waveform: "square",
            },
            {
              start_ms: 1000,
              duration_ms: 400,
              frequency: 740,
              voice: 0,
              waveform: "square",
            },
          ],
        },
        metadata: {
          id: "warning_attention_v1",
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
        animation: {
          name: "info_subtle_v1",
          duration_ms: 1500,
          fps: 20,
          frames: [
            { time_ms: 0, leds: Array(20).fill([0, 100, 200]) },
            { time_ms: 750, leds: Array(20).fill([0, 150, 255]) },
            { time_ms: 1500, leds: Array(20).fill([0, 50, 100]) },
          ],
          audio: [
            {
              start_ms: 0,
              duration_ms: 200,
              frequency: 349,
              voice: 0,
              waveform: "square",
            },
          ],
        },
        metadata: {
          id: "info_subtle_v1",
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
        animation: {
          name: "progress_building_v1",
          duration_ms: 4000,
          fps: 20,
          frames: [
            { time_ms: 0, leds: Array(20).fill([100, 0, 100]) },
            { time_ms: 1000, leds: Array(20).fill([150, 0, 150]) },
            { time_ms: 2000, leds: Array(20).fill([200, 0, 200]) },
            { time_ms: 3000, leds: Array(20).fill([255, 0, 255]) },
            { time_ms: 4000, leds: Array(20).fill([150, 0, 150]) },
          ],
          audio: [
            {
              start_ms: 0,
              duration_ms: 100,
              frequency: 293,
              voice: 0,
              waveform: "square",
            },
            {
              start_ms: 1000,
              duration_ms: 100,
              frequency: 330,
              voice: 0,
              waveform: "square",
            },
            {
              start_ms: 2000,
              duration_ms: 100,
              frequency: 370,
              voice: 0,
              waveform: "square",
            },
            {
              start_ms: 3000,
              duration_ms: 100,
              frequency: 392,
              voice: 0,
              waveform: "square",
            },
          ],
        },
        metadata: {
          id: "progress_building_v1",
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
        animation: {
          name: "calm_waiting_v1",
          duration_ms: 6000,
          fps: 20,
          frames: [
            { time_ms: 0, leds: Array(20).fill([0, 255, 255]) },
            { time_ms: 2000, leds: Array(20).fill([0, 200, 200]) },
            { time_ms: 4000, leds: Array(20).fill([0, 255, 255]) },
            { time_ms: 6000, leds: Array(20).fill([0, 150, 150]) },
          ],
          audio: [],
        },
        metadata: {
          id: "calm_waiting_v1",
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
        animation: {
          name: "error_prominent_v1",
          duration_ms: 1800,
          fps: 20,
          frames: [
            { time_ms: 0, leds: Array(20).fill([255, 50, 50]) },
            { time_ms: 600, leds: Array(20).fill([200, 0, 0]) },
            { time_ms: 1200, leds: Array(20).fill([255, 50, 50]) },
            { time_ms: 1800, leds: Array(20).fill([150, 0, 0]) },
          ],
          audio: [
            {
              start_ms: 0,
              duration_ms: 300,
              frequency: 220,
              voice: 0,
              waveform: "square",
            },
            {
              start_ms: 0,
              duration_ms: 300,
              frequency: 233,
              voice: 1,
              waveform: "square",
            },
          ],
        },
        metadata: {
          id: "error_prominent_v1",
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
        animation: {
          name: "success_dramatic_v1",
          duration_ms: 3500,
          fps: 20,
          frames: [
            { time_ms: 0, leds: Array(20).fill([0, 0, 0]) },
            { time_ms: 500, leds: Array(20).fill([0, 255, 0]) },
            { time_ms: 1500, leds: Array(20).fill([255, 255, 255]) },
            { time_ms: 2500, leds: Array(20).fill([0, 255, 0]) },
            { time_ms: 3500, leds: Array(20).fill([0, 150, 0]) },
          ],
          audio: [
            {
              start_ms: 500,
              duration_ms: 200,
              frequency: 523,
              voice: 0,
              waveform: "square",
            },
            {
              start_ms: 700,
              duration_ms: 200,
              frequency: 659,
              voice: 0,
              waveform: "square",
            },
            {
              start_ms: 900,
              duration_ms: 200,
              frequency: 784,
              voice: 0,
              waveform: "square",
            },
            {
              start_ms: 1100,
              duration_ms: 400,
              frequency: 1047,
              voice: 0,
              waveform: "square",
            },
          ],
        },
        metadata: {
          id: "success_dramatic_v1",
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

