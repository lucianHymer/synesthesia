use animation_encoder::*;
use byteorder::{LittleEndian, ReadBytesExt};
use flate2::read::ZlibDecoder;
use std::io::Read;

#[test]
fn test_round_trip_encoding_decoding() {
    let animation = Animation {
        duration_ms: 2000,
        frames: vec![
            Frame {
                time_ms: 0,
                leds: vec![RGB { r: 255, g: 0, b: 0 }; 20],
            },
            Frame {
                time_ms: 1000,
                leds: vec![RGB { r: 0, g: 255, b: 0 }; 20],
            },
            Frame {
                time_ms: 2000,
                leds: vec![RGB { r: 0, g: 0, b: 255 }; 20],
            },
        ],
        audio_notes: vec![
            AudioNote {
                start_ms: 0,
                duration_ms: 500,
                frequency_hz: 440,
                voice: 0,
                waveform: 0,
            },
            AudioNote {
                start_ms: 1000,
                duration_ms: 500,
                frequency_hz: 880,
                voice: 1,
                waveform: 1,
            },
        ],
    };

    let encoded = encode_animation(&animation).expect("Encoding should succeed");
    assert!(!encoded.is_empty());

    let decompressed = decompress_and_validate(&encoded).expect("Decompression should succeed");

    verify_header(&decompressed, &animation);
    verify_frames(&decompressed, &animation);
    verify_audio_notes(&decompressed, &animation);
}

#[test]
fn test_minimal_animation() {
    let animation = Animation {
        duration_ms: 100,
        frames: vec![Frame {
            time_ms: 0,
            leds: vec![
                RGB {
                    r: 128,
                    g: 128,
                    b: 128
                };
                20
            ],
        }],
        audio_notes: vec![],
    };

    let encoded = encode_animation(&animation).expect("Encoding should succeed");
    let decompressed = decompress_and_validate(&encoded).expect("Decompression should succeed");

    verify_header(&decompressed, &animation);
    verify_frames(&decompressed, &animation);
    assert!(decompressed.len() >= 10 + 62);
}

#[test]
fn test_compression_efficiency() {
    let animation = Animation {
        duration_ms: 5000,
        frames: (0..100)
            .map(|i| Frame {
                time_ms: i * 50,
                leds: vec![
                    RGB {
                        r: (i % 256) as u8,
                        g: 0,
                        b: 0
                    };
                    20
                ],
            })
            .collect(),
        audio_notes: vec![AudioNote {
            start_ms: 0,
            duration_ms: 5000,
            frequency_hz: 440,
            voice: 0,
            waveform: 2,
        }],
    };

    let encoded = encode_animation(&animation).expect("Encoding should succeed");

    let uncompressed_size = 10 + (100 * 62) + 9;
    let compression_ratio = (uncompressed_size - encoded.len()) as f64 / uncompressed_size as f64;

    println!("Uncompressed: {} bytes", uncompressed_size);
    println!("Compressed: {} bytes", encoded.len());
    println!("Compression ratio: {:.1}%", compression_ratio * 100.0);

    assert!(compression_ratio > 0.8);
    assert!(encoded.len() < 8192);
}

#[test]
fn test_maximum_size_animation() {
    let animation = Animation {
        duration_ms: 10000,
        frames: (0..100)
            .map(|i| Frame {
                time_ms: i * 100,
                leds: (0..20)
                    .map(|j| RGB {
                        r: ((i + j) % 256) as u8,
                        g: ((i * 2 + j) % 256) as u8,
                        b: ((i * 3 + j) % 256) as u8,
                    })
                    .collect(),
            })
            .collect(),
        audio_notes: (0..20)
            .map(|i| AudioNote {
                start_ms: i * 500,
                duration_ms: 400,
                frequency_hz: 440 + (i * 20),
                voice: (i % 2) as u8,
                waveform: (i % 4) as u8,
            })
            .collect(),
    };

    let encoded = encode_animation(&animation).expect("Encoding should succeed");
    println!("Large animation compressed to {} bytes", encoded.len());
    assert!(encoded.len() < 8192);

    let decompressed = decompress_and_validate(&encoded).expect("Decompression should succeed");
    verify_header(&decompressed, &animation);
}

fn decompress_and_validate(compressed: &[u8]) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let mut decoder = ZlibDecoder::new(compressed);
    let mut decompressed = Vec::new();
    decoder.read_to_end(&mut decompressed)?;
    Ok(decompressed)
}

fn verify_header(data: &[u8], original: &Animation) {
    let mut cursor = std::io::Cursor::new(data);

    let version = cursor.read_u16::<LittleEndian>().unwrap();
    assert_eq!(version, 0x0001);

    let duration_ms = cursor.read_u16::<LittleEndian>().unwrap();
    assert_eq!(duration_ms, original.duration_ms);

    let fps = cursor.read_u8().unwrap();
    assert_eq!(fps, 20);

    let _reserved = cursor.read_u8().unwrap();

    let frame_count = cursor.read_u16::<LittleEndian>().unwrap();
    assert_eq!(frame_count, original.frames.len() as u16);

    let note_count = cursor.read_u16::<LittleEndian>().unwrap();
    assert_eq!(note_count, original.audio_notes.len() as u16);
}

fn verify_frames(data: &[u8], original: &Animation) {
    let mut cursor = std::io::Cursor::new(&data[10..]);

    for (i, frame) in original.frames.iter().enumerate() {
        let time_ms = cursor.read_u16::<LittleEndian>().unwrap();
        assert_eq!(time_ms, frame.time_ms, "Frame {} time mismatch", i);

        for (j, led) in frame.leds.iter().enumerate() {
            let r = cursor.read_u8().unwrap();
            let g = cursor.read_u8().unwrap();
            let b = cursor.read_u8().unwrap();

            assert_eq!(r, led.r, "Frame {} LED {} red mismatch", i, j);
            assert_eq!(g, led.g, "Frame {} LED {} green mismatch", i, j);
            assert_eq!(b, led.b, "Frame {} LED {} blue mismatch", i, j);
        }
    }
}

fn verify_audio_notes(data: &[u8], original: &Animation) {
    let frames_size = original.frames.len() * 62;
    let mut cursor = std::io::Cursor::new(&data[10 + frames_size..]);

    for (i, note) in original.audio_notes.iter().enumerate() {
        let start_ms = cursor.read_u16::<LittleEndian>().unwrap();
        assert_eq!(start_ms, note.start_ms, "Note {} start_ms mismatch", i);

        let duration_ms = cursor.read_u16::<LittleEndian>().unwrap();
        assert_eq!(
            duration_ms, note.duration_ms,
            "Note {} duration_ms mismatch",
            i
        );

        let frequency_hz = cursor.read_u16::<LittleEndian>().unwrap();
        assert_eq!(
            frequency_hz, note.frequency_hz,
            "Note {} frequency_hz mismatch",
            i
        );

        let voice = cursor.read_u8().unwrap();
        assert_eq!(voice, note.voice, "Note {} voice mismatch", i);

        let waveform = cursor.read_u8().unwrap();
        assert_eq!(waveform, note.waveform, "Note {} waveform mismatch", i);

        let _reserved = cursor.read_u8().unwrap();
    }
}
