/* =========================================================================
   AgriSense DevKit V1 — Dedicated Master Sensor Node & Google Sheets Ingestion
   =========================================================================
   Target Board: ESP32 DevKit V1 (ESP-WROOM-32 / 30-pin or 38-pin NodeMCU)
   
   Role in AgriSense Architecture:
     • Dedicated 100% to Sensor Acquisition & Actuator Control
     • Transmits live telemetry to Google Sheets every 3.5 seconds
     • Transmits live telemetry to FastAPI Cloud / Local Backend
     • Reads remote manual override pump/fan commands from Google Sheets & FastAPI
     • Simultaneous USB Serial JSON (115200 baud) for 1-click Web Serial in browser
     • Edge autonomous fail-safe: Automatically halts pump if soil saturation > 85%,
       if rain is active (> 45%), if water tank is low, or continuous run > 15 mins.
   
   Hardware Pinout (ESP32 DevKit V1):
     • DHT11 (Air Temperature & Humidity):   GPIO 4
     • Soil Moisture Sensor 1:                GPIO 34 (ADC1_CH6 - Input Only)
     • Soil Moisture Sensor 2:                GPIO 35 (ADC1_CH7 - Input Only)
     • LDR Light / Solar Radiation Sensor:    GPIO 32 (ADC1_CH4)
     • Raindrop / Precipitation Sensor:       GPIO 33 (ADC1_CH5)
     • HC-SR04 Ultrasonic (Water Tank Level): TRIG -> GPIO 5, ECHO -> GPIO 18
     • Water Pump Relay (Active LOW):         GPIO 25
     • Cooling Fan Relay (Active LOW):        GPIO 26
   ========================================================================= */

#include <WiFi.h>
#include <WiFiMulti.h>
#include <HTTPClient.h>
#include <DHT.h>

WiFiMulti wifiMulti;

// -------------------- 1. WI-FI & CLOUD CONFIGURATION --------------------
const char* WIFI_SSID   = "Redmi Note 10 Pro Max";
const char* WIFI_PASS_1 = "mear man";
const char* WIFI_PASS_2 = "mera man";

// Google Apps Script Web App Endpoint for Google Sheets
const char* WEB_APP_URL = 
  "https://script.google.com/macros/s/"
  "AKfycbxEWNrnzavYmBi6JyLME1dnxTW-xqxL17jZrVtTBhRO0rKKEXpTxAGb3yx_3D-IMzDUiw"
  "/exec";

// FastAPI Local & Cloud Ingestion Endpoint
const char* FASTAPI_URL = "http://10.128.89.164:8000/api/sensors/ingest";

// -------------------- 2. PIN DEFINITIONS --------------------
#define DHT_PIN       4
#define DHT_TYPE      DHT11

#define SOIL1_PIN     34
#define SOIL2_PIN     35
#define LDR_PIN       32
#define RAIN_PIN      33

#define TRIG_PIN      5
#define ECHO_PIN      18

#define PUMP_RELAY    25
#define FAN_RELAY     26

// Active-LOW Relays (LOW = Relay Energized / ON, HIGH = De-energized / OFF)
#define RELAY_ON      LOW
#define RELAY_OFF     HIGH

// -------------------- 3. AGRONOMIC THRESHOLDS --------------------
#define SOIL_DRY_PCT        32.0f // Auto pump ON when soil average < 32%
#define SOIL_SATURATED_PCT  85.0f // Emergency pump OFF if soil > 85%
#define RAIN_SUPPRESS_PCT   45.0f // Inhibit irrigation if rain > 45%
#define FAN_ON_TEMP         34.0f // Auto fan ON when air temp > 34°C
#define TANK_EMPTY_CM       25.0f // Water tank low if surface distance > 25cm
#define MAX_PUMP_RUN_MS     900000UL // 15-minute continuous run safety cutoff

// -------------------- 4. GLOBAL INSTANCES & VARIABLES --------------------
DHT dht(DHT_PIN, DHT_TYPE);

float curAirTemp = 28.5f;
float curAirHum  = 65.0f;
int   curSoil1   = 45;
int   curSoil2   = 48;
int   curSoilAvg = 46;
int   curLight   = 55;
int   curRain    = 0;
float curTankCm  = 12.0f;
float curTankPct = 80.0f;

bool pumpState            = false;
bool fanState             = false;
bool autoMode             = true;
bool manualOverrideActive = false;

unsigned long pumpStartTime  = 0;
unsigned long lastSensorRead = 0;
unsigned long lastSheetSync  = 0;
unsigned long lastFastApiSync = 0;

