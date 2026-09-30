/* ====================================================================
   AgriSense — Connected ESP32 Production Firmware
   Connects your real field hardware to the AgriSense Web Platform
   
   Supports:
     1. Direct Web Serial USB Plug-and-Play (Zero setup via Chrome/Edge)
     2. Wi-Fi Cloud / Local Backend Ingestion (HTTP POST to /api/sensors/ingest)
     3. 100% Offline Edge Autonomous Irrigation Logic
     
   WIRING PINOUT (Matches Your Exact Kit):
     • DHT11 (Temperature & Humidity):  DATA -> GPIO 4
     • Soil Moisture Sensor 1:          AO   -> GPIO 34 (Analog)
     • Soil Moisture Sensor 2:          AO   -> GPIO 35 (Analog)
     • LDR Light Sensor Module:         AO   -> GPIO 32 (Analog)
     • Raindrop Sensor Module:          AO   -> GPIO 33 (Analog)
     • HC-SR04 Ultrasonic:             TRIG -> GPIO 5, ECHO -> GPIO 18
     • 5V Pump Relay (Active LOW):      IN   -> GPIO 25
     • 5V Fan Relay (Active LOW):       IN   -> GPIO 26
   ==================================================================== */

#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>

// ====================================================================
// 1. NETWORK SETTINGS (Optional — leave as-is for USB-only mode)
// ====================================================================
const char* WIFI_SSID     = "YOUR_WIFI_OR_HOTSPOT_NAME";     // Enter your Wi-Fi or Mobile Hotspot name
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";         // Enter your Wi-Fi password

// Backend Server Endpoint (Replace with your Laptop IP when testing on same Wi-Fi)
// Example: "http://192.168.1.15:8000/api/sensors/ingest"
const char* SERVER_URL    = "http://127.0.0.1:8000/api/sensors/ingest";

// ====================================================================
// 2. PIN DEFINITIONS
// ====================================================================
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

// Relays are active-LOW: LOW = ON, HIGH = OFF
#define RELAY_ON      LOW
#define RELAY_OFF     HIGH

// ====================================================================
// 3. THRESHOLDS
// ====================================================================
#define SOIL_DRY_PCT   30.0   // Turn pump ON below this moisture %
#define RAIN_WET_PCT   45.0   // Hold irrigation if rain reading > 45%
#define FAN_ON_TEMP    34.0   // Turn fan ON above 34°C
#define TANK_EMPTY_CM  25.0   // Warn & cut off pump if water distance > 25cm

DHT dht(DHT_PIN, DHT_TYPE);

unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL = 3000; // Send readings every 3 seconds

// Translate analog ADC (0-4095) to percentage (0-100%)
float toPct(int raw) {
  return constrain((4095.0 - raw) / 4095.0 * 100.0, 0.0, 100.0);
}

float readTankCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long dur = pulseIn(ECHO_PIN, HIGH, 30000); // 30ms timeout
  if (!dur) return -1;
  return dur * 0.0343 / 2.0; // cm distance to water surface
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println(F("\n=========================================="));
  Serial.println(F("   AgriSense — Connected Hardware Node    "));
  Serial.println(F("=========================================="));

  // Initialize sensors
  pinMode(SOIL1_PIN, INPUT);
  pinMode(SOIL2_PIN, INPUT);
  pinMode(LDR_PIN, INPUT);
  pinMode(RAIN_PIN, INPUT);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  // Initialize relays (start SAFE and OFF)
  pinMode(PUMP_RELAY, OUTPUT);
  pinMode(FAN_RELAY, OUTPUT);
  digitalWrite(PUMP_RELAY, RELAY_OFF);
  digitalWrite(FAN_RELAY, RELAY_OFF);

  dht.begin();

  // Connect to Wi-Fi if credentials are provided
  if (String(WIFI_SSID) != "YOUR_WIFI_OR_HOTSPOT_NAME") {
    Serial.printf("Connecting to Wi-Fi: %s ...\n", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    int retries = 0;
    while (WiFi.status() != WL_CONNECTED && retries < 15) {
      delay(500);
      Serial.print(".");
      retries++;
    }
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println(F("\n✓ Wi-Fi Connected!"));
      Serial.printf("IP Address: %s\n", WiFi.localIP().toString().c_str());
    } else {
      Serial.println(F("\n⚠️ Wi-Fi not connected. Operating in USB Serial / Offline mode."));
    }
  } else {
    Serial.println(F("ℹ️ Plug & Play USB Mode active. Use 'Connect Hardware' button on website."));
  }
}

