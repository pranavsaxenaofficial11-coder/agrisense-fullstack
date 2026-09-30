/*
   ============================================================
   AgriSense — ESP32 Real Hardware Connected to Web Platform
   ============================================================

   DHT11          -> GPIO 4
   Soil Sensor 1  -> GPIO 34
   Soil Sensor 2  -> GPIO 35
   LDR            -> GPIO 32
   Rain Sensor    -> GPIO 33

   Pump Relay     -> GPIO 25
   Fan Relay      -> GPIO 26

   HC-SR04        -> REMOVED

   Relay type: ACTIVE LOW
   LOW  = relay ON
   HIGH = relay OFF

   HOW TO CONNECT TO WEBSITE:
   Method 1 (USB Serial):
     • Plug ESP32 into Laptop/PC via USB cable.
     • Open https://agrisense-269.pages.dev or http://localhost:8000
     • Click "🔌 Connect Hardware (USB Serial)" button on the home page.
     • Select your COM port — the website will immediately show your real data!

   Method 2 (Wireless Wi-Fi):
     • Put your Wi-Fi name & password in WIFI_SSID & WIFI_PASS below.
     • Put your Laptop IP in SERVER_URL.
     • ESP32 will automatically sync data every 3 seconds!
   ============================================================
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>

// -------------------- WI-FI CONFIG (Optional) --------------------
// If you want wireless mode, fill these in. Otherwise, leave them to use USB mode!
const char* WIFI_SSID     = "YOUR_WIFI_OR_HOTSPOT";
const char* WIFI_PASS     = "YOUR_WIFI_PASSWORD";

// Server endpoint for local backend:
// (Run 'ipconfig' in PowerShell to find your laptop IPv4 address)
const char* SERVER_URL    = "http://127.0.0.1:8000/api/sensors/ingest";

// -------------------- PIN DEFINITIONS --------------------

#define DHT_PIN       4
#define DHT_TYPE      DHT11

#define SOIL1_PIN     34
#define SOIL2_PIN     35

#define LDR_PIN       32
#define RAIN_PIN      33

#define PUMP_RELAY    25
#define FAN_RELAY     26

// -------------------- DHT --------------------

DHT dht(DHT_PIN, DHT_TYPE);

// -------------------- RELAY SETTINGS --------------------

#define RELAY_ON      LOW
#define RELAY_OFF     HIGH

// -------------------- THRESHOLDS --------------------

#define SOIL_PUMP_THRESHOLD 100
#define TEMP_FAN_THRESHOLD  2

// -------------------- LDR CALIBRATION --------------------
#define LDR_BRIGHT 1631
#define LDR_DARK   2112

unsigned long lastWifiSend = 0;
const unsigned long WIFI_INTERVAL = 3000; // 3 seconds


// ========================================================
// SETUP
// ========================================================

void setup() {

  Serial.begin(115200);
  delay(1000);

  // Sensor pins
  pinMode(SOIL1_PIN, INPUT);
  pinMode(SOIL2_PIN, INPUT);
  pinMode(LDR_PIN, INPUT);
  pinMode(RAIN_PIN, INPUT);

  // Relay pins
  pinMode(PUMP_RELAY, OUTPUT);
  pinMode(FAN_RELAY, OUTPUT);

  // Make sure both devices start OFF
  digitalWrite(PUMP_RELAY, RELAY_OFF);
  digitalWrite(FAN_RELAY, RELAY_OFF);

  dht.begin();

  Serial.println();
  Serial.println("==========================================");
  Serial.println("       AgriSense Hardware System");
  Serial.println("==========================================");
  Serial.println("HC-SR04: REMOVED");
  Serial.println("Pump Relay: GPIO 25");
  Serial.println("Fan Relay:  GPIO 26");
  Serial.println("------------------------------------------");

  // ------------------------------------------------------
  // Relay startup test
  // ------------------------------------------------------

  Serial.println("Testing PUMP relay...");
  digitalWrite(PUMP_RELAY, RELAY_ON);
  delay(1000);
  digitalWrite(PUMP_RELAY, RELAY_OFF);
  Serial.println("Pump relay test complete.");

  delay(500);

  Serial.println("Testing FAN relay...");
  digitalWrite(FAN_RELAY, RELAY_ON);
  delay(1000);
  digitalWrite(FAN_RELAY, RELAY_OFF);
  Serial.println("Fan relay test complete.");

  // ------------------------------------------------------
  // Optional Wi-Fi connection
  // ------------------------------------------------------
  if (String(WIFI_SSID) != "YOUR_WIFI_OR_HOTSPOT") {
    Serial.printf("Connecting to Wi-Fi '%s'...\n", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 15) {
      delay(500);
      Serial.print(".");
      attempts++;
    }
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\n[✓] Wi-Fi Connected!");
      Serial.printf("IP: %s\n", WiFi.localIP().toString().c_str());
    } else {
      Serial.println("\n[!] Wi-Fi not connected. Continuing in USB Serial Mode.");
    }
  } else {
    Serial.println("USB Plug & Play Mode Ready. Click 'Connect Hardware' on website.");
  }

  Serial.println("------------------------------------------");
  Serial.println("System started.");
  Serial.println();
}


// ========================================================
// LOOP
// ========================================================

void loop() {

  // -------------------- DHT11 --------------------

  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();


  // -------------------- SOIL --------------------

  int soilRaw1 = analogRead(SOIL1_PIN);
  int soilRaw2 = analogRead(SOIL2_PIN);

  int soilPercent1 = map(soilRaw1, 4095, 1200, 0, 100);
  int soilPercent2 = map(soilRaw2, 4095, 1200, 0, 100);

  soilPercent1 = constrain(soilPercent1, 0, 100);
  soilPercent2 = constrain(soilPercent2, 0, 100);

  int soilAverage = (soilPercent1 + soilPercent2) / 2;


  // -------------------- LDR --------------------

  int ldrRaw = analogRead(LDR_PIN);

  int lightPercent = map(
    ldrRaw,
    LDR_BRIGHT,
    LDR_DARK,
    100,
    0
  );

  lightPercent = constrain(lightPercent, 0, 100);


  // -------------------- RAIN SENSOR --------------------

  int rainRaw = analogRead(RAIN_PIN);

  int rainPercent = map(rainRaw, 4095, 0, 0, 100);
  rainPercent = constrain(rainPercent, 0, 100);


  // =====================================================
  // PUMP CONTROL
  // =====================================================

  bool pumpON = false;

  if (soilAverage < SOIL_PUMP_THRESHOLD && rainPercent < 45) {

    pumpON = true;
    digitalWrite(PUMP_RELAY, RELAY_ON);

  } else {

    pumpON = false;
    digitalWrite(PUMP_RELAY, RELAY_OFF);
  }


  // =====================================================
  // FAN CONTROL
  // =====================================================

  bool fanON = false;

  if (!isnan(temperature) && temperature > TEMP_FAN_THRESHOLD) {

    fanON = true;
    digitalWrite(FAN_RELAY, RELAY_ON);

  } else {

    fanON = false;
    digitalWrite(FAN_RELAY, RELAY_OFF);
  }


  // =====================================================
  // 1. JSON STREAM (Fast Machine Parsing for Website)
  // =====================================================

  float validTemp = isnan(temperature) ? 28.0 : temperature;
  float validHum  = isnan(humidity) ? 60.0 : humidity;

  Serial.printf("{\"airTemp\":%.1f,\"airHum\":%.1f,\"soilAvg\":%d,\"soil1\":%d,\"soil2\":%d,\"light\":%d,\"rain\":%d,\"pump\":%s,\"fan\":%s}\n",
                validTemp, validHum, soilAverage, soilPercent1, soilPercent2, lightPercent, rainPercent, pumpON ? "true" : "false", fanON ? "true" : "false");


  // =====================================================
  // 2. SERIAL MONITOR (Your Exact Original Format)
  // =====================================================

  Serial.println("==========================================");

  // DHT
  if (isnan(temperature) || isnan(humidity)) {

    Serial.println("DHT11: ERROR");

  } else {

    Serial.print("Temperature : ");
    Serial.print(temperature);
    Serial.println(" °C");

    Serial.print("Humidity    : ");
    Serial.print(humidity);
    Serial.println(" %");
  }


  // Soil
  Serial.print("Soil 1 Raw  : ");
  Serial.println(soilRaw1);

  Serial.print("Soil 1      : ");
  Serial.print(soilPercent1);
  Serial.println(" %");

  Serial.print("Soil 2 Raw  : ");
  Serial.println(soilRaw2);

  Serial.print("Soil 2      : ");
  Serial.print(soilPercent2);
  Serial.println(" %");

  Serial.print("Soil Average: ");
  Serial.print(soilAverage);
  Serial.println(" %");


  // LDR
  Serial.print("LDR Raw     : ");
  Serial.println(ldrRaw);

  Serial.print("Light       : ");
  Serial.print(lightPercent);
  Serial.println(" %");


  // Rain
  Serial.print("Rain Raw    : ");
  Serial.println(rainRaw);

  Serial.print("Rain        : ");
  Serial.print(rainPercent);
  Serial.println(" %");


  // Pump
  Serial.print("Pump        : ");
  if (pumpON) {
    Serial.println("ON");
  } else {
    Serial.println("OFF");
  }


  // Fan
  Serial.print("Fan         : ");
  if (fanON) {
    Serial.println("ON");
  } else {
    Serial.println("OFF");
  }

  Serial.println("==========================================");
  Serial.println();


  // =====================================================
  // 3. OPTIONAL WI-FI CLOUD SYNC (Runs if Wi-Fi connected)
  // =====================================================

  if (WiFi.status() == WL_CONNECTED && (millis() - lastWifiSend >= WIFI_INTERVAL)) {
    lastWifiSend = millis();
    HTTPClient http;
    http.begin(SERVER_URL);
    http.addHeader("Content-Type", "application/json");

    String json = String("{") +
      "\"soil_average\":" + String(soilAverage) + "," +
      "\"soil_moisture_1\":" + String(soilPercent1) + "," +
      "\"soil_moisture_2\":" + String(soilPercent2) + "," +
      "\"air_temp\":" + String(validTemp, 1) + "," +
      "\"air_humidity\":" + String(validHum, 1) + "," +
      "\"light_pct\":" + String(lightPercent) + "," +
      "\"rain_pct\":" + String(rainPercent) + "," +
      "\"pump_state\":" + (pumpON ? "true" : "false") + "," +
      "\"fan_state\":" + (fanON ? "true" : "false") +
      "}";

    int code = http.POST(json);
    if (code > 0) {
      Serial.printf("[Cloud Sync] ✓ Synced to website (HTTP %d)\n", code);
    }
    http.end();
  }

  delay(2000);
}
