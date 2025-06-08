import { Animation } from '../types';
import { encodeAnimation as mockEncode } from './mockEncoder';
import logger from '../utils/logger';
import path from 'path';

export function encodeAnimation(animation: Animation): Uint8Array {
  try {
    // Use absolute path to find the Rust encoder
    // In CommonJS context (inside require), use __dirname
    const currentDir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(require.resolve('../types'));
    const encoderPath = path.resolve(currentDir, '../../../animation_encoder');
    const rustEncoder = require(encoderPath);
    
    const result = rustEncoder.encodeAnimationJs(animation);
    logger.info('✅ Using Rust encoder');
    return new Uint8Array(result);
  } catch (error) {
    logger.warn('Rust encoder not available, using mock encoder:', (error as Error).message);
    return mockEncode(animation);
  }
}