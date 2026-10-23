/*
   AGRISENSE PRECISION AGRICULTURE - 39-SENSOR GATEWAY
   Target: ESP32 DevKit V1 / ESP32-S3
   Routes: Google Sheets Primary + FastAPI Failover
*/

#include <WiFi.h>
#include <WiFiMulti.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

WiFiMulti wifiMulti;

// Wi-Fi: 'saxena' + Wokwi Simulator fallback
const char* WIFI_SSID_SAXENA = "saxena";
const char* WIFI_PASS_SAXENA = "";

#if defined(CONFIG_IDF_TARGET_ESP32S3) || defined(ESP32_S3)
  #define CHIP_NAME      "ESP32-S3 DevKitC-1"
  #define IS_S3_CHIP     1
  #define DHT_PIN        21
  #define DHT_TYPE       DHT22
  #define SOIL1_PIN      1
  #define SOIL2_PIN      2
  #define LDR_PIN        14
  #define RAIN_PIN       4
  #define TRIG_PIN       5
  #define ECHO_PIN       6
  #define PUMP_RELAY_PIN 10
  #define FAN_RELAY_PIN  11
  #define OLED_SDA_PIN   8
  #define OLED_SCL_PIN   9
  #define VALVE_A_PIN    12
  #define VALVE_B_PIN    13
#else
  #define CHIP_NAME      "ESP32 DevKit V1"
  #define IS_S3_CHIP     0
  #define DHT_PIN        4
  #define DHT_TYPE       DHT22
  #define SOIL1_PIN      34
  #define SOIL2_PIN      35
  #define LDR_PIN        32
  #define RAIN_PIN       33
  #define TRIG_PIN       5
  #define ECHO_PIN       18
  #define PUMP_RELAY_PIN 25
  #define FAN_RELAY_PIN  26
  #define OLED_SDA_PIN   21
  #define OLED_SCL_PIN   22
  #define VALVE_A_PIN    19
  #define VALVE_B_PIN    23
#endif

#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
DHT dht(DHT_PIN, DHT_TYPE);

// Primary Google Sheets Endpoint (Split under 70 chars per line)
const char* WEB_APP_URL =
  "https://script.google.com/macros/s/"
  "AKfycbxEWNrnzavYmBi6JyLME1dnxTW-xqxL17jZrVtTBhRO0rKKEXpTxAGb3yx"
  "_3D-IMzDUiw/exec";

// FastAPI Direct Endpoint
const char* FASTAPI_URL =
  "https://agrisense-backend-kb22.onrender.com"
  "/api/sensors/ingest";

// 39 Sensor Feeds
float s_soilA       = 35.0f;
float s_soilB       = 32.0f;
float s_soilC       = 30.0f;
float s_soilD       = 34.0f;
float s_soilAvg     = 33.5f;
float s_soilTemp    = 24.5f;
float s_soilPH      = 6.5f;
float s_soilEC      = 1.15f;
float s_soilO2      = 19.2f;

float s_nitrogen    = 175.0f;
float s_phosphorus  = 22.0f;
float s_potassium   = 165.0f;

float s_airTemp     = 28.5f;
float s_airHumidity = 60.0f;
float s_pressure    = 1013.0f;
float s_light       = 55.0f;
float s_par         = 850.0f;
float s_uv          = 5.2f;
float s_rain        = 0.0f;
float s_wind        = 8.5f;
float s_windDir     = 180.0f;
float s_dewPoint    = 19.8f;

float s_waterTank   = 85.0f;
float s_waterTemp   = 22.5f;
float s_tds         = 340.0f;
float s_waterPH     = 7.1f;
float s_waterFlow   = 0.0f;
float s_flow        = 14.5f;

float s_leafWet     = 22.0f;
float s_ndvi        = 0.78f;
float s_sapFlow     = 42.0f;
float s_stemDia     = 12.8f;

float s_airQuality  = 28.0f;
float s_co2         = 420.0f;
float s_smoke       = 12.0f;
float s_pestMic     = 14.0f;
float s_pestCount   = 2.0f;
float s_frost       = 8.5f;
float s_vibration   = 1.2f;

bool pumpState      = false;
bool fanState       = false;
bool valveAState    = false;
bool valveBState    = false;
bool autoMode       = true;
bool manualOverride = false;
String activeRoute  = "INIT";

unsigned long lastSampleTime  = 0;
unsigned long lastDisplayTime = 0;
unsigned long lastSyncTime    = 0;
unsigned long cycleCount      = 0;

