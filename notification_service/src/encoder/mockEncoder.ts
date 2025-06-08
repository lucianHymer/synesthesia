import { deflateSync, inflateSync } from 'zlib';
import { Animation } from '../types';

// eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
interface BinaryFrame {
  time_ms: number;
  leds: number[][];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
interface BinaryAudioNote {
  start_ms: number;
  duration_ms: number;
  frequency: number;
  voice: number;
  waveform: number;
}

export function encodeAnimation(animation: Animation): Uint8Array {
  const header = Buffer.alloc(8);
  let offset = 0;

  header.writeUInt16LE(0x0001, offset); offset += 2;
  header.writeUInt16LE(animation.duration_ms, offset); offset += 2;
  header.writeUInt8(animation.fps, offset); offset += 1;
  header.writeUInt8(0, offset); offset += 1;
  header.writeUInt16LE(animation.frames.length, offset); offset += 2;

  const frameBuffers: Buffer[] = [];
  for (const frame of animation.frames) {
    const frameBuffer = Buffer.alloc(62);
    let frameOffset = 0;
    
    frameBuffer.writeUInt16LE(frame.time_ms, frameOffset);
    frameOffset += 2;
    
    for (const led of frame.leds) {
      frameBuffer.writeUInt8(led[0], frameOffset++);
      frameBuffer.writeUInt8(led[1], frameOffset++);
      frameBuffer.writeUInt8(led[2], frameOffset++);
    }
    
    frameBuffers.push(frameBuffer);
  }

  const audioBuffers: Buffer[] = [];
  for (const note of animation.audio) {
    const noteBuffer = Buffer.alloc(9);
    let noteOffset = 0;
    
    noteBuffer.writeUInt16LE(note.start_ms, noteOffset); noteOffset += 2;
    noteBuffer.writeUInt16LE(note.duration_ms, noteOffset); noteOffset += 2;
    noteBuffer.writeUInt16LE(note.frequency, noteOffset); noteOffset += 2;
    noteBuffer.writeUInt8(note.voice, noteOffset); noteOffset += 1;
    
    let waveformCode = 0;
    switch (note.waveform) {
      case 'square': waveformCode = 0; break;
      case 'triangle': waveformCode = 1; break;
      case 'sawtooth': waveformCode = 2; break;
      case 'noise': waveformCode = 3; break;
    }
    noteBuffer.writeUInt8(waveformCode, noteOffset); noteOffset += 1;
    noteBuffer.writeUInt8(0, noteOffset);
    
    audioBuffers.push(noteBuffer);
  }

  const audioCountBuffer = Buffer.alloc(2);
  audioCountBuffer.writeUInt16LE(animation.audio.length, 0);

  const binaryData = Buffer.concat([
    header,
    ...frameBuffers,
    audioCountBuffer,
    ...audioBuffers
  ]);

  return new Uint8Array(deflateSync(binaryData, { level: 1 }));
}

export function validateEncodedData(data: Uint8Array): boolean {
  try {
    const decompressed = inflateSync(data);
    
    if (decompressed.length < 8) return false;
    
    const magic = decompressed.readUInt16LE(0);
    if (magic !== 0x0001) return false;
    
    const frameCount = decompressed.readUInt16LE(6);
    const expectedFrameDataSize = frameCount * 62;
    
    if (decompressed.length < 8 + expectedFrameDataSize + 2) return false;
    
    return true;
  } catch {
    return false;
  }
}