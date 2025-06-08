#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>
#include <FastLED.h>
#include <driver/ledc.h>
#include <zlib.h>
#include <base64.h>

#define LED_PIN 5
#define NUM_LEDS 20
#define AUDIO_PIN_1 25
#define AUDIO_PIN_2 26
#define WEBSOCKET_PORT 80

const char* ssid = "ESP32_Animation";
const char* password = "animation123";

CRGB leds[NUM_LEDS];
WebSocketsServer webSocket = WebSocketsServer(WEBSOCKET_PORT);

struct AnimationHeader {
    uint16_t version;
    uint16_t duration_ms;
    uint8_t fps;
    uint8_t reserved;
    uint16_t frame_count;
    uint16_t note_count;
} __attribute__((packed));

struct Frame {
    uint16_t time_ms;
    uint8_t leds[20][3];
} __attribute__((packed));

struct AudioNote {
    uint16_t start_ms;
    uint16_t duration_ms;
    uint16_t frequency_hz;
    uint8_t voice;
    uint8_t waveform;
    uint8_t reserved;
} __attribute__((packed));

struct Animation {
    AnimationHeader header;
    Frame* frames;
    AudioNote* notes;
    bool is_playing;
    unsigned long start_time;
    uint16_t current_frame;
    uint16_t current_note;
};

Animation current_animation = {0};
TaskHandle_t animationTask;
TaskHandle_t audioTask;

void setupAudioPWM() {
    ledc_timer_config_t timer_config = {
        .speed_mode = LEDC_LOW_SPEED_MODE,
        .duty_resolution = LEDC_TIMER_8_BIT,
        .timer_num = LEDC_TIMER_0,
        .freq_hz = 5000,
        .clk_cfg = LEDC_AUTO_CLK
    };
    ledc_timer_config(&timer_config);

    timer_config.timer_num = LEDC_TIMER_1;
    ledc_timer_config(&timer_config);

    ledc_channel_config_t channel_config = {
        .gpio_num = AUDIO_PIN_1,
        .speed_mode = LEDC_LOW_SPEED_MODE,
        .channel = LEDC_CHANNEL_0,
        .timer_sel = LEDC_TIMER_0,
        .duty = 0,
        .hpoint = 0
    };
    ledc_channel_config(&channel_config);

    channel_config.gpio_num = AUDIO_PIN_2;
    channel_config.channel = LEDC_CHANNEL_1;
    channel_config.timer_sel = LEDC_TIMER_1;
    ledc_channel_config(&channel_config);
}

uint8_t generateWaveform(uint8_t waveform, float phase) {
    switch (waveform) {
        case 0: // Square
            return (phase < 0.5) ? 255 : 0;
        case 1: // Triangle
            return (phase < 0.5) ? (uint8_t)(phase * 510) : (uint8_t)(255 - (phase - 0.5) * 510);
        case 2: // Sawtooth
            return (uint8_t)(phase * 255);
        case 3: // Noise
            return random(0, 256);
        default:
            return 128;
    }
}

void playAudio(AudioNote* note, unsigned long elapsed_ms) {
    if (!note || elapsed_ms < note->start_ms || elapsed_ms > note->start_ms + note->duration_ms) {
        return;
    }

    float time_in_note = (elapsed_ms - note->start_ms) / 1000.0f;
    float phase = fmod(time_in_note * note->frequency_hz, 1.0f);
    uint8_t amplitude = generateWaveform(note->waveform, phase);
    
    uint32_t duty = (amplitude * 255) / 255;
    
    if (note->voice == 0) {
        ledc_set_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0, duty);
        ledc_update_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0);
    } else {
        ledc_set_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_1, duty);
        ledc_update_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_1);
    }
}

void animationTaskCode(void* parameter) {
    while (true) {
        if (current_animation.is_playing) {
            unsigned long elapsed_ms = millis() - current_animation.start_time;
            
            if (elapsed_ms >= current_animation.header.duration_ms) {
                current_animation.is_playing = false;
                fill_solid(leds, NUM_LEDS, CRGB::Black);
                FastLED.show();
                continue;
            }

            // Update LEDs
            while (current_animation.current_frame < current_animation.header.frame_count - 1 &&
                   current_animation.frames[current_animation.current_frame + 1].time_ms <= elapsed_ms) {
                current_animation.current_frame++;
            }

            if (current_animation.current_frame < current_animation.header.frame_count) {
                Frame* frame = &current_animation.frames[current_animation.current_frame];
                for (int i = 0; i < NUM_LEDS; i++) {
                    leds[i] = CRGB(frame->leds[i][0], frame->leds[i][1], frame->leds[i][2]);
                }
                FastLED.show();
            }
        }
        vTaskDelay(pdMS_TO_TICKS(50)); // 20 FPS
    }
}

void audioTaskCode(void* parameter) {
    while (true) {
        if (current_animation.is_playing) {
            unsigned long elapsed_ms = millis() - current_animation.start_time;
            
            bool audio_playing = false;
            for (uint16_t i = 0; i < current_animation.header.note_count; i++) {
                AudioNote* note = &current_animation.notes[i];
                if (elapsed_ms >= note->start_ms && elapsed_ms <= note->start_ms + note->duration_ms) {
                    playAudio(note, elapsed_ms);
                    audio_playing = true;
                }
            }
            
            if (!audio_playing) {
                ledc_set_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0, 0);
                ledc_set_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_1, 0);
                ledc_update_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0);
                ledc_update_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_1);
            }
        }
        vTaskDelay(pdMS_TO_TICKS(10));
    }
}

