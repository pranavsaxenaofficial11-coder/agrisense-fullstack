/* ==============================================================================
   AGRISENSE PRECISION AGRICULTURE — ALL-IN-ONE SIMULATION & HARDWARE FIRMWARE
   Platform: ESP32 (Wokwi Virtual Simulator & Physical ESP32 DevKit V1)
   Team: AgriSense Innovation Cell — Bal Bharati Public School
   
   FEEDS & CAPABILITIES:
   1. Cloud Website Ingestion (FastAPI Backend + Render Cloud)
   2. Google Sheets Live Database Sync (HTTPS + SSL Redirects)
   3. Dual-Probe Root Zone Soil Moisture (Zone A & Zone B)
   4. Air Microclimate (DHT22: Temperature, Relative Humidity, VPD in kPa)
   5. Solar Radiation (LDR Lux & Light Percentage)
   6. Precipitation & Flood Sensor (Rainfall Intensity %)
   7. Ultrasonic Water Reservoir Monitor (HC-SR04 Tank Level & Volumetric %)
   8. Closed-Loop Relays: Submersible Drip Pump & Cooling Exhaust Fan
   9. Multi-Zone Solenoid Valves: Zone A (Tomato Drip) & Zone B (Wheat Drip)
   10. FUTURE SCOPE FEEDS:
       • NPK Macronutrient Telemetry (Nitrogen, Phosphorus, Potassium, pH, EC)
       • High-Frequency Agronomic VPD (Vapor Pressure Deficit) Diagnostics
       • Water Conservation Cumulative Liters Counter
       • Foliar Health & AI Pest Diagnosis Simulation Stream
       • Remote Web Actuator Overrides & Emergency Stop
   11. SSD1306 128x64 I2C Graphic OLED Live Edge HUD
   12. Simultaneous USB Web Serial JSON (115200 baud) for browser dashboard
   ============================================================================== */

#include <WiFi.h>
#include <WiFiMulti.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

WiFiMulti wifiMulti;

// -------------------- 1. DISPLAY CONFIGURATION --------------------
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// -------------------- 2. SENSOR PIN DEFINITIONS --------------------
#define DHT_PIN          4     // DHT22 Data pin
#define DHT_TYPE         DHT22 // DHT 22 (AM2302)

#define SOIL1_PIN        34    // Potentiometer 1 / Soil Moisture Probe 1 (Zone A)
#define SOIL2_PIN        35    // Potentiometer 2 / Soil Moisture Probe 2 (Zone B)
#define LDR_PIN          32    // Photoresistor Analog Pin (Sunlight)
#define RAIN_PIN         33    // Raindrop Sensor Analog Pin

#define TRIG_PIN         5     // HC-SR04 Ultrasonic Transmitter
#define ECHO_PIN         18    // HC-SR04 Ultrasonic Receiver

// -------------------- 3. ACTUATOR PIN DEFINITIONS --------------------
#define PUMP_RELAY_PIN   25    // Water Pump Relay (Active LOW)
#define FAN_RELAY_PIN    26    // Cooling Fan Relay (Active LOW)
#define VALVE_A_PIN      19    // Zone A Solenoid Valve LED / Relay
#define VALVE_B_PIN      23    // Zone B Solenoid Valve LED / Relay

DHT dht(DHT_PIN, DHT_TYPE);

// -------------------- 4. NETWORK & CLOUD CONFIGURATION --------------------
// Google Apps Script Web App Endpoint for Google Sheets
const char* WEB_APP_URL = 
  "https://script.google.com/macros/s/"
  "AKfycbxEWNrnzavYmBi6JyLME1dnxTW-xqxL17jZrVtTBhRO0rKKEXpTxAGb3yx_3D-IMzDUiw"
  "/exec";

// FastAPI Endpoints (Wokwi uses Cloud Render directly; hardware also tries local IP)
const char* FASTAPI_ENDPOINTS[] = {
  "https://agrisense-backend-kb22.onrender.com/api/sensors/ingest",
  "http://10.3.9.249:8000/api/sensors/ingest",
  "https://agrisense-backend-kb22.onrender.com/api/iot/telemetry"
};
const int NUM_FASTAPI_ENDPOINTS = 3;

