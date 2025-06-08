import { PatternLibrary } from '../src/patterns/PatternLibrary';
import { PatternWithMetadata } from '../src/types';

describe('PatternLibrary', () => {
  let library: PatternLibrary;

  beforeEach(() => {
    library = new PatternLibrary();
  });

  test('should load initial patterns', () => {
    const patterns = library.getAllPatterns();
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns.some(p => p.metadata.id === 'gentle_success_v3')).toBe(true);
    expect(patterns.some(p => p.metadata.id === 'default_notification_v1')).toBe(true);
  });

  test('should get pattern by id', () => {
    const pattern = library.getPattern('gentle_success_v3');
    expect(pattern).toBeDefined();
    expect(pattern?.metadata.id).toBe('gentle_success_v3');
    expect(pattern?.metadata.tags).toContain('success');
  });

  test('should return undefined for non-existent pattern', () => {
    const pattern = library.getPattern('non_existent_pattern');
    expect(pattern).toBeUndefined();
  });

  test('should add new pattern', () => {
    const newPattern: PatternWithMetadata = {
      animation: {
        name: 'test_pattern',
        duration_ms: 1000,
        fps: 20,
        frames: [{ time_ms: 0, leds: Array(20).fill([255, 0, 0]) }],
        audio: []
      },
      metadata: {
        id: 'test_pattern_v1',
        description: 'Test pattern for unit tests',
        tags: ['test'],
        typical_use: 'testing',
        intensity: 'low',
        mood: 'neutral',
        usage_count: 0,
        created_at: '2025-06-07T00:00:00Z'
      }
    };

    library.addPattern(newPattern);
    const retrieved = library.getPattern('test_pattern_v1');
    expect(retrieved).toEqual(newPattern);
  });

  test('should update existing pattern', () => {
    const pattern = library.getPattern('gentle_success_v3');
    expect(pattern).toBeDefined();
    
    const updatedPattern = { 
      ...pattern!, 
      metadata: { ...pattern!.metadata, description: 'Updated description' }
    };
    
    const success = library.updatePattern('gentle_success_v3', updatedPattern);
    expect(success).toBe(true);
    
    const retrieved = library.getPattern('gentle_success_v3');
    expect(retrieved?.metadata.description).toBe('Updated description');
  });

  test('should not update non-existent pattern', () => {
    const dummyPattern: PatternWithMetadata = {
      animation: { name: 'dummy', duration_ms: 1000, fps: 20, frames: [], audio: [] },
      metadata: { id: 'dummy', description: '', tags: [], typical_use: '', intensity: 'low', mood: '', usage_count: 0, created_at: '' }
    };
    
    const success = library.updatePattern('non_existent', dummyPattern);
    expect(success).toBe(false);
  });

  test('should delete pattern', () => {
    expect(library.getPattern('gentle_success_v3')).toBeDefined();
    
    const success = library.deletePattern('gentle_success_v3');
    expect(success).toBe(true);
    expect(library.getPattern('gentle_success_v3')).toBeUndefined();
  });

  test('should not delete non-existent pattern', () => {
    const success = library.deletePattern('non_existent');
    expect(success).toBe(false);
  });

  test('should increment usage count', () => {
    const pattern = library.getPattern('gentle_success_v3');
    const initialCount = pattern!.metadata.usage_count;
    
    library.incrementUsage('gentle_success_v3');
    
    const updatedPattern = library.getPattern('gentle_success_v3');
    expect(updatedPattern!.metadata.usage_count).toBe(initialCount + 1);
  });

  test('should search patterns by tags', () => {
    const successPatterns = library.searchPatterns(['success']);
    expect(successPatterns.length).toBeGreaterThan(0);
    expect(successPatterns.every(p => p.metadata.tags.includes('success'))).toBe(true);
  });

  test('should return fallback pattern id', () => {
    const fallback = library.getFallbackPattern();
    expect(fallback).toBe('default_notification_v1');
    expect(library.getPattern(fallback)).toBeDefined();
  });
});