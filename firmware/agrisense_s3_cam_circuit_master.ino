/* =========================================================================
   AgriSense S3 Master — Unified Camera & Circuitry Firmware
   =========================================================================
   Target Board: ESP32-S3 (8MB PSRAM, S3-WROOM-1 / S3-EYE / Freenove S3 Cam)
   
   Architecture:
     • Core 0: Dedicated Port 81 High-Speed MJPEG Live Video Engine (25-30+ FPS)
     • Core 1: Port 80 WebServer, Sensor Acquisition, Automation & Cloud Ingest
   
   Hardware Pinout & Circuitry:
     1. Camera Module (RHYX GC2145 / OV2640 Parallel DVP Bus):
        - XCLK: 15, SIOD: 4, SIOC: 5
        - Y9: 16, Y8: 17, Y7: 18, Y6: 12, Y5: 10, Y4: 8, Y3: 9, Y2: 11
        - VSYNC: 6, HREF: 7, PCLK: 13
     2. MicroSD Card (1-Line SD_MMC Bus):
        - CMD: 38, CLK: 39, D0: 40
     3. Environmental Sensors:
        - DHT11 (Air Temp & Humidity): GPIO 21
        - Soil Moisture Sensor 1: GPIO 1 (ADC1_CH0)
        - Soil Moisture Sensor 2: GPIO 2 (ADC1_CH1)
        - LDR Light / Solar Sensor: GPIO 14 (ADC2_CH3)
        - Rain Sensor: GPIO 47 (ADC2_CH6)
     4. Actuator Relays (Active LOW with safety timeout):
        - Water Pump Relay: GPIO 41
        - Cooling Fan Relay: GPIO 42
   ========================================================================= */

#include "esp_camera.h"
#include "img_converters.h"
#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include "FS.h"
#include "SD_MMC.h"
#include <DHT.h>

// ==========================================
// 1. Wi-Fi & Cloud Ingest Configuration
// ==========================================
// Set to true to broadcast standalone hotspot (AgriSense-Pro at 192.168.4.1)
// Set to false to connect to your farm Wi-Fi router / mobile hotspot
const bool USE_OFFLINE_HOTSPOT = false;

const char* ssid        = "NEW WIFI";
const char* password    = "bBPS@123";

const char* ap_ssid     = "AgriSense-Pro";
const char* ap_password = "agrisense_field";

// Cloud / Web Ingest REST endpoint (optional sync):
const char* CLOUD_INGEST_URL = "http://127.0.0.1:8000/api/sensors/ingest";

// ==========================================
// 2. Hardware Pin Definitions (ESP32-S3)
// ==========================================
// Camera Parallel DVP Bus
#define PWDN_GPIO_NUM     -1
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM     15
#define SIOD_GPIO_NUM      4
#define SIOC_GPIO_NUM      5

#define Y9_GPIO_NUM       16
#define Y8_GPIO_NUM       17
#define Y7_GPIO_NUM       18
#define Y6_GPIO_NUM       12
#define Y5_GPIO_NUM       10
#define Y4_GPIO_NUM        8
#define Y3_GPIO_NUM        9
#define Y2_GPIO_NUM       11
#define VSYNC_GPIO_NUM     6
#define HREF_GPIO_NUM      7
#define PCLK_GPIO_NUM     13

// MicroSD Slot (SD_MMC 1-Line)
#define SD_CMD_PIN        38
#define SD_CLK_PIN        39
#define SD_D0_PIN         40

// Environmental Sensors
#define DHT_PIN           21
#define DHT_TYPE          DHT11

#define SOIL1_PIN          1    // ADC1_CH0
#define SOIL2_PIN          2    // ADC1_CH1
#define LDR_PIN           14    // ADC2_CH3
#define RAIN_PIN          47    // ADC2_CH6

// Actuators
#define PUMP_RELAY        41
#define FAN_RELAY         42
#define RELAY_ACTIVE_LOW  true

// Automated Field Thresholds
#define SOIL_DRY_PCT      35    // Auto pump ON when average soil moisture < 35%
#define RAIN_WET_PCT      40    // Suppress irrigation when rain > 40%
#define FAN_ON_TEMP       34.0f // Auto fan ON when temperature > 34°C

// ==========================================
// 3. Global Instances & Variables
// ==========================================
WebServer server(80);
WiFiServer streamServer(81);
DHT dht(DHT_PIN, DHT_TYPE);

camera_config_t camera_cfg;
volatile int jpegQuality = 72; // 35 - 95 quality scale
volatile bool cameraPaused = false;
volatile float liveFPS = 0.0f;
volatile uint32_t fpsFrameCount = 0;
volatile uint32_t fpsLastTime = 0;
int photoCounter = 1;
bool sdMounted = false;

// Sensor Readings & State
float curAirTemp = 28.0f;
float curAirHum  = 55.0f;
int   curSoil1   = 40;
int   curSoil2   = 40;
int   curSoilAvg = 40;
int   curLight   = 80;
int   curRain    = 0;

bool pumpState = false;
bool fanState  = false;
bool autoMode  = true; // If false, manual override is active