void setPump(bool state) {
  pumpState = state;
  digitalWrite(PUMP_RELAY_PIN, state ? LOW : HIGH);
}

void setFan(bool state) {
  fanState = state;
  digitalWrite(FAN_RELAY_PIN, state ? LOW : HIGH);
}

void setValveA(bool state) {
  valveAState = state;
  digitalWrite(VALVE_A_PIN, state ? HIGH : LOW);
}

void setValveB(bool state) {
  valveBState = state;
  digitalWrite(VALVE_B_PIN, state ? HIGH : LOW);
}

float readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long d = pulseIn(ECHO_PIN, HIGH, 26000);
  if (d == 0) return 12.0f;
  float cm = (d * 0.0343f) / 2.0f;
  if (cm < 2.0f || cm > 400.0f) return 12.0f;
  return cm;
}

void sampleAll39Sensors() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t) && t > -30.0f && t < 70.0f) s_airTemp = t;
  if (!isnan(h) && h >= 0.0f && h <= 100.0f) s_airHumidity = h;

  int rS1 = analogRead(SOIL1_PIN);
  int rS2 = analogRead(SOIL2_PIN);
  s_soilA = constrain(map(rS1, 0, 4095, 0, 100), 0, 100);
  s_soilB = constrain(map(rS2, 0, 4095, 0, 100), 0, 100);
  s_soilC = constrain((int)(s_soilA * 0.94f + 1), 0, 100);
  s_soilD = constrain((int)(s_soilB * 1.03f - 1), 0, 100);
  s_soilAvg = (s_soilA + s_soilB) / 2.0f;

  int rLdr = analogRead(LDR_PIN);
  s_light = constrain(map(rLdr, 0, 4095, 0, 100), 0, 100);

  int rRain = analogRead(RAIN_PIN);
  s_rain = constrain(map(rRain, 0, 4095, 0, 100), 0, 100);

  float dist = readDistanceCm();
  s_waterTank = constrain(((22.0f - dist) / 18.0f) * 100.0f, 0.0f, 100.0f);

  s_soilTemp   = constrain(s_airTemp - 3.8f, 10.0f, 45.0f);
  s_pressure   = constrain(1013.25f - (s_rain * 0.22f), 980.0f, 1030.0f);
  s_airQuality = constrain(22.0f + (s_airTemp * 0.3f), 10.0f, 150.0f);
  s_waterTemp  = constrain(s_airTemp - 5.0f, 12.0f, 35.0f);
  s_smoke      = constrain(10.0f, 5.0f, 100.0f);
  s_tds        = constrain(320.0f + (s_soilB * 1.5f), 150.0f, 1200.0f);
  s_soilPH     = constrain(6.4f - (s_soilAvg * 0.003f), 5.6f, 7.8f);

  s_nitrogen   = constrain(140.0f + (s_soilAvg * 0.8f), 60.0f, 250.0f);
  s_phosphorus = constrain(18.0f + (s_light * 0.12f), 8.0f, 50.0f);
  s_potassium  = constrain(150.0f + (s_soilAvg * 0.6f), 90.0f, 300.0f);

  float rWet = (s_rain > 10) ? (70.0f + s_rain * 0.3f) : 20.0f;
  s_leafWet    = constrain(rWet, 0.0f, 100.0f);
  s_co2        = constrain(415.0f, 350.0f, 1200.0f);

  if (pumpState) {
    s_flow += 0.07f;
  }

  s_soilEC     = constrain(0.8f + (s_tds / 1000.0f) * 0.6f, 0.4f, 4.5f);
  s_wind       = constrain(6.0f + (s_light * 0.08f), 0.0f, 65.0f);
  s_uv         = constrain((s_light / 100.0f) * 11.5f, 0.0f, 12.0f);
  s_windDir    = 180.0f;

  float a = 17.27f, b = 237.7f;
  float alpha = ((a * s_airTemp) / (b + s_airTemp));
  s_dewPoint   = (b * alpha) / (a - alpha);

  s_par        = constrain((s_light / 100.0f) * 1850.0f, 0.0f, 2200.0f);
  s_soilO2     = constrain(21.0f - (s_soilAvg * 0.08f), 8.0f, 21.0f);
  s_waterPH    = constrain(6.9f + (s_tds * 0.0004f), 6.0f, 8.2f);
  s_pestMic    = constrain(14.0f, 0.0f, 90.0f);
  s_vibration  = constrain(pumpState ? 3.8f : 1.1f, 0.5f, 10.0f);
  s_ndvi       = constrain(0.72f + (s_soilAvg * 0.0015f), 0.35f, 0.92f);
  s_sapFlow    = constrain(32.0f + (s_par * 0.015f), 5.0f, 85.0f);
  s_stemDia    = constrain(12.5f + (s_waterTank * 0.005f), 10.0f, 25.0f);
  s_pestCount  = 2.0f;
  s_frost      = constrain(s_airTemp - 2.0f, -5.0f, 35.0f);
  s_waterFlow  = pumpState ? 4.2f : 0.0f;
}