bool decodeAnimation(const String& base64Data) {
    // Clean up previous animation
    if (current_animation.frames) {
        free(current_animation.frames);
        current_animation.frames = nullptr;
    }
    if (current_animation.notes) {
        free(current_animation.notes);
        current_animation.notes = nullptr;
    }

    // Decode base64
    int decodedLen = base64_dec_len(base64Data.c_str(), base64Data.length());
    uint8_t* compressed = (uint8_t*)malloc(decodedLen);
    if (!compressed) {
        Serial.println("Failed to allocate memory for compressed data");
        return false;
    }
    
    base64_decode((char*)compressed, base64Data.c_str(), base64Data.length());

    // Decompress
    z_stream stream = {0};
    if (inflateInit(&stream) != Z_OK) {
        free(compressed);
        Serial.println("Failed to initialize zlib");
        return false;
    }

    uint8_t* decompressed = (uint8_t*)malloc(8192); // 8KB buffer
    if (!decompressed) {
        free(compressed);
        inflateEnd(&stream);
        Serial.println("Failed to allocate decompression buffer");
        return false;
    }

    stream.next_in = compressed;
    stream.avail_in = decodedLen;
    stream.next_out = decompressed;
    stream.avail_out = 8192;

    int result = inflate(&stream, Z_FINISH);
    if (result != Z_STREAM_END) {
        free(compressed);
        free(decompressed);
        inflateEnd(&stream);
        Serial.printf("Decompression failed: %d\n", result);
        return false;
    }

    size_t decompressed_size = stream.total_out;
    inflateEnd(&stream);
    free(compressed);

    // Parse header
    if (decompressed_size < sizeof(AnimationHeader)) {
        free(decompressed);
        Serial.println("Data too small for header");
        return false;
    }

    memcpy(&current_animation.header, decompressed, sizeof(AnimationHeader));
    
    if (current_animation.header.version != 0x0001) {
        free(decompressed);
        Serial.printf("Invalid version: 0x%04X\n", current_animation.header.version);
        return false;
    }

    // Allocate and parse frames
    size_t frames_size = current_animation.header.frame_count * sizeof(Frame);
    current_animation.frames = (Frame*)malloc(frames_size);
    if (!current_animation.frames) {
        free(decompressed);
        Serial.println("Failed to allocate frames");
        return false;
    }

    memcpy(current_animation.frames, 
           decompressed + sizeof(AnimationHeader), 
           frames_size);

    // Allocate and parse audio notes
    size_t notes_size = current_animation.header.note_count * sizeof(AudioNote);
    current_animation.notes = (AudioNote*)malloc(notes_size);
    if (!current_animation.notes) {
        free(current_animation.frames);
        free(decompressed);
        Serial.println("Failed to allocate notes");
        return false;
    }

    memcpy(current_animation.notes,
           decompressed + sizeof(AnimationHeader) + frames_size,
           notes_size);

    free(decompressed);
    
    Serial.printf("Animation loaded: %dms, %d frames, %d notes\n", 
                  current_animation.header.duration_ms,
                  current_animation.header.frame_count,
                  current_animation.header.note_count);
    
    return true;
}

void onWebSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
    switch(type) {
        case WStype_DISCONNECTED:
            Serial.printf("WebSocket [%u] Disconnected\n", num);
            break;
            
        case WStype_CONNECTED:
            Serial.printf("WebSocket [%u] Connected from %s\n", num, 
                         webSocket.remoteIP(num).toString().c_str());
            webSocket.sendTXT(num, "{\"status\":\"connected\"}");
            break;
            
        case WStype_TEXT: {
            Serial.printf("WebSocket [%u] Received: %s\n", num, payload);
            
            DynamicJsonDocument doc(1024);
            DeserializationError error = deserializeJson(doc, payload);
            
            if (error) {
                Serial.printf("JSON parse error: %s\n", error.c_str());
                webSocket.sendTXT(num, "{\"status\":\"error\",\"message\":\"Invalid JSON\"}");
                return;
            }
            
            if (doc["type"] == "play") {
                String data = doc["data"];
                if (decodeAnimation(data)) {
                    current_animation.is_playing = true;
                    current_animation.start_time = millis();
                    current_animation.current_frame = 0;
                    current_animation.current_note = 0;
                    
                    webSocket.sendTXT(num, "{\"status\":\"playing\"}");
                    Serial.println("Animation started");
                } else {
                    webSocket.sendTXT(num, "{\"status\":\"error\",\"message\":\"Failed to decode animation\"}");
                }
            } else {
                webSocket.sendTXT(num, "{\"status\":\"error\",\"message\":\"Unknown command\"}");
            }
            break;
        }
        
        default:
            break;
    }
}

void setup() {
    Serial.begin(115200);
    Serial.println("ESP32 Animation Device Starting...");

    // Initialize LEDs
    FastLED.addLeds<WS2812B, LED_PIN, GRB>(leds, NUM_LEDS);
    FastLED.setBrightness(128);
    fill_solid(leds, NUM_LEDS, CRGB::Blue);
    FastLED.show();

    // Initialize audio
    setupAudioPWM();

    // Setup WiFi AP
    WiFi.softAP(ssid, password);
    Serial.print("AP IP address: ");
    Serial.println(WiFi.softAPIP());

    // Initialize WebSocket server
    webSocket.begin();
    webSocket.onEvent(onWebSocketEvent);

    // Create tasks
    xTaskCreatePinnedToCore(
        animationTaskCode,
        "AnimationTask",
        4096,
        NULL,
        1,
        &animationTask,
        0
    );

    xTaskCreatePinnedToCore(
        audioTaskCode,
        "AudioTask",
        4096,
        NULL,
        1,
        &audioTask,
        1
    );

    Serial.println("ESP32 Animation Device Ready!");
    fill_solid(leds, NUM_LEDS, CRGB::Green);
    FastLED.show();
}

void loop() {
    webSocket.loop();
    delay(10);
}