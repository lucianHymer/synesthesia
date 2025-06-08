import { Animation } from '../types';
import { encodeAnimation as mockEncode } from './mockEncoder';
import logger from '../utils/logger';

export function encodeAnimation(animation: Animation): Uint8Array {
  try {
    const rustEncoder = require('../../animation-encoder');
    return rustEncoder.encode_animation(animation);
  } catch (error) {
    logger.warn('Rust encoder not available, using mock encoder:', (error as Error).message);
    return mockEncode(animation);
  }
}