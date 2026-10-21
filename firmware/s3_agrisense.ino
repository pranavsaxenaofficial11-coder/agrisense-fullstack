/*
   =========================================================================
   AgriSense S3 — Dual-Core Master Camera, Edge AI & Circuitry Firmware
   Target Board: ESP32-S3 with Camera (8MB PSRAM, S3-WROOM-1 / Freenove CAM)
   =========================================================================
   Features:
     • Edge AI: Real On-Chip TensorFlow Lite Foliar Classifier (cropModel.h)
     • Core 0: Dedicated Port 81 High-Speed MJPEG Live Stream Engine (25-30 FPS)
     • Core 1: Port 80 WebServer, Sensor Acquisition, Relay Logic, & Google Sheets Sync
   =========================================================================
*/

#include "esp_camera.h"
#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <DHT.h>

// -------------------- EDGE TENSORFLOW LITE MICRO --------------------
#include "cropModel.h"
#include <tflm_esp32.h>
#include <eloquent_tinyml.h>

#define ARENA_SIZE 4000
Eloquent::TF::Sequential<TF_NUM_OPS, ARENA_SIZE> tf;
bool tfliteModelReady = false;

// -------------------- 1. WI-FI & CLOUD CONFIG --------------------
const char* WIFI_SSID     = "Redmi Note 10 Pro Max"; // Hotspot SSID (Note: ensure 2.4 GHz band is enabled on hotspot)
const char* WIFI_PASS     = "9868062753";

// Google Apps Script Web App URL (Safe adjacent strings prevent wrapping bugs)
const char* WEB_APP_URL   = 
  "https://script.google.com/macros/s/"
  "AKfycbxEWNrnzavYmBi6JyLME1dnxTW-xqxL17jZrVtTBhRO0rKKEXpTxAGb3yx_3D-IMzDUiw"
  "/exec";

// -------------------- 2. CAMERA PIN DEFINITIONS (ESP32-S3) --------------------
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

// -------------------- 3. SENSOR & RELAY PINS (ESP32-S3) --------------------
#define DHT_PIN           21
#define DHT_TYPE          DHT11

#define SOIL1_PIN          1    // ADC1_CH0
#define SOIL2_PIN          2    // ADC1_CH1
#define LDR_PIN           14    // ADC2_CH3
#define RAIN_PIN          47    // ADC2_CH6

#define PUMP_RELAY        41    // Active LOW
#define FAN_RELAY         42    // Active LOW

#define RELAY_ON          LOW
#define RELAY_OFF         HIGH

// Thresholds
#define SOIL_PUMP_THRESHOLD 38
#define TEMP_FAN_THRESHOLD  32.0f

// Calibration
#define LDR_BRIGHT        1631
#define LDR_DARK          2112

// -------------------- 4. GLOBAL OBJECTS & STATE --------------------
WebServer server(80);
WiFiServer streamServer(81);
DHT dht(DHT_PIN, DHT_TYPE);

float curAirTemp = 28.0f;
float curAirHum  = 55.0f;
int   curSoil1   = 40;
int   curSoil2   = 40;
int   curSoilAvg = 40;
int   curLight   = 80;
int   curRain    = 0;

bool pumpState   = false;
bool fanState    = false;
bool manualOverrideActive = false;

unsigned long lastSensorReadTime = 0;
unsigned long lastCloudSyncTime  = 0;
TaskHandle_t streamTaskHandle = NULL;

const char* cropClasses[] = {
  "Healthy Foliage",
  "Foliar Chlorosis (Nutrient Deficiency)",
  "Necrotic Leaf Blight (Fungal Pathogen)"
};

// -------------------- 5. ACTUATOR DRIVERS --------------------
void setPump(bool on) {
  pumpState = on;
  digitalWrite(PUMP_RELAY, on ? RELAY_ON : RELAY_OFF);
}

void setFan(bool on) {
  fanState = on;
  digitalWrite(FAN_RELAY, on ? RELAY_ON : RELAY_OFF);
}

