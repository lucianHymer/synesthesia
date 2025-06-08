use byteorder::{LittleEndian, WriteBytesExt};
use flate2::{write::ZlibEncoder, Compression};
use serde::{Deserialize, Serialize};
use std::io::Write;
use thiserror::Error;

#[cfg(feature = "napi")]
use napi_derive::napi;

#[derive(Error, Debug)]
pub enum EncodingError {
    #[error("Animation too long: {0} frames (max 200)")]
    TooManyFrames(usize),
    #[error("Animation too short: {0}ms (min 100ms)")]
    TooShort(u16),
    #[error("Animation too long: {0}ms (max 10000ms)")]
    TooLong(u16),
    #[error("Invalid LED index: {0} (max 19)")]
    InvalidLedIndex(usize),
    #[error("Invalid voice: {0} (max 1)")]
    InvalidVoice(u8),
    #[error("Invalid waveform: {0} (max 3)")]
    InvalidWaveform(u8),
    #[error("Audio note timing error: start={0}ms, duration={1}ms exceeds animation")]
    AudioTimingError(u16, u16),
    #[error("Compression failed: {0}")]
    CompressionError(String),
    #[error("Serialization failed: {0}")]
    SerializationError(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "napi", napi(object))]
pub struct RGB {
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "napi", napi(object))]
pub struct Frame {
    pub time_ms: u16,
    pub leds: Vec<RGB>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "napi", napi(object))]
pub struct AudioNote {
    pub start_ms: u16,
    pub duration_ms: u16,
    pub frequency_hz: u16,
    pub voice: u8,
    pub waveform: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "napi", napi(object))]
pub struct Animation {
    pub duration_ms: u16,
    pub frames: Vec<Frame>,
    pub audio_notes: Vec<AudioNote>,
}

#[repr(C, packed)]
struct AnimationHeader {
    version: u16,
    duration_ms: u16,
    fps: u8,
    reserved: u8,
    frame_count: u16,
    note_count: u16,
}

#[repr(C, packed)]
#[allow(dead_code)]
struct BinaryFrame {
    time_ms: u16,
    leds: [[u8; 3]; 20],
}

#[repr(C, packed)]
#[allow(dead_code)]
struct BinaryAudioNote {
    start_ms: u16,
    duration_ms: u16,
    frequency_hz: u16,
    voice: u8,
    waveform: u8,
    reserved: u8,
}

pub fn encode_animation(animation: &Animation) -> Result<Vec<u8>, EncodingError> {
    validate_animation(animation)?;

    let binary_data = serialize_to_binary(animation)?;
    compress_data(&binary_data)
}

fn validate_animation(animation: &Animation) -> Result<(), EncodingError> {
    if animation.duration_ms < 100 {
        return Err(EncodingError::TooShort(animation.duration_ms));
    }

    if animation.duration_ms > 10000 {
        return Err(EncodingError::TooLong(animation.duration_ms));
    }

    if animation.frames.len() > 200 {
        return Err(EncodingError::TooManyFrames(animation.frames.len()));
    }

    for frame in &animation.frames {
        if frame.leds.len() != 20 {
            return Err(EncodingError::InvalidLedIndex(frame.leds.len()));
        }
    }

    for note in &animation.audio_notes {
        if note.voice > 1 {
            return Err(EncodingError::InvalidVoice(note.voice));
        }

        if note.waveform > 3 {
            return Err(EncodingError::InvalidWaveform(note.waveform));
        }

        if note.start_ms + note.duration_ms > animation.duration_ms {
            return Err(EncodingError::AudioTimingError(
                note.start_ms,
                note.duration_ms,
            ));
        }
    }

    Ok(())
}