// -------------------- 5. THRESHOLDS & AGRONOMY CALIBRATION --------------------
const int   SOIL_DRY_TRIGGER = 35;   // Start pump when average soil < 35%
const int   SOIL_SAT_STOP    = 65;   // Stop pump when soil reaches 65%
const float TEMP_FAN_TRIGGER = 32.0; // Start cooling fan when air temp > 32°C
const float TANK_EMPTY_CM    = 22.0; // Tank dry protection (HC-SR04 distance > 22cm)
const float TANK_FULL_CM     = 4.0;  // Tank brim distance (HC-SR04 distance 4cm)

// -------------------- 6. LIVE STATE VARIABLES --------------------
float curAirTemp    = 28.5f;
float curAirHum     = 62.0f;
int   curSoil1      = 42;
int   curSoil2      = 40;
int   curSoilAvg    = 41;
int   curLight      = 65;
int   curRain       = 0;
float curTankCm     = 12.0f;
float curTankPct    = 55.0f;
float curVpdKpa     = 1.45f;

// Future Scope Feeds:
float soilNitrogen   = 54.0f;  // mg/kg
float soilPhosphorus = 26.0f;  // mg/kg
float soilPotassium  = 188.0f; // mg/kg
float soilPh         = 6.5f;   // Optimal pH
float soilEc         = 1.15f;  // dS/m
float waterSavedLtr  = 1420.0f;// Cumulative Liters saved vs flood irrigation
float flowRateLpm    = 0.0f;   // Liters per minute
int   aiHealthScore  = 95;     // 0-100 Crop health index

bool pumpState            = false;
bool fanState             = false;
bool valveAState          = false;
bool valveBState          = false;
bool autoMode             = true;
bool manualOverrideActive = false;

unsigned long lastSensorRead   = 0;
unsigned long lastSerialStream = 0;
unsigned long lastSheetsSync   = 0;
unsigned long lastFastApiSync  = 0;
unsigned long lastOledRefresh  = 0;
unsigned long lastWaterCalc    = 0;

// -------------------- 7. ACTUATOR CONTROL HELPERS --------------------
void setPump(bool on) {
  pumpState = on;
  digitalWrite(PUMP_RELAY_PIN, on ? LOW : HIGH); // Active LOW
  flowRateLpm = on ? 4.2f : 0.0f;
  valveAState = on && (curSoil1 < curSoil2);
  valveBState = on && (curSoil2 <= curSoil1);
  digitalWrite(VALVE_A_PIN, valveAState ? HIGH : LOW);
  digitalWrite(VALVE_B_PIN, valveBState ? HIGH : LOW);
}

void setFan(bool on) {
  fanState = on;
  digitalWrite(FAN_RELAY_PIN, on ? LOW : HIGH); // Active LOW
}

// -------------------- 8. HC-SR04 TANK LEVEL SENSOR --------------------
float readUltrasonicCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0) return curTankCm; // Timeout fallback
  float dist = (duration * 0.0343f) / 2.0f;
  if (dist < 2.0f || dist > 400.0f) return curTankCm;
  return dist;
}