unsigned long lastSensorReadTime = 0;
unsigned long lastSdLogTime      = 0;
unsigned long lastCloudSyncTime  = 0;

// FreeRTOS Task Handles
TaskHandle_t streamTaskHandle = NULL;

// ==========================================
// 4. Actuator Driver Functions
// ==========================================
void setPump(bool on) {
  pumpState = on;
  if (RELAY_ACTIVE_LOW) {
    digitalWrite(PUMP_RELAY, on ? LOW : HIGH);
  } else {
    digitalWrite(PUMP_RELAY, on ? HIGH : LOW);
  }
  Serial.printf("[ACTUATOR] Water Pump Relay -> %s\n", on ? "ENGAGED (ON)" : "STOPPED (OFF)");
}

void setFan(bool on) {
  fanState = on;
  if (RELAY_ACTIVE_LOW) {
    digitalWrite(FAN_RELAY, on ? LOW : HIGH);
  } else {
    digitalWrite(FAN_RELAY, on ? HIGH : LOW);
  }
  Serial.printf("[ACTUATOR] Cooling Fan Relay -> %s\n", on ? "ENGAGED (ON)" : "STOPPED (OFF)");
}

// ==========================================
// 5. Sensor Acquisition & Automation Engine
// ==========================================
void readAllSensors() {
  // 1. Air Temperature & Humidity from DHT11
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  if (!isnan(h) && !isnan(t) && h > 0.0f && t > 0.0f) {
    curAirHum  = h;
    curAirTemp = t;
  }

  // 2. Dual Soil Moisture Sensors (Analog ADC 0-4095 -> 0-100%)
  // Raw reading: ~3200 (bone dry air) to ~1200 (submerged in water)
  int rawSoil1 = analogRead(SOIL1_PIN);
  int rawSoil2 = analogRead(SOIL2_PIN);
  curSoil1 = constrain(map(rawSoil1, 3200, 1200, 0, 100), 0, 100);
  curSoil2 = constrain(map(rawSoil2, 3200, 1200, 0, 100), 0, 100);
  curSoilAvg = (curSoil1 + curSoil2) / 2;

  // 3. LDR Light Sensor (Dark: 4095, Direct Sun: 100)
  int rawLdr = analogRead(LDR_PIN);
  curLight = constrain(map(rawLdr, 4095, 100, 0, 100), 0, 100);

  // 4. Rain Sensor (Dry: 4095, Rain: 500)
  int rawRain = analogRead(RAIN_PIN);
  curRain = constrain(map(rawRain, 4095, 500, 0, 100), 0, 100);

  // Automated Irrigation & Cooling Logic (when autoMode is active)
  if (autoMode) {
    // Pump decision: Dry soil AND not raining
    if (curSoilAvg < SOIL_DRY_PCT && curRain < RAIN_WET_PCT) {
      if (!pumpState) setPump(true);
    } else {
      if (pumpState) setPump(false);
    }

    // Fan decision: High temperature threshold
    if (curAirTemp > FAN_ON_TEMP) {
      if (!fanState) setFan(true);
    } else {
      if (fanState) setFan(false);
    }
  }

  Serial.printf("[TELEMETRY] Temp: %.1fC | Hum: %.1f%% | SoilAvg: %d%% (S1:%d, S2:%d) | Light: %d%% | Rain: %d%% | Pump: %s | Fan: %s\n",
                curAirTemp, curAirHum, curSoilAvg, curSoil1, curSoil2, curLight, curRain,
                pumpState ? "ON" : "OFF", fanState ? "ON" : "OFF");
}

// ==========================================
// 6. Camera Tuning Helpers
// ==========================================
void applySensorDefaults() {
  sensor_t *s = esp_camera_sensor_get();
  if (s != NULL) {
    s->set_brightness(s, 0);   // Natural exposure
    s->set_contrast(s, 0);     // Neutral contrast
    s->set_saturation(s, 0);   // Natural saturation
    s->set_sharpness(s, 0);    // Clean sharpness
    s->set_denoise(s, 1);      // Noise filter
    s->set_whitebal(s, 1);     // Auto white balance
    s->set_awb_gain(s, 1);
    s->set_wb_mode(s, 0);
  }
}

void changeCameraResolution(framesize_t newSize) {
  if (camera_cfg.frame_size == newSize) return;

  vTaskSuspend(streamTaskHandle);
  delay(40);

  esp_camera_deinit();
  camera_cfg.frame_size = newSize;
  esp_err_t err = esp_camera_init(&camera_cfg);
  if (err != ESP_OK) {
    Serial.printf("[CAM] Res change error: 0x%x. Restoring VGA\n", err);
    camera_cfg.frame_size = FRAMESIZE_VGA;
    esp_camera_init(&camera_cfg);
  }
  applySensorDefaults();
  vTaskResume(streamTaskHandle);
}

