# 🌾 AgriSense Wokwi Simulation & Precision IoT Gateway Guide
### Bal Bharati Public School Innovation Cell — Precision Agriculture & Edge AI

Complete hardware simulation package for **AgriSense 39-Sensor Precision Agriculture Platform**, featuring native **ESP32-S3 DevKitC-1** chip configuration, dual-route pipeline (Google Sheets primary + Direct FastAPI failover), OLED telemetry HUD, and bidirectional edge actuator control.

---

## ⚡ Architecture: Systematic Dual-Route Telemetry Pipeline

```
                                  +------------------------------+
                                  |   Wokwi ESP32-S3 Simulator  |
                                  |     (All 39 Sensors HUD)     |
                                  +--------------+---------------+
                                                 |
                        [Attempt Primary Route]  |
                                                 v
                        +-----------------------------------------------+
                        |   Google Sheets Cloud App (Google Apps Script) |
                        |   - Systematic 7-Category Tabulation          |
                        |   - Real-time row append & pruning            |
                        +-----------------------+-----------------------+
                                                |
                                   (Success)    |   (If Failed / Timeout)
                                                v            v
           +-----------------------------------------+   [Direct Fallback]
           |   AgriSense FastAPI Cloud Backend       |<----------+
           |   - Ingests all 39 categorized feeds    |
           |   - Live Cache, DB storage, WS manager  |
           |   - Operator Actuator Control Plane     |
           +--------------------+--------------------+
                                |
                                v
           +-----------------------------------------+
           |   Live Website & Dashboard              |
           |   (WebSockets & Instant Live Telemetry) |
           +-----------------------------------------+
```

1. **Primary Ingestion Route (ESP32 -> Google Sheets -> Backend -> Website)**:
   - ESP32 samples all 39 sensors and transmits telemetry to the Google Apps Script Web App.
   - Google Apps Script logs the data into categorized columns in Google Sheets.
   - Google Apps Script automatically relays the payload to our FastAPI backend (`/api/sensors/ingest?source=google_sheets`).
   - The backend pushes live readings via WebSockets to the website dashboard.
   - Any remote pump or fan commands from the backend or Google Sheet are returned in the response back to the ESP32!
2. **Automatic Failover Route (ESP32 Direct -> Backend -> Website)**:
   - If Google Sheets is unavailable, times out, or hits a quota limit, the ESP32 automatically detects the failure and routes readings directly to the FastAPI backend (`/api/sensors/ingest?source=wokwi_direct`).
   - Telemetry flows uninterrupted to the website.
3. **Operator Control in Both Cases**:
   - In both cases, the readings flow through our backend where operators can see the active route badge, view all 39 feeds, and control the actuators (Pump, Fan, Solenoids, Mode).

---

## 🚀 How to Run in Wokwi (ESP32-S3)