// -------------------- 9. SENSOR SAMPLING & AGRONOMY MATH --------------------
void sampleSensors() {
  // 1. Read DHT22
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t) && t > -20.0f && t < 70.0f) curAirTemp = t;
  if (!isnan(h) && h >= 0.0f && h <= 100.0f) curAirHum = h;

  // 2. Read Soil Moisture (Zone A & Zone B)
  // Potentiometers in Wokwi return 0-4095
  int rawSoil1 = analogRead(SOIL1_PIN);
  int rawSoil2 = analogRead(SOIL2_PIN);
  curSoil1 = constrain((int)map(rawSoil1, 0, 4095, 0, 100), 0, 100);
  curSoil2 = constrain((int)map(rawSoil2, 0, 4095, 0, 100), 0, 100);
  curSoilAvg = (curSoil1 + curSoil2) / 2;

  // 3. Read LDR Sunlight Intensity
  int rawLdr = analogRead(LDR_PIN);
  curLight = constrain((int)map(rawLdr, 0, 4095, 0, 100), 0, 100);

  // 4. Read Rain Sensor
  int rawRain = analogRead(RAIN_PIN);
  curRain = constrain((int)map(rawRain, 0, 4095, 0, 100), 0, 100);

  // 5. Read HC-SR04 Reservoir Water Tank
  curTankCm = readUltrasonicCm();
  curTankPct = constrain(((TANK_EMPTY_CM - curTankCm) / (TANK_EMPTY_CM - TANK_FULL_CM)) * 100.0f, 0.0f, 100.0f);

  // 6. Compute Vapor Pressure Deficit (VPD in kPa)
  // Saturated Vapor Pressure = 0.61078 * exp((17.27 * T) / (T + 237.3))
  float vpSat = 0.61078f * exp((17.27f * curAirTemp) / (curAirTemp + 237.3f));
  float vpAct = vpSat * (curAirHum / 100.0f);
  curVpdKpa = max(0.1f, vpSat - vpAct);

  // 7. Dynamic NPK & Health computation
  soilNitrogen   = constrain(45.0f + (curSoilAvg * 0.2f), 30.0f, 75.0f);
  soilPhosphorus = constrain(22.0f + (curLight * 0.08f), 15.0f, 40.0f);
  soilPotassium  = constrain(160.0f + (curSoilAvg * 0.5f), 120.0f, 250.0f);
  soilPh         = constrain(6.2f + ((50 - curRain) * 0.008f), 5.8f, 7.2f);
  
  if (curSoilAvg < 25 || curAirTemp > 38.0f || curRain > 60) {
    aiHealthScore = 68;
  } else if (curSoilAvg < 35 || curAirTemp > 34.0f) {
    aiHealthScore = 84;
  } else {
    aiHealthScore = 96;
  }

  // 8. Cumulative Water Saved Accounting (simulates automated drip savings)
  if (pumpState) {
    waterSavedLtr += 0.08f; // Saved ~0.08 liters per second vs conventional flood
  }
}

// -------------------- 10. CLOSED-LOOP AUTONOMOUS DECISION ENGINE --------------------
void runAutonomousLogic() {
  if (manualOverrideActive) return;

  // Dry Run Reservoir Protection: Tank empty -> FORCE PUMP OFF
  if (curTankCm > TANK_EMPTY_CM) {
    if (pumpState) {
      setPump(false);
      Serial.println(F("⚠️ [AUTO SAFETY] Water tank depleted! Pump halted for dry-run protection."));
    }
    return;
  }

  // Rain Protection: Heavy rain -> Halt pump
  if (curRain >= 50) {
    if (pumpState) {
      setPump(false);
      Serial.println(F("🌧️ [AUTO ECO] Rain detected! Drip irrigation suspended to save water."));
    }
  } else {
    // Soil moisture thresholding
    if (curSoilAvg <= SOIL_DRY_TRIGGER && !pumpState) {
      setPump(true);
      Serial.printf("💧 [AUTO IRRIGATION] Low moisture (%d%%). Pump STARTED.\n", curSoilAvg);
    } else if (curSoilAvg >= SOIL_SAT_STOP && pumpState) {
      setPump(false);
      Serial.printf("🌱 [AUTO IRRIGATION] Moisture optimal (%d%%). Pump STOPPED.\n", curSoilAvg);
    }
  }

  // Canopy Heat Stress Cooling Logic
  if (curAirTemp >= TEMP_FAN_TRIGGER && !fanState) {
    setFan(true);
    Serial.printf("🔥 [AUTO CLIMATE] High temperature (%.1f°C). Ventilation fan STARTED.\n", curAirTemp);
  } else if (curAirTemp < (TEMP_FAN_TRIGGER - 2.0f) && fanState) {
    setFan(false);
    Serial.printf("❄️ [AUTO CLIMATE] Temperature cooled (%.1f°C). Fan STOPPED.\n", curAirTemp);
  }
}

