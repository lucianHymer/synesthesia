import { Animation } from '../types.js';
import { encodeAnimation as mockEncode } from './mockEncoder.js';
import logger from '../utils/logger.js';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

export function encodeAnimation(animation: Animation): Uint8Array {
  try {
    // Create require function for ES modules
    const require = createRequire(import.meta.url);
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    const encoderPath = path.resolve(__dirname, '../../../animation_encoder');
    const rustEncoder = require(encoderPath);
    
    const result = rustEncoder.encodeAnimationJs(animation);
    logger.info('✅ Using Rust encoder');
    return new Uint8Array(result);
  } catch (error) {
    logger.warn('Rust encoder not available, using mock encoder:', (error as Error).message);
    logger.warn('Error details:', error);
    return mockEncode(animation);
  }
}