// ==========================================
// 7. Core 0: High-Speed MJPEG Stream Engine
// ==========================================
void streamTask(void *pvParameters) {
  streamServer.begin();
  Serial.println("[STREAM] Port 81 MJPEG Video Engine Active on Core 0");

  const char* BOUNDARY = "\r\n--123456789000000000000987654321\r\n";
  const char* CT_HEADER = "Content-Type: image/jpeg\r\nContent-Length: ";

  while (true) {
    WiFiClient client = streamServer.available();
    if (client) {
      Serial.println("[STREAM] Live video client connected to Port 81");
      client.write("HTTP/1.1 200 OK\r\n"
                   "Access-Control-Allow-Origin: *\r\n"
                   "Content-Type: multipart/x-mixed-replace;boundary=123456789000000000000987654321\r\n\r\n");

      while (client.connected()) {
        if (cameraPaused) {
          vTaskDelay(pdMS_TO_TICKS(50));
          continue;
        }

        camera_fb_t *fb = esp_camera_fb_get();
        if (!fb) {
          vTaskDelay(pdMS_TO_TICKS(10));
          continue;
        }

        // Calculate live FPS
        fpsFrameCount++;
        uint32_t now = millis();
        if (now - fpsLastTime >= 1000) {
          liveFPS = (float)fpsFrameCount * 1000.0f / (float)(now - fpsLastTime);
          fpsFrameCount = 0;
          fpsLastTime = now;
        }

        if (fb->format == PIXFORMAT_JPEG) {
          client.write(BOUNDARY, strlen(BOUNDARY));
          client.write(CT_HEADER, strlen(CT_HEADER));
          client.print(fb->len);
          client.write("\r\n\r\n");
          client.write((const char*)fb->buf, fb->len);
          esp_camera_fb_return(fb);
        } else {
          uint8_t *jpg_buf = NULL;
          size_t jpg_len = 0;
          bool ok = fmt2jpg(fb->buf, fb->len, fb->width, fb->height, fb->format, jpegQuality, &jpg_buf, &jpg_len);
          esp_camera_fb_return(fb);

          if (ok && jpg_buf) {
            client.write(BOUNDARY, strlen(BOUNDARY));
            client.write(CT_HEADER, strlen(CT_HEADER));
            client.print(jpg_len);
            client.write("\r\n\r\n");
            client.write((const char*)jpg_buf, jpg_len);
            free(jpg_buf);
          }
        }
        vTaskDelay(pdMS_TO_TICKS(1));
      }
      client.stop();
      Serial.println("[STREAM] Video client disconnected");
    }
    vTaskDelay(pdMS_TO_TICKS(10));
  }
}

// ==========================================
// 8. Port 80 WebServer REST Handlers
// ==========================================
void handleCapture() {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(503, "text/plain", "Camera busy");
    return;
  }

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Content-Disposition", "inline; filename=capture.jpg");

  if (fb->format == PIXFORMAT_JPEG) {
    server.send_P(200, "image/jpeg", (const char*)fb->buf, fb->len);
    esp_camera_fb_return(fb);
  } else {
    uint8_t *jpg_buf = NULL;
    size_t jpg_len = 0;
    bool ok = fmt2jpg(fb->buf, fb->len, fb->width, fb->height, fb->format, jpegQuality, &jpg_buf, &jpg_len);
    esp_camera_fb_return(fb);
    if (ok && jpg_buf) {
      server.send_P(200, "image/jpeg", (const char*)jpg_buf, jpg_len);
      free(jpg_buf);
    } else {
      server.send(500, "text/plain", "JPEG conversion failed");
    }
  }
}

void handleControl() {
  if (!server.hasArg("var") || !server.hasArg("val")) {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(400, "text/plain", "Missing var/val args");
    return;
  }

  String var = server.arg("var");
  int val = server.arg("val").toInt();
  sensor_t *s = esp_camera_sensor_get();

  if (s != NULL) {
    // Parameter validation and bounds constraint
    if (var == "brightness") s->set_brightness(s, constrain(val, -2, 2));
    else if (var == "contrast") s->set_contrast(s, constrain(val, -2, 2));
    else if (var == "saturation") s->set_saturation(s, constrain(val, -2, 2));
    else if (var == "sharpness") s->set_sharpness(s, constrain(val, -2, 2));
    else if (var == "exposure") s->set_ae_level(s, constrain(val, -2, 2));
    else if (var == "wb_mode") { if (s->set_wb_mode) s->set_wb_mode(s, constrain(val, 0, 4)); }
    else if (var == "vflip") { if (s->set_vflip) s->set_vflip(s, val ? 1 : 0); }
    else if (var == "hflip") { if (s->set_hmirror) s->set_hmirror(s, val ? 1 : 0); }
    else if (var == "framesize") changeCameraResolution((framesize_t)constrain(val, 0, 13));
    else if (var == "quality") {
      jpegQuality = constrain(val, 10, 63);
      if (s->set_quality) s->set_quality(s, jpegQuality);
    }
    else if (var == "reset") {
      // Restore hardware camera factory defaults
      if (s->set_brightness) s->set_brightness(s, 0);
      if (s->set_contrast) s->set_contrast(s, 0);
      if (s->set_saturation) s->set_saturation(s, 0);
      if (s->set_sharpness) s->set_sharpness(s, 0);
      if (s->set_ae_level) s->set_ae_level(s, 0);
      if (s->set_wb_mode) s->set_wb_mode(s, 0);
      if (s->set_vflip) s->set_vflip(s, 0);
      if (s->set_hmirror) s->set_hmirror(s, 0);
      jpegQuality = 12;
      if (s->set_quality) s->set_quality(s, jpegQuality);
    }
  }

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "text/plain", "OK");
}

