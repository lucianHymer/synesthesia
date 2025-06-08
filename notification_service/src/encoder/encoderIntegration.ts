import { Animation } from '../types';
import { encodeAnimation as mockEncode } from './mockEncoder';
import logger from '../utils/logger';

export function encodeAnimation(animation: Animation): Uint8Array {
  // In test environment, always use mock encoder
  if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined) {
    return mockEncode(animation);
  }

  try {
    // Dynamic import for production use
    const { encodeAnimationJs } = require('../../../animation_encoder');
    const result = encodeAnimationJs(animation);
    logger.info('✅ Using Rust encoder');
    return new Uint8Array(result);
  } catch (error) {
    logger.warn('Rust encoder not available, using mock encoder:', (error as Error).message);
    logger.warn('Error details:', error);
    return mockEncode(animation);
  }
}