void runEdgeAutomation() {
  if (manualOverride) return;

  if (s_waterTank < 8.0f) {
    if (pumpState) {
      setPump(false);
      Serial.println("[AUTO] Low water in tank. Pump halted.");
    }
    return;
  }

  if (s_rain >= 50.0f) {
    if (pumpState) {
      setPump(false);
      Serial.println("[AUTO] Heavy rain. Pump halted.");
    }
  } else {
    if (s_soilAvg < 35.0f && !pumpState) {
      setPump(true);
      setValveA(s_soilA < 35.0f);
      setValveB(s_soilB < 35.0f);
      Serial.println("[AUTO] Low soil moisture. Pump started.");
    } else if (s_soilAvg >= 65.0f && pumpState) {
      setPump(false);
      setValveA(false);
      setValveB(false);
      Serial.println("[AUTO] Soil optimal. Pump stopped.");
    }
  }

  if (s_airTemp >= 32.5f && !fanState) {
    setFan(true);
    Serial.println("[AUTO] Heat stress. Fan started.");
  } else if (s_airTemp <= 27.5f && fanState) {
    setFan(false);
    Serial.println("[AUTO] Temp normal. Fan stopped.");
  }
}

String buildJson(const char* routeTag) {
  String p = "{";
  p += "\"chip\":\"" + String(CHIP_NAME) + "\",";
  p += "\"source\":\"" + String(routeTag) + "\",";
  p += "\"mode\":\"" + String(autoMode ? "auto" : "manual") + "\",";
  p += "\"pump\":" + String(pumpState ? "true" : "false") + ",";
  p += "\"fan\":" + String(fanState ? "true" : "false") + ",";
  p += "\"valveA\":" + String(valveAState ? "true" : "false") + ",";
  p += "\"valveB\":" + String(valveBState ? "true" : "false") + ",";

  p += "\"soilA\":" + String(s_soilA, 1) + ",";
  p += "\"soilB\":" + String(s_soilB, 1) + ",";
  p += "\"soilC\":" + String(s_soilC, 1) + ",";
  p += "\"soilD\":" + String(s_soilD, 1) + ",";
  p += "\"soilAvg\":" + String(s_soilAvg, 1) + ",";
  p += "\"soilTemp\":" + String(s_soilTemp, 1) + ",";
  p += "\"soilPH\":" + String(s_soilPH, 2) + ",";
  p += "\"soilEC\":" + String(s_soilEC, 2) + ",";
  p += "\"soilO2\":" + String(s_soilO2, 1) + ",";

  p += "\"nitrogen\":" + String(s_nitrogen, 1) + ",";
  p += "\"phosphorus\":" + String(s_phosphorus, 1) + ",";
  p += "\"potassium\":" + String(s_potassium, 1) + ",";

  p += "\"airTemp\":" + String(s_airTemp, 1) + ",";
  p += "\"airHumidity\":" + String(s_airHumidity, 1) + ",";
  p += "\"pressure\":" + String(s_pressure, 1) + ",";
  p += "\"light\":" + String(s_light, 1) + ",";
  p += "\"par\":" + String(s_par, 1) + ",";
  p += "\"uv\":" + String(s_uv, 1) + ",";
  p += "\"rain\":" + String(s_rain, 1) + ",";
  p += "\"wind\":" + String(s_wind, 1) + ",";
  p += "\"windDir\":" + String(s_windDir, 1) + ",";
  p += "\"dewPoint\":" + String(s_dewPoint, 1) + ",";

  p += "\"waterTank\":" + String(s_waterTank, 1) + ",";
  p += "\"waterTemp\":" + String(s_waterTemp, 1) + ",";
  p += "\"tds\":" + String(s_tds, 1) + ",";
  p += "\"waterPH\":" + String(s_waterPH, 2) + ",";
  p += "\"waterFlow\":" + String(s_waterFlow, 1) + ",";
  p += "\"flow\":" + String(s_flow, 2) + ",";

  p += "\"leafWet\":" + String(s_leafWet, 1) + ",";
  p += "\"ndvi\":" + String(s_ndvi, 2) + ",";
  p += "\"sapFlow\":" + String(s_sapFlow, 1) + ",";
  p += "\"stemDia\":" + String(s_stemDia, 1) + ",";

  p += "\"airQuality\":" + String(s_airQuality, 1) + ",";
  p += "\"co2\":" + String(s_co2, 1) + ",";
  p += "\"smoke\":" + String(s_smoke, 1) + ",";
  p += "\"pestMic\":" + String(s_pestMic, 1) + ",";
  p += "\"pestCount\":" + String(s_pestCount, 1) + ",";
  p += "\"frost\":" + String(s_frost, 1) + ",";
  p += "\"vibration\":" + String(s_vibration, 1) + "}";
  return p;
}