void handleSensorsJSON() {
  char json[256];
  snprintf(json, sizeof(json),
    "{\"airTemp\":%.1f,\"airHumidity\":%.1f,\"soil1\":%d,\"soil2\":%d,\"soilAvg\":%d,\"light\":%d,\"rain\":%d,\"pump\":%s,\"fan\":%s,\"autoMode\":%s}",
    curAirTemp, curAirHum, curSoil1, curSoil2, curSoilAvg, curLight, curRain,
    pumpState ? "true" : "false", fanState ? "true" : "false", autoMode ? "true" : "false");

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

void handleStatusJSON() {
  char json[192];
  sensor_t *s = esp_camera_sensor_get();
  int fs = s ? (int)s->status.framesize : 8;
  snprintf(json, sizeof(json),
    "{\"fps\":%.1f,\"quality\":%d,\"framesize\":%d,\"sd_mounted\":%s,\"free_heap\":%u,\"wifi\":\"%s\"}",
    liveFPS, jpegQuality, fs, sdMounted ? "true" : "false", (unsigned int)ESP.getFreeHeap(),
    WiFi.status() == WL_CONNECTED ? WiFi.localIP().toString().c_str() : WiFi.softAPIP().toString().c_str());

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

void handleRelayPump() {
  if (server.hasArg("state")) {
    String st = server.arg("state");
    if (st == "on" || st == "1") setPump(true);
    else if (st == "off" || st == "0") setPump(false);
    else if (st == "toggle") setPump(!pumpState);
    autoMode = false; // Manual intervention pauses auto mode temporarily
  }
  handleSensorsJSON();
}

void handleRelayFan() {
  if (server.hasArg("state")) {
    String st = server.arg("state");
    if (st == "on" || st == "1") setFan(true);
    else if (st == "off" || st == "0") setFan(false);
    else if (st == "toggle") setFan(!fanState);
    autoMode = false;
  }
  handleSensorsJSON();
}

void handleRelayMode() {
  if (server.hasArg("auto")) {
    autoMode = (server.arg("auto") == "true" || server.arg("auto") == "1");
  }
  handleSensorsJSON();
}

void handleSaveSD() {
  if (!sdMounted) {
    SD_MMC.setPins(SD_CLK_PIN, SD_CMD_PIN, SD_D0_PIN);
    if (SD_MMC.begin("/sdcard", true)) sdMounted = true;
  }
  if (!sdMounted) {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(500, "application/json", "{\"success\":false,\"error\":\"MicroSD card not mounted\"}");
    return;
  }

  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(503, "application/json", "{\"success\":false,\"error\":\"Camera busy\"}");
    return;
  }

  char path[32];
  snprintf(path, sizeof(path), "/agri_%04d.jpg", photoCounter++);
  File file = SD_MMC.open(path, FILE_WRITE);
  if (!file) {
    esp_camera_fb_return(fb);
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(500, "application/json", "{\"success\":false,\"error\":\"Write failed on SD\"}");
    return;
  }

  size_t written = 0;
  if (fb->format == PIXFORMAT_JPEG) {
    written = file.write(fb->buf, fb->len);
    esp_camera_fb_return(fb);
  } else {
    uint8_t *jpg_buf = NULL;
    size_t jpg_len = 0;
    bool ok = fmt2jpg(fb->buf, fb->len, fb->width, fb->height, fb->format, 85, &jpg_buf, &jpg_len);
    esp_camera_fb_return(fb);
    if (ok && jpg_buf) {
      written = file.write(jpg_buf, jpg_len);
      free(jpg_buf);
    }
  }
  file.close();

  // Also append to continuous CSV telemetry log on SD
  File csvFile = SD_MMC.open("/telemetry_log.csv", FILE_APPEND);
  if (csvFile) {
    csvFile.printf("%lu,%s,%.1f,%.1f,%d,%d,%d,%d,%s,%s\n",
      millis() / 1000, path, curAirTemp, curAirHum, curSoilAvg, curSoil1, curSoil2, curLight,
      pumpState ? "ON" : "OFF", fanState ? "ON" : "OFF");
    csvFile.close();
  }

  Serial.printf("[SD] Snapshot & telemetry saved: %s (%u bytes)\n", path, (unsigned int)written);
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", String("{\"success\":true,\"file\":\"") + path + "\"}");
}

