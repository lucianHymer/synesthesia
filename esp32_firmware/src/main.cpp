#include <WiFi.h>
#include <WiFiManager.h>
#include <WebSocketsClient.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <FastLED.h>
#include <driver/ledc.h>
#include <miniz.h>
#include <Base64.h>

#define LED_PIN 5
#define NUM_LEDS 20
#define AUDIO_PIN_1 25
#define AUDIO_PIN_2 26

CRGB leds[NUM_LEDS];
WebSocketsClient webSocketClient;
WiFiManager wifiManager;
WebServer resetServer(80);

// Notification service configuration
char notificationHost[40] = "192.168.1.100"; // Default, can be configured
char notificationPortStr[6] = "3001";
int notificationPort = 3001;
char deviceIdStr[40] = "esp32_led_strip_01";
String deviceId = "esp32_led_strip_01";

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
    int decodedLen = Base64.decodedLength((char*)base64Data.c_str(), base64Data.length());
    uint8_t* compressed = (uint8_t*)malloc(decodedLen);
    if (!compressed) {
        Serial.println("Failed to allocate memory for compressed data");
        return false;
    }
    
    Base64.decode((char*)compressed, (char*)base64Data.c_str(), base64Data.length());

    // Decompress using miniz
    mz_ulong decompressed_size = 8192; // 8KB buffer
    uint8_t* decompressed = (uint8_t*)malloc(decompressed_size);
    if (!decompressed) {
        free(compressed);
        Serial.println("Failed to allocate decompression buffer");
        return false;
    }

    int result = mz_uncompress(decompressed, &decompressed_size, compressed, decodedLen);
    free(compressed);
    
    if (result != MZ_OK) {
        free(decompressed);
        Serial.printf("Decompression failed: %d\n", result);
        return false;
    }

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

void onWebSocketClientEvent(WStype_t type, uint8_t * payload, size_t length) {
    switch(type) {
        case WStype_DISCONNECTED:
            Serial.println("WebSocket Client Disconnected");
            break;
            
        case WStype_CONNECTED: {
            Serial.println("WebSocket Client Connected to Notification Service");
            // Send device registration
            DynamicJsonDocument doc(256);
            doc["type"] = "register";
            doc["deviceId"] = deviceId;
            doc["capabilities"] = "led,audio";
            String output;
            serializeJson(doc, output);
            webSocketClient.sendTXT(output);
            break;
        }
            
        case WStype_TEXT: {
            Serial.printf("WebSocket Client Received: %s\n", payload);
            
            DynamicJsonDocument doc(1024);
            DeserializationError error = deserializeJson(doc, payload);
            
            if (error) {
                Serial.printf("JSON parse error: %s\n", error.c_str());
                return;
            }
            
            if (doc["type"] == "play") {
                String data = doc["data"];
                if (decodeAnimation(data)) {
                    current_animation.is_playing = true;
                    current_animation.start_time = millis();
                    current_animation.current_frame = 0;
                    current_animation.current_note = 0;
                    Serial.println("Animation started from Notification Service");
                }
            }
            break;
        }
        
        default:
            break;
    }
}

void configModeCallback(WiFiManager *myWiFiManager) {
    Serial.println("Entered config mode");
    Serial.println(WiFi.softAPIP());
    Serial.println(myWiFiManager->getConfigPortalSSID());
    
    // Indicate config mode with LED pattern
    fill_solid(leds, NUM_LEDS, CRGB::Blue);
    FastLED.show();
}

void saveConfigCallback() {
    Serial.println("Config saved");
    // Flash green to indicate save
    fill_solid(leds, NUM_LEDS, CRGB::Green);
    FastLED.show();
    delay(500);
    fill_solid(leds, NUM_LEDS, CRGB::Black);
    FastLED.show();
}

void handleResetPage() {
    String wifiStatus = (WiFi.status() == WL_CONNECTED) ? WiFi.SSID() : "Not Connected";
    String deviceIP = (WiFi.status() == WL_CONNECTED) ? WiFi.localIP().toString() : "No IP";
    
    String html = "<!DOCTYPE html><html><head>";
    html += "<title>ESP32 LED Device - Reset Options</title>";
    html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
    html += "<style>body{font-family:Arial;margin:40px;background:#f0f0f0}";
    html += ".container{background:white;padding:20px;border-radius:8px;max-width:500px}";
    html += ".status{background:#e8f4fd;padding:15px;border-radius:5px;margin:20px 0}";
    html += ".button{display:inline-block;background:#007cba;color:white;padding:12px 24px;";
    html += "text-decoration:none;border-radius:5px;margin:10px 5px;border:none;cursor:pointer}";
    html += ".button:hover{background:#005a87}";
    html += ".danger{background:#d32f2f}.danger:hover{background:#b71c1c}";
    html += "</style></head><body>";
    
    html += "<div class='container'>";
    html += "<h1>ESP32 LED Device</h1>";
    html += "<div class='status'>";
    html += "<h3>Current Status</h3>";
    html += "<p><strong>WiFi:</strong> " + wifiStatus + "</p>";
    html += "<p><strong>IP Address:</strong> " + deviceIP + "</p>";
    html += "<p><strong>Device ID:</strong> " + deviceId + "</p>";
    html += "<p><strong>Service:</strong> " + String(notificationHost) + ":" + String(notificationPort) + "</p>";
    html += "<p><strong>WebSocket:</strong> ";
    html += (webSocketClient.isConnected() ? "Connected" : "Disconnected");
    html += "</p>";
    html += "</div>";
    
    html += "<h3>Reset Options</h3>";
    html += "<p><strong>Reset Configuration</strong> will wipe all settings and restart setup mode.</p>";
    html += "<a href='/reset' class='button danger' onclick='return confirm(\"Reset all configuration? Device will restart in setup mode.\")'>Reset Configuration</a>";
    html += "<br>";
    html += "<p><strong>Restart Device</strong> will reboot but keep current settings.</p>";
    html += "<a href='/reboot' class='button' onclick='return confirm(\"Restart device?\")'>Restart Device</a>";
    
    html += "<br><br><a href='/' class='button'>Refresh Status</a>";
    html += "</div></body></html>";
    
    resetServer.send(200, "text/html", html);
}