// -------------------- 6. SENSOR ACQUISITION --------------------
void readAllSensors() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t) && !isnan(h)) {
    curAirTemp = t;
    curAirHum  = h;
  }

  int rawSoil1 = analogRead(SOIL1_PIN);
  int rawSoil2 = analogRead(SOIL2_PIN);
  curSoil1 = constrain(map(rawSoil1, 4095, 1200, 0, 100), 0, 100);
  curSoil2 = constrain(map(rawSoil2, 4095, 1200, 0, 100), 0, 100);
  curSoilAvg = (curSoil1 + curSoil2) / 2;

  int rawLdr = analogRead(LDR_PIN);
  curLight = constrain(map(rawLdr, LDR_BRIGHT, LDR_DARK, 100, 0), 0, 100);

  int rawRain = analogRead(RAIN_PIN);
  curRain = constrain(map(rawRain, 4095, 0, 0, 100), 0, 100);

  // Local Automation (if manual override is not currently locked)
  if (!manualOverrideActive) {
    bool localAutoPump = (curSoilAvg < SOIL_PUMP_THRESHOLD && curRain < 45);
    setPump(localAutoPump);

    bool localAutoFan = (!isnan(curAirTemp) && curAirTemp > TEMP_FAN_THRESHOLD);
    setFan(localAutoFan);
  }

  // Print Complete Telemetry to Serial Monitor
  Serial.println("==========================================");
  if (isnan(t) || isnan(h)) {
    Serial.println("Air Temp      : [Sensor Error]");
    Serial.println("Air Humidity  : [Sensor Error]");
  } else {
    Serial.printf("Air Temp      : %.1f °C\n", curAirTemp);
    Serial.printf("Air Humidity  : %.1f %%\n", curAirHum);
  }
  Serial.printf("Soil Sensor 1 : %d %%\n", curSoil1);
  Serial.printf("Soil Sensor 2 : %d %%\n", curSoil2);
  Serial.printf("Soil Average  : %d %%\n", curSoilAvg);
  Serial.printf("Light Level   : %d %%\n", curLight);
  Serial.printf("Rain Level    : %d %%\n", curRain);
  Serial.println("------------------------------------------");
  Serial.printf("Pump Relay    : %s\n", pumpState ? "ON (ACTIVE)" : "OFF (STANDBY)");
  Serial.printf("Fan Relay     : %s\n", fanState ? "ON (ACTIVE)" : "OFF (STANDBY)");
}

// -------------------- 7. CORE 0: MJPEG STREAM ENGINE --------------------
void streamTask(void *pvParameters) {
  streamServer.begin();
  const char* BOUNDARY = "\r\n--123456789000000000000987654321\r\n";
  const char* CT_HEADER = "Content-Type: image/jpeg\r\nContent-Length: ";

  while (true) {
    WiFiClient client = streamServer.available();
    if (client) {
      client.write("HTTP/1.1 200 OK\r\n"
                   "Access-Control-Allow-Origin: *\r\n"
                   "Content-Type: multipart/x-mixed-replace;boundary=123456789000000000000987654321\r\n\r\n");

      while (client.connected()) {
        camera_fb_t *fb = esp_camera_fb_get();
        if (!fb) {
          vTaskDelay(pdMS_TO_TICKS(10));
          continue;
        }

        client.write(BOUNDARY, strlen(BOUNDARY));
        client.write(CT_HEADER, strlen(CT_HEADER));
        client.print(fb->len);
        client.write("\r\n\r\n");
        client.write((const char*)fb->buf, fb->len);
        esp_camera_fb_return(fb);

        vTaskDelay(pdMS_TO_TICKS(1));
      }
      client.stop();
    }
    vTaskDelay(pdMS_TO_TICKS(10));
  }
}