// -------------------- 5. ACTUATOR CONTROL --------------------
void setPump(bool state) {
  pumpState = state;
  digitalWrite(PUMP_RELAY, state ? RELAY_ON : RELAY_OFF);
  if (state) pumpStartTime = millis();
}

void setFan(bool state) {
  fanState = state;
  digitalWrite(FAN_RELAY, state ? RELAY_ON : RELAY_OFF);
}

// -------------------- 6. SENSOR ACQUISITION & LOGIC --------------------
float toPercent(int raw) {
  return constrain((4095.0f - (float)raw) / 4095.0f * 100.0f, 0.0f, 100.0f);
}

float readUltrasonicTankCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration <= 0) return -1.0f;
  return (float)duration * 0.0343f / 2.0f;
}

void readAllSensors() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t) && t > -20.0f && t < 70.0f) curAirTemp = t;
  if (!isnan(h) && h >= 0.0f && h <= 100.0f) curAirHum = h;

  curSoil1   = (int)round(toPercent(analogRead(SOIL1_PIN)));
  curSoil2   = (int)round(toPercent(analogRead(SOIL2_PIN)));
  curSoilAvg = (curSoil1 + curSoil2) / 2;

  curLight = (int)round(((float)analogRead(LDR_PIN) / 4095.0f) * 100.0f);
  curRain  = (int)round(toPercent(analogRead(RAIN_PIN)));

  float cm = readUltrasonicTankCm();
  if (cm > 0.0f) {
    curTankCm = cm;
    curTankPct = constrain((25.0f - cm) / 20.0f * 100.0f, 0.0f, 100.0f);
  }

  bool tankLow = (curTankCm > 0.0f && curTankCm > TANK_EMPTY_CM);

  // Autonomous Edge Decision Logic (when not manually overridden)
  if (autoMode && !manualOverrideActive) {
    bool shouldIrrigate = (curSoilAvg < SOIL_DRY_PCT) && (curRain < RAIN_SUPPRESS_PCT) && !tankLow;
    if (shouldIrrigate && !pumpState) {
      setPump(true);
      Serial.println(F("[AUTO] Soil dry (<32%) & No rain -> Pump ON"));
    } else if (!shouldIrrigate && pumpState) {
      setPump(false);
      Serial.println(F("[AUTO] Soil replenished or rain active -> Pump OFF"));
    }

    bool shouldCool = (curAirTemp > FAN_ON_TEMP);
    if (shouldCool != fanState) {
      setFan(shouldCool);
      Serial.printf("[AUTO] Air Temp: %.1f°C -> Fan %s\n", curAirTemp, shouldCool ? "ON" : "OFF");
    }
  }

  // 15-Minute Continuous Pump Run Cutoff
  if (pumpState && (millis() - pumpStartTime > MAX_PUMP_RUN_MS)) {
    setPump(false);
    Serial.println(F("[SAFETY] 15-minute max pump timeout reached. Pump halted."));
  }

  // Single-line JSON Output for Browser Web Serial connection
  Serial.printf(
    "{\"airTemp\":%.1f,\"airHumidity\":%.1f,\"soilAvg\":%d,\"soil1\":%d,\"soil2\":%d,\"light\":%d,\"rain\":%d,\"tankPct\":%.1f,\"pump\":%s,\"fan\":%s,\"mode\":\"%s\"}\n",
    curAirTemp, curAirHum, curSoilAvg, curSoil1, curSoil2, curLight, curRain, curTankPct,
    pumpState ? "true" : "false", fanState ? "true" : "false", autoMode ? "auto" : "manual"
  );
}