void handleReset() {
    String html = "<!DOCTYPE html><html><head>";
    html += "<title>Resetting Device</title>";
    html += "<meta http-equiv='refresh' content='15;url=/'>";
    html += "<style>body{font-family:Arial;text-align:center;margin:40px;background:#f0f0f0}";
    html += ".container{background:white;padding:40px;border-radius:8px;max-width:400px;margin:0 auto}</style>";
    html += "</head><body>";
    html += "<div class='container'>";
    html += "<h1>Resetting Configuration</h1>";
    html += "<p>Device configuration has been cleared.</p>";
    html += "<p>The device will restart in setup mode in a few seconds.</p>";
    html += "<p>Look for the <strong>ESP32_LED_Setup</strong> WiFi network to reconfigure.</p>";
    html += "</div></body></html>";
    
    resetServer.send(200, "text/html", html);
    
    Serial.println("Reset requested via web interface");
    delay(2000);
    wifiManager.resetSettings();
    ESP.restart();
}

void handleReboot() {
    String html = "<!DOCTYPE html><html><head>";
    html += "<title>Rebooting Device</title>";
    html += "<meta http-equiv='refresh' content='10;url=/'>";
    html += "<style>body{font-family:Arial;text-align:center;margin:40px;background:#f0f0f0}";
    html += ".container{background:white;padding:40px;border-radius:8px;max-width:400px;margin:0 auto}</style>";
    html += "</head><body>";
    html += "<div class='container'>";
    html += "<h1>Rebooting Device</h1>";
    html += "<p>Device is restarting with current configuration.</p>";
    html += "<p>This page will refresh automatically in 10 seconds.</p>";
    html += "</div></body></html>";
    
    resetServer.send(200, "text/html", html);
    
    Serial.println("Reboot requested via web interface");
    delay(2000);
    ESP.restart();
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

    // Configure WiFiManager
    wifiManager.setDebugOutput(true);
    wifiManager.setAPCallback(configModeCallback);
    wifiManager.setSaveConfigCallback(saveConfigCallback);
    wifiManager.setConfigPortalTimeout(180); // 3 minutes timeout
    
    // Custom parameters for notification service host
    WiFiManagerParameter custom_host("host", "Notification Host", notificationHost, 40);
    WiFiManagerParameter custom_port("port", "Notification Port", notificationPortStr, 6);
    WiFiManagerParameter custom_device_id("device_id", "Device ID", deviceIdStr, 40);
    
    wifiManager.addParameter(&custom_host);
    wifiManager.addParameter(&custom_port);
    wifiManager.addParameter(&custom_device_id);
    
    // Try to connect, create AP if fails
    if (!wifiManager.autoConnect("ESP32_LED_Setup", "setup123")) {
        Serial.println("Failed to connect and hit timeout");
        fill_solid(leds, NUM_LEDS, CRGB::Red);
        FastLED.show();
        delay(3000);
        ESP.restart();
    }
    
    // Connected to WiFi - now enable dual mode for always-on reset AP
    WiFi.mode(WIFI_AP_STA);
    WiFi.softAP("ESP32_LED_Setup", "setup123");
    
    Serial.println("Connected to WiFi!");
    Serial.print("Station IP address: ");
    Serial.println(WiFi.localIP());
    Serial.print("AP IP address: ");
    Serial.println(WiFi.softAPIP());
    Serial.println("Reset interface available at: http://192.168.4.1");
    
    // Update configuration from custom parameters - safe copy to our buffers
    strcpy(notificationHost, custom_host.getValue());
    strcpy(notificationPortStr, custom_port.getValue());
    notificationPort = atoi(notificationPortStr);
    strcpy(deviceIdStr, custom_device_id.getValue());
    deviceId = String(deviceIdStr);
    
    // Show connection success
    fill_solid(leds, NUM_LEDS, CRGB::Green);
    FastLED.show();
    
    // Setup reset server routes
    resetServer.on("/", handleResetPage);
    resetServer.on("/reset", handleReset);
    resetServer.on("/reboot", handleReboot);
    resetServer.begin();
    Serial.println("Reset server started on AP");
    
    // Connect to notification service
    webSocketClient.begin(notificationHost, notificationPort, "/ws");
    webSocketClient.onEvent(onWebSocketClientEvent);
    webSocketClient.setReconnectInterval(5000);
    Serial.printf("Connecting to Notification Service at %s:%d\n", notificationHost, notificationPort);

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
    webSocketClient.loop();
    resetServer.handleClient();  // Handle reset web interface requests
    
    // Check WiFi connection
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi disconnected, restarting...");
        fill_solid(leds, NUM_LEDS, CRGB::Red);
        FastLED.show();
        delay(3000);
        ESP.restart();
    }
    
    delay(10);
}