void loop() {
  // Read sensors
  float airTemp = dht.readTemperature();
  float airHum  = dht.readHumidity();
  if (isnan(airTemp)) airTemp = 28.0;
  if (isnan(airHum))  airHum  = 60.0;

  int soil1Raw  = analogRead(SOIL1_PIN);
  int soil2Raw  = analogRead(SOIL2_PIN);
  float soil1   = toPct(soil1Raw);
  float soil2   = toPct(soil2Raw);
  float soilAvg = (soil1 + soil2) / 2.0;

  int ldrRaw    = analogRead(LDR_PIN);
  float lightPct = (ldrRaw / 4095.0) * 100.0;

  int rainRaw   = analogRead(RAIN_PIN);
  float rainPct = toPct(rainRaw);

  float tankCm  = readTankCm();
  bool tankLow  = (tankCm > 0 && tankCm > TANK_EMPTY_CM);
  float tankPct = (tankCm > 0) ? constrain((25.0 - tankCm) / 20.0 * 100.0, 0.0, 100.0) : 80.0;

  // Autonomous Edge Decision Logic
  bool pumpOn = (soilAvg < SOIL_DRY_PCT) && (rainPct < RAIN_WET_PCT) && !tankLow;
  bool fanOn  = (airTemp > FAN_ON_TEMP);

  digitalWrite(PUMP_RELAY, pumpOn ? RELAY_ON : RELAY_OFF);
  digitalWrite(FAN_RELAY,  fanOn ? RELAY_ON : RELAY_OFF);

  // Send readings every SEND_INTERVAL
  if (millis() - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = millis();

    // 1. Output Structured JSON to Serial (For Web Serial USB Browser Connection)
    Serial.printf("{\"airTemp\":%.1f,\"airHum\":%.1f,\"soilAvg\":%.1f,\"soil1\":%.1f,\"soil2\":%.1f,\"light\":%.1f,\"rain\":%.1f,\"tankPct\":%.1f,\"pump\":%s,\"fan\":%s}\n",
                  airTemp, airHum, soilAvg, soil1, soil2, lightPct, rainPct, tankPct, pumpOn ? "true" : "false", fanOn ? "true" : "false");

    // 2. Output Human-Readable Serial stream
    Serial.println(F("------ AgriSense Telemetry ------"));
    Serial.printf("Air Temp:       %.1f C\n", airTemp);
    Serial.printf("Air Humidity:   %.1f %%\n", airHum);
    Serial.printf("Soil Moisture:  %.0f %% (S1: %.0f%% | S2: %.0f%%)\n", soilAvg, soil1, soil2);
    Serial.printf("Sunlight:       %.0f %%\n", lightPct);
    Serial.printf("Rain Level:     %.0f %%\n", rainPct);
    Serial.printf("Tank Level:     %.1f %% %s\n", tankPct, tankLow ? "[LOW WATER WARNING]" : "");
    Serial.printf("Pump Relay:     %s\n", pumpOn ? "ACTIVE (Irrigating)" : "STANDBY");
    Serial.printf("Fan Relay:      %s\n", fanOn ? "ACTIVE (Cooling)" : "STANDBY");
    Serial.println(F("----------------------------------"));

    // 3. Send HTTP POST over Wi-Fi if connected
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(SERVER_URL);
      http.addHeader("Content-Type", "application/json");

      String payload = String("{") +
        "\"soil_moisture_1\":" + String(soil1, 1) + "," +
        "\"soil_moisture_2\":" + String(soil2, 1) + "," +
        "\"soil_average\":" + String(soilAvg, 1) + "," +
        "\"air_temp\":" + String(airTemp, 1) + "," +
        "\"air_humidity\":" + String(airHum, 1) + "," +
        "\"light_pct\":" + String(lightPct, 1) + "," +
        "\"rain_pct\":" + String(rainPct, 1) + "," +
        "\"tank_cm\":" + String(tankCm, 1) + "," +
        "\"tank_level_pct\":" + String(tankPct, 1) + "," +
        "\"pump_state\":" + (pumpOn ? "true" : "false") + "," +
        "\"fan_state\":" + (fanOn ? "true" : "false") +
        "}";

      int httpResponseCode = http.POST(payload);
      if (httpResponseCode > 0) {
        Serial.printf("✓ Synced to Website Backend (HTTP %d)\n", httpResponseCode);
      } else {
        Serial.printf("⚠️ Ingestion error: %s\n", http.errorToString(httpResponseCode).c_str());
      }
      http.end();
    }
  }

  delay(20);
}
