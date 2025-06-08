import { Animation } from '../types';
import { encodeAnimation as mockEncode } from './mockEncoder';

export function encodeAnimation(animation: Animation): Uint8Array {
  try {
    const rustEncoder = require('../../animation-encoder');
    return rustEncoder.encode_animation(animation);
  } catch (error) {
    console.warn('Rust encoder not available, using mock encoder:', (error as Error).message);
    return mockEncode(animation);
  }
}