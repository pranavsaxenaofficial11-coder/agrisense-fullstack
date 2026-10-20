/* =========================================================================
   AgriSense DevKit V1 — Dedicated Sensor Hub & Google Sheets Ingestion
   =========================================================================
   Target Board: ESP32 DevKit V1 (ESP-WROOM-32, 30/38 pin)
   
   Role in AgriSense Architecture:
     • Dedicated 100% to Sensor Acquisition & Actuator Control
     • Transmits live telemetry to Google Sheets every 3.5 seconds
     • Reads remote manual override pump/fan commands from Google Sheets
     • Dual fallback: Simultaneously outputs USB Serial JSON (115200 baud)
       for direct Chrome/Edge Web Serial connection to https://agrisense-269.pages.dev
     • Edge autonomous fail-safe: Automatically halts pump if soil saturation > 85%
       or if pump runs continuously > 15 minutes.
   
   Hardware Pinout (ESP32 DevKit V1):
     1. DHT11 (Air Temperature & Humidity):   GPIO 4
     2. Soil Moisture Sensor 1:                GPIO 34 (ADC1_CH6 - Input Only)
     3. Soil Moisture Sensor 2:                GPIO 35 (ADC1_CH7 - Input Only)
     4. LDR Light / Solar Radiation:           GPIO 32 (ADC1_CH4)
     5. Raindrop / Precipitation Sensor:       GPIO 33 (ADC1_CH5)
     6. Water Pump Relay (Active LOW):         GPIO 25
     7. Cooling Fan Relay (Active LOW):        GPIO 26
   ========================================================================= */

#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>

// -------------------- 1. WI-FI & CLOUD CONFIGURATION --------------------
// Change to your farm Wi-Fi or mobile hotspot SSID & Password
const char* WIFI_SSID     = "NEW WIFI";
const char* WIFI_PASSWORD = "bBPS@123";

// Google Apps Script Web App Endpoint
const char* WEB_APP_URL = 
  "https://script.google.com/macros/s/"
  "AKfycbxEWNrnzavYmBi6JyLME1dnxTW-xqxL17jZrVtTBhRO0rKKEXpTxAGb3yx_3D-IMzDUiw"
  "/exec";

// -------------------- 2. PIN DEFINITIONS --------------------
#define DHT_PIN       4
#define DHT_TYPE      DHT11

#define SOIL1_PIN     34
#define SOIL2_PIN     35
#define LDR_PIN       32
#define RAIN_PIN      33

#define PUMP_RELAY    25
#define FAN_RELAY     26

// Active-LOW Relays
#define RELAY_ON      LOW
#define RELAY_OFF     HIGH

// -------------------- 3. AGRONOMIC THRESHOLDS --------------------
#define SOIL_DRY_PCT        32.0f // Auto pump ON when soil average < 32%
#define SOIL_SATURATED_PCT  85.0f // Emergency pump OFF if soil > 85%
#define RAIN_SUPPRESS_PCT   45.0f // Inhibit irrigation if rain > 45%
#define FAN_ON_TEMP         34.0f // Auto fan ON when air temp > 34°C
#define MAX_PUMP_RUN_MS     900000UL // 15-minute continuous run safety cutoff

// -------------------- 4. GLOBAL INSTANCES & VARIABLES --------------------
DHT dht(DHT_PIN, DHT_TYPE);

float curAirTemp = 28.5f;
float curAirHum  = 65.0f;
int   curSoil1   = 45;
int   curSoil2   = 48;
int   curSoilAvg = 46;
int   curLight   = 72;
int   curRain    = 0;

bool  pumpState  = false;
bool  fanState   = false;
bool  autoMode   = true;
bool  manualOverrideActive = false;

unsigned long pumpStartTime = 0;
unsigned long lastSensorRead = 0;
unsigned long lastSheetSync  = 0;

// Convert raw 12-bit ADC (0–4095) to calibrated percentage (0–100%)
int rawToPct(int raw, bool invert = true) {
  raw = constrain(raw, 0, 4095);
  float pct = invert ? ((4095.0f - raw) / 4095.0f * 100.0f) : (raw / 4095.0f * 100.0f);
  return constrain((int)round(pct), 0, 100);
}

void setPump(bool on) {
  if (on) {
    digitalWrite(PUMP_RELAY, RELAY_ON);
    if (!pumpState) pumpStartTime = millis();
    pumpState = true;
  } else {
    digitalWrite(PUMP_RELAY, RELAY_OFF);
    pumpState = false;
  }
}

void setFan(bool on) {
  digitalWrite(FAN_RELAY, on ? RELAY_ON : RELAY_OFF);
  fanState = on;
}

