/*
  ========================================================================================
  AgriSense Autonomous Edge IoT Firmware with Dual-Threshold Hysteresis & Failsafe Watchdog
  Platform: ESP32 DevKit V1 (Espressif)
  Authors: Pranav Saxena (Lead Developer, Class X-D) & Inaya Sharma (Co-Researcher)
  Purpose: Autonomous local edge pump control, sensor noise filtering, and cloud fallback.
  ========================================================================================
*/

#include <WiFi.h>
#include <HTTPClient.h>

// ==========================================
// 1. PIN CONFIGURATIONS (ADC1 Safe Pins)
// ==========================================
// Use ADC1 pins only when Wi-Fi is active (ADC2 is shared with Wi-Fi radio)
const int PIN_SOIL_MOISTURE    = 34; // Analog ADC1 Channel 6
const int PIN_RELAY_PUMP       = 23; // Digital Output to Active-LOW Relay Module
const int PIN_STATUS_LED       = 2;  // Onboard Blue Status LED

// ==========================================
// 2. AGRONOMIC & HYSTERESIS THRESHOLDS
// ==========================================
// Hysteresis prevents rapid relay switching ("chattering") near threshold boundary
const float THRESHOLD_LOW_TRIGGER   = 28.0; // Turn pump ON when moisture falls below 28%
const float THRESHOLD_HIGH_SHUTOFF  = 38.0; // Turn pump OFF when moisture rises above 38%

// ==========================================
// 3. HARDWARE FAILSAFE SAFETY LIMITS
// ==========================================
// Protects against soil flooding and pump motor burnout if sensor floats or shorts
const unsigned long MAX_PUMP_DURATION_MS = 120000; // 2 minutes (120,000 ms) max continuous runtime
const unsigned long MANDATORY_SOAK_DELAY_MS = 900000; // 15 minutes rest to allow soil percolation
const unsigned long SENSOR_SAMPLE_INTERVAL_MS = 3500; // Sample every 3.5 seconds

// Capacitive Sensor Raw Calibration Constants (3.3V ADC, 12-bit: 0 - 4095)
const int SENSOR_AIR_RAW   = 3450; // Dry air baseline reading
const int SENSOR_WATER_RAW = 1450; // Fully submerged in water reading

// ==========================================
// 4. NETWORK CONFIGURATION (Optional Cloud Ingest)
// ==========================================
const char* WIFI_SSID     = "AgriSense_Local_AP";
const char* WIFI_PASSWORD = "agrisense_secure";
const char* CLOUD_API_URL = "http://192.168.1.100:8000/api/v1/local-advisory";

// ==========================================
// 5. RUNTIME STATE VARIABLES
// ==========================================
bool isPumpActive = false;
unsigned long pumpStartTime = 0;
unsigned long lastPumpStopTime = 0;
unsigned long lastSampleTime = 0;
float smoothedMoisture = 50.0; // Exponential Moving Average (EMA) filter state
unsigned long totalPumpRunCycles = 0;

// Relay Active State Helper (Most relay boards are Active-LOW)
void setRelayState(bool turnOn) {
  if (turnOn) {
    digitalWrite(PIN_RELAY_PUMP, LOW);  // Relay ON (Active-LOW)
    digitalWrite(PIN_STATUS_LED, HIGH); // LED ON
    isPumpActive = true;
  } else {
    digitalWrite(PIN_RELAY_PUMP, HIGH); // Relay OFF (Active-LOW)
    digitalWrite(PIN_STATUS_LED, LOW);  // LED OFF
    isPumpActive = false;
  }
}

// ==========================================
// 6. SENSOR READ & NOISE FILTERING
// ==========================================
float readCalibratedMoisture() {
  // Multisampling: average 8 consecutive ADC samples to smooth electrical noise
  long sum = 0;
  for (int i = 0; i < 8; i++) {
    sum += analogRead(PIN_SOIL_MOISTURE);
    delayMicroseconds(50);
  }
  int rawValue = sum / 8;

  // Sensor Sanity Validation: Detect disconnected or shorted probes
  if (rawValue < 200 || rawValue > 4080) {
    Serial.printf("[FAULT] Sensor disconnected or open circuit! Raw ADC: %d\n", rawValue);
    return -1.0; // Invalidate reading
  }

  // Constrain to calibrated physical range
  int clamped = constrain(rawValue, SENSOR_WATER_RAW, SENSOR_AIR_RAW);
  
  // Inverse mapping: higher raw voltage = lower capacitance = drier soil
  float percentage = (float)map(clamped, SENSOR_AIR_RAW, SENSOR_WATER_RAW, 0, 100);
  return percentage;
}