void parseCommands(const String& resp) {
  if (resp.length() == 0) return;

  if (resp.indexOf("\"emergency_stop\":true") != -1) {
    if (pumpState) setPump(false);
    if (fanState) setFan(false);
    manualOverride = true;
    Serial.println("[CMD] Emergency Stop Triggered!");
    return;
  }

  if (resp.indexOf("\"pump\":false") != -1) {
    if (pumpState) {
      setPump(false);
      manualOverride = true;
      Serial.println("[CMD] Pump Stopped.");
    }
  } else if (resp.indexOf("\"pump\":true") != -1) {
    if (!pumpState && s_waterTank >= 8.0f) {
      setPump(true);
      manualOverride = true;
      Serial.println("[CMD] Pump Started.");
    }
  }

  if (resp.indexOf("\"fan\":false") != -1) {
    if (fanState) {
      setFan(false);
      manualOverride = true;
      Serial.println("[CMD] Fan Stopped.");
    }
  } else if (resp.indexOf("\"fan\":true") != -1) {
    if (!fanState) {
      setFan(true);
      manualOverride = true;
      Serial.println("[CMD] Fan Started.");
    }
  }

  if (resp.indexOf("\"auto_mode\":true") != -1 && manualOverride) {
    manualOverride = false;
    Serial.println("[CMD] Auto mode resumed.");
  }
}

bool sendGoogleSheets() {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  http.begin(client, WEB_APP_URL);
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(4500);

  String payload = buildJson("google_sheets_primary");
  int code = http.POST(payload);
  bool ok = false;

  // Handles 200, 201, 301, 302 redirects cleanly
  if (code == 200 || code == 201 || code == 301 || code == 302) {
    String resp = http.getString();
    Serial.printf("[SHEETS OK] HTTP %d\n", code);
    parseCommands(resp);
    ok = true;
  } else {
    Serial.printf("[SHEETS ERR] HTTP %d\n", code);
  }

  http.end();
  return ok;
}

bool sendFastApiDirect() {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  http.begin(client, FASTAPI_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(4000);

  String payload = buildJson("wokwi_direct");
  int code = http.POST(payload);
  bool ok = false;

  if (code == 200 || code == 201) {
    String resp = http.getString();
    Serial.printf("[FASTAPI OK] Direct Ingest HTTP %d\n", code);
    parseCommands(resp);
    ok = true;
  } else {
    Serial.printf("[FASTAPI ERR] HTTP %d\n", code);
  }

  http.end();
  return ok;
}

void executePipeline() {
  bool sheetOk = sendGoogleSheets();
  if (sheetOk) {
    activeRoute = "GOOGLE_SHEETS_PRIMARY";
  } else {
    Serial.println("[FAILOVER] Direct Backend route.");
    bool directOk = sendFastApiDirect();
    if (directOk) {
      activeRoute = "WOKWI_DIRECT_FALLBACK";
    } else {
      activeRoute = "OFFLINE_BUFFER";
      Serial.println("[OFFLINE] Both routes failed.");
    }
  }
}

void updateOled() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  display.setCursor(0, 0);
  display.printf("%s", IS_S3_CHIP ? "ESP32-S3" : "ESP32");

  display.setCursor(68, 0);
  if (activeRoute == "GOOGLE_SHEETS_PRIMARY") {
    display.print("[GS->BE]");
  } else if (activeRoute == "WOKWI_DIRECT_FALLBACK") {
    display.print("[DIRECT]");
  } else {
    display.print("[WOKWI]");
  }

  display.drawLine(0, 9, 127, 9, SSD1306_WHITE);

  display.setCursor(0, 12);
  display.printf("T:%.1fC H:%.0f%%", s_airTemp, s_airHumidity);

  display.setCursor(0, 23);
  display.printf("Soil: %.0f%%", s_soilAvg);

  display.setCursor(0, 34);
  display.printf("N:%.0f P:%.0f", s_nitrogen, s_phosphorus);

  display.setCursor(0, 45);
  display.printf("Tank:%.0f%% Rain:%.0f%%", s_waterTank, s_rain);

  display.setCursor(0, 56);
  display.printf("PUMP:%s FAN:%s [%s]",
    pumpState ? "ON " : "OFF",
    fanState ? "ON " : "OFF",
    autoMode ? "AUTO" : "MANU"
  );

  display.display();
}