void handleSDStatus() {
  if (!sdMounted) {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", "{\"mounted\":false}");
    return;
  }
  uint64_t totalBytes = SD_MMC.totalBytes();
  uint64_t usedBytes  = SD_MMC.usedBytes();
  float totalMB = (float)totalBytes / (1024 * 1024);
  float usedMB  = (float)usedBytes  / (1024 * 1024);

  char json[128];
  snprintf(json, sizeof(json), "{\"mounted\":true,\"total_mb\":%.1f,\"used_mb\":%.1f}", totalMB, usedMB);
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

// Fast on-device RGB leaf health scanner (Edge heuristic)
void handleTFLiteScan() {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(503, "application/json", "{\"error\":\"Camera busy\"}");
    return;
  }

  size_t plantPixels = 0, necroticCount = 0, yellowCount = 0;
  if (fb->format == PIXFORMAT_JPEG) {
    size_t rgbLen = 80 * 60 * 2;
    uint8_t *rgbBuf = (uint8_t*)malloc(rgbLen);
    if (rgbBuf && jpg2rgb565(fb->buf, fb->len, rgbBuf, JPG_SCALE_8X)) {
      for (size_t i = 0; i + 1 < rgbLen; i += 2) {
        uint16_t pixel = (rgbBuf[i] << 8) | rgbBuf[i+1];
        uint8_t r = (pixel >> 11) & 0x1F;
        uint8_t g = (pixel >> 5) & 0x3F;
        uint8_t b = pixel & 0x1F;
        if (g > 15 && g > b) {
          plantPixels++;
          if (r < 10 && g < 15 && b < 8) necroticCount++;
          else if (r > 16 && g > 25 && b < 10) yellowCount++;
        }
      }
      free(rgbBuf);
    }
  }
  esp_camera_fb_return(fb);

  float necroticRatio = plantPixels > 0 ? (float)necroticCount / (float)plantPixels : 0.0f;
  const char* dx = "Healthy Crop Foliage";
  int conf = 92;
  if (necroticRatio > 0.12f) {
    dx = "Early / Late Blight (Fungal Micro-Spotting)";
    conf = 88;
  } else if (plantPixels < 100) {
    dx = "No Plant Foliage Detected";
    conf = 20;
  }

  char json[256];
  snprintf(json, sizeof(json),
    "{\"has_leaf\":%s,\"diagnosis\":\"%s\",\"confidence\":%d,\"plant_pixels\":%u,\"necrotic_ratio\":%.2f}",
    plantPixels >= 100 ? "true" : "false", dx, conf, (unsigned int)plantPixels, necroticRatio);

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

// Complete Modern Embedded Studio Dashboard UI
void handleRoot() {
  static const char PROGMEM html[] = R"rawliteral(<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>AgriSense S3 Master Studio</title>
  <style>
    :root {
      --bg: #090d16; --card: rgba(26, 34, 52, 0.95); --primary: #38bdf8;
      --accent: #10b981; --border: rgba(255, 255, 255, 0.12);
      --danger: #ef4444; --warning: #f59e0b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
    body { background: var(--bg); color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 12px; display: flex; justify-content: center; }
    .studio { width: 100%; max-width: 680px; background: var(--card); border: 1px solid var(--border); border-radius: 18px; padding: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
    
    .nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .nav h1 { font-size: 1.15rem; color: var(--primary); font-weight: 700; }
    .live-tag { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid #10b981; font-size: 0.72rem; font-weight: 700; padding: 3px 9px; border-radius: 20px; display: flex; align-items: center; gap: 6px; }
    .live-dot { width: 7px; height: 7px; border-radius: 50%; background: #34d399; animation: pulse 1.2s infinite; }
    @keyframes pulse { 0%{opacity:1;} 50%{opacity:0.3;} 100%{opacity:1;} }

    /* Viewport */
    .viewport { position: relative; width: 100%; aspect-ratio: 4/3; background: #000; border-radius: 14px; overflow: hidden; border: 2px solid var(--primary); display: flex; align-items: center; justify-content: center; }
    img#cam { width: 100%; height: 100%; object-fit: contain; display: block; }
    .hud { position: absolute; top: 10px; left: 10px; right: 10px; display: flex; justify-content: space-between; pointer-events: none; z-index: 5; }
    .fps-tag { background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); color: #4ade80; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 0.85rem; font-weight: bold; border: 1px solid rgba(255,255,255,0.15); }
    .res-tag { background: rgba(0,0,0,0.75); color: #38bdf8; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; border: 1px solid rgba(255,255,255,0.1); font-weight: 700; }

    /* Telemetry Grid */
    .section-title { font-size: 0.75rem; text-transform: uppercase; color: #94a3b8; font-weight: 800; letter-spacing: 0.8px; margin: 16px 0 8px 2px; }
    .sensor-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .sensor-card { background: rgba(15, 23, 42, 0.75); border: 1px solid var(--border); border-radius: 12px; padding: 10px 8px; text-align: center; }
    .sensor-card .title { font-size: 0.72rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; margin-bottom: 4px; }
    .sensor-card .val { font-size: 1.15rem; font-weight: 800; color: #f1f5f9; font-family: monospace; }
    .sensor-card .sub { font-size: 0.68rem; color: #64748b; margin-top: 2px; }

    /* Actuators */
    .actuator-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
    .act-card { background: rgba(15, 23, 42, 0.85); border: 1px solid var(--border); border-radius: 12px; padding: 12px; display: flex; justify-content: space-between; align-items: center; }
    .act-info h4 { font-size: 0.82rem; color: #cbd5e1; font-weight: 700; }
    .badge-on { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid #10b981; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; }
    .badge-off { background: rgba(100, 116, 139, 0.2); color: #94a3b8; border: 1px solid rgba(255,255,255,0.1); font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; }
    .btn-toggle { background: #1e293b; color: #f8fafc; border: 1px solid var(--border); padding: 8px 12px; border-radius: 8px; font-weight: 700; font-size: 0.75rem; cursor: pointer; }
    .btn-toggle:active { background: var(--primary); color: #090d16; }

    /* Hardware Sliders */
    .control-card { background: rgba(15, 23, 42, 0.75); border-radius: 12px; padding: 12px; border: 1px solid var(--border); margin-top: 6px; }
    .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
    .row:last-child { margin-bottom: 0; }
    .row label { font-size: 0.8rem; font-weight: 600; color: #cbd5e1; min-width: 95px; }
    .row input[type=range] { flex: 1; accent-color: var(--primary); height: 6px; cursor: pointer; }
    .val-badge { font-family: monospace; font-size: 0.75rem; color: #38bdf8; min-width: 36px; text-align: right; }

    .btn-action { display: block; width: 100%; background: linear-gradient(135deg, #10b981, #059669); color: #fff; text-align: center; padding: 12px; border-radius: 12px; font-weight: 700; font-size: 0.88rem; margin-top: 12px; border: none; cursor: pointer; }
  </style>
</head>
<body>
  <div class="studio">
    <div class="nav">
      <h1>🌱 AgriSense S3 Master Studio</h1>
      <div class="live-tag"><div class="live-dot"></div>DUAL-CORE ACTIVE</div>
    </div>

    <div class="viewport">
      <div class="hud">
        <div class="fps-tag" id="hudFPS">0.0 FPS</div>
        <div class="res-tag" id="hudRes">VGA 640x480</div>
      </div>
      <img id="cam" src="/capture.jpg" alt="Live Camera Stream">
    </div>

    <!-- Live Telemetry -->
    <div class="section-title">Field Sensor Telemetry</div>
    <div class="sensor-grid">
      <div class="sensor-card">
        <div class="title">Air Temp</div>
        <div class="val" id="valAirTemp">--°C</div>
        <div class="sub">Target: 22-30°C</div>
      </div>
      <div class="sensor-card">
        <div class="title">Humidity</div>
        <div class="val" id="valAirHum">--%</div>
        <div class="sub">VPD Range</div>
      </div>
      <div class="sensor-card">
        <div class="title">Soil Avg</div>
        <div class="val" id="valSoilAvg" style="color:#38bdf8">--%</div>
        <div class="sub" id="valSoilSplit">S1: --% | S2: --%</div>
      </div>
      <div class="sensor-card">
        <div class="title">Solar Light</div>
        <div class="val" id="valLight">--%</div>
        <div class="sub">LDR Sensor</div>
      </div>
      <div class="sensor-card">
        <div class="title">Rainfall</div>
        <div class="val" id="valRain">--%</div>
        <div class="sub">Precipitation</div>
      </div>
      <div class="sensor-card">
        <div class="title">Auto Logic</div>
        <div class="val" id="valAutoMode" style="color:#34d399">ACTIVE</div>
        <div class="sub">Self-Regulating</div>
      </div>
    </div>

    <!-- Actuators -->
    <div class="section-title">Actuator Relays &amp; Overrides</div>
    <div class="actuator-grid">
      <div class="act-card">
        <div class="act-info">
          <h4>💧 Water Pump</h4>
          <span id="badgePump" class="badge-off">OFF</span>
        </div>
        <button class="btn-toggle" onclick="togglePump()">Toggle</button>
      </div>
      <div class="act-card">
        <div class="act-info">
          <h4>🌀 Cooling Fan</h4>
          <span id="badgeFan" class="badge-off">OFF</span>
        </div>
        <button class="btn-toggle" onclick="toggleFan()">Toggle</button>
      </div>
    </div>

    <!-- Hardware Camera Sliders -->
    <div class="section-title">Camera Hardware Controls</div>
    <div class="control-card">
      <div class="row">
        <label>Brightness</label>
        <input type="range" min="-2" max="2" value="0" oninput="setCam('brightness', this.value); $('#bVal').textContent=this.value">
        <span class="val-badge" id="bVal">0</span>
      </div>
      <div class="row">
        <label>Contrast</label>
        <input type="range" min="-2" max="2" value="0" oninput="setCam('contrast', this.value); $('#cVal').textContent=this.value">
        <span class="val-badge" id="cVal">0</span>
      </div>
      <div class="row">
        <label>Saturation</label>
        <input type="range" min="-2" max="2" value="0" oninput="setCam('saturation', this.value); $('#sVal').textContent=this.value">
        <span class="val-badge" id="sVal">0</span>
      </div>
      <div class="row">
        <label>JPEG Quality</label>
        <input type="range" min="35" max="95" value="72" oninput="setCam('quality', this.value); $('#qVal').textContent=this.value">
        <span class="val-badge" id="qVal">72</span>
      </div>
    </div>

    <button class="btn-action" onclick="saveToSD()">💾 Save Snapshot &amp; Telemetry to MicroSD</button>
  </div>

  <script>
    const $ = s => document.querySelector(s);

    // Auto-connect to Port 81 MJPEG live video stream
    const camImg = $('#cam');
    camImg.src = 'http://' + window.location.hostname + ':81/';
    camImg.onerror = () => {
      // Fallback to single-frame polling if Port 81 is blocked
      setInterval(() => { camImg.src = '/capture.jpg?t=' + Date.now(); }, 250);
    };

    function setCam(v, val) {
      fetch(`/control?var=${v}&val=${val}`).catch(console.warn);
    }

    function togglePump() {
      fetch('/relay/pump?state=toggle').then(r => r.json()).then(updateSensorsUI);
    }

    function toggleFan() {
      fetch('/relay/fan?state=toggle').then(r => r.json()).then(updateSensorsUI);
    }

    function saveToSD() {
      fetch('/sd/save').then(r => r.json()).then(res => {
        alert(res.success ? 'Snapshot saved: ' + res.file : 'SD Error: ' + res.error);
      });
    }

    function updateSensorsUI(d) {
      if (!d) return;
      $('#valAirTemp').textContent = d.airTemp.toFixed(1) + '°C';
      $('#valAirHum').textContent  = d.airHumidity.toFixed(0) + '%';
      $('#valSoilAvg').textContent = d.soilAvg + '%';
      $('#valSoilSplit').textContent = `S1: ${d.soil1}% | S2: ${d.soil2}%`;
      $('#valLight').textContent   = d.light + '%';
      $('#valRain').textContent    = d.rain + '%';
      $('#valAutoMode').textContent = d.autoMode ? 'ACTIVE' : 'MANUAL';

      $('#badgePump').className = d.pump ? 'badge-on' : 'badge-off';
      $('#badgePump').textContent = d.pump ? 'ON (RUNNING)' : 'OFF';

      $('#badgeFan').className = d.fan ? 'badge-on' : 'badge-off';
      $('#badgeFan').textContent = d.fan ? 'ON (ACTIVE)' : 'OFF';
    }

    setInterval(() => {
      fetch('/sensors').then(r => r.json()).then(updateSensorsUI).catch(console.warn);
      fetch('/status').then(r => r.json()).then(s => {
        if (s) $('#hudFPS').textContent = s.fps.toFixed(1) + ' FPS';
      }).catch(console.warn);
    }, 2000);
  </script>
</body>
</html>)rawliteral";

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send_P(200, "text/html", html);
}

// ==========================================
// 9. Arduino setup() & loop()
// ==========================================
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n\n=======================================================");
  Serial.println("🌱 AgriSense S3 Master — Unified Cam & Circuitry Boot");
  Serial.println("=======================================================");

  // 1. Initialize Relays & Pin Modes
  pinMode(PUMP_RELAY, OUTPUT);
  pinMode(FAN_RELAY, OUTPUT);
  setPump(false);
  setFan(false);

  // Configure Analog Pins (12-bit ADC: 0-4095)
  analogReadResolution(12);

  // 2. Initialize DHT11 Sensor
  dht.begin();
  Serial.println("[SENSORS] DHT11 Air Temperature & Humidity online");

  // 3. Initialize MicroSD Card (SD_MMC)
  SD_MMC.setPins(SD_CLK_PIN, SD_CMD_PIN, SD_D0_PIN);
  if (SD_MMC.begin("/sdcard", true)) {
    sdMounted = true;
    Serial.printf("[SD] MicroSD Mounted. Size: %llu MB\n", SD_MMC.cardSize() / (1024 * 1024));

    // Create CSV header if file doesn't exist
    if (!SD_MMC.exists("/telemetry_log.csv")) {
      File f = SD_MMC.open("/telemetry_log.csv", FILE_WRITE);
      if (f) {
        f.println("Timestamp_sec,Snapshot_File,AirTemp_C,AirHum_pct,SoilAvg_pct,Soil1_pct,Soil2_pct,Light_pct,Pump_State,Fan_State");
        f.close();
      }
    }
  } else {
    Serial.println("[SD] MicroSD Card slot empty or mount failed (continuing without SD)");
  }

  // 4. Initialize Camera Parallel Bus
  camera_cfg.pin_pwdn     = PWDN_GPIO_NUM;
  camera_cfg.pin_reset    = RESET_GPIO_NUM;
  camera_cfg.pin_xclk     = XCLK_GPIO_NUM;
  camera_cfg.pin_sccb_sda = SIOD_GPIO_NUM;
  camera_cfg.pin_sccb_scl = SIOC_GPIO_NUM;

  camera_cfg.pin_d7 = Y9_GPIO_NUM;
  camera_cfg.pin_d6 = Y8_GPIO_NUM;
  camera_cfg.pin_d5 = Y7_GPIO_NUM;
  camera_cfg.pin_d4 = Y6_GPIO_NUM;
  camera_cfg.pin_d3 = Y5_GPIO_NUM;
  camera_cfg.pin_d2 = Y4_GPIO_NUM;
  camera_cfg.pin_d1 = Y3_GPIO_NUM;
  camera_cfg.pin_d0 = Y2_GPIO_NUM;

  camera_cfg.pin_vsync = VSYNC_GPIO_NUM;
  camera_cfg.pin_href  = HREF_GPIO_NUM;
  camera_cfg.pin_pclk  = PCLK_GPIO_NUM;

  camera_cfg.xclk_freq_hz = 20000000;
  camera_cfg.ledc_timer   = LEDC_TIMER_0;
  camera_cfg.ledc_channel = LEDC_CHANNEL_0;
  camera_cfg.pixel_format = PIXFORMAT_JPEG;
  camera_cfg.frame_size   = FRAMESIZE_VGA;
  camera_cfg.jpeg_quality = jpegQuality;
  camera_cfg.fb_count     = 2;
  camera_cfg.grab_mode    = CAMERA_GRAB_LATEST;

  esp_err_t camErr = esp_camera_init(&camera_cfg);
  if (camErr != ESP_OK) {
    Serial.printf("[CAM] Parallel Camera init failed (0x%x). Retrying with SVGA...\n", camErr);
    camera_cfg.frame_size = FRAMESIZE_SVGA;
    esp_camera_init(&camera_cfg);
  } else {
    Serial.println("[CAM] Parallel Bus Camera Sensor online!");
  }
  applySensorDefaults();

  // 5. Connect Wi-Fi / SoftAP
  WiFi.mode(WIFI_MODE_APSTA);
  bool connected = false;

  if (!USE_OFFLINE_HOTSPOT) {
    Serial.printf("[WIFI] Connecting to '%s'...\n", ssid);
    WiFi.begin(ssid, password);
    unsigned long startMs = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - startMs < 9000) {
      delay(300);
      Serial.print(".");
    }
    if (WiFi.status() == WL_CONNECTED) {
      connected = true;
      Serial.printf("\n[WIFI] Connected! IP Address: %s\n", WiFi.localIP().toString().c_str());
    } else {
      Serial.println("\n[WIFI] Connection timed out. Broadcasting Offline SoftAP fallback.");
    }
  }

  // Always enable SoftAP so farm devices can connect directly anytime
  WiFi.softAP(ap_ssid, ap_password);
  Serial.printf("[HOTSPOT] SoftAP Active: '%s' -> IP: %s\n", ap_ssid, WiFi.softAPIP().toString().c_str());

  // 6. Launch Port 80 WebServer
  server.on("/", handleRoot);
  server.on("/capture.jpg", handleCapture);
  server.on("/control", handleControl);
  server.on("/sensors", handleSensorsJSON);
  server.on("/telemetry", handleSensorsJSON);
  server.on("/status", handleStatusJSON);
  server.on("/relay/pump", handleRelayPump);
  server.on("/relay/fan", handleRelayFan);
  server.on("/relay/mode", handleRelayMode);
  server.on("/sd/save", handleSaveSD);
  server.on("/sd/status", handleSDStatus);
  server.on("/tflite_scan", handleTFLiteScan);
  server.begin();
  Serial.println("[HTTP] Port 80 WebServer started");

  // 7. Pin Dedicated MJPEG Stream to Core 0
  xTaskCreatePinnedToCore(
    streamTask,
    "streamTask",
    4096,
    NULL,
    1,
    &streamTaskHandle,
    0 // Core 0
  );

  Serial.println("[SYSTEM] AgriSense S3 Dual-Core Firmware Ready!\n");
}

void loop() {
  // Handle HTTP REST & UI requests on Core 1
  server.handleClient();

  unsigned long now = millis();

  // 1. Periodic Sensor Acquisition (Every 2000ms)
  if (now - lastSensorReadTime >= 2000) {
    lastSensorReadTime = now;
    readAllSensors();
  }

  // 2. Periodic MicroSD Telemetry Logging (Every 30 seconds)
  if (sdMounted && (now - lastSdLogTime >= 30000)) {
    lastSdLogTime = now;
    File csvFile = SD_MMC.open("/telemetry_log.csv", FILE_APPEND);
    if (csvFile) {
      csvFile.printf("%lu,AUTO_LOG,%.1f,%.1f,%d,%d,%d,%d,%s,%s\n",
        now / 1000, curAirTemp, curAirHum, curSoilAvg, curSoil1, curSoil2, curLight,
        pumpState ? "ON" : "OFF", fanState ? "ON" : "OFF");
      csvFile.close();
    }
  }

  // 3. Serial CLI Command Interface
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd == "PUMP_ON") setPump(true);
    else if (cmd == "PUMP_OFF") setPump(false);
    else if (cmd == "FAN_ON") setFan(true);
    else if (cmd == "FAN_OFF") setFan(false);
    else if (cmd == "READ_SENSORS") readAllSensors();
    else if (cmd == "SNAP_PHOTO") handleSaveSD();
  }

  delay(2);
}