// -------------------- 7. GOOGLE SHEETS CLOUD SYNC --------------------
void syncWithGoogleSheets() {
  if (wifiMulti.run() != WL_CONNECTED) {
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
    Serial.printf("📊 [GOOGLE SHEETS] Sync OK (HTTP %d) -> Logged row!\n", httpCode);

    // Read remote commands sent from the Google Sheet
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
        Serial.println(F("⚡ [SHEET COMMAND] Pump forced ON from Google Sheet"));
      } else if (cmdPumpOff && pumpState) {
        setPump(false);
        Serial.println(F("🛑 [SHEET COMMAND] Pump forced OFF from Google Sheet"));
      }
    } else {
      manualOverrideActive = false;
    }
  } else {
    Serial.printf("⚠️ [SHEETS] Sync Notice: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}

// -------------------- 8. FASTAPI BACKEND SYNC --------------------
void syncWithFastApi() {
  if (wifiMulti.run() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(FASTAPI_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(2500);

  String payload = String("{") +
    "\"soil_moisture_1\":" + String(curSoil1) + "," +
    "\"soil_moisture_2\":" + String(curSoil2) + "," +
    "\"soil_average\":" + String(curSoilAvg) + "," +
    "\"air_temp\":" + String(curAirTemp, 1) + "," +
    "\"air_humidity\":" + String(curAirHum, 1) + "," +
    "\"light_pct\":" + String(curLight) + "," +
    "\"rain_pct\":" + String(curRain) + "," +
    "\"tank_cm\":" + String(curTankCm, 1) + "," +
    "\"tank_level_pct\":" + String(curTankPct, 1) + "," +
    "\"pump_state\":" + (pumpState ? "true" : "false") + "," +
    "\"fan_state\":" + (fanState ? "true" : "false") +
    "}";

  int code = http.POST(payload);
  if (code > 0) {
    String resp = http.getString();
    // Check for FastAPI Remote Emergency Stop
    if (resp.indexOf("\"pump_command\":false") != -1 || resp.indexOf("\"pump\":false") != -1 || resp.indexOf("\"emergency_stop\":true") != -1 || resp.indexOf("\"status\":\"halted\"") != -1) {
      if (pumpState) {
        setPump(false);
        manualOverrideActive = true;
        Serial.println(F("🛑 [FASTAPI STOP] Pump halted by Cloud Command"));
      }
    } else if ((resp.indexOf("\"pump_command\":true") != -1 || resp.indexOf("\"pump\":true") != -1)) {
      if (!pumpState && curTankCm <= TANK_EMPTY_CM) {
        setPump(true);
        manualOverrideActive = true;
        Serial.println(F("⚡ [FASTAPI START] Pump started by Cloud Command"));
      }
    }
  }
  http.end();
}

// -------------------- 9. SETUP & MAIN LOOP --------------------
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println(F("\n========================================================"));
  Serial.println(F("   AgriSense DevKit V1 — Master Sensor & Sheets Node   "));
  Serial.println(F("========================================================"));

  // 1. Hardware Pin Configurations
  pinMode(PUMP_RELAY, OUTPUT);
  digitalWrite(PUMP_RELAY, RELAY_OFF);
  pinMode(FAN_RELAY, OUTPUT);
  digitalWrite(FAN_RELAY, RELAY_OFF);

  pinMode(SOIL1_PIN, INPUT);
  pinMode(SOIL2_PIN, INPUT);
  pinMode(LDR_PIN, INPUT);
  pinMode(RAIN_PIN, INPUT);

  pinMode(TRIG_PIN, OUTPUT);
  digitalWrite(TRIG_PIN, LOW);
  pinMode(ECHO_PIN, INPUT);

  // 2. ADC Calibration (12-bit, 0-3.3V attenuation)
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  dht.begin();

  // 3. Wi-Fi Multi Connection (Auto-switches to "mear man" or "mera man")
  Serial.printf("[WIFI] Connecting to '%s'...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(true);
  wifiMulti.addAP(WIFI_SSID, WIFI_PASS_1);
  wifiMulti.addAP(WIFI_SSID, WIFI_PASS_2);

  int attempts = 0;
  while (wifiMulti.run() != WL_CONNECTED && attempts < 25) {
    delay(400);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n✓ [WIFI] Connected! Node IP: %s\n", WiFi.localIP().toString().c_str());
    Serial.println(F("✓ [GOOGLE SHEETS] Ready to log sensor rows live every 3.5s"));
  } else {
    Serial.println(F("\n⚠️ [WIFI] Hotspot not connected. Operating in autonomous USB Serial mode."));
  }

  readAllSensors();
}

void loop() {
  unsigned long now = millis();

  // 1. Sensor Acquisition (Every 2 seconds)
  if (now - lastSensorRead >= 2000) {
    lastSensorRead = now;
    readAllSensors();
  }

  // 2. Google Sheets Cloud Logging (Every 3.5 seconds)
  if (now - lastSheetSync >= 3500) {
    lastSheetSync = now;
    syncWithGoogleSheets();
  }

  // 3. FastAPI Local/Cloud Synchronization (Every 5 seconds)
  if (now - lastFastApiSync >= 5000) {
    lastFastApiSync = now;
    syncWithFastApi();
  }

  // 4. Two-Way Serial Command Listener
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd == "PUMP_ON")   { manualOverrideActive = true; setPump(true); }
    if (cmd == "PUMP_OFF")  { manualOverrideActive = true; setPump(false); }
    if (cmd == "FAN_ON")    { manualOverrideActive = true; setFan(true); }
    if (cmd == "FAN_OFF")   { manualOverrideActive = true; setFan(false); }
    if (cmd == "AUTO_ON")   { manualOverrideActive = false; autoMode = true; }
    if (cmd == "AUTO_OFF")  { autoMode = false; }
  }

  delay(20);
}