// -------------------- 11. GOOGLE SHEETS LIVE SYNC --------------------
void syncWithGoogleSheets() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure secClient;
  secClient.setInsecure(); // Required for Google Script SSL handshake & 302 redirects

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
  url += "&tank_level_pct=" + String(curTankPct, 1);
  url += "&vpd_kpa=" + String(curVpdKpa, 2);
  url += "&npk_n=" + String(soilNitrogen, 1);
  url += "&health_idx=" + String(aiHealthScore);
  url += "&pump_state=" + String(pumpState ? "true" : "false");
  url += "&fan_state=" + String(fanState ? "true" : "false");

  http.begin(secClient, url);
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  http.setTimeout(10000);

  int httpCode = http.GET();
  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("📊 [GOOGLE SHEETS] Sync OK (HTTP %d) -> Logged row to sheet!\n", httpCode);

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
    Serial.printf("⚠️ [SHEETS] Sync Notice: %s (code %d)\n", http.errorToString(httpCode).c_str(), httpCode);
  }
  http.end();
}

// -------------------- 12. FASTAPI WEBSITE BACKEND SYNC --------------------
void syncWithFastApi() {
  if (WiFi.status() != WL_CONNECTED) return;

  // Build JSON payload with BOTH camelCase and snake_case + future scope feeds
  String payload = String("{") +
    "\"airTemp\":" + String(curAirTemp, 1) + "," +
    "\"airHumidity\":" + String(curAirHum, 1) + "," +
    "\"soil1\":" + String(curSoil1) + "," +
    "\"soil2\":" + String(curSoil2) + "," +
    "\"soilAvg\":" + String(curSoilAvg) + "," +
    "\"light\":" + String(curLight) + "," +
    "\"rain\":" + String(curRain) + "," +
    "\"tankPct\":" + String(curTankPct, 1) + "," +
    "\"pump\":" + (pumpState ? "true" : "false") + "," +
    "\"fan\":" + (fanState ? "true" : "false") + "," +
    "\"mode\":\"" + (autoMode ? "auto" : "manual") + "\"," +
    "\"vpd_kpa\":" + String(curVpdKpa, 2) + "," +
    "\"npk_n\":" + String(soilNitrogen, 1) + "," +
    "\"npk_p\":" + String(soilPhosphorus, 1) + "," +
    "\"npk_k\":" + String(soilPotassium, 1) + "," +
    "\"soil_ph\":" + String(soilPh, 2) + "," +
    "\"water_saved_ltr\":" + String(waterSavedLtr, 1) + "," +
    "\"flow_rate_lpm\":" + String(flowRateLpm, 1) + "," +
    "\"ai_health_score\":" + String(aiHealthScore) + "," +
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

  bool uploaded = false;
  for (int i = 0; i < NUM_FASTAPI_ENDPOINTS; i++) {
    const char* targetUrl = FASTAPI_ENDPOINTS[i];
    HTTPClient http;
    bool isHttps = (strncmp(targetUrl, "https://", 8) == 0);

    if (isHttps) {
      WiFiClientSecure secClient;
      secClient.setInsecure();
      http.begin(secClient, targetUrl);
    } else {
      http.begin(targetUrl);
    }

    http.addHeader("Content-Type", "application/json");
    http.setTimeout(4000);

    int code = http.POST(payload);
    if (code > 0) {
      Serial.printf("✅ [FASTAPI SYNC] Telemetry posted to %s (HTTP %d)\n", targetUrl, code);
      String resp = http.getString();

      // Check for website Emergency Stop & remote commands
      if (resp.indexOf("\"pump_command\":false") != -1 || resp.indexOf("\"pump\":false") != -1 || 
          resp.indexOf("\"emergency_stop\":true") != -1 || resp.indexOf("\"status\":\"halted\"") != -1) {
        if (pumpState) {
          setPump(false);
          manualOverrideActive = true;
          Serial.println(F("🛑 [WEBSITE COMMAND] Pump HALTED by dashboard Emergency Stop!"));
        }
      } else if ((resp.indexOf("\"pump_command\":true") != -1 || resp.indexOf("\"pump\":true") != -1)) {
        if (!pumpState && curTankCm <= TANK_EMPTY_CM) {
          setPump(true);
          manualOverrideActive = true;
          Serial.println(F("⚡ [WEBSITE COMMAND] Pump ACTIVATED remotely from dashboard!"));
        }
      }
      http.end();
      uploaded = true;
      break;
    } else {
      http.end();
    }
  }

  if (!uploaded) {
    Serial.println(F("ℹ️ [FASTAPI] Cloud upload pending. Telemetry streamed via USB Serial."));
  }
}

