import { encodeAnimation, validateEncodedData } from '../src/encoder/mockEncoder';
import { Animation } from '../src/types';

describe('mockEncoder', () => {
  const sampleAnimation: Animation = {
    name: 'test_animation',
    duration_ms: 1000,
    fps: 20,
    frames: [
      { time_ms: 0, leds: Array(20).fill([255, 0, 0]) },
      { time_ms: 500, leds: Array(20).fill([0, 255, 0]) },
      { time_ms: 1000, leds: Array(20).fill([0, 0, 255]) }
    ],
    audio: [
      { start_ms: 0, duration_ms: 200, frequency: 440, voice: 0, waveform: 'square' },
      { start_ms: 500, duration_ms: 300, frequency: 880, voice: 1, waveform: 'triangle' }
    ]
  };

  test('should encode animation to binary data', () => {
    const encoded = encodeAnimation(sampleAnimation);
    
    expect(encoded).toBeInstanceOf(Uint8Array);
    expect(encoded.length).toBeGreaterThan(0);
    expect(encoded.length).toBeLessThan(1000);
  });

  test('should validate correctly encoded data', () => {
    const encoded = encodeAnimation(sampleAnimation);
    const isValid = validateEncodedData(encoded);
    
    expect(isValid).toBe(true);
  });

  test('should reject invalid data', () => {
    const invalidData = new Uint8Array([1, 2, 3, 4]);
    const isValid = validateEncodedData(invalidData);
    
    expect(isValid).toBe(false);
  });

  test('should handle animation with no audio', () => {
    const animationNoAudio: Animation = {
      ...sampleAnimation,
      audio: []
    };

    const encoded = encodeAnimation(animationNoAudio);
    const isValid = validateEncodedData(encoded);
    
    expect(isValid).toBe(true);
    expect(encoded.length).toBeGreaterThan(0);
  });

  test('should handle animation with single frame', () => {
    const singleFrameAnimation: Animation = {
      ...sampleAnimation,
      duration_ms: 100,
      frames: [{ time_ms: 0, leds: Array(20).fill([255, 255, 255]) }]
    };

    const encoded = encodeAnimation(singleFrameAnimation);
    const isValid = validateEncodedData(encoded);
    
    expect(isValid).toBe(true);
  });

  test('should encode different waveforms correctly', () => {
    const waveformTypes: Array<'square' | 'triangle' | 'sawtooth' | 'noise'> = 
      ['square', 'triangle', 'sawtooth', 'noise'];

    waveformTypes.forEach(waveform => {
      const animation: Animation = {
        ...sampleAnimation,
        audio: [{ start_ms: 0, duration_ms: 100, frequency: 440, voice: 0, waveform }]
      };

      const encoded = encodeAnimation(animation);
      const isValid = validateEncodedData(encoded);
      
      expect(isValid).toBe(true);
    });
  });

  test('should handle large animations efficiently', () => {
    const largeAnimation: Animation = {
      name: 'large_test',
      duration_ms: 5000,
      fps: 20,
      frames: Array.from({ length: 100 }, (_, i) => ({
        time_ms: i * 50,
        leds: Array(20).fill([Math.floor(Math.random() * 255), Math.floor(Math.random() * 255), Math.floor(Math.random() * 255)])
      })),
      audio: Array.from({ length: 20 }, (_, i) => ({
        start_ms: i * 250,
        duration_ms: 200,
        frequency: 440 + i * 50,
        voice: i % 2 as 0 | 1,
        waveform: 'square' as const
      }))
    };

    const startTime = Date.now();
    const encoded = encodeAnimation(largeAnimation);
    const endTime = Date.now();

    expect(encoded).toBeInstanceOf(Uint8Array);
    expect(endTime - startTime).toBeLessThan(100);
    expect(validateEncodedData(encoded)).toBe(true);
  });
});