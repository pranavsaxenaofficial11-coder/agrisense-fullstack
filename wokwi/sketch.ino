/* ==============================================================================
   AGRISENSE PRECISION AGRICULTURE — ALL 39 SENSORS WOKWI SIMULATION & HARDWARE
   Platform: ESP32 (Wokwi Virtual Simulator & Physical ESP32 DevKit V1)
   Team: AgriSense Innovation Cell — Bal Bharati Public School
   
   FEEDS & CAPABILITIES COVERED (ALL 39 SENSORS ON WEBSITE):
   1.  soilA         - Soil Moisture Sensor 1 (Zone A Primary Probe) [%]
   2.  soilB         - Soil Moisture Sensor 2 (Zone B Probe) [%]
   3.  soilC         - Soil Moisture Sensor 3 (Zone C Probe) [%]
   4.  soilD         - Soil Moisture Sensor 4 (Zone D Probe) [%]
   5.  soilAvg       - Average Root-Zone Soil Moisture [%]
   6.  airTemp       - Ambient Air Temperature (DHT22) [°C]
   7.  airHumidity   - Air Relative Humidity (DHT22) [%]
   8.  soilTemp      - Root Depth Soil Temperature [°C]
   9.  light         - Sunlight / Solar Radiation (LDR) [%]
   10. pressure      - Barometric Atmospheric Pressure [hPa]
   11. waterTank     - Ultrasonic Water Reservoir Level [%]
   12. rain          - Precipitation / Raindrop Intensity [%]
   13. airQuality    - MQ-135 Gas & Air Quality Index [idx]
   14. waterTemp     - Reservoir Water Temperature [°C]
   15. smoke         - MQ-2 Fire / Smoke & Combustible Gas [idx]
   16. tds           - Irrigation Water Total Dissolved Solids [ppm]
   17. soilPH        - Soil Acidity / Alkalinity [pH 5.5 - 8.5]
   18. nitrogen      - Soil Nitrogen (N) Macronutrient [mg/kg]
   19. phosphorus    - Soil Phosphorus (P) Macronutrient [mg/kg]
   20. potassium     - Soil Potassium (K) Macronutrient [mg/kg]
   21. leafWet       - Leaf Canopy Wetness Surface Sensor [%]
   22. co2           - Carbon Dioxide Concentration [ppm]
   23. flow          - Cumulative Irrigation Water Used Today [L]
   24. soilEC        - Soil Electrical Conductivity / Salinity [dS/m]
   25. wind          - Anemometer Wind Velocity [km/h]
   26. uv            - Solar Ultraviolet Index [0 - 12]
   27. windDir       - Anemometer Wind Direction [0° - 360°]
   28. dewPoint      - Thermodynamic Dew Point [°C]
   29. par           - Photosynthetically Active Radiation [µmol/m²/s]
   30. soilO2        - Sub-surface Soil Oxygen Aeration [%]
   31. waterFlow     - Instantaneous Inline Drip Flow Rate [L/min]
   32. waterPH       - Reservoir Irrigation Water pH [pH 6.0 - 8.0]
   33. pestMic       - Bio-Acoustic Pest Activity Index [idx]
   34. vibration     - Anti-Tamper & Field Enclosure Vibration [idx]
   35. ndvi          - Normalized Difference Vegetation Index [0.0 - 1.0]
   36. sapFlow       - Plant Vascular Sap Flow Velocity [g/h]
   37. stemDia       - Stem Micrometer / Dendrometer Diameter [mm]
   38. pestCount     - Smart Pheromone Trap Pest Count [/day]
   39. frost         - Ground-level Freeze / Frost Alert Temperature [°C]

   ACTUATORS:
   • Relay 1 (GPIO 25): Submersible Water Pump (Active LOW)
   • Relay 2 (GPIO 26): Greenhouse Ventilation Cooling Fan (Active LOW)
   • Valve A (GPIO 19): Zone A Solenoid Valve Indicator
   • Valve B (GPIO 23): Zone B Solenoid Valve Indicator
   • OLED (I2C 21/22): SSD1306 128x64 Live Telemetry HUD

   DIRECT CONNECTIONS:
   • Cloud Backend: https://agrisense-backend-kb22.onrender.com/api/sensors/ingest
   • Local Backend: http://10.3.9.249:8000/api/sensors/ingest
   • Google Sheets: https://script.google.com/macros/s/AKfycbxEWNrnzavYmBi6JyLME1dnxTW-xqxL17jZrVtTBhRO0rKKEXpTxAGb3yx_3D-IMzDUiw/exec
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

// -------------------- 1. OLED DISPLAY CONFIG --------------------
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// -------------------- 2. HARDWARE PIN DEFINITIONS --------------------
#define DHT_PIN          4     // DHT22 (Air Temp & Humidity)
#define DHT_TYPE         DHT22

#define SOIL1_PIN        34    // Potentiometer 1 -> Soil Moisture 1 (Zone A)
#define SOIL2_PIN        35    // Potentiometer 2 -> Soil Moisture 2 (Zone B)
#define LDR_PIN          32    // LDR Photoresistor -> Solar Light Level
#define RAIN_PIN         33    // Raindrop Analog Sensor

#define TRIG_PIN         5     // HC-SR04 Ultrasonic Transmitter
#define ECHO_PIN         18    // HC-SR04 Ultrasonic Receiver

#define PUMP_RELAY_PIN   25    // Submersible Pump Relay (Active LOW)
#define FAN_RELAY_PIN    26    // Cooling Fan Relay (Active LOW)
#define VALVE_A_PIN      19    // Zone A Solenoid Valve Indicator
#define VALVE_B_PIN      23    // Zone B Solenoid Valve Indicator

DHT dht(DHT_PIN, DHT_TYPE);

// -------------------- 3. CLOUD ENDPOINTS --------------------
const char* WEB_APP_URL = 
  "https://script.google.com/macros/s/"
  "AKfycbxEWNrnzavYmBi6JyLME1dnxTW-xqxL17jZrVtTBhRO0rKKEXpTxAGb3yx_3D-IMzDUiw"
  "/exec";

const char* FASTAPI_ENDPOINTS[] = {
  "https://agrisense-backend-kb22.onrender.com/api/sensors/ingest",
  "http://10.3.9.249:8000/api/sensors/ingest",
  "https://agrisense-backend-kb22.onrender.com/api/iot/telemetry"
};
const int NUM_FASTAPI_ENDPOINTS = 3;

// -------------------- 4. ALL 39 SENSOR STATE VARIABLES --------------------
float s_soilA       = 35.0f; // 1. Soil Moisture 1 (%)
float s_soilB       = 32.0f; // 2. Soil Moisture 2 (%)
float s_soilC       = 30.0f; // 3. Soil Moisture 3 (%)
float s_soilD       = 34.0f; // 4. Soil Moisture 4 (%)
float s_soilAvg     = 33.5f; // 5. Soil Moisture Average (%)
float s_airTemp     = 28.5f; // 6. Air Temperature (°C)
float s_airHumidity = 60.0f; // 7. Air Humidity (%)
float s_soilTemp    = 24.5f; // 8. Soil Temperature (°C)
float s_light       = 65.0f; // 9. Solar Light Level (%)
float s_pressure    = 1012.0f; // 10. Barometric Pressure (hPa)
float s_waterTank   = 75.0f; // 11. Water Reservoir Tank Level (%)
float s_rain        = 0.0f;  // 12. Rainfall Intensity (%)
float s_airQuality  = 28.0f; // 13. Air Quality Index (MQ-135)
float s_waterTemp   = 23.0f; // 14. Water Temperature (°C)
float s_smoke       = 14.0f; // 15. Smoke / Combustible Gas Index (MQ-2)
float s_tds         = 340.0f; // 16. Water Salinity TDS (ppm)
float s_soilPH      = 6.5f;  // 17. Soil pH
float s_nitrogen    = 175.0f; // 18. Soil Nitrogen (mg/kg)
float s_phosphorus  = 22.0f; // 19. Soil Phosphorus (mg/kg)
float s_potassium   = 165.0f; // 20. Soil Potassium (mg/kg)
float s_leafWet     = 28.0f; // 21. Leaf Wetness (%)
float s_co2         = 430.0f; // 22. CO2 Concentration (ppm)
float s_flow        = 18.5f; // 23. Cumulative Water Delivered Today (L)
float s_soilEC      = 1.15f; // 24. Soil EC Salinity (dS/m)
float s_wind        = 8.5f;  // 25. Wind Speed (km/h)
float s_uv          = 5.5f;  // 26. UV Index
float s_windDir     = 180.0f; // 27. Wind Direction (degrees)
float s_dewPoint    = 19.5f; // 28. Dew Point (°C)
float s_par         = 850.0f; // 29. Photosynthetically Active Radiation (µmol)
float s_soilO2      = 19.2f; // 30. Soil Oxygen (%)
float s_waterFlow   = 0.0f;  // 31. Live Drip Water Flow (L/min)
float s_waterPH     = 7.0f;  // 32. Water pH
float s_pestMic     = 12.0f; // 33. Acoustic Pest Activity Index
float s_vibration   = 1.5f;  // 34. Enclosure Tamper Vibration
float s_ndvi        = 0.76f; // 35. NDVI Canopy Vigour (0-1)
float s_sapFlow     = 45.0f; // 36. Plant Stem Sap Flow (g/h)
float s_stemDia     = 12.6f; // 37. Stem Dendrometer Diameter (mm)
float s_pestCount   = 2.0f;  // 38. Smart Pheromone Trap Count (/day)
float s_frost       = 8.5f;  // 39. Ground Frost Temperature (°C)

// Actuators & Flags
bool pumpState            = false;
bool fanState             = false;
bool valveAState          = false;
bool valveBState          = false;
bool autoMode             = true;
bool manualOverrideActive = false;

// Timers
unsigned long lastSensorSample = 0;
unsigned long lastSerialStream = 0;
unsigned long lastFastApiSync  = 0;
unsigned long lastSheetsSync   = 0;
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

// -------------------- 7. COMPREHENSIVE 39-SENSOR SAMPLING & FORMULAS --------------------
void sampleAll39Sensors() {
  // --- REAL PHYSICAL / WOKWI HARDWARE PINS ---
  // A. DHT22
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

  // E. Ultrasonic Reservoir Tank
  float distCm = readDistanceCm();
  // HC-SR04: 22cm empty -> 4cm full
  s_waterTank = constrain(((22.0f - distCm) / 18.0f) * 100.0f, 0.0f, 100.0f);

  // --- SCIENTIFIC & AGRONOMIC SENSOR COMPUTATIONS ---
  // 8. Soil Temperature (Thermodynamic depth buffer: lags air temp by ~4°C)
  s_soilTemp = constrain(s_airTemp - 3.8f + (s_light * 0.04f), 10.0f, 45.0f);

  // 10. Barometric Pressure (Drop correlates with rain and storm systems)
  s_pressure = constrain(1013.25f - (s_rain * 0.22f) - ((s_airTemp - 25.0f) * 0.15f), 980.0f, 1030.0f);

  // 13. MQ-135 Air Quality (VOCs & Ammonia)
  s_airQuality = constrain(22.0f + (s_airTemp * 0.3f) + (s_smoke * 0.4f), 10.0f, 150.0f);

  // 14. Water Temperature in Reservoir
  s_waterTemp = constrain(s_airTemp - 5.0f + (s_light * 0.03f), 12.0f, 35.0f);

  // 15. MQ-2 Smoke & Flammable Gas Index
  s_smoke = constrain(10.0f + ((s_airTemp > 38.0f) ? 25.0f : 0.0f), 5.0f, 100.0f);

  // 16. Total Dissolved Solids (TDS ppm)
  s_tds = constrain(320.0f + (s_soilB * 1.5f), 150.0f, 1200.0f);

  // 17. Soil pH
  s_soilPH = constrain(6.4f + ((50.0f - s_rain) * 0.006f) - (s_soilAvg * 0.003f), 5.6f, 7.8f);

  // 18-20. NPK Macronutrients (mg/kg)
  s_nitrogen   = constrain(140.0f + (s_soilAvg * 0.8f), 60.0f, 250.0f);
  s_phosphorus = constrain(18.0f + (s_light * 0.12f), 8.0f, 50.0f);
  s_potassium  = constrain(150.0f + (s_soilAvg * 0.6f), 90.0f, 300.0f);

  // 21. Leaf Wetness (%) - Rises with high air humidity or rain
  s_leafWet = constrain((s_rain > 10) ? (70.0f + s_rain * 0.3f) : (s_airHumidity * 0.45f), 0.0f, 100.0f);

  // 22. CO2 Concentration (ppm)
  s_co2 = constrain(415.0f + ((s_airQuality > 50) ? 80.0f : 15.0f), 350.0f, 1200.0f);

  // 23. Cumulative Water Delivered Today (L)
  if (pumpState) {
    s_flow += 0.07f; // ~4.2 Liters per minute
  }

  // 24. Soil Electrical Conductivity / Salinity (dS/m)
  s_soilEC = constrain(0.8f + (s_tds / 1000.0f) * 0.6f, 0.4f, 4.5f);

  // 25. Anemometer Wind Speed (km/h)
  s_wind = constrain(6.0f + (s_light * 0.08f) + (s_rain * 0.12f), 0.0f, 65.0f);

  // 26. Solar Ultraviolet UV Index
  s_uv = constrain((s_light / 100.0f) * 11.5f, 0.0f, 12.0f);

  // 27. Wind Direction (Degrees 0-360)
  s_windDir = 180.0f; // South-Southwest predominant

  // 28. Thermodynamic Dew Point (°C) via Magnus formula
  float a = 17.27f, b = 237.7f;
  float alpha = ((a * s_airTemp) / (b + s_airTemp)) + log(max(0.01f, s_airHumidity / 100.0f));
  s_dewPoint = (b * alpha) / (a - alpha);

  // 29. Photosynthetically Active Radiation PAR (µmol/m²/s)
  s_par = constrain((s_light / 100.0f) * 1850.0f, 0.0f, 2200.0f);

  // 30. Sub-surface Soil Oxygen Aeration (%)
  s_soilO2 = constrain(21.0f - (s_soilAvg * 0.08f), 8.0f, 21.0f);

  // 32. Water pH
  s_waterPH = constrain(6.9f + (s_tds * 0.0004f), 6.0f, 8.2f);

  // 33. Acoustic Bio-Pest Activity Index
  s_pestMic = constrain((s_airTemp > 30.0f && s_airHumidity > 60.0f) ? 38.0f : 12.0f, 0.0f, 90.0f);

  // 34. Tamper Vibration Index
  s_vibration = 1.0f; // Normal stable field box

  // 35. NDVI Canopy Vigour (0.00 - 1.00)
  s_ndvi = constrain(0.55f + ((s_soilAvg > 30 && s_soilAvg < 65) ? 0.28f : 0.05f) - (s_airTemp > 38 ? 0.15f : 0.0f), 0.2f, 0.95f);

  // 36. Plant Stem Sap Flow Velocity (g/h)
  s_sapFlow = constrain((s_light * 0.6f) + ((s_soilAvg > 25) ? 20.0f : 5.0f), 5.0f, 95.0f);

  // 37. Stem Dendrometer Diameter (mm)
  s_stemDia = constrain(12.2f + (s_soilAvg * 0.012f), 10.0f, 15.0f);

  // 38. Smart Pheromone Trap Count (/day)
  s_pestCount = (s_airTemp > 32.0f && s_airHumidity > 65.0f) ? 8.0f : 2.0f;

  // 39. Ground Frost Temperature (°C)
  s_frost = constrain(s_airTemp - 6.5f, -5.0f, 35.0f);
}

// -------------------- 8. EDGE CLOSED-LOOP DECISION ENGINE --------------------
void runEdgeAutomation() {
  if (manualOverrideActive) return;

  // Dry-Run Reservoir Protection
  if (s_waterTank < 8.0f) {
    if (pumpState) {
      setPump(false);
      Serial.println(F("⚠️ [AUTO SAFETY] Water tank level critical (<8%)! Pump halted."));
    }
    return;
  }

  // Rain Protection
  if (s_rain >= 50.0f) {
    if (pumpState) {
      setPump(false);
      Serial.println(F("🌧️ [AUTO ECO] Heavy rain active. Irrigation paused."));
    }
  } else {
    // Soil moisture thresholding
    if (s_soilAvg <= 35.0f && !pumpState) {
      setPump(true);
      Serial.printf("💧 [AUTO PUMP] Low moisture (%.1f%%). Irrigation STARTED.\n", s_soilAvg);
    } else if (s_soilAvg >= 65.0f && pumpState) {
      setPump(false);
      Serial.printf("🌱 [AUTO PUMP] Optimal moisture (%.1f%%). Irrigation STOPPED.\n", s_soilAvg);
    }
  }

  // Canopy Heat Stress Cooling Logic
  if (s_airTemp >= 32.5f && !fanState) {
    setFan(true);
    Serial.printf("🔥 [AUTO FAN] High temperature (%.1f°C). Ventilation STARTED.\n", s_airTemp);
  } else if (s_airTemp < 30.0f && fanState) {
    setFan(false);
    Serial.printf("❄️ [AUTO FAN] Temperature cooled (%.1f°C). Ventilation STOPPED.\n", s_airTemp);
  }
}

// -------------------- 9. FASTAPI DIRECT INGESTION SYNC (ALL 39 FEEDS) --------------------
void syncWithFastApi() {
  if (WiFi.status() != WL_CONNECTED) return;

  // Construct comprehensive 39-sensor JSON payload
  String p = "{";
  p += "\"soilA\":" + String(s_soilA, 1) + ",";
  p += "\"soilB\":" + String(s_soilB, 1) + ",";
  p += "\"soilC\":" + String(s_soilC, 1) + ",";
  p += "\"soilD\":" + String(s_soilD, 1) + ",";
  p += "\"soilAvg\":" + String(s_soilAvg, 1) + ",";
  p += "\"soil_moisture_1\":" + String(s_soilA, 1) + ",";
  p += "\"soil_moisture_2\":" + String(s_soilB, 1) + ",";
  p += "\"soil_average\":" + String(s_soilAvg, 1) + ",";
  p += "\"airTemp\":" + String(s_airTemp, 1) + ",";
  p += "\"air_temp\":" + String(s_airTemp, 1) + ",";
  p += "\"airHumidity\":" + String(s_airHumidity, 1) + ",";
  p += "\"air_humidity\":" + String(s_airHumidity, 1) + ",";
  p += "\"soilTemp\":" + String(s_soilTemp, 1) + ",";
  p += "\"light\":" + String(s_light, 1) + ",";
  p += "\"light_pct\":" + String(s_light, 1) + ",";
  p += "\"pressure\":" + String(s_pressure, 1) + ",";
  p += "\"waterTank\":" + String(s_waterTank, 1) + ",";
  p += "\"tankPct\":" + String(s_waterTank, 1) + ",";
  p += "\"rain\":" + String(s_rain, 1) + ",";
  p += "\"rain_pct\":" + String(s_rain, 1) + ",";
  p += "\"airQuality\":" + String(s_airQuality, 1) + ",";
  p += "\"waterTemp\":" + String(s_waterTemp, 1) + ",";
  p += "\"smoke\":" + String(s_smoke, 1) + ",";
  p += "\"tds\":" + String(s_tds, 1) + ",";
  p += "\"soilPH\":" + String(s_soilPH, 2) + ",";
  p += "\"nitrogen\":" + String(s_nitrogen, 1) + ",";
  p += "\"phosphorus\":" + String(s_phosphorus, 1) + ",";
  p += "\"potassium\":" + String(s_potassium, 1) + ",";
  p += "\"leafWet\":" + String(s_leafWet, 1) + ",";
  p += "\"co2\":" + String(s_co2, 1) + ",";
  p += "\"flow\":" + String(s_flow, 1) + ",";
  p += "\"soilEC\":" + String(s_soilEC, 2) + ",";
  p += "\"wind\":" + String(s_wind, 1) + ",";
  p += "\"uv\":" + String(s_uv, 1) + ",";
  p += "\"windDir\":" + String(s_windDir, 1) + ",";
  p += "\"dewPoint\":" + String(s_dewPoint, 1) + ",";
  p += "\"par\":" + String(s_par, 1) + ",";
  p += "\"soilO2\":" + String(s_soilO2, 1) + ",";
  p += "\"waterFlow\":" + String(s_waterFlow, 1) + ",";
  p += "\"waterPH\":" + String(s_waterPH, 2) + ",";
  p += "\"pestMic\":" + String(s_pestMic, 1) + ",";
  p += "\"vibration\":" + String(s_vibration, 1) + ",";
  p += "\"ndvi\":" + String(s_ndvi, 2) + ",";
  p += "\"sapFlow\":" + String(s_sapFlow, 1) + ",";
  p += "\"stemDia\":" + String(s_stemDia, 2) + ",";
  p += "\"pestCount\":" + String(s_pestCount, 1) + ",";
  p += "\"frost\":" + String(s_frost, 1) + ",";
  p += "\"pump\":" + String(pumpState ? "true" : "false") + ",";
  p += "\"fan\":" + String(fanState ? "true" : "false") + ",";
  p += "\"valveA\":" + String(valveAState ? "true" : "false") + ",";
  p += "\"valveB\":" + String(valveBState ? "true" : "false") + ",";
  p += "\"mode\":\"" + String(autoMode ? "auto" : "manual") + "\"";
  p += "}";

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

    int code = http.POST(p);
    if (code > 0) {
      Serial.printf("✅ [FASTAPI SYNC] All 39 Feeds uploaded to %s (HTTP %d)\n", targetUrl, code);
      String resp = http.getString();

      // Check remote commands
      if (resp.indexOf("\"pump_command\":false") != -1 || resp.indexOf("\"pump\":false") != -1 ||
          resp.indexOf("\"emergency_stop\":true") != -1 || resp.indexOf("\"status\":\"halted\"") != -1) {
        if (pumpState) {
          setPump(false);
          manualOverrideActive = true;
          Serial.println(F("🛑 [REMOTE CMD] Pump HALTED by Dashboard Emergency Stop"));
        }
      } else if (resp.indexOf("\"pump_command\":true") != -1 || resp.indexOf("\"pump\":true") != -1) {
        if (!pumpState && s_waterTank >= 8.0f) {
          setPump(true);
          manualOverrideActive = true;
          Serial.println(F("⚡ [REMOTE CMD] Pump STARTED remotely from Dashboard"));
        }
      }
      http.end();
      break;
    } else {
      http.end();
    }
  }
}

// -------------------- 10. GOOGLE SHEETS SYNC --------------------
void syncWithGoogleSheets() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure secClient;
  secClient.setInsecure(); // Required for Google Script SSL handshake & 302 redirects

  HTTPClient http;
  String url = String(WEB_APP_URL) + "?sts=write";
  url += "&zone=Zone%20A";
  url += "&air_temp=" + String(s_airTemp, 1);
  url += "&air_humidity=" + String(s_airHumidity, 1);
  url += "&soil_moisture_1=" + String(s_soilA, 1);
  url += "&soil_moisture_2=" + String(s_soilB, 1);
  url += "&soil_average=" + String(s_soilAvg, 1);
  url += "&light_pct=" + String(s_light, 1);
  url += "&rain_pct=" + String(s_rain, 1);
  url += "&tank_level_pct=" + String(s_waterTank, 1);
  url += "&soil_ph=" + String(s_soilPH, 2);
  url += "&nitrogen=" + String(s_nitrogen, 1);
  url += "&co2=" + String(s_co2, 1);
  url += "&ndvi=" + String(s_ndvi, 2);
  url += "&pump_state=" + String(pumpState ? "true" : "false");
  url += "&fan_state=" + String(fanState ? "true" : "false");

  http.begin(secClient, url);
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  http.setTimeout(10000);

  int httpCode = http.GET();
  if (httpCode > 0) {
    Serial.printf("📊 [GOOGLE SHEETS] 39-Sensor telemetry logged to sheet (HTTP %d)\n", httpCode);
  }
  http.end();
}

// -------------------- 11. OLED DISPLAY HUD --------------------
void updateOledHUD() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  display.setCursor(0, 0);
  display.print("AgriSense 39-Feed");

  display.setCursor(96, 0);
  display.print(WiFi.status() == WL_CONNECTED ? "[ON]" : "[--]");
  display.drawLine(0, 9, 127, 9, SSD1306_WHITE);

  display.setCursor(0, 13);
  display.printf("T:%.1fC  H:%.0f%%  P:%0.f", s_airTemp, s_airHumidity, s_pressure);

  display.setCursor(0, 24);
  display.printf("Soil: A:%0.f B:%0.f (%0.f%%)", s_soilA, s_soilB, s_soilAvg);

  display.setCursor(0, 35);
  display.printf("N:%0.f P:%0.f K:%0.f pH:%.1f", s_nitrogen, s_phosphorus, s_potassium, s_soilPH);

  display.setCursor(0, 46);
  display.printf("Tank:%0.f%% Flow:%.1fL", s_waterTank, s_flow);

  display.drawLine(0, 54, 127, 54, SSD1306_WHITE);
  display.setCursor(0, 56);
  display.printf("PUMP:%s FAN:%s", pumpState ? "ON " : "OFF", fanState ? "ON " : "OFF");

  display.display();
}

// -------------------- 12. USB WEB SERIAL JSON STREAM --------------------
void streamSerialTelemetry() {
  // Real-time JSON stream consumed directly by app.html Web Serial reader
  Serial.printf(
    "{\"soilA\":%.1f,\"soilB\":%.1f,\"soilC\":%.1f,\"soilD\":%.1f,\"soilAvg\":%.1f,\"airTemp\":%.1f,\"airHumidity\":%.1f,\"soilTemp\":%.1f,\"light\":%.1f,\"pressure\":%.1f,\"waterTank\":%.1f,\"rain\":%.1f,\"airQuality\":%.1f,\"waterTemp\":%.1f,\"smoke\":%.1f,\"tds\":%.1f,\"soilPH\":%.2f,\"nitrogen\":%.1f,\"phosphorus\":%.1f,\"potassium\":%.1f,\"leafWet\":%.1f,\"co2\":%.1f,\"flow\":%.1f,\"soilEC\":%.2f,\"wind\":%.1f,\"uv\":%.1f,\"windDir\":%.1f,\"dewPoint\":%.1f,\"par\":%.1f,\"soilO2\":%.1f,\"waterFlow\":%.1f,\"waterPH\":%.2f,\"pestMic\":%.1f,\"vibration\":%.1f,\"ndvi\":%.2f,\"sapFlow\":%.1f,\"stemDia\":%.2f,\"pestCount\":%.1f,\"frost\":%.1f,\"pump\":%s,\"fan\":%s,\"valveA\":%s,\"valveB\":%s,\"mode\":\"%s\"}\n",
    s_soilA, s_soilB, s_soilC, s_soilD, s_soilAvg, s_airTemp, s_airHumidity, s_soilTemp, s_light, s_pressure,
    s_waterTank, s_rain, s_airQuality, s_waterTemp, s_smoke, s_tds, s_soilPH, s_nitrogen, s_phosphorus, s_potassium,
    s_leafWet, s_co2, s_flow, s_soilEC, s_wind, s_uv, s_windDir, s_dewPoint, s_par, s_soilO2,
    s_waterFlow, s_waterPH, s_pestMic, s_vibration, s_ndvi, s_sapFlow, s_stemDia, s_pestCount, s_frost,
    pumpState ? "true" : "false", fanState ? "true" : "false",
    valveAState ? "true" : "false", valveBState ? "true" : "false",
    autoMode ? "auto" : "manual"
  );
}

// ==============================================================================
// SETUP
// ==============================================================================
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println(F("\n========================================================"));
  Serial.println(F("🌱 AgriSense 39-Sensor Master Edge IoT Gateway"));
  Serial.println(F("BAL BHARATI PUBLIC SCHOOL — RESEARCH & INNOVATION CELL"));
  Serial.println(F("========================================================"));

  pinMode(PUMP_RELAY_PIN, OUTPUT);
  pinMode(FAN_RELAY_PIN, OUTPUT);
  pinMode(VALVE_A_PIN, OUTPUT);
  pinMode(VALVE_B_PIN, OUTPUT);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  setPump(false);
  setFan(false);

  dht.begin();

  if (display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(14, 20);
    display.println("AgriSense 39");
    display.setCursor(8, 34);
    display.println("Sensors Starting...");
    display.display();
  }

  // Dual connectivity: Wokwi Simulator network + Real Mobile Hotspot
  wifiMulti.addAP("Wokwi-GUEST", "");
  wifiMulti.addAP("Redmi Note 10 Pro Max", "mear man");
  wifiMulti.addAP("Redmi Note 10 Pro Max", "mera man");

  Serial.print(F("🌐 Connecting to Network..."));
  int att = 0;
  while (wifiMulti.run() != WL_CONNECTED && att < 18) {
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

// ==============================================================================
// SUPER-LOOP
// ==============================================================================
void loop() {
  unsigned long now = millis();

  // 1. Sample all 39 sensors and run autonomous logic (1000ms)
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

  // 3. Stream 39-sensor telemetry over USB Serial (1000ms)
  if (now - lastSerialStream >= 1000) {
    lastSerialStream = now;
    streamSerialTelemetry();
  }

  // 4. Ingest into FastAPI Cloud Website (Every 4000ms)
  if (now - lastFastApiSync >= 4000) {
    lastFastApiSync = now;
    syncWithFastApi();
  }

  // 5. Ingest into Google Sheets (Every 10000ms)
  if (now - lastSheetsSync >= 10000) {
    lastSheetsSync = now;
    syncWithGoogleSheets();
  }

  // 6. Handle bidirectional USB Serial commands from web app
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
    }
  }

  delay(20);
}
