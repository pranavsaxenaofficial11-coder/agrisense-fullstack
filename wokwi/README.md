# 🌾 AgriSense Wokwi Simulation & Hardware Integration Guide

Complete simulation package for **AgriSense** — Smart AI-Based Precision Agriculture & Edge-IoT Automation.

---

## 🚀 How to Run in Wokwi (1-Minute Setup)

1. Open **[wokwi.com](https://wokwi.com)** and start an **ESP32** project (or choose "New ESP32").
2. In the code editor tab, replace the code in `sketch.ino` with the contents of [`sketch.ino`](./sketch.ino).
3. In the circuit tab (`diagram.json`), click the raw JSON editor and replace it with [`diagram.json`](./diagram.json).
4. In the `libraries.txt` tab, paste:
   ```txt
   DHT sensor library
   Adafruit Unified Sensor
   Adafruit SSD1306
   Adafruit GFX Library
   ArduinoJson
   ```
5. Click **▶ Play (Start Simulation)**!

---

## ⚡ Direct Cloud & Website Connection

The simulation connects to the virtual network `Wokwi-GUEST`, giving the virtual ESP32 direct outbound internet access:

1. **Website Telemetry Ingestion (FastAPI Cloud)**:
   - **Endpoint**: `https://agrisense-backend-kb22.onrender.com/api/sensors/ingest`
   - **Local Endpoint Fallback**: `http://10.3.9.249:8000/api/sensors/ingest`
   - Posts live telemetry every 4 seconds.
   - Automatically polls for remote **Emergency Stop**, **Pump Toggle**, and **Fan Toggle** commands executed on the dashboard.

2. **Google Sheets Live Logging**:
   - **Endpoint**: `https://script.google.com/macros/s/AKfycbxEWNrnzavYmBi6JyLME1dnxTW-xqxL17jZrVtTBhRO0rKKEXpTxAGb3yx_3D-IMzDUiw/exec`
   - Uses `WiFiClientSecure` with `secClient.setInsecure()` to handle SSL handshakes and 302 redirects.
   - Appends a new real-time row to your Google Sheet every 10 seconds.

3. **Simultaneous Web Serial (115200 baud)**:
   - Streams clean single-line JSON (`airTemp`, `airHumidity`, `soilAvg`, `soil1`, `soil2`, `light`, `rain`, `tankPct`, `vpd`, `npk`, `pump`, `fan`).
   - If you plug a physical board into your USB port and open [`app.html`](https://agrisense-269.pages.dev/app.html), clicking **"Connect ESP32 Hardware"** instantly streams this data directly into the web dashboard!

---

## 📌 Complete Pin Wiring Diagram

| Component | Pin on ESP32 | Wokwi Part Type | Description |
| :--- | :--- | :--- | :--- |
| **DHT22 Data** | **GPIO 4** | `wokwi-dht22` | Air Temperature & Relative Humidity |
| **Soil Moisture 1 (Zone A)** | **GPIO 34** (ADC1) | `wokwi-potentiometer` | Root zone moisture probe for Polyhouse / Tomato |
| **Soil Moisture 2 (Zone B)** | **GPIO 35** (ADC1) | `wokwi-potentiometer` | Root zone moisture probe for Field / Wheat |
| **LDR Photoresistor** | **GPIO 32** (ADC1) | `wokwi-photoresistor-sensor` | Solar radiation & sunlight intensity |
| **Raindrop / Flood Sensor** | **GPIO 33** (ADC1) | `wokwi-potentiometer` | Precipitation intensity & storm detection |
| **HC-SR04 TRIG** | **GPIO 5** | `wokwi-hc-sr04` | Ultrasonic transmitter for water tank level |
| **HC-SR04 ECHO** | **GPIO 18** | `wokwi-hc-sr04` | Ultrasonic receiver for water tank level |
| **Water Pump Relay** | **GPIO 25** | `wokwi-relay-module` | Active LOW relay driving irrigation pump |
| **Cooling Fan Relay** | **GPIO 26** | `wokwi-relay-module` | Active LOW relay driving exhaust ventilation fan |
| **OLED Display (SDA)** | **GPIO 21** | `wokwi-ssd1306` | SSD1306 128x64 I2C Graphic Display Data line |
| **OLED Display (SCL)** | **GPIO 22** | `wokwi-ssd1306` | SSD1306 128x64 I2C Graphic Display Clock line |
| **Zone A Solenoid Valve** | **GPIO 19** | `wokwi-led` (Green) | Drip line solenoid valve for Zone A |
| **Zone B Solenoid Valve** | **GPIO 23** | `wokwi-led` (Blue) | Drip line solenoid valve for Zone B |

---

## 🔬 Future Scope Feeds Included in Code

- **NPK Macronutrient Stream**: Nitrogen (`soilNitrogen`), Phosphorus (`soilPhosphorus`), Potassium (`soilPotassium`), Soil pH (`soilPh`), and Electrical Conductivity (`soilEc`).
- **Vapor Pressure Deficit (VPD)**: Real-time Tetens calculation (`curVpdKpa` in kPa) to assess crop transpiration stress.
- **Water Conservation Counter**: Dynamically computes cumulative liters saved by autonomous drip vs flood irrigation (`waterSavedLtr`).
- **AI Foliar Health Score**: 0–100 dynamic index reflecting plant health and aphid/leaf pest risk.
- **Multi-Zone Solenoid Routing**: Directs water flow selectively to Zone A or Zone B depending on individual soil moisture deficit.