// ==========================================
// 7. ARDUINO SETUP
// ==========================================
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n=======================================================");
  Serial.println("  AgriSense Autonomous Edge Firmware v2.1 (Hardened)");
  Serial.println("  Pranav Saxena & Inaya Sharma");
  Serial.println("=======================================================");

  pinMode(PIN_RELAY_PUMP, OUTPUT);
  pinMode(PIN_STATUS_LED, OUTPUT);
  setRelayState(false); // Ensure pump is OFF on power-up

  // Set ADC attenuation to 11dB for full 0 - 3.3V range
  analogSetAttenuation(ADC_11db);

  // Initialize Wi-Fi in background (Non-blocking fallback)
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.println("[WIFI] Connecting to local gateway (background)...");
}

// ==========================================
// 8. AUTONOMOUS MAIN LOOP
// ==========================================
void loop() {
  unsigned long now = millis();

  // --- TASK 1: Sensor Sampling & Moving Average Filter ---
  if (now - lastSampleTime >= SENSOR_SAMPLE_INTERVAL_MS) {
    lastSampleTime = now;
    
    float instantMoisture = readCalibratedMoisture();
    if (instantMoisture >= 0.0) {
      // Exponential Moving Average (alpha = 0.25)
      smoothedMoisture = (0.25f * instantMoisture) + (0.75f * smoothedMoisture);
      
      Serial.printf("[TELEMETRY] Smoothed Moisture: %.1f%% | Instant: %.1f%% | Pump: %s\n",
                    smoothedMoisture, instantMoisture, isPumpActive ? "ACTIVE" : "STANDBY");

      // --- TASK 2: Dual-Threshold Hysteresis Evaluation ---
      if (!isPumpActive) {
        // Condition: Soil is dry (< 28%) AND mandatory soak interval has elapsed
        bool soakReady = (lastPumpStopTime == 0) || (now - lastPumpStopTime >= MANDATORY_SOAK_DELAY_MS);
        if (smoothedMoisture < THRESHOLD_LOW_TRIGGER) {
          if (soakReady) {
            Serial.printf("[ACTION] Soil moisture (%.1f%%) < Low Trigger (%.1f%%) -> STARTING PUMP\n",
                          smoothedMoisture, THRESHOLD_LOW_TRIGGER);
            setRelayState(true);
            pumpStartTime = now;
            totalPumpRunCycles++;
          } else {
            unsigned long remainingSoakSec = (MANDATORY_SOAK_DELAY_MS - (now - lastPumpStopTime)) / 1000;
            Serial.printf("[SOAK DELAY] Soil dry, but soaking in progress. Remaining: %lu sec\n", remainingSoakSec);
          }
        }
      } else {
        // Pump is running: Check if moisture reached shutoff threshold
        if (smoothedMoisture >= THRESHOLD_HIGH_SHUTOFF) {
          Serial.printf("[ACTION] Soil replenished (%.1f%% >= %.1f%%) -> SHUTTING OFF PUMP\n",
                        smoothedMoisture, THRESHOLD_HIGH_SHUTOFF);
          setRelayState(false);
          lastPumpStopTime = now;
        }
      }
    } else {
      // Failsafe: if sensor reading failed and pump is active, shut off immediately
      if (isPumpActive) {
        Serial.println("[SAFETY] Sensor fault detected while pump active! Emergency shutoff.");
        setRelayState(false);
        lastPumpStopTime = now;
      }
    }
  }

  // --- TASK 3: Emergency Watchdog Cutoff ---
  if (isPumpActive && (now - pumpStartTime >= MAX_PUMP_DURATION_MS)) {
    Serial.println("[SAFETY WATCHDOG] Maximum pump runtime exceeded (120s)! Forcing emergency shutoff.");
    setRelayState(false);
    lastPumpStopTime = now;
  }
}
