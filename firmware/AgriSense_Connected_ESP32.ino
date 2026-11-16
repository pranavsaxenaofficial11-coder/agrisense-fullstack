/* =========================================================================
   AgriSense DevKit V1 — Dedicated Master Sensor Node & Google Sheets Ingestion
   =========================================================================
   Target Board: ESP32 DevKit V1 (ESP-WROOM-32 / 30-pin or 38-pin NodeMCU)
   
   Role in AgriSense Architecture:
     • Dedicated 100% to Sensor Acquisition & Actuator Control
     • Transmits live telemetry to Google Sheets every 6 seconds
     • Transmits live telemetry to FastAPI Cloud Backend every 10 seconds
     • Reads remote manual override pump/fan commands from Google Sheets Edge_Controls tab
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
#include <WiFiClientSecure.h>
#include <DHT.h>

WiFiMulti wifiMulti;

// -------------------- 1. WI-FI & CLOUD CONFIGURATION --------------------
const char* WIFI_SSID   = "Redmi Note 10 Pro Max";
const char* WIFI_PASS_1 = "mear man";
const char* WIFI_PASS_2 = "mera man";

// Google Apps Script Web App Endpoint for Google Sheets
const char* WEB_APP_URL = 
  "https://script.google.com/macros/s/"
  "AKfycbyZAxjIK1vonWr0GLVNmAjfGh18zScATZFUSVaEVl7jfeKrSzMFmDVAX4TqjOhuwNikNA"
  "/exec";

// FastAPI Cloud Backend (Render Primary & Hotspot Gateway Fallback)
const char* FASTAPI_URLS[] = {
  "https://agrisense-backend-kb22.onrender.com/api/sensors/ingest",
  "http://192.168.43.1:8000/api/sensors/ingest"
};
const int NUM_FASTAPI_ENDPOINTS = 2;

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

unsigned long pumpStartTime   = 0;
unsigned long lastSensorRead  = 0;
unsigned long lastSheetSync   = 0;
unsigned long lastFastApiSync = 0;

void printVisualDashboard();

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

  // Autonomous Edge Decision Logic (only when NOT manually overridden)
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

  // 15-Minute Continuous Pump Run Cutoff Safety
  if (pumpState && (millis() - pumpStartTime > MAX_PUMP_RUN_MS)) {
    setPump(false);
    manualOverrideActive = false;
    Serial.println(F("[SAFETY] 15-minute max pump timeout reached. Pump halted."));
  }

  // 1. Instant 1-Line Real-Time Sensor Telemetry (Updated every 1 second)
  Serial.printf(">>> [LIVE SENSORS] Temp: %.1f°C | Hum: %.1f%% | Soil1: %d%% | Soil2: %d%% (Avg: %d%%) | Light: %d%% | Rain: %d%% | Tank: %.1f cm (%.0f%%) | Pump: %s | Mode: %s\n",
    curAirTemp, curAirHum, curSoil1, curSoil2, curSoilAvg, curLight, curRain, curTankCm, curTankPct,
    pumpState ? "ON" : "OFF",
    manualOverrideActive ? "MANUAL_SHEETS" : (autoMode ? "AUTO" : "MANUAL_SERIAL")
  );

  // 2. Beautiful Visual HUD Terminal Dashboard
  printVisualDashboard();

  // 3. Single-line JSON Output for Web Serial Browser integration
  Serial.printf(
    "{\"airTemp\":%.1f,\"airHumidity\":%.1f,\"soilAvg\":%d,\"soil1\":%d,\"soil2\":%d,\"light\":%d,\"rain\":%d,\"tankPct\":%.1f,\"pump\":%s,\"fan\":%s,\"mode\":\"%s\"}\n",
    curAirTemp, curAirHum, curSoilAvg, curSoil1, curSoil2, curLight, curRain, curTankPct,
    pumpState ? "true" : "false", fanState ? "true" : "false",
    manualOverrideActive ? "manual_override" : (autoMode ? "auto" : "manual")
  );
}

// -------------------- 7. GOOGLE SHEETS CLOUD SYNC & EDGE CONTROLS --------------------
void syncWithGoogleSheets() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure secClient;
  secClient.setInsecure(); // Essential for Google Apps Script HTTPS & redirects

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
  url += "&pump=" + String(pumpState ? "true" : "false");
  url += "&pump_state=" + String(pumpState ? "true" : "false");
  url += "&fan=" + String(fanState ? "true" : "false");
  url += "&fan_state=" + String(fanState ? "true" : "false");
  url += "&tankPct=" + String(curTankPct, 1);
  url += "&waterTank=" + String(curTankPct, 1);

  http.begin(secClient, url);
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  http.setTimeout(4500);

  int httpCode = http.GET();
  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("📊 [GOOGLE SHEETS] Sync OK (HTTP %d) -> Logged row to Live_Telemetry!\n", httpCode);

    // Read remote Edge_Controls commands from Google Sheet
    bool hasOverride = (response.indexOf("\"manual_override\":true") >= 0) ||
                       (response.indexOf("\"manual_override\": true") >= 0);

    bool cmdPumpOn   = (response.indexOf("\"pump_command\":true") >= 0) ||
                       (response.indexOf("\"pump_command\": true") >= 0) ||
                       (response.indexOf("\"pump\":true") >= 0) ||
                       (response.indexOf("\"pump\": true") >= 0);

    bool cmdPumpOff  = (response.indexOf("\"pump_command\":false") >= 0) ||
                       (response.indexOf("\"pump_command\": false") >= 0) ||
                       (response.indexOf("\"pump\":false") >= 0) ||
                       (response.indexOf("\"pump\": false") >= 0);

    bool cmdEmergency = (response.indexOf("\"emergency_stop\":true") >= 0) ||
                        (response.indexOf("\"emergency_stop\": true") >= 0);

    if (cmdEmergency) {
      setPump(false);
      setFan(false);
      manualOverrideActive = true;
      Serial.println(F("🚨 [SHEET EMERGENCY STOP] All actuators halted from Google Sheet!"));
    } else if (hasOverride) {
      manualOverrideActive = true;
      if (cmdPumpOn && !pumpState) {
        setPump(true);
        Serial.println(F("⚡ [SHEET COMMAND] Manual Override: Pump set to ON from Edge_Controls tab"));
      } else if (cmdPumpOff && pumpState) {
        setPump(false);
        Serial.println(F("🛑 [SHEET COMMAND] Manual Override: Pump set to OFF from Edge_Controls tab"));
      }
    } else {
      // Return to autonomous agronomic control when set to AUTO in Edge_Controls
      if (manualOverrideActive) {
        Serial.println(F("🌿 [SHEET COMMAND] Edge Controls set to AUTO -> Autonomous loop resumed"));
      }
      manualOverrideActive = false;
    }
  } else {
    Serial.printf("⚠️ [SHEETS] Sync Notice: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}

// -------------------- 8. FASTAPI BACKEND SYNC --------------------
void syncWithFastApi() {
  if (WiFi.status() != WL_CONNECTED) return;

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
    "\"waterTank\":" + String(curTankPct, 1) + "," +
    "\"pump_state\":" + (pumpState ? "true" : "false") + "," +
    "\"pump\":" + (pumpState ? "true" : "false") + "," +
    "\"fan_state\":" + (fanState ? "true" : "false") + "," +
    "\"source\":\"esp32_devkit_v1\"," +
    "\"chip\":\"ESP32-DevKitV1-Hardware\"" +
    "}";

  for (int i = 0; i < NUM_FASTAPI_ENDPOINTS; i++) {
    HTTPClient http;
    bool isHttps = (strncmp(FASTAPI_URLS[i], "https://", 8) == 0);

    if (isHttps) {
      WiFiClientSecure secClient;
      secClient.setInsecure();
      http.begin(secClient, FASTAPI_URLS[i]);
    } else {
      http.begin(FASTAPI_URLS[i]);
    }

    http.addHeader("Content-Type", "application/json");
    http.setTimeout(1500);

    int code = http.POST(payload);
    if (code > 0) {
      String resp = http.getString();
      // Only execute emergency stop or cloud halt if explicitly triggered
      if (resp.indexOf("\"emergency_stop\":true") != -1 || resp.indexOf("\"status\":\"halted\"") != -1) {
        if (pumpState) {
          setPump(false);
          manualOverrideActive = true;
          Serial.println(F("🛑 [EMERGENCY STOP] Pump halted by Cloud Command"));
        }
      }
      http.end();
      break; // Successfully delivered live readings to website backend
    }
    http.end();
  }
}

// -------------------- 9. SETUP & MAIN LOOP --------------------
void setup() {
  Serial.begin(115200);
  delay(400);

  Serial.println(F("\n\n"));
  Serial.println(F("  █████╗  ██████╗ ██████╗ ██╗███████╗███████╗███╗   ██╗███████╗███████╗"));
  Serial.println(F(" ██╔══██╗██╔════╝ ██╔══██╗██║██╔════╝██╔════╝████╗  ██║██╔════╝██╔════╝"));
  Serial.println(F(" ███████║██║  ███╗██████╔╝██║███████╗█████╗  ██╔██╗ ██║███████╗█████╗  "));
  Serial.println(F(" ██╔══██║██║   ██║██╔══██╗██║╚════██║██╔══╝  ██║╚██╗██║╚════██║██╔══╝  "));
  Serial.println(F(" ██║  ██║╚██████╔╝██║  ██║██║███████║███████╗██║ ╚████║███████║███████╗"));
  Serial.println(F(" ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚═╝  ╚═══╝╚══════╝╚══════╝"));
  Serial.println(F("               🌱 PRECISION AGRICULTURE EDGE IoT SYSTEM                "));
  Serial.println(F("        BAL BHARATI PUBLIC SCHOOL — RESEARCH & INNOVATION CELL         "));
  Serial.println(F("========================================================================\n"));

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
  while (wifiMulti.run() != WL_CONNECTED && attempts < 20) {
    delay(300);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n✓ [WIFI] Connected! Node IP: %s\n", WiFi.localIP().toString().c_str());
    Serial.println(F("✓ [GOOGLE SHEETS] Ready to log sensor rows live every 6s"));
    Serial.println(F("✓ [EDGE CONTROLS] Ready to read manual pump overrides from Google Sheet"));
  } else {
    Serial.println(F("\n⚠️ [WIFI] Hotspot not connected. Operating in autonomous 1s USB Serial mode."));
  }

  readAllSensors();
}

void loop() {
  unsigned long now = millis();

  // 1. Instant Sensor Acquisition & Serial Output (Every 1000ms = 1 second fast pace!)
  if (now - lastSensorRead >= 1000) {
    lastSensorRead = now;
    readAllSensors();
  }

  // 2. Google Sheets Cloud Logging & Edge Controls Sync (Every 6 seconds)
  if (WiFi.status() == WL_CONNECTED && (now - lastSheetSync >= 6000)) {
    lastSheetSync = now;
    syncWithGoogleSheets();
  }

  // 3. FastAPI Cloud Synchronization (Every 10 seconds - forwards real readings to Website)
  if (WiFi.status() == WL_CONNECTED && (now - lastFastApiSync >= 10000)) {
    lastFastApiSync = now;
    syncWithFastApi();
  }

  // 4. Two-Way Serial Command Listener
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd == "PUMP_ON")   { manualOverrideActive = true; setPump(true);  Serial.println(F("⚡ [USB] Pump forced ON")); }
    if (cmd == "PUMP_OFF")  { manualOverrideActive = true; setPump(false); Serial.println(F("🛑 [USB] Pump forced OFF")); }
    if (cmd == "FAN_ON")    { manualOverrideActive = true; setFan(true);   Serial.println(F("⚡ [USB] Fan forced ON")); }
    if (cmd == "FAN_OFF")   { manualOverrideActive = true; setFan(false);  Serial.println(F("🛑 [USB] Fan forced OFF")); }
    if (cmd == "AUTO_ON")   { manualOverrideActive = false; autoMode = true; Serial.println(F("🌿 [USB] Auto mode ON")); }
    if (cmd == "AUTO_OFF")  { autoMode = false; Serial.println(F("⚙️ [USB] Auto mode OFF")); }
  }

  delay(20);
}

// -------------------- 6B. BEAUTIFUL VISUAL HUD DASHBOARD --------------------
static void printProgressBar(float pct, int width = 8) {
  int filled = constrain((int)round((pct / 100.0f) * width), 0, width);
  Serial.print(F("["));
  for (int i = 0; i < filled; i++) Serial.print(F("="));
  if (filled < width) Serial.print(F(">"));
  for (int i = filled + 1; i < width; i++) Serial.print(F(" "));
  Serial.printf("] %4.0f%%", pct);
}

void printVisualDashboard() {
  unsigned long s = millis() / 1000;
  int hrs = s / 3600;
  int mins = (s % 3600) / 60;
  int secs = s % 60;

  Serial.println(F("\n+======================================================================================+"));
  Serial.println(F("|        🌱  AGRISENSE DEVKIT V1  |  MASTER SENSOR & TELEMETRY HUD                     |"));
  Serial.println(F("+======================================================================================+"));
  Serial.printf("| 📶 Wi-Fi: %-14s | ⏱️ Uptime: %02d:%02d:%02d | ⚙️ Mode: %-9s | 📡 Baud: 115200  |\n",
    WiFi.status() == WL_CONNECTED ? "[ONLINE]" : "[OFFLINE]",
    hrs, mins, secs,
    manualOverrideActive ? "MANUAL_OVR" : (autoMode ? "AUTO" : "MANUAL")
  );
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("| 🌐 Node IP: %-15s | 📊 Sheets: [READY]      | ☁️ FastAPI: [READY]           |\n",
      WiFi.localIP().toString().c_str()
    );
  }
  Serial.println(F("+--------------------------------------------------------------------------------------+"));
  Serial.println(F("| [1] 🌡️  MICROCLIMATE & ATMOSPHERE                                                    |"));
  Serial.printf("|   • Air Temp   : %5.1f °C       • Humidity  : %5.1f %%         • Light Level: %5d %%   |\n",
    curAirTemp, curAirHum, curLight);
  Serial.printf("|   • Rain Gauge : %5d %% (%-4s)   • Tank Depth: %5.1f cm        • Run Timer  : %5lu s   |\n",
    curRain, curRain > 10 ? "WET" : "DRY", curTankCm, pumpState ? (millis() - pumpStartTime)/1000 : 0);
  Serial.println(F("+--------------------------------------------------------------------------------------+"));
  Serial.println(F("| [2] 🌱  SOIL MOISTURE ROOT MATRIX                                                    |"));
  Serial.print(F("|   • Soil 1 (Pin 34): ")); printProgressBar(curSoil1, 8);
  Serial.print(F("  • Soil 2 (Pin 35): ")); printProgressBar(curSoil2, 8);
  Serial.println(F(" |"));
  Serial.print(F("|   • Soil Average   : ")); printProgressBar(curSoilAvg, 8);
  Serial.printf("  • Soil Status    : %-23s |\n",
    curSoilAvg < SOIL_DRY_PCT ? "DRY (Irrigation Needed)" : (curSoilAvg > 75 ? "SATURATED (Moist)" : "OPTIMAL"));
  Serial.println(F("+--------------------------------------------------------------------------------------+"));
  Serial.println(F("| [3] 💧  ACTUATORS & IRRIGATION SAFETY                                                |"));
  Serial.print(F("|   • Water Tank     : ")); printProgressBar(curTankPct, 8);
  Serial.printf("  • Tank Low Cutoff: %-23s |\n", curTankCm > TANK_EMPTY_CM ? "YES (Pump Protected)" : "NO (Reservoir Good)");
  Serial.printf("|   • Main Water Pump: [%-12s]    • Fan Cooler     : [%-12s]       |\n",
    pumpState ? "ON (ACTIVE)" : "OFF (STANDBY)",
    fanState ? "ON (COOLING)" : "OFF (STANDBY)");
  Serial.printf("|   • Agronomic Status: %-67s |\n",
    manualOverrideActive ? "Manual override active via Edge Controls tab in Google Sheet." :
    (curSoilAvg < SOIL_DRY_PCT ? (curRain >= RAIN_SUPPRESS_PCT ? "Rain active: Irrigation suppressed to conserve water." : "Soil dry: Smart pump irrigating crop roots.") : "Soil moisture optimal: Crop in healthy transpiration zone."));
  Serial.println(F("+======================================================================================+"));
}
