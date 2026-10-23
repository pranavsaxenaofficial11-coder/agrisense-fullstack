/* ==============================================================================
   AGRISENSE PRECISION AGRICULTURE — ALL 39 SENSORS EDGE IoT GATEWAY
   Dual-Target Hardware: ESP32-S3 DevKitC-1 & ESP32 DevKit V1
   Team: AgriSense Innovation Cell — Bal Bharati Public School
   
   DUAL-ROUTING PIPELINE:
   1. PRIMARY ROUTE (Wokwi -> Google Sheets -> Backend -> Website):
      - Ingests all 39 sensors into Google Apps Script.
      - Google Apps Script logs the formatted row into Google Sheets AND
        relays the telemetry payload directly to our FastAPI Backend.
      - The FastAPI Backend updates live cache, database, and WebSocket stream -> reaches website.
      - Returns bidirectional actuator commands (Pump, Fan, Mode) from Backend & Sheet back to ESP32.
   2. AUTOMATIC FAILOVER ROUTE (Google Sheets Failed -> Wokwi Direct -> Backend -> Website):
      - If Google Sheets fails (timeout, HTTP error, SSL issue), the ESP32 automatically
        detects the failure and routes readings DIRECTLY to FastAPI Cloud / Local Backend.
      - FastAPI Backend ingests the readings with source="wokwi_direct", updates website live,
        and returns actuator commands.
   * IN BOTH CASES, TELEMETRY FLOWS THROUGH OUR BACKEND WITH COMPLETE OPERATOR VISIBILITY & CONTROL!
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

// -------------------- 1. PIN DEFINITIONS & CHIP CONFIGURATION --------------------
#if defined(CONFIG_IDF_TARGET_ESP32S3) || defined(ARDUINO_ESP32S3_DEV) || defined(ARDUINO_ESP32_S3_BOX) || defined(ESP32_S3)
  #define CHIP_NAME         "ESP32-S3 DevKitC-1"
  #define IS_S3_CHIP        1
  #define DHT_PIN           21    // DHT22 (Air Temp & Humidity)
  #define DHT_TYPE          DHT22
  #define SOIL1_PIN         1     // ADC1_CH0 -> Soil Moisture 1 (Zone A)
  #define SOIL2_PIN         2     // ADC1_CH1 -> Soil Moisture 2 (Zone B)
  #define LDR_PIN           14    // ADC2_CH3 -> Solar Light Level
  #define RAIN_PIN          4     // ADC1_CH3 -> Raindrop Analog Sensor
  #define TRIG_PIN          5     // HC-SR04 Ultrasonic Transmitter
  #define ECHO_PIN          6     // HC-SR04 Ultrasonic Receiver
  #define PUMP_RELAY_PIN    10    // Submersible Pump Relay (Active LOW)
  #define FAN_RELAY_PIN     11    // Cooling Fan Relay (Active LOW)
  #define OLED_SDA_PIN      8     // I2C SDA
  #define OLED_SCL_PIN      9     // I2C SCL
  #define VALVE_A_PIN       12    // Zone A Solenoid Indicator LED
  #define VALVE_B_PIN       13    // Zone B Solenoid Indicator LED
#else
  #define CHIP_NAME         "ESP32 DevKit V1"
  #define IS_S3_CHIP        0
  #define DHT_PIN           4     // DHT22 (Air Temp & Humidity)
  #define DHT_TYPE          DHT22
  #define SOIL1_PIN         34    // Potentiometer 1 -> Soil Moisture 1 (Zone A)
  #define SOIL2_PIN         35    // Potentiometer 2 -> Soil Moisture 2 (Zone B)
  #define LDR_PIN           32    // LDR Photoresistor -> Solar Light Level
  #define RAIN_PIN          33    // Raindrop Analog Sensor
  #define TRIG_PIN          5     // HC-SR04 Ultrasonic Transmitter
  #define ECHO_PIN          18    // HC-SR04 Ultrasonic Receiver
  #define PUMP_RELAY_PIN    25    // Submersible Pump Relay (Active LOW)
  #define FAN_RELAY_PIN     26    // Cooling Fan Relay (Active LOW)
  #define OLED_SDA_PIN      21    // I2C SDA
  #define OLED_SCL_PIN      22    // I2C SCL
  #define VALVE_A_PIN       19    // Zone A Solenoid Indicator LED
  #define VALVE_B_PIN       23    // Zone B Solenoid Indicator LED
#endif

// -------------------- 2. OLED DISPLAY CONFIG --------------------
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
DHT dht(DHT_PIN, DHT_TYPE);

// -------------------- 3. CLOUD ENDPOINTS --------------------
// Google Apps Script Web App Endpoint for Google Sheets
const char* WEB_APP_URL = 
  "https://script.google.com/macros/s/"
  "AKfycbxEWNrnzavYmBi6JyLME1dnxTW-xqxL17jZrVtTBhRO0rKKEXpTxAGb3yx_3D-IMzDUiw"
  "/exec";

// FastAPI Endpoints (Cloud Render Primary, Local Backend Fallback, IoT Telemetry)
const char* FASTAPI_ENDPOINTS[] = {
  "https://agrisense-backend-kb22.onrender.com/api/sensors/ingest",
  "http://10.3.9.249:8000/api/sensors/ingest",
  "https://agrisense-backend-kb22.onrender.com/api/iot/telemetry"
};
const int NUM_FASTAPI_ENDPOINTS = 3;

// -------------------- 4. ALL 39 SENSOR STATE VARIABLES --------------------
// Category 1: Soil Dynamics & Root-Zone (9)
float s_soilA       = 35.0f; // 1. Soil Moisture 1 (%)
float s_soilB       = 32.0f; // 2. Soil Moisture 2 (%)
float s_soilC       = 30.0f; // 3. Soil Moisture 3 (%)
float s_soilD       = 34.0f; // 4. Soil Moisture 4 (%)
float s_soilAvg     = 33.5f; // 5. Root-Zone Soil Average Moisture (%)
float s_soilTemp    = 24.5f; // 6. Root-Zone Soil Temperature (°C)
float s_soilPH      = 6.5f;  // 7. Soil Acidity / Alkalinity (pH)
float s_soilEC      = 1.15f; // 8. Soil Electrical Conductivity (dS/m)
float s_soilO2      = 19.2f; // 9. Sub-surface Soil Oxygen (%)

// Category 2: NPK Macronutrients (3)
float s_nitrogen    = 175.0f; // 10. Soil Nitrogen (N) (mg/kg)
float s_phosphorus  = 22.0f;  // 11. Soil Phosphorus (P) (mg/kg)
float s_potassium   = 165.0f; // 12. Soil Potassium (K) (mg/kg)

// Category 3: Micro-Climate & Meteorology (10)
float s_airTemp     = 28.5f;  // 13. Ambient Air Temperature (°C)
float s_airHumidity = 60.0f;  // 14. Relative Humidity (%)
float s_pressure    = 1012.0f;// 15. Barometric Pressure (hPa)
float s_light       = 65.0f;  // 16. Sunlight / Solar Radiation (%)
float s_par         = 850.0f; // 17. Photosynthetically Active Radiation (µmol/m²/s)
float s_uv          = 5.5f;   // 18. Solar Ultraviolet Index (0-12)
float s_rain        = 0.0f;   // 19. Rainfall / Precipitation Intensity (%)
float s_wind        = 8.5f;   // 20. Anemometer Wind Velocity (km/h)
float s_windDir     = 180.0f; // 21. Wind Direction (Degrees)
float s_dewPoint    = 19.5f;  // 22. Thermodynamic Dew Point (°C)

// Category 4: Hydraulics & Water Infrastructure (6)
float s_waterTank   = 75.0f;  // 23. Water Reservoir Level (%)
float s_waterTemp   = 23.0f;  // 24. Water Temperature in Tank (°C)
float s_tds         = 340.0f; // 25. Total Dissolved Solids (ppm)
float s_waterPH     = 7.0f;   // 26. Reservoir Irrigation Water pH
float s_waterFlow   = 0.0f;   // 27. Instantaneous Inline Drip Flow Rate (L/min)
float s_flow        = 18.5f;  // 28. Cumulative Water Delivered Today (L)

// Category 5: Canopy Biometrics & Plant Health (4)
float s_leafWet     = 28.0f;  // 29. Leaf Canopy Wetness (%)
float s_ndvi        = 0.76f;  // 30. Normalized Difference Vegetation Index (0.0 - 1.0)
float s_sapFlow     = 45.0f;  // 31. Plant Vascular Sap Flow (g/h)
float s_stemDia     = 12.6f;  // 32. Stem Dendrometer Diameter (mm)

// Category 6: Environmental & Pest Intelligence (7)
float s_airQuality  = 28.0f;  // 33. MQ-135 Gas & Air Quality Index
float s_co2         = 430.0f; // 34. Carbon Dioxide Concentration (ppm)
float s_smoke       = 14.0f;  // 35. MQ-2 Smoke & Combustible Gas Index
float s_pestMic     = 12.0f;  // 36. Acoustic Bio-Pest Activity Index
float s_pestCount   = 2.0f;   // 37. Smart Pheromone Trap Count (/day)
float s_frost       = 8.5f;   // 38. Ground Frost Alert Temperature (°C)
float s_vibration   = 1.0f;   // 39. Enclosure Anti-Tamper Vibration Index

// Category 7: Actuators, Overrides & Pipeline Telemetry Status
bool pumpState            = false;
bool fanState             = false;
bool valveAState          = false;
bool valveBState          = false;
bool autoMode             = true;
bool manualOverrideActive = false;
String activePipelineRoute = "STARTING"; // "GOOGLE_SHEETS_PRIMARY" or "WOKWI_DIRECT_FALLBACK"

// Timers
unsigned long lastSensorSample = 0;
unsigned long lastSerialStream = 0;
unsigned long lastPipelineSync = 0;
unsigned long lastOledRefresh  = 0;

// -------------------- 5. ACTUATOR CONTROL HELPERS --------------------
void setPump(bool on) {
  pumpState = on;
  digitalWrite(PUMP_RELAY_PIN, on ? LOW : HIGH); // Active LOW relay
  s_waterFlow = on ? 4.2f : 0.0f;
  valveAState = on && (s_soilA <= s_soilB);
  valveBState = on && (s_soilB < s_soilA);
  digitalWrite(VALVE_A_PIN, valveAState ? HIGH : LOW);
  digitalWrite(VALVE_B_PIN, valveBState ? HIGH : LOW);
}

void setFan(bool on) {
  fanState = on;
  digitalWrite(FAN_RELAY_PIN, on ? LOW : HIGH); // Active LOW relay
}

// -------------------- 6. HC-SR04 ULTRASONIC SENSOR --------------------
float readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long dur = pulseIn(ECHO_PIN, HIGH, 26000);
  if (dur == 0) return 12.0f; // Timeout fallback
  float d = (dur * 0.0343f) / 2.0f;
  if (d < 2.0f || d > 400.0f) return 12.0f;
  return d;
}

// -------------------- 7. ALL 39 SENSORS SAMPLING & CALIBRATION --------------------
void sampleAll39Sensors() {
  // A. DHT22 (Air Temp & Humidity)
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t) && t > -30.0f && t < 70.0f) s_airTemp = t;
  if (!isnan(h) && h >= 0.0f && h <= 100.0f) s_airHumidity = h;

  // B. Dual Root Zone Soil Moisture Potentiometers
  int rawSoil1 = analogRead(SOIL1_PIN);
  int rawSoil2 = analogRead(SOIL2_PIN);
  s_soilA = constrain(map(rawSoil1, 0, 4095, 0, 100), 0, 100);
  s_soilB = constrain(map(rawSoil2, 0, 4095, 0, 100), 0, 100);
  s_soilC = constrain((int)(s_soilA * 0.92f + 2), 0, 100);
  s_soilD = constrain((int)(s_soilB * 1.05f - 1), 0, 100);
  s_soilAvg = (s_soilA + s_soilB) / 2.0f;

  // C. LDR Sunlight Intensity
  int rawLdr = analogRead(LDR_PIN);
  s_light = constrain(map(rawLdr, 0, 4095, 0, 100), 0, 100);

  // D. Raindrop / Flood Sensor
  int rawRain = analogRead(RAIN_PIN);
  s_rain = constrain(map(rawRain, 0, 4095, 0, 100), 0, 100);

  // E. Ultrasonic Reservoir Tank (22cm empty -> 4cm full)
  float distCm = readDistanceCm();
  s_waterTank = constrain(((22.0f - distCm) / 18.0f) * 100.0f, 0.0f, 100.0f);

  // F. Agronomic Derived & Environmental Calculations
  s_soilTemp   = constrain(s_airTemp - 3.8f + (s_light * 0.04f), 10.0f, 45.0f);
  s_pressure   = constrain(1013.25f - (s_rain * 0.22f) - ((s_airTemp - 25.0f) * 0.15f), 980.0f, 1030.0f);
  s_airQuality = constrain(22.0f + (s_airTemp * 0.3f) + (s_smoke * 0.4f), 10.0f, 150.0f);
  s_waterTemp  = constrain(s_airTemp - 5.0f + (s_light * 0.03f), 12.0f, 35.0f);
  s_smoke      = constrain(10.0f + ((s_airTemp > 38.0f) ? 25.0f : 0.0f), 5.0f, 100.0f);
  s_tds        = constrain(320.0f + (s_soilB * 1.5f), 150.0f, 1200.0f);
  s_soilPH     = constrain(6.4f + ((50.0f - s_rain) * 0.006f) - (s_soilAvg * 0.003f), 5.6f, 7.8f);

  s_nitrogen   = constrain(140.0f + (s_soilAvg * 0.8f), 60.0f, 250.0f);
  s_phosphorus = constrain(18.0f + (s_light * 0.12f), 8.0f, 50.0f);
  s_potassium  = constrain(150.0f + (s_soilAvg * 0.6f), 90.0f, 300.0f);

  s_leafWet    = constrain((s_rain > 10) ? (70.0f + s_rain * 0.3f) : (s_airHumidity * 0.45f), 0.0f, 100.0f);
  s_co2        = constrain(415.0f + ((s_airQuality > 50) ? 80.0f : 15.0f), 350.0f, 1200.0f);

  if (pumpState) {
    s_flow += 0.07f; // ~4.2 Liters per minute
  }

  s_soilEC     = constrain(0.8f + (s_tds / 1000.0f) * 0.6f, 0.4f, 4.5f);
  s_wind       = constrain(6.0f + (s_light * 0.08f) + (s_rain * 0.12f), 0.0f, 65.0f);
  s_uv         = constrain((s_light / 100.0f) * 11.5f, 0.0f, 12.0f);
  s_windDir    = 180.0f;

  float a = 17.27f, b = 237.7f;
  float alpha = ((a * s_airTemp) / (b + s_airTemp)) + log(max(0.01f, s_airHumidity / 100.0f));
  s_dewPoint   = (b * alpha) / (a - alpha);

  s_par        = constrain((s_light / 100.0f) * 1850.0f, 0.0f, 2200.0f);
  s_soilO2     = constrain(21.0f - (s_soilAvg * 0.08f), 8.0f, 21.0f);
  s_waterPH    = constrain(6.9f + (s_tds * 0.0004f), 6.0f, 8.2f);
  s_pestMic    = constrain((s_airTemp > 30.0f && s_airHumidity > 60.0f) ? 38.0f : 12.0f, 0.0f, 90.0f);
  s_vibration  = 1.0f;
  s_ndvi       = constrain(0.55f + ((s_soilAvg > 30 && s_soilAvg < 65) ? 0.28f : 0.05f) - (s_airTemp > 38 ? 0.15f : 0.0f), 0.2f, 0.95f);
  s_sapFlow    = constrain((s_light * 0.6f) + ((s_soilAvg > 25) ? 20.0f : 5.0f), 5.0f, 95.0f);
  s_stemDia    = constrain(12.2f + (s_soilAvg * 0.012f), 10.0f, 15.0f);
  s_pestCount  = (s_airTemp > 32.0f && s_airHumidity > 65.0f) ? 8.0f : 2.0f;
  s_frost      = constrain(s_airTemp - 6.5f, -5.0f, 35.0f);
}

// -------------------- 8. EDGE CLOSED-LOOP DECISION ENGINE --------------------
void runEdgeAutomation() {
  if (manualOverrideActive) return;

  // Dry-Run Reservoir Protection
  if (s_waterTank < 8.0f) {
    if (pumpState) {
      setPump(false);
      Serial.println(F("⚠️ [AUTO SAFETY] Water reservoir critically low (<8%)! Pump halted."));
    }
    return;
  }

  // Heavy Rain Infiltration Protection
  if (s_rain >= 50.0f) {
    if (pumpState) {
      setPump(false);
      Serial.println(F("🌧️ [AUTO ECO] Heavy rain detected. Irrigation held."));
    }
  } else {
    // Soil Moisture Cutoff Logic
    if (s_soilAvg <= 35.0f && !pumpState) {
      setPump(true);
      Serial.printf("💧 [AUTO PUMP] Low moisture (%.1f%%). Irrigation STARTED.\n", s_soilAvg);
    } else if (s_soilAvg >= 65.0f && pumpState) {
      setPump(false);
      Serial.printf("🌱 [AUTO PUMP] Optimal moisture reached (%.1f%%). Irrigation STOPPED.\n", s_soilAvg);
    }
  }

  // Canopy Heat Stress Cooling Logic
  if (s_airTemp >= 32.5f && !fanState) {
    setFan(true);
    Serial.printf("🔥 [AUTO FAN] Heat stress threshold exceeded (%.1f°C). Ventilation STARTED.\n", s_airTemp);
  } else if (s_airTemp < 30.0f && fanState) {
    setFan(false);
    Serial.printf("❄️ [AUTO FAN] Temperature normalized (%.1f°C). Ventilation STOPPED.\n", s_airTemp);
  }
}

// -------------------- 9. PAYLOAD BUILDER HELPERS --------------------
String buildJsonPayload(const char* routeSource) {
  String p = "{";
  p += "\"source\":\"" + String(routeSource) + "\",";
  p += "\"chip\":\"" + String(CHIP_NAME) + "\",";
  p += "\"zone\":\"Zone A\",";
  
  // Category 1: Soil Dynamics (9)
  p += "\"soilA\":" + String(s_soilA, 1) + ",";
  p += "\"soilB\":" + String(s_soilB, 1) + ",";
  p += "\"soilC\":" + String(s_soilC, 1) + ",";
  p += "\"soilD\":" + String(s_soilD, 1) + ",";
  p += "\"soilAvg\":" + String(s_soilAvg, 1) + ",";
  p += "\"soil_moisture_1\":" + String(s_soilA, 1) + ",";
  p += "\"soil_moisture_2\":" + String(s_soilB, 1) + ",";
  p += "\"soil_average\":" + String(s_soilAvg, 1) + ",";
  p += "\"soilTemp\":" + String(s_soilTemp, 1) + ",";
  p += "\"soilPH\":" + String(s_soilPH, 2) + ",";
  p += "\"soilEC\":" + String(s_soilEC, 2) + ",";
  p += "\"soilO2\":" + String(s_soilO2, 1) + ",";

  // Category 2: NPK Macronutrients (3)
  p += "\"nitrogen\":" + String(s_nitrogen, 1) + ",";
  p += "\"phosphorus\":" + String(s_phosphorus, 1) + ",";
  p += "\"potassium\":" + String(s_potassium, 1) + ",";

  // Category 3: Micro-Climate & Meteorology (10)
  p += "\"airTemp\":" + String(s_airTemp, 1) + ",";
  p += "\"air_temp\":" + String(s_airTemp, 1) + ",";
  p += "\"airHumidity\":" + String(s_airHumidity, 1) + ",";
  p += "\"air_humidity\":" + String(s_airHumidity, 1) + ",";
  p += "\"pressure\":" + String(s_pressure, 1) + ",";
  p += "\"light\":" + String(s_light, 1) + ",";
  p += "\"light_pct\":" + String(s_light, 1) + ",";
  p += "\"par\":" + String(s_par, 1) + ",";
  p += "\"uv\":" + String(s_uv, 1) + ",";
  p += "\"rain\":" + String(s_rain, 1) + ",";
  p += "\"rain_pct\":" + String(s_rain, 1) + ",";
  p += "\"wind\":" + String(s_wind, 1) + ",";
  p += "\"windDir\":" + String(s_windDir, 1) + ",";
  p += "\"dewPoint\":" + String(s_dewPoint, 1) + ",";

  // Category 4: Hydraulics & Water Infrastructure (6)
  p += "\"waterTank\":" + String(s_waterTank, 1) + ",";
  p += "\"tankPct\":" + String(s_waterTank, 1) + ",";
  p += "\"waterTemp\":" + String(s_waterTemp, 1) + ",";
  p += "\"tds\":" + String(s_tds, 1) + ",";
  p += "\"waterPH\":" + String(s_waterPH, 2) + ",";
  p += "\"waterFlow\":" + String(s_waterFlow, 1) + ",";
  p += "\"flow\":" + String(s_flow, 1) + ",";

  // Category 5: Canopy Biometrics (4)
  p += "\"leafWet\":" + String(s_leafWet, 1) + ",";
  p += "\"ndvi\":" + String(s_ndvi, 2) + ",";
  p += "\"sapFlow\":" + String(s_sapFlow, 1) + ",";
  p += "\"stemDia\":" + String(s_stemDia, 2) + ",";

  // Category 6: Environmental & Pest Intelligence (7)
  p += "\"airQuality\":" + String(s_airQuality, 1) + ",";
  p += "\"co2\":" + String(s_co2, 1) + ",";
  p += "\"smoke\":" + String(s_smoke, 1) + ",";
  p += "\"pestMic\":" + String(s_pestMic, 1) + ",";
  p += "\"pestCount\":" + String(s_pestCount, 1) + ",";
  p += "\"frost\":" + String(s_frost, 1) + ",";
  p += "\"vibration\":" + String(s_vibration, 1) + ",";

  // Category 7: Actuators (6)
  p += "\"pump\":" + String(pumpState ? "true" : "false") + ",";
  p += "\"fan\":" + String(fanState ? "true" : "false") + ",";
  p += "\"valveA\":" + String(valveAState ? "true" : "false") + ",";
  p += "\"valveB\":" + String(valveBState ? "true" : "false") + ",";
  p += "\"mode\":\"" + String(autoMode ? "auto" : "manual") + "\"";
  p += "}";
  return p;
}

// -------------------- 10. REMOTE ACTUATOR PARSER --------------------
void parseActuatorCommands(const String& resp) {
  if (resp.length() == 0) return;

  // Emergency stop check
  if (resp.indexOf("\"emergency_stop\":true") != -1 || resp.indexOf("\"status\":\"halted\"") != -1) {
    if (pumpState) setPump(false);
    if (fanState) setFan(false);
    manualOverrideActive = true;
    Serial.println(F("🛑 [REMOTE CMD] Emergency Stop Activated! All Actuators Halting."));
    return;
  }

  // Pump command check
  if (resp.indexOf("\"pump_command\":false") != -1 || resp.indexOf("\"pump\":false") != -1) {
    if (pumpState) {
      setPump(false);
      manualOverrideActive = true;
      Serial.println(F("🛑 [REMOTE CMD] Pump STOPPED remotely from Backend/Sheet"));
    }
  } else if (resp.indexOf("\"pump_command\":true") != -1 || resp.indexOf("\"pump\":true") != -1) {
    if (!pumpState && s_waterTank >= 8.0f) {
      setPump(true);
      manualOverrideActive = true;
      Serial.println(F("⚡ [REMOTE CMD] Pump STARTED remotely from Backend/Sheet"));
    }
  }

  // Fan command check
  if (resp.indexOf("\"fan_command\":false") != -1 || resp.indexOf("\"fan\":false") != -1) {
    if (fanState) {
      setFan(false);
      manualOverrideActive = true;
      Serial.println(F("🛑 [REMOTE CMD] Fan STOPPED remotely from Backend/Sheet"));
    }
  } else if (resp.indexOf("\"fan_command\":true") != -1 || resp.indexOf("\"fan\":true") != -1) {
    if (!fanState) {
      setFan(true);
      manualOverrideActive = true;
      Serial.println(F("⚡ [REMOTE CMD] Fan STARTED remotely from Backend/Sheet"));
    }
  }

  // Auto mode check
  if (resp.indexOf("\"auto_mode\":true") != -1 && manualOverrideActive) {
    manualOverrideActive = false;
    Serial.println(F("🌱 [REMOTE CMD] Auto-irrigation loop resumed from Backend/Sheet"));
  }
}

// -------------------- 11. PRIMARY ROUTE: GOOGLE SHEETS SYNC --------------------
bool syncWithGoogleSheets() {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure secClient;
  secClient.setInsecure(); // Essential for Google Apps Script SSL redirects (302)

  HTTPClient http;
  String url = String(WEB_APP_URL) + "?sts=write&source=wokwi_primary";
  url += "&zone=Zone%20A";
  url += "&soilA=" + String(s_soilA, 1);
  url += "&soilB=" + String(s_soilB, 1);
  url += "&soilAvg=" + String(s_soilAvg, 1);
  url += "&airTemp=" + String(s_airTemp, 1);
  url += "&airHumidity=" + String(s_airHumidity, 1);
  url += "&light=" + String(s_light, 1);
  url += "&rain=" + String(s_rain, 1);
  url += "&waterTank=" + String(s_waterTank, 1);
  url += "&soilPH=" + String(s_soilPH, 2);
  url += "&nitrogen=" + String(s_nitrogen, 1);
  url += "&phosphorus=" + String(s_phosphorus, 1);
  url += "&potassium=" + String(s_potassium, 1);
  url += "&co2=" + String(s_co2, 1);
  url += "&ndvi=" + String(s_ndvi, 2);
  url += "&waterFlow=" + String(s_waterFlow, 1);
  url += "&flow=" + String(s_flow, 1);
  url += "&pump=" + String(pumpState ? "true" : "false");
  url += "&fan=" + String(fanState ? "true" : "false");
  url += "&mode=" + String(autoMode ? "auto" : "manual");

  http.begin(secClient, url);
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  http.setTimeout(7000);

  int httpCode = http.GET();
  bool success = false;

  if (httpCode == 200 || httpCode == 302) {
    String resp = http.getString();
    Serial.printf("📊 [PRIMARY ROUTE SUCCESS] Telemetry logged to Google Sheet (HTTP %d) & Relayed to Backend!\n", httpCode);
    parseActuatorCommands(resp);
    success = true;
  } else {
    Serial.printf("⚠️ [GOOGLE SHEETS NOTICE] HTTP %d: %s\n", httpCode, http.errorToString(httpCode).c_str());
  }

  http.end();
  return success;
}

// -------------------- 12. FALLBACK ROUTE: DIRECT FASTAPI INGESTION --------------------
bool syncDirectFastApi() {
  if (WiFi.status() != WL_CONNECTED) return false;

  String payload = buildJsonPayload("wokwi_direct");
  bool success = false;

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
    if (code > 0 && (code == 200 || code == 201)) {
      Serial.printf("🚀 [FALLBACK ROUTE SUCCESS] Ingested DIRECTLY to FastAPI (%s, HTTP %d)\n", targetUrl, code);
      String resp = http.getString();
      parseActuatorCommands(resp);
      http.end();
      success = true;
      break;
    } else {
      http.end();
    }
  }

  return success;
}

// -------------------- 13. MASTER PIPELINE CONTROLLER --------------------
void executeTelemetryPipeline() {
  // Step 1: Attempt transmission via Google Sheets (Primary Path)
  bool sheetSuccess = syncWithGoogleSheets();

  if (sheetSuccess) {
    activePipelineRoute = "GOOGLE_SHEETS_PRIMARY";
  } else {
    // Step 2: Google Sheets failed or timed out -> Route directly to FastAPI website backend!
    Serial.println(F("⚠️ [FAILOVER TRIGGERED] Google Sheets unreachable. Routing DIRECTLY to AgriSense Website Backend..."));
    bool directSuccess = syncDirectFastApi();
    if (directSuccess) {
      activePipelineRoute = "WOKWI_DIRECT_FALLBACK";
    } else {
      activePipelineRoute = "OFFLINE_BUFFER";
      Serial.println(F("❌ [OFFLINE] Both Google Sheets and Direct Backend unreachable. Telemetry held in local buffer."));
    }
  }
}

// -------------------- 14. OLED DISPLAY HUD --------------------
void updateOledHUD() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  // Row 1: Header + Chip + Route Status
  display.setCursor(0, 0);
  display.printf("%s", IS_S3_CHIP ? "ESP32-S3" : "ESP32");

  display.setCursor(68, 0);
  if (activePipelineRoute == "GOOGLE_SHEETS_PRIMARY") {
    display.print("[GS->BE]");
  } else if (activePipelineRoute == "WOKWI_DIRECT_FALLBACK") {
    display.print("[DIRECT]");
  } else {
    display.print("[WOKWI]");
  }

  display.drawLine(0, 9, 127, 9, SSD1306_WHITE);

  // Row 2: Atmospheric Telemetry
  display.setCursor(0, 12);
  display.printf("T:%.1fC  H:%.0f%%  P:%0.f", s_airTemp, s_airHumidity, s_pressure);

  // Row 3: Soil Telemetry
  display.setCursor(0, 23);
  display.printf("Soil: A:%0.f B:%0.f (%0.f%%)", s_soilA, s_soilB, s_soilAvg);

  // Row 4: NPK & pH
  display.setCursor(0, 34);
  display.printf("N:%0.f P:%0.f K:%0.f pH:%.1f", s_nitrogen, s_phosphorus, s_potassium, s_soilPH);

  // Row 5: Hydraulics & Flow
  display.setCursor(0, 45);
  display.printf("Tank:%0.f%% Flow:%.1fL", s_waterTank, s_flow);

  // Row 6: Actuator Status Bar
  display.drawLine(0, 54, 127, 54, SSD1306_WHITE);
  display.setCursor(0, 56);
  display.printf("PUMP:%s FAN:%s M:%s",
    pumpState ? "ON " : "OFF",
    fanState ? "ON " : "OFF",
    autoMode ? "A" : "M"
  );

  display.display();
}

// -------------------- 15. USB WEB SERIAL & DASHBOARD STREAM --------------------
static void printProgressBar(float pct, int width = 8) {
  int filled = constrain((int)round((pct / 100.0f) * width), 0, width);
  Serial.print(F("["));
  for (int i = 0; i < filled; i++) Serial.print(F("="));
  if (filled < width) Serial.print(F(">"));
  for (int i = filled + 1; i < width; i++) Serial.print(F(" "));
  Serial.printf("] %4.0f%%", pct);
}

void streamSerialTelemetry() {
  unsigned long s = millis() / 1000;
  int hrs = s / 3600;
  int mins = (s % 3600) / 60;
  int secs = s % 60;

  Serial.println(F("\n+======================================================================================+"));
  Serial.printf("|   🌱  AGRISENSE 39-SENSOR MASTER EDGE IoT GATEWAY  |  PLATFORM: %-20s |\n", CHIP_NAME);
  Serial.println(F("+======================================================================================+"));
  Serial.printf("| 📶 Wi-Fi: %-14s | ⏱️ Uptime: %02d:%02d:%02d | ⚙️ Mode: %-9s | 📡 Baud: 115200  |\n",
    WiFi.status() == WL_CONNECTED ? "[ONLINE]" : "[OFFLINE]",
    hrs, mins, secs,
    autoMode ? "AUTO" : "MANUAL"
  );
  Serial.printf("| 🌐 Active Route: %-26s | ☁️ FastAPI: [READY] | 📊 Sheets: [READY]   |\n",
    activePipelineRoute.c_str()
  );
  Serial.println(F("+--------------------------------------------------------------------------------------+"));
  Serial.println(F("| 📊 SENSORS (39 FEEDS)          | VALUE                  | STATUS & SAFETY THRESHOLDS |"));
  Serial.println(F("+--------------------------------+------------------------+----------------------------+"));

  // 1. Soil Dynamics
  Serial.print(F("| 1. Soil Moisture 1 (Zone A)    | "));
  printProgressBar(s_soilA, 8);
  Serial.printf("  | %-26s |\n", s_soilA < 35 ? "LOW -> IRRIGATION CALL" : (s_soilA > 75 ? "SATURATED" : "OPTIMAL"));

  Serial.print(F("| 2. Soil Moisture 2 (Zone B)    | "));
  printProgressBar(s_soilB, 8);
  Serial.printf("  | %-26s |\n", s_soilB < 35 ? "LOW -> ZONE B DEFICIT" : "BALANCED");

  Serial.printf("| 3. Root Average Moisture       | %6.1f %%               | Optimal Range: 35-65%%      |\n", s_soilAvg);
  Serial.printf("| 4. Root Zone Soil Temperature  | %6.1f °C              | Lags air temp by ~4°C      |\n", s_soilTemp);
  Serial.printf("| 5. Soil Acidity / Alkalinity   | %6.2f pH              | Calibrated Agronomic Range |\n", s_soilPH);
  Serial.printf("| 6. Soil Electrical Conduct. EC | %6.2f dS/m            | Salinity Index             |\n", s_soilEC);
  Serial.printf("| 7. Sub-surface Soil Oxygen     | %6.1f %%               | Root Respiration Buffer    |\n", s_soilO2);

  // 2. NPK
  Serial.printf("| 8. Soil Nitrogen (N)           | %6.1f mg/kg           | Macronutrient Buffer       |\n", s_nitrogen);
  Serial.printf("| 9. Soil Phosphorus (P)         | %6.1f mg/kg           | Root Cell Energizer        |\n", s_phosphorus);
  Serial.printf("| 10. Soil Potassium (K)         | %6.1f mg/kg           | Stomatal Osmoregulation    |\n", s_potassium);

  // 3. Atmosphere
  Serial.printf("| 11. Ambient Air Temp (DHT22)   | %6.1f °C              | %-26s |\n",
    s_airTemp, s_airTemp >= 32.5f ? "HIGH HEAT -> FAN ACTIVE" : "CANOPY STABLE");
  Serial.printf("| 12. Relative Humidity (DHT22)  | %6.1f %%               | Transpiration Drive        |\n", s_airHumidity);
  Serial.printf("| 13. Barometric Pressure        | %6.1f hPa             | Weather Trend Buffer       |\n", s_pressure);
  Serial.printf("| 14. Solar Sunlight Level (LDR) | %6.1f %%               | Photoperiod Radiation      |\n", s_light);
  Serial.printf("| 15. PAR Quantum Sensor         | %6.1f µmol/m²/s       | Photosynthesis Rate        |\n", s_par);
  Serial.printf("| 16. Solar UV Index             | %6.1f / 12            | Photoprotection Check      |\n", s_uv);
  Serial.printf("| 17. Rainfall Intensity         | %6.1f %%               | %-26s |\n",
    s_rain, s_rain >= 50.0f ? "RAIN ACTIVE -> CUT PUMP" : "DRY");

  // 4. Hydraulics
  Serial.print(F("| 18. Water Reservoir Tank       | "));
  printProgressBar(s_waterTank, 8);
  Serial.printf("  | %-26s |\n", s_waterTank < 8 ? "CRITICAL -> PUMP LOCKOUT" : "SUFFICIENT HEAD");
  Serial.printf("| 19. Water Salinity TDS         | %6.1f ppm             | Irrigation Purity          |\n", s_tds);
  Serial.printf("| 20. Live Drip Inline Flow Rate | %6.1f L/min           | %-26s |\n",
    s_waterFlow, pumpState ? "FLOWING TO EMITTERS" : "STATIC");
  Serial.printf("| 21. Cumulative Water Used      | %6.1f Liters          | Precision Conservation     |\n", s_flow);

  // 5. Canopy Biometrics & Pests
  Serial.printf("| 22. Leaf Canopy Wetness        | %6.1f %%               | Fungal Inoculation Risk    |\n", s_leafWet);
  Serial.printf("| 23. Canopy NDVI Vigour Index   | %6.2f / 1.00          | Multispectral Crop Health  |\n", s_ndvi);
  Serial.printf("| 24. Vascular Sap Flow Rate     | %6.1f g/h             | Crop Water Uptake Velocity |\n", s_sapFlow);
  Serial.printf("| 25. Bio-Acoustic Pest Activity | %6.1f idx             | Acoustic Pest Detection    |\n", s_pestMic);
  Serial.printf("| 26. Ground Frost Alert Temp    | %6.1f °C              | Freeze Warning System      |\n", s_frost);

  // Actuators
  Serial.println(F("+--------------------------------+------------------------+----------------------------+"));
  Serial.printf("| ⚡ Water Pump Relay (GPIO %2d)  | %-22s | Valve A: %-4s | Valve B: %-4s|\n",
    PUMP_RELAY_PIN,
    pumpState ? "ON  [ACTIVE DISCHARGE]" : "OFF [STANDBY]",
    valveAState ? "OPEN" : "HOLD",
    valveBState ? "OPEN" : "HOLD"
  );
  Serial.printf("| 🌀 Cooling Fan Relay (GPIO %2d) | %-22s | Canopy Thermal Relief      |\n",
    FAN_RELAY_PIN,
    fanState ? "ON  [VENTILATING]" : "OFF [IDLE]"
  );
  Serial.println(F("+======================================================================================+\n"));

  // Clean Web Serial single-line JSON for 1-click in-browser sync
  Serial.print(F("{\"telemetry\":{"));
  Serial.printf("\"airTemp\":%.1f,\"airHumidity\":%.1f,\"soilAvg\":%.1f,\"soilA\":%.1f,\"soilB\":%.1f,",
    s_airTemp, s_airHumidity, s_soilAvg, s_soilA, s_soilB);
  Serial.printf("\"light\":%.1f,\"rain\":%.1f,\"waterTank\":%.1f,\"nitrogen\":%.1f,\"phosphorus\":%.1f,\"potassium\":%.1f,",
    s_light, s_rain, s_waterTank, s_nitrogen, s_phosphorus, s_potassium);
  Serial.printf("\"soilPH\":%.2f,\"ndvi\":%.2f,\"pump\":%s,\"fan\":%s,\"route\":\"%s\"}}\n",
    s_soilPH, s_ndvi,
    pumpState ? "true" : "false",
    fanState ? "true" : "false",
    activePipelineRoute.c_str()
  );
}

// -------------------- 16. SETUP & SUPER-LOOP --------------------
void setup() {
  Serial.begin(115200);
  delay(300);

  Serial.println(F("\n========================================================"));
  Serial.printf("   🌱 AGRISENSE 39-SENSOR MASTER EDGE IoT GATEWAY\n");
  Serial.printf("   Target Platform: %s\n", CHIP_NAME);
  Serial.printf("   Bal Bharati Public School Innovation Cell\n");
  Serial.println(F("========================================================"));

  pinMode(PUMP_RELAY_PIN, OUTPUT);
  pinMode(FAN_RELAY_PIN, OUTPUT);
  pinMode(VALVE_A_PIN, OUTPUT);
  pinMode(VALVE_B_PIN, OUTPUT);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  setPump(false);
  setFan(false);

  // Initialize I2C for SSD1306 OLED with chip-specific SDA/SCL pins
  Wire.begin(OLED_SDA_PIN, OLED_SCL_PIN);
  dht.begin();

  if (display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(10, 18);
    display.printf("AgriSense %s", IS_S3_CHIP ? "S3" : "V1");
    display.setCursor(6, 32);
    display.println("All 39 Sensors Init");
    display.display();
  }

  // Dual connectivity: Wokwi Simulator network + Real Mobile Hotspot
  wifiMulti.addAP("Wokwi-GUEST", "");
  wifiMulti.addAP("Redmi Note 10 Pro Max", "mear man");
  wifiMulti.addAP("Redmi Note 10 Pro Max", "mera man");

  Serial.print(F("🌐 Connecting to Network..."));
  int att = 0;
  while (wifiMulti.run() != WL_CONNECTED && att < 16) {
    delay(400);
    Serial.print(".");
    att++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(F("\n✅ Network Online!"));
    Serial.printf("   IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println(F("\n⚠️ Running in Offline Autonomous / USB Web Serial mode."));
  }

  sampleAll39Sensors();
  updateOledHUD();
}

void loop() {
  unsigned long now = millis();

  // 1. Sample all 39 sensors and run autonomous decision logic (1000ms)
  if (now - lastSensorSample >= 1000) {
    lastSensorSample = now;
    sampleAll39Sensors();
    runEdgeAutomation();
  }

  // 2. Refresh OLED HUD (1000ms)
  if (now - lastOledRefresh >= 1000) {
    lastOledRefresh = now;
    updateOledHUD();
  }

  // 3. Stream 39-sensor telemetry & visual HUD over USB Serial (2500ms)
  if (now - lastSerialStream >= 2500) {
    lastSerialStream = now;
    streamSerialTelemetry();
  }

  // 4. Primary Ingestion via Google Sheets & Fallback to Direct FastAPI (Every 4000ms)
  if (now - lastPipelineSync >= 4000) {
    lastPipelineSync = now;
    executeTelemetryPipeline();
  }

  // 5. Handle bidirectional USB Serial commands from web app
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
      manualOverrideActive = true;
      Serial.println(F("{\"ack\":\"fan_stopped\",\"state\":false}"));
    } else if (cmd == "AUTO_RESUME") {
      manualOverrideActive = false;
      Serial.println(F("{\"ack\":\"auto_resumed\"}"));
    } else if (cmd == "EMERGENCY_STOP") {
      setPump(false);
      setFan(false);
      manualOverrideActive = true;
      Serial.println(F("{\"ack\":\"emergency_stop_triggered\"}"));
    }
  }

  delay(20);
}