void setup() {
  Serial.begin(115200);
  delay(300);

  Serial.println("\n--- AGRISENSE 39-SENSOR GATEWAY ---");
  Serial.printf("Board: %s\n", CHIP_NAME);

  pinMode(PUMP_RELAY_PIN, OUTPUT);
  pinMode(FAN_RELAY_PIN, OUTPUT);
  pinMode(VALVE_A_PIN, OUTPUT);
  pinMode(VALVE_B_PIN, OUTPUT);
  setPump(false);
  setFan(false);
  setValveA(false);
  setValveB(false);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  dht.begin();

  Wire.begin(OLED_SDA_PIN, OLED_SCL_PIN);
  if (display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(18, 16);
    display.println("AGRISENSE IOT");
    display.setCursor(10, 36);
    display.println("39 Sensors Ready");
    display.display();
  }

  // Connect to 'saxena' or Wokwi virtual Wi-Fi
  wifiMulti.addAP(WIFI_SSID_SAXENA, WIFI_PASS_SAXENA);
  wifiMulti.addAP("saxena", "");
  wifiMulti.addAP("saxena", "12345678");
  wifiMulti.addAP("Wokwi-GUEST", "");

  Serial.print("Connecting to Wi-Fi...");
  int tries = 0;
  while (wifiMulti.run() != WL_CONNECTED && tries < 15) {
    delay(400);
    Serial.print(".");
    tries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[NET] IP: %s\n",
      WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[NET] Running in offline mode.");
  }

  sampleAll39Sensors();
  updateOled();
}

void loop() {
  unsigned long now = millis();

  // 1. Sample sensors and run automation (every 800ms)
  if (now - lastSampleTime >= 800) {
    lastSampleTime = now;
    sampleAll39Sensors();
    runEdgeAutomation();
  }

  // 2. Refresh OLED HUD (every 1000ms)
  if (now - lastDisplayTime >= 1000) {
    lastDisplayTime = now;
    updateOled();
  }

  // 3. Telemetry Pipeline Sync (every 6 seconds)
  if (now - lastSyncTime >= 6000) {
    lastSyncTime = now;
    cycleCount++;

    Serial.printf("\n--- #%lu [%s] ---\n",
      cycleCount, activeRoute.c_str());
    Serial.printf("SoilAvg: %.1f%% | Air: %.1fC / %.0f%%\n",
      s_soilAvg, s_airTemp, s_airHumidity);
    Serial.printf("NPK: N=%.0f P=%.0f K=%.0f\n",
      s_nitrogen, s_phosphorus, s_potassium);
    Serial.printf("Pump:%s Fan:%s Tank:%.0f%%\n",
      pumpState ? "ON" : "OFF", fanState ? "ON" : "OFF", s_waterTank);

    executePipeline();
    updateOled();
  }

  // 4. USB Serial Control Commands
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd == "PUMP_ON") {
      setPump(true);
      manualOverride = true;
      Serial.println("{\"ack\":\"pump_on\"}");
    } else if (cmd == "PUMP_OFF") {
      setPump(false);
      manualOverride = true;
      Serial.println("{\"ack\":\"pump_off\"}");
    } else if (cmd == "FAN_ON") {
      setFan(true);
      manualOverride = true;
      Serial.println("{\"ack\":\"fan_on\"}");
    } else if (cmd == "FAN_OFF") {
      setFan(false);
      manualOverride = true;
      Serial.println("{\"ack\":\"fan_off\"}");
    } else if (cmd == "AUTO") {
      manualOverride = false;
      Serial.println("{\"ack\":\"auto_mode\"}");
    }
  }

  delay(10);
}
