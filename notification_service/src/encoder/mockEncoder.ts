import { deflateSync, inflateSync } from 'zlib';
import { Animation } from '../types';

export function encodeAnimation(animation: Animation): Uint8Array {
  const header = Buffer.alloc(10);
  let offset = 0;

  header.writeUInt16LE(0x0001, offset); offset += 2;
  header.writeUInt16LE(animation.durationMs, offset); offset += 2;
  header.writeUInt8(20, offset); offset += 1; // fps hardcoded to 20
  header.writeUInt8(0, offset); offset += 1;
  header.writeUInt16LE(animation.frames.length, offset); offset += 2;
  header.writeUInt16LE(animation.audioNotes.length, offset); offset += 2;

  const frameBuffers: Buffer[] = [];
  for (const frame of animation.frames) {
    const frameBuffer = Buffer.alloc(62);
    let frameOffset = 0;
    
    frameBuffer.writeUInt16LE(frame.timeMs, frameOffset);
    frameOffset += 2;
    
    for (const led of frame.leds) {
      frameBuffer.writeUInt8(led.r, frameOffset++);
      frameBuffer.writeUInt8(led.g, frameOffset++);
      frameBuffer.writeUInt8(led.b, frameOffset++);
    }
    
    frameBuffers.push(frameBuffer);
  }

  const audioBuffers: Buffer[] = [];
  for (const note of animation.audioNotes) {
    const noteBuffer = Buffer.alloc(9);
    let noteOffset = 0;
    
    noteBuffer.writeUInt16LE(note.startMs, noteOffset); noteOffset += 2;
    noteBuffer.writeUInt16LE(note.durationMs, noteOffset); noteOffset += 2;
    noteBuffer.writeUInt16LE(note.frequencyHz, noteOffset); noteOffset += 2;
    noteBuffer.writeUInt8(note.voice, noteOffset); noteOffset += 1;
    noteBuffer.writeUInt8(note.waveform, noteOffset); noteOffset += 1;
    noteBuffer.writeUInt8(0, noteOffset);
    
    audioBuffers.push(noteBuffer);
  }

  const binaryData = Buffer.concat([
    header,
    ...frameBuffers,
    ...audioBuffers
  ]);

  return new Uint8Array(deflateSync(binaryData, { level: 1 }));
}

export function validateEncodedData(data: Uint8Array): boolean {
  try {
    const decompressed = inflateSync(data);
    
    if (decompressed.length < 10) return false;
    
    const magic = decompressed.readUInt16LE(0);
    if (magic !== 0x0001) return false;
    
    const frameCount = decompressed.readUInt16LE(6);
    const audioCount = decompressed.readUInt16LE(8);
    const expectedFrameDataSize = frameCount * 62;
    const expectedAudioDataSize = audioCount * 9;
    
    if (decompressed.length < 10 + expectedFrameDataSize + expectedAudioDataSize) return false;
    
    return true;
  } catch {
    return false;
  }
}