1. Open **[wokwi.com](https://wokwi.com)** and create a new **ESP32-S3** project (or start from ESP32).
2. In the **Circuit Editor** tab (`diagram.json`), switch to the JSON code view and paste the contents of [`diagram.json`](./diagram.json) (or [`diagram-esp32-s3.json`](./diagram-esp32-s3.json)).
3. In the **Code Editor** tab (`sketch.ino`), replace all code with the contents of [`sketch.ino`](./sketch.ino).
4. In the `libraries.txt` tab, ensure the following libraries are present:
   ```txt
   DHT sensor library
   Adafruit Unified Sensor
   Adafruit SSD1306
   Adafruit GFX Library
   ArduinoJson
   ```
5. Click **▶ Play (Start Simulation)**!

> **Note for Classic ESP32 DevKit V1**: If using a classic ESP32 board instead of S3, use [`diagram-esp32-devkit-v1.json`](./diagram-esp32-devkit-v1.json). The sketch automatically detects the chip target at compile time!

---

## 📊 How to Set Up the Systematic Google Sheet

1. Open a new Google Sheet at **[sheets.google.com](https://sheets.google.com)**.
2. In the top menu, go to **Extensions** → **Apps Script**.
3. Delete any default code in `Code.gs` and paste the entire contents of [`google_apps_script.js`](./google_apps_script.js).
4. Click **Save** (💾).
5. In the toolbar, select the function **`setupSystematicSheet`** and click **Run** (▶) to initialize the 7-category color-coded header layout.
6. Click **Deploy** → **New deployment**:
   - Select type: **Web app**
   - Description: `AgriSense 39-Sensor Master Gateway`
   - Execute as: **Me**
   - Who has access: **Anyone** (essential for ESP32 cloud HTTP calls)
   - Click **Deploy** and copy the **Web app URL**.
7. In `sketch.ino`, ensure `WEB_APP_URL` matches your deployed Web App URL!

---

## 🔬 Systematic 39-Sensor Categorization

| Category | Feeds Included | Units |
| :--- | :--- | :--- |
| **1. Soil Dynamics & Root-Zone (9)** | `soilA`, `soilB`, `soilC`, `soilD`, `soilAvg`, `soilTemp`, `soilPH`, `soilEC`, `soilO2` | %, °C, pH, dS/m, % |
| **2. NPK Macronutrients (3)** | `nitrogen`, `phosphorus`, `potassium` | mg/kg |
| **3. Micro-Climate & Meteorology (10)** | `airTemp`, `airHumidity`, `pressure`, `light`, `par`, `uv`, `rain`, `wind`, `windDir`, `dewPoint` | °C, %, hPa, %, µmol/m²/s, idx, %, km/h, °, °C |
| **4. Hydraulics & Water Infrastructure (6)** | `waterTank`, `waterTemp`, `tds`, `waterPH`, `waterFlow`, `flow` | %, °C, ppm, pH, L/min, L |
| **5. Canopy Biometrics & Plant Health (4)** | `leafWet`, `ndvi`, `sapFlow`, `stemDia` | %, 0-1, g/h, mm |
| **6. Environment & Pest Intelligence (7)** | `airQuality`, `co2`, `smoke`, `pestMic`, `pestCount`, `frost`, `vibration` | idx, ppm, idx, idx, /day, °C, idx |
| **7. Actuators & Relay Diagnostics (6)** | `pump`, `fan`, `valveA`, `valveB`, `mode`, `route` | Boolean / String |

---

## 📌 Pinout Mapping (ESP32-S3 vs DevKit V1)

| Component | ESP32-S3 Pin | ESP32 DevKit V1 Pin | Wokwi Part Type |
| :--- | :--- | :--- | :--- |
| **DHT22 Data (Temp & Hum)** | **GPIO 21** | **GPIO 4** | `wokwi-dht22` |
| **Soil Moisture 1 (Zone A)** | **GPIO 1** (ADC1) | **GPIO 34** (ADC1) | `wokwi-potentiometer` |
| **Soil Moisture 2 (Zone B)** | **GPIO 2** (ADC1) | **GPIO 35** (ADC1) | `wokwi-potentiometer` |
| **LDR Sunlight Intensity** | **GPIO 14** (ADC2) | **GPIO 32** (ADC1) | `wokwi-photoresistor-sensor` |
| **Raindrop / Flood Sensor** | **GPIO 4** (ADC1) | **GPIO 33** (ADC1) | `wokwi-potentiometer` |
| **Ultrasonic TRIG (Water Level)** | **GPIO 5** | **GPIO 5** | `wokwi-hc-sr04` |
| **Ultrasonic ECHO (Water Level)** | **GPIO 6** | **GPIO 18** | `wokwi-hc-sr04` |
| **Water Pump Relay** | **GPIO 10** | **GPIO 25** | `wokwi-relay-module` |
| **Cooling Fan Relay** | **GPIO 11** | **GPIO 26** | `wokwi-relay-module` |
| **OLED Display (SDA)** | **GPIO 8** | **GPIO 21** | `wokwi-ssd1306` |
| **OLED Display (SCL)** | **GPIO 9** | **GPIO 22** | `wokwi-ssd1306` |
| **Zone A Solenoid Indicator** | **GPIO 12** | **GPIO 19** | `wokwi-led` (Green) |
| **Zone B Solenoid Indicator** | **GPIO 13** | **GPIO 23** | `wokwi-led` (Blue) |