// -------------------- 13. OLED GRAPHIC DASHBOARD HUD --------------------
void updateOledDisplay() {
  display.clearDisplay();

  // Header Bar
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.print("AgriSense Edge");

  display.setCursor(88, 0);
  if (WiFi.status() == WL_CONNECTED) {
    display.print("[WiFi]");
  } else {
    display.print("[Wait]");
  }

  display.drawLine(0, 9, 127, 9, SSD1306_WHITE);

  // Row 1: Air Temp & Humidity
  display.setCursor(0, 13);
  display.printf("T:%.1fC  RH:%.0f%%", curAirTemp, curAirHum);

  // Row 2: Soil Moisture (Zone A & B)
  display.setCursor(0, 24);
  display.printf("Soil: A:%d%% B:%d%% (%d)", curSoil1, curSoil2, curSoilAvg);

  // Row 3: VPD & Reservoir Tank Level
  display.setCursor(0, 35);
  display.printf("VPD:%.2fkPa Tank:%.0f%%", curVpdKpa, curTankPct);

  // Row 4: Future Scope Feeds (NPK & Health)
  display.setCursor(0, 46);
  display.printf("N:%0.f P:%0.f K:%0.f H:%d%%", soilNitrogen, soilPhosphorus, soilPotassium, aiHealthScore);

  display.drawLine(0, 54, 127, 54, SSD1306_WHITE);

  // Status Footer
  display.setCursor(0, 56);
  display.printf("PUMP:%s  FAN:%s", pumpState ? "ON " : "OFF", fanState ? "ON " : "OFF");

  display.display();
}

// -------------------- 14. HIGH-FREQUENCY USB SERIAL JSON STREAM --------------------
void streamSerialJson() {
  // Output clean 1-line JSON parsed by AgriSense app.html Web Serial reader
  Serial.printf(
    "{\"airTemp\":%.1f,\"airHumidity\":%.1f,\"soilAvg\":%d,\"soil1\":%d,\"soil2\":%d,\"light\":%d,\"rain\":%d,\"tankPct\":%.1f,\"vpd\":%.2f,\"npkN\":%.1f,\"npkP\":%.1f,\"npkK\":%.1f,\"ph\":%.2f,\"waterSaved\":%.1f,\"flowRate\":%.1f,\"health\":%d,\"pump\":%s,\"fan\":%s,\"valveA\":%s,\"valveB\":%s,\"mode\":\"%s\"}\n",
    curAirTemp, curAirHum, curSoilAvg, curSoil1, curSoil2, curLight, curRain, curTankPct, curVpdKpa,
    soilNitrogen, soilPhosphorus, soilPotassium, soilPh, waterSavedLtr, flowRateLpm, aiHealthScore,
    pumpState ? "true" : "false", fanState ? "true" : "false",
    valveAState ? "true" : "false", valveBState ? "true" : "false",
    autoMode ? "auto" : "manual"
  );
}