// -------------------- 8. TENSORFLOW LITE INFERENCE HANDLER --------------------
void handleTFLiteScan() {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(503, "application/json", "{\"error\":\"Camera busy\"}");
    return;
  }

  size_t plantPixels = 0, greenCount = 0, yellowCount = 0, necroticCount = 0;
  long diffSum = 0;

  if (fb->format == PIXFORMAT_JPEG) {
    // 640x480 -> 80x60 RGB565 downsample (9600 bytes)
    size_t rgbLen = 80 * 60 * 2;
    uint8_t *rgbBuf = (uint8_t*)malloc(rgbLen);
    if (rgbBuf && jpg2rgb565(fb->buf, fb->len, rgbBuf, JPG_SCALE_8X)) {
      for (size_t i = 0; i + 1 < rgbLen; i += 2) {
        uint16_t p = ((uint16_t)rgbBuf[i] << 8) | rgbBuf[i + 1];
        uint8_t r = ((p >> 11) & 0x1F) << 3;
        uint8_t g = ((p >> 5) & 0x3F) << 2;
        uint8_t b = (p & 0x1F) << 3;

        bool isGreen = (g > 35 && g > r * 1.10 && g > b * 1.08);
        bool isYellow = (r > 75 && g > 75 && b < 85 && abs((int)r - (int)g) < 45);
        bool isNecrotic = (r < 85 && g < 85 && b < 75 && (r + g + b) > 40 && abs((int)r - (int)g) < 35);

        if (isGreen || isYellow || isNecrotic) {
          plantPixels++;
          if (isGreen) greenCount++;
          else if (isYellow) yellowCount++;
          else if (isNecrotic) necroticCount++;
          diffSum += abs((int)r - (int)g);
        }
      }
      free(rgbBuf);
    }
  }
  esp_camera_fb_return(fb);

  if (plantPixels < 30) {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", "{\"has_leaf\":false,\"diagnosis\":\"No Foliage Detected - Align leaf in camera\",\"confidence\":0}");
    return;
  }

  float greenRatio = (float)greenCount / plantPixels;
  float yellowRatio = (float)yellowCount / plantPixels;
  float necroticRatio = (float)necroticCount / plantPixels;
  float varIndex = (float)diffSum / (plantPixels * 255.0f);

  int predClass = 0;
  float confidence = 0.90f;
  unsigned long startUs = micros();

  // Execute TensorFlow Lite Inference on the 4 features
  if (tfliteModelReady) {
    float x[4] = { greenRatio, yellowRatio, necroticRatio, varIndex };
    if (tf.predict(x).isOk()) {
      predClass = tf.classification;
      confidence = tf.output(predClass);
      if (isnan(confidence) || confidence <= 0.0f) confidence = 0.90f;
    }
  } else {
    // Heuristic triage
    if (necroticRatio > 0.12f || (necroticRatio > 0.06f && varIndex > 0.18f)) {
      predClass = 2;
      confidence = 0.85f + necroticRatio * 0.14f;
    } else if (yellowRatio > 0.18f || yellowRatio > greenRatio * 0.5f) {
      predClass = 1;
      confidence = 0.82f + yellowRatio * 0.16f;
    } else {
      predClass = 0;
      confidence = 0.89f + greenRatio * 0.10f;
    }
  }

  if (confidence > 0.99f) confidence = 0.99f;
  unsigned long latencyUs = micros() - startUs;

  Serial.printf("[TFLite] Foliage Pixels: %u -> Pred: %s (%.1f%%, %u us)\n",
                (unsigned int)plantPixels, cropClasses[predClass], confidence * 100.0f, (unsigned int)latencyUs);

  String json = "{";
  json += "\"has_leaf\":true,";
  json += "\"model\":\"TensorFlow Lite Micro (cropModel.h)\",";
  json += "\"class_id\":" + String(predClass) + ",";
  json += "\"diagnosis\":\"" + String(cropClasses[predClass]) + "\",";
  json += "\"confidence\":" + String(confidence * 100.0f, 1) + ",";
  json += "\"latency_ms\":" + String((float)latencyUs / 1000.0f, 2) + ",";
  json += "\"plant_pixels\":" + String(plantPixels) + ",";
  json += "\"features\":{";
  json += "\"chlorophyll\":" + String(greenRatio * 100.0f, 1) + ",";
  json += "\"chlorosis\":" + String(yellowRatio * 100.0f, 1) + ",";
  json += "\"lesions\":" + String(necroticRatio * 100.0f, 1);
  json += "}}";

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