// -------------------- 5. SENSOR ACQUISITION --------------------
void readAllSensors() {
  // Read DHT11
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t) && t >= -10.0f && t <= 65.0f) curAirTemp = t;
  if (!isnan(h) && h >= 0.0f && h <= 100.0f)   curAirHum  = h;

  // Read Soil Moisture Probes (Averaged 4 samples to eliminate noise)
  int s1 = 0, s2 = 0, ldr = 0, rain = 0;
  for (int i = 0; i < 4; i++) {
    s1   += analogRead(SOIL1_PIN);
    s2   += analogRead(SOIL2_PIN);
    ldr  += analogRead(LDR_PIN);
    rain += analogRead(RAIN_PIN);
    delay(5);
  }
  s1   /= 4; s2   /= 4; ldr  /= 4; rain /= 4;

  curSoil1   = rawToPct(s1, true);
  curSoil2   = rawToPct(s2, true);
  curSoilAvg = (curSoil1 + curSoil2) / 2;
  curLight   = rawToPct(ldr, true);
  curRain    = rawToPct(rain, true);

  // Autonomous Edge Safety Logic
  if (autoMode && !manualOverrideActive) {
    // If rain is detected or soil is saturated, suppress irrigation
    if (curRain >= RAIN_SUPPRESS_PCT || curSoilAvg >= SOIL_SATURATED_PCT) {
      if (pumpState) setPump(false);
    } else if (curSoilAvg < SOIL_DRY_PCT) {
      // Trigger pump only if not running
      if (!pumpState) setPump(true);
    } else if (curSoilAvg >= 55) {
      if (pumpState) setPump(false);
    }

    // Auto Fan cooling
    if (curAirTemp >= FAN_ON_TEMP) {
      if (!fanState) setFan(true);
    } else if (curAirTemp < FAN_ON_TEMP - 2.0f) {
      if (fanState) setFan(false);
    }
  }

  // Safety Timeout Cutoff
  if (pumpState && (millis() - pumpStartTime > MAX_PUMP_RUN_MS)) {
    setPump(false);
    Serial.println(F("[SAFETY] Pump run timeout (15 min) triggered. Pump halted."));
  }

  // Output USB Serial JSON for Web Serial
  Serial.printf(
    "{\"airTemp\":%.1f,\"airHumidity\":%.1f,\"soilA\":%d,\"soilB\":%d,\"soilAvg\":%d,\"light\":%d,\"rain\":%d,\"pump\":%s,\"fan\":%s,\"mode\":\"%s\"}\n",
    curAirTemp, curAirHum, curSoil1, curSoil2, curSoilAvg, curLight, curRain,
    pumpState ? "true" : "false", fanState ? "true" : "false", autoMode ? "auto" : "manual"
  );
}

// -------------------- 6. GOOGLE SHEETS CLOUD SYNC --------------------
void syncWithGoogleSheets() {
  if (WiFi.status() != WL_CONNECTED) {
    // Attempt non-blocking reconnect
    WiFi.reconnect();
    return;
  }

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
  http.setTimeout(4500);

  int httpCode = http.GET();
  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("[SHEETS] Sync OK (HTTP %d)\n", httpCode);

    // Parse remote control commands from Google Sheet
    bool hasOverride = (response.indexOf("\"manual_override\":true") >= 0) ||
                       (response.indexOf("\"manual_override\": true") >= 0);
    bool cmdPumpOn   = (response.indexOf("\"pump_command\":true") >= 0) ||
                       (response.indexOf("\"pump_command\": true") >= 0);
    bool cmdPumpOff  = (response.indexOf("\"pump_command\":false") >= 0) ||
                       (response.indexOf("\"pump_command\": false") >= 0);

    if (hasOverride) {
      manualOverrideActive = true;
      if (cmdPumpOn && !pumpState) {
        setPump(true);
        Serial.println(F("[COMMAND] Pump turned ON via Google Sheets!"));
      } else if (cmdPumpOff && pumpState) {
        setPump(false);
        Serial.println(F("[COMMAND] Pump turned OFF via Google Sheets!"));
      }
    } else {
      manualOverrideActive = false;
    }
  } else {
    Serial.printf("[SHEETS] Sync Error: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}

// -------------------- 7. SETUP & MAIN LOOP --------------------
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println(F("\n========================================================"));
  Serial.println(F("   AgriSense DevKit V1 — Dedicated Sensor Hub Node     "));
  Serial.println(F("========================================================"));

  // Initialize Relays
  pinMode(PUMP_RELAY, OUTPUT);
  pinMode(FAN_RELAY, OUTPUT);
  digitalWrite(PUMP_RELAY, RELAY_OFF);
  digitalWrite(FAN_RELAY, RELAY_OFF);

  // Initialize Sensors
  pinMode(SOIL1_PIN, INPUT);
  pinMode(SOIL2_PIN, INPUT);
  pinMode(LDR_PIN, INPUT);
  pinMode(RAIN_PIN, INPUT);
  dht.begin();

  // Connect to Wi-Fi
  Serial.printf("[WIFI] Connecting to '%s'...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WIFI] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println(F("\n[WIFI] Connection timeout. Operating in autonomous USB Serial mode."));
  }

  // Initial read
  readAllSensors();
}

void loop() {
  unsigned long now = millis();

  // 1. Periodic Sensor Acquisition (Every 2 seconds)
  if (now - lastSensorRead >= 2000) {
    lastSensorRead = now;
    readAllSensors();
  }

  // 2. Periodic Google Sheets Sync (Every 3.5 seconds)
  if (now - lastSheetSync >= 3500) {
    lastSheetSync = now;
    syncWithGoogleSheets();
  }

  // 3. Serial CLI Command Listener (for Web Serial Two-Way Control)
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd == "PUMP_ON") {
      setPump(true);
      manualOverrideActive = true;
    } else if (cmd == "PUMP_OFF") {
      setPump(false);
      manualOverrideActive = false;
    } else if (cmd == "FAN_ON") {
      setFan(true);
    } else if (cmd == "FAN_OFF") {
      setFan(false);
    } else if (cmd == "MODE_AUTO") {
      autoMode = true;
      manualOverrideActive = false;
    } else if (cmd == "MODE_MANUAL") {
      autoMode = false;
    }
  }

  delay(5);
}