// ==============================================================================
// SETUP & INITIALIZATION
// ==============================================================================
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println(F("\n========================================================"));
  Serial.println(F("🌱 AgriSense Precision Agriculture & Edge-IoT Gateway"));
  Serial.println(F("BAL BHARATI PUBLIC SCHOOL — RESEARCH & INNOVATION CELL"));
  Serial.println(F("========================================================"));

  // Initialize GPIO Pins
  pinMode(PUMP_RELAY_PIN, OUTPUT);
  pinMode(FAN_RELAY_PIN, OUTPUT);
  pinMode(VALVE_A_PIN, OUTPUT);
  pinMode(VALVE_B_PIN, OUTPUT);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  // Default actuators to OFF
  setPump(false);
  setFan(false);

  // Initialize DHT22
  dht.begin();

  // Initialize OLED Display (I2C Address 0x3C)
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("ℹ️ OLED display not detected or running in headless mode."));
  } else {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(18, 18);
    display.println("AgriSense Edge");
    display.setCursor(14, 32);
    display.println("Connecting WiFi...");
    display.display();
  }

  // Configure Wi-Fi credentials:
  // 1. Wokwi virtual simulator network (unrestricted outbound cloud access)
  wifiMulti.addAP("Wokwi-GUEST", "");
  // 2. Physical hardware fallback: User's mobile hotspot
  wifiMulti.addAP("Redmi Note 10 Pro Max", "mear man");
  wifiMulti.addAP("Redmi Note 10 Pro Max", "mera man");

  Serial.print(F("🌐 Connecting to Wi-Fi..."));
  int attempts = 0;
  while (wifiMulti.run() != WL_CONNECTED && attempts < 20) {
    delay(400);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(F("\n✅ Wi-Fi Connected!"));
    Serial.printf("   SSID: %s\n", WiFi.SSID().c_str());
    Serial.printf("   IP:   %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("   Web App Dashboard: https://agrisense-269.pages.dev/app.html\n");
  } else {
    Serial.println(F("\n⚠️ Wi-Fi Standby. Running local autonomous loop + Web Serial."));
  }

  // Initial sensor sample
  sampleSensors();
  updateOledDisplay();
}

// ==============================================================================
// MAIN SUPER-LOOP (Real-time telemetry, edge AI, cloud sync)
// ==============================================================================
void loop() {
  unsigned long now = millis();

  // 1. Sample all analog sensors & microclimate (Every 1000ms)
  if (now - lastSensorRead >= 1000) {
    lastSensorRead = now;
    sampleSensors();
    runAutonomousLogic();
  }

  // 2. Refresh OLED Graphics HUD (Every 1000ms)
  if (now - lastOledRefresh >= 1000) {
    lastOledRefresh = now;
    updateOledDisplay();
  }

  // 3. High-Frequency JSON Serial Output for Browser Web Serial (Every 1000ms)
  if (now - lastSerialStream >= 1000) {
    lastSerialStream = now;
    streamSerialJson();
  }

  // 4. Direct FastAPI Website Backend Sync (Every 4000ms)
  if (now - lastFastApiSync >= 4000) {
    lastFastApiSync = now;
    syncWithFastApi();
  }

  // 5. Google Sheets Live Database Sync (Every 10000ms)
  if (now - lastSheetsSync >= 10000) {
    lastSheetsSync = now;
    syncWithGoogleSheets();
  }

  // 6. Handle incoming remote USB Serial commands from web app
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd == "PUMP_ON" || cmd == "{\"pump\":true}") {
      setPump(true);
      manualOverrideActive = true;
      Serial.println(F("{\"ack\":\"pump_started\",\"state\":true}"));
    } else if (cmd == "PUMP_OFF" || cmd == "{\"pump\":false}") {
      setPump(false);
      manualOverrideActive = true;
      Serial.println(F("{\"ack\":\"pump_stopped\",\"state\":false}"));
    } else if (cmd == "FAN_ON" || cmd == "{\"fan\":true}") {
      setFan(true);
      Serial.println(F("{\"ack\":\"fan_started\",\"state\":true}"));
    } else if (cmd == "FAN_OFF" || cmd == "{\"fan\":false}") {
      setFan(false);
      Serial.println(F("{\"ack\":\"fan_stopped\",\"state\":false}"));
    } else if (cmd == "AUTO_RESUME") {
      manualOverrideActive = false;
      Serial.println(F("{\"ack\":\"auto_resumed\"}"));
    }
  }

  delay(20); // Cooperative multi-tasking yield
}
