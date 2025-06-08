import { encodeAnimation, validateEncodedData } from '../src/encoder/mockEncoder';
import { Animation, WAVEFORMS } from '../src/types';

describe('mockEncoder', () => {
  const sampleAnimation: Animation = {
    durationMs: 1000,
    frames: [
      { timeMs: 0, leds: Array(20).fill({ r: 255, g: 0, b: 0 }) },
      { timeMs: 500, leds: Array(20).fill({ r: 0, g: 255, b: 0 }) },
      { timeMs: 1000, leds: Array(20).fill({ r: 0, g: 0, b: 255 }) }
    ],
    audioNotes: [
      { startMs: 0, durationMs: 200, frequencyHz: 440, voice: 0, waveform: WAVEFORMS.SQUARE },
      { startMs: 500, durationMs: 300, frequencyHz: 880, voice: 1, waveform: WAVEFORMS.TRIANGLE }
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
      audioNotes: []
    };

    const encoded = encodeAnimation(animationNoAudio);
    const isValid = validateEncodedData(encoded);
    
    expect(isValid).toBe(true);
    expect(encoded.length).toBeGreaterThan(0);
  });

  test('should handle animation with single frame', () => {
    const singleFrameAnimation: Animation = {
      ...sampleAnimation,
      durationMs: 100,
      frames: [{ timeMs: 0, leds: Array(20).fill({ r: 255, g: 255, b: 255 }) }]
    };

    const encoded = encodeAnimation(singleFrameAnimation);
    const isValid = validateEncodedData(encoded);
    
    expect(isValid).toBe(true);
  });

  test('should encode different waveforms correctly', () => {
    const waveformTypes = [WAVEFORMS.SQUARE, WAVEFORMS.TRIANGLE, WAVEFORMS.SAWTOOTH, WAVEFORMS.NOISE];

    waveformTypes.forEach(waveform => {
      const animation: Animation = {
        ...sampleAnimation,
        audioNotes: [{ startMs: 0, durationMs: 100, frequencyHz: 440, voice: 0, waveform }]
      };

      const encoded = encodeAnimation(animation);
      const isValid = validateEncodedData(encoded);
      
      expect(isValid).toBe(true);
    });
  });

  test('should handle large animations efficiently', () => {
    const largeAnimation: Animation = {
      durationMs: 5000,
      frames: Array.from({ length: 100 }, (_, i) => ({
        timeMs: i * 50,
        leds: Array(20).fill({ 
          r: Math.floor(Math.random() * 255), 
          g: Math.floor(Math.random() * 255), 
          b: Math.floor(Math.random() * 255) 
        })
      })),
      audioNotes: Array.from({ length: 20 }, (_, i) => ({
        startMs: i * 250,
        durationMs: 200,
        frequencyHz: 440 + i * 50,
        voice: i % 2 as 0 | 1,
        waveform: WAVEFORMS.SQUARE
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