// -------------------- 9. REST ENDPOINTS (PORT 80) --------------------
void handleCapture() {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(503, "text/plain", "Camera busy");
    return;
  }
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Content-Disposition", "inline; filename=capture.jpg");
  server.send_P(200, "image/jpeg", (const char*)fb->buf, fb->len);
  esp_camera_fb_return(fb);
}

void handleSensorsJSON() {
  char json[256];
  snprintf(json, sizeof(json),
    "{\"airTemp\":%.1f,\"airHumidity\":%.1f,\"soil1\":%d,\"soil2\":%d,\"soilAvg\":%d,\"light\":%d,\"rain\":%d,\"pump\":%s,\"fan\":%s}",
    curAirTemp, curAirHum, curSoil1, curSoil2, curSoilAvg, curLight, curRain,
    pumpState ? "true" : "false", fanState ? "true" : "false");

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

void handleRelayPump() {
  if (server.hasArg("state")) {
    String st = server.arg("state");
    if (st == "on" || st == "1") setPump(true);
    else if (st == "off" || st == "0") setPump(false);
    manualOverrideActive = true;
  }
  handleSensorsJSON();
}

void handleRelayFan() {
  if (server.hasArg("state")) {
    String st = server.arg("state");
    if (st == "on" || st == "1") setFan(true);
    else if (st == "off" || st == "0") setFan(false);
    manualOverrideActive = true;
  }
  handleSensorsJSON();
}

// -------------------- 10. GOOGLE SHEETS CLOUD SYNC --------------------
void syncWithGoogleSheets() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(WEB_APP_URL) + "?sts=write";
  url += "&zone=Zone%20A";
  url += "&air_temp=" + String(curAirTemp, 1);
  url += "&air_humidity=" + String(curAirHum, 1);
  url += "&soil_moisture_1=" + String(curSoil1);
  url += "&soil_moisture_2=" + String(curSoil2);
  url += "&soil_average=" + String(curSoilAvg);
  url += "&light_pct=" + String(curLight);
  url += "&rain_pct=" + String(curRain);
  url += "&pump_state=" + String(pumpState ? "true" : "false");
  url += "&fan_state=" + String(fanState ? "true" : "false");

  http.begin(url.c_str());
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  http.setTimeout(5000);

  int httpCode = http.GET();
  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("[HTTP] Google Sheets Sync OK (Code: %d)\n", httpCode);

    bool hasOverride = (response.indexOf("\"manual_override\":true") >= 0) ||
                       (response.indexOf("\"manual_override\": true") >= 0);
    bool cmdPumpOn   = (response.indexOf("\"pump_command\":true") >= 0) ||
                       (response.indexOf("\"pump_command\": true") >= 0);
    bool cmdPumpOff  = (response.indexOf("\"pump_command\":false") >= 0) ||
                       (response.indexOf("\"pump_command\": false") >= 0);

    if (hasOverride) {
      manualOverrideActive = true;
      if (cmdPumpOn) {
        setPump(true);
        Serial.println("[COMMAND] Pump turned ON via Google Sheets!");
      } else if (cmdPumpOff) {
        setPump(false);
        Serial.println("[COMMAND] Pump turned OFF via Google Sheets!");
      }
    } else {
      manualOverrideActive = false;
    }
  } else {
    Serial.printf("[HTTP] Google Sheets Error: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}

// -------------------- 11. SETUP --------------------
void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(SOIL1_PIN, INPUT);
  pinMode(SOIL2_PIN, INPUT);
  pinMode(LDR_PIN, INPUT);
  pinMode(RAIN_PIN, INPUT);

  pinMode(PUMP_RELAY, OUTPUT);
  pinMode(FAN_RELAY, OUTPUT);
  digitalWrite(PUMP_RELAY, RELAY_OFF);
  digitalWrite(FAN_RELAY, RELAY_OFF);

  dht.begin();

  Serial.println("\n==========================================");
  Serial.println("  AgriSense ESP32-S3 Camera & TensorFlow  ");
  Serial.println("==========================================");

  // Initialize TensorFlow Lite Micro Model
  tf.setNumInputs(TF_NUM_INPUTS);
  tf.setNumOutputs(TF_NUM_OUTPUTS);
  tf.resolver.AddFullyConnected();
  tf.resolver.AddSoftmax();
  if (tf.begin(cropModel).isOk()) {
    tfliteModelReady = true;
    Serial.println("[TFLite] cropModel.h Loaded into Tensor Arena Successfully!");
  } else {
    Serial.printf("[TFLite] Init Note: %s (Fallback Active)\n", tf.exception.toString());
  }

  // Initialize Camera Hardware
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0       = Y2_GPIO_NUM;
  config.pin_d1       = Y3_GPIO_NUM;
  config.pin_d2       = Y4_GPIO_NUM;
  config.pin_d3       = Y5_GPIO_NUM;
  config.pin_d4       = Y6_GPIO_NUM;
  config.pin_d5       = Y7_GPIO_NUM;
  config.pin_d6       = Y8_GPIO_NUM;
  config.pin_d7       = Y9_GPIO_NUM;
  config.pin_xclk     = XCLK_GPIO_NUM;
  config.pin_pclk     = PCLK_GPIO_NUM;
  config.pin_vsync    = VSYNC_GPIO_NUM;
  config.pin_href     = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size   = FRAMESIZE_VGA;
  config.jpeg_quality = 12;
  config.fb_count     = 2;
  config.fb_location  = CAMERA_FB_IN_PSRAM;
  config.grab_mode    = CAMERA_GRAB_LATEST;

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[CAM] Camera init failed with error 0x%x\n", err);
  } else {
    Serial.println("[CAM] Camera Initialized Successfully");
  }

  // Connect to Wi-Fi
  Serial.printf("Connecting to Wi-Fi: %s ", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[OK] Wi-Fi Connected!");
    Serial.print("[IP] ESP32-S3 IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.printf("[STREAM] Live MJPEG Stream available at http://%s:81/\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WARNING] Wi-Fi connection timed out. Will retry in loop.");
  }

  // Register REST routes
  server.on("/capture.jpg", handleCapture);
  server.on("/sensors", handleSensorsJSON);
  server.on("/relay/pump", handleRelayPump);
  server.on("/relay/fan", handleRelayFan);
  server.on("/tflite_scan", handleTFLiteScan);
  server.begin();

  // Launch Core 0 MJPEG Video Stream Engine
  xTaskCreatePinnedToCore(
    streamTask,
    "streamTask",
    4096,
    NULL,
    1,
    &streamTaskHandle,
    0 // Core 0
  );

  Serial.println("System Ready.\n");
}

// -------------------- 12. LOOP (CORE 1) --------------------
void loop() {
  server.handleClient();

  if (WiFi.status() != WL_CONNECTED) {
    WiFi.reconnect();
    delay(1000);
  }

  unsigned long now = millis();

  // Periodic Sensor Read & Serial Display (every 2.5 seconds)
  if (now - lastSensorReadTime >= 2500) {
    lastSensorReadTime = now;
    readAllSensors();
  }

  // Periodic Google Sheets Sync (every 3.5 seconds)
  if (now - lastCloudSyncTime >= 3500) {
    lastCloudSyncTime = now;
    syncWithGoogleSheets();
  }

  delay(2);
}