fn serialize_to_binary(animation: &Animation) -> Result<Vec<u8>, EncodingError> {
    let mut buffer = Vec::new();

    let header = AnimationHeader {
        version: 0x0001,
        duration_ms: animation.duration_ms,
        fps: 20,
        reserved: 0,
        frame_count: animation.frames.len() as u16,
        note_count: animation.audio_notes.len() as u16,
    };

    buffer
        .write_u16::<LittleEndian>(header.version)
        .map_err(|e| EncodingError::SerializationError(e.to_string()))?;
    buffer
        .write_u16::<LittleEndian>(header.duration_ms)
        .map_err(|e| EncodingError::SerializationError(e.to_string()))?;
    buffer
        .write_u8(header.fps)
        .map_err(|e| EncodingError::SerializationError(e.to_string()))?;
    buffer
        .write_u8(header.reserved)
        .map_err(|e| EncodingError::SerializationError(e.to_string()))?;
    buffer
        .write_u16::<LittleEndian>(header.frame_count)
        .map_err(|e| EncodingError::SerializationError(e.to_string()))?;
    buffer
        .write_u16::<LittleEndian>(header.note_count)
        .map_err(|e| EncodingError::SerializationError(e.to_string()))?;

    for frame in &animation.frames {
        buffer
            .write_u16::<LittleEndian>(frame.time_ms)
            .map_err(|e| EncodingError::SerializationError(e.to_string()))?;

        for led in &frame.leds {
            buffer
                .write_u8(led.r)
                .map_err(|e| EncodingError::SerializationError(e.to_string()))?;
            buffer
                .write_u8(led.g)
                .map_err(|e| EncodingError::SerializationError(e.to_string()))?;
            buffer
                .write_u8(led.b)
                .map_err(|e| EncodingError::SerializationError(e.to_string()))?;
        }
    }

    for note in &animation.audio_notes {
        buffer
            .write_u16::<LittleEndian>(note.start_ms)
            .map_err(|e| EncodingError::SerializationError(e.to_string()))?;
        buffer
            .write_u16::<LittleEndian>(note.duration_ms)
            .map_err(|e| EncodingError::SerializationError(e.to_string()))?;
        buffer
            .write_u16::<LittleEndian>(note.frequency_hz)
            .map_err(|e| EncodingError::SerializationError(e.to_string()))?;
        buffer
            .write_u8(note.voice)
            .map_err(|e| EncodingError::SerializationError(e.to_string()))?;
        buffer
            .write_u8(note.waveform)
            .map_err(|e| EncodingError::SerializationError(e.to_string()))?;
        buffer
            .write_u8(0)
            .map_err(|e| EncodingError::SerializationError(e.to_string()))?;
    }

    Ok(buffer)
}

fn compress_data(data: &[u8]) -> Result<Vec<u8>, EncodingError> {
    let mut encoder = ZlibEncoder::new(Vec::new(), Compression::new(1));
    encoder
        .write_all(data)
        .map_err(|e| EncodingError::CompressionError(e.to_string()))?;
    encoder
        .finish()
        .map_err(|e| EncodingError::CompressionError(e.to_string()))
}

#[cfg(feature = "napi")]
#[napi]
pub fn encode_animation_js(animation: Animation) -> napi::Result<Vec<u8>> {
    encode_animation(&animation).map_err(|e| napi::Error::from_reason(e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_animation() -> Animation {
        Animation {
            duration_ms: 1000,
            frames: vec![
                Frame {
                    time_ms: 0,
                    leds: vec![RGB { r: 255, g: 0, b: 0 }; 20],
                },
                Frame {
                    time_ms: 500,
                    leds: vec![RGB { r: 0, g: 255, b: 0 }; 20],
                },
            ],
            audio_notes: vec![AudioNote {
                start_ms: 0,
                duration_ms: 500,
                frequency_hz: 440,
                voice: 0,
                waveform: 0,
            }],
        }
    }

    #[test]
    fn test_encode_valid_animation() {
        let animation = create_test_animation();
        let result = encode_animation(&animation);
        assert!(result.is_ok());

        let compressed = result.unwrap();
        assert!(!compressed.is_empty());
        assert!(compressed.len() < 1000);
    }

    #[test]
    fn test_animation_too_short() {
        let mut animation = create_test_animation();
        animation.duration_ms = 50;

        let result = encode_animation(&animation);
        assert!(matches!(result, Err(EncodingError::TooShort(50))));
    }

    #[test]
    fn test_animation_too_long() {
        let mut animation = create_test_animation();
        animation.duration_ms = 15000;

        let result = encode_animation(&animation);
        assert!(matches!(result, Err(EncodingError::TooLong(15000))));
    }

    #[test]
    fn test_too_many_frames() {
        let mut animation = create_test_animation();
        animation.frames = (0..201)
            .map(|i| Frame {
                time_ms: i as u16,
                leds: vec![RGB { r: 0, g: 0, b: 0 }; 20],
            })
            .collect();

        let result = encode_animation(&animation);
        assert!(matches!(result, Err(EncodingError::TooManyFrames(201))));
    }

    #[test]
    fn test_invalid_led_count() {
        let mut animation = create_test_animation();
        animation.frames[0].leds = vec![RGB { r: 0, g: 0, b: 0 }; 10];

        let result = encode_animation(&animation);
        assert!(matches!(result, Err(EncodingError::InvalidLedIndex(10))));
    }

    #[test]
    fn test_invalid_voice() {
        let mut animation = create_test_animation();
        animation.audio_notes[0].voice = 2;

        let result = encode_animation(&animation);
        assert!(matches!(result, Err(EncodingError::InvalidVoice(2))));
    }

    #[test]
    fn test_invalid_waveform() {
        let mut animation = create_test_animation();
        animation.audio_notes[0].waveform = 4;

        let result = encode_animation(&animation);
        assert!(matches!(result, Err(EncodingError::InvalidWaveform(4))));
    }

    #[test]
    fn test_audio_timing_error() {
        let mut animation = create_test_animation();
        animation.audio_notes[0].start_ms = 800;
        animation.audio_notes[0].duration_ms = 300;

        let result = encode_animation(&animation);
        assert!(matches!(
            result,
            Err(EncodingError::AudioTimingError(800, 300))
        ));
    }
}
