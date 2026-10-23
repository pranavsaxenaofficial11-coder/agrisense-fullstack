/**
 * ==============================================================================
 * AGRISENSE PRECISION AGRICULTURE — ALL 39 SENSORS GOOGLE APPS SCRIPT
 * Team: AgriSense Innovation Cell — Bal Bharati Public School
 * 
 * ROLE IN ARCHITECTURE:
 * 1. Primary Ingestion Gate: Receives telemetry covering all 39 sensors from Wokwi / physical ESP32.
 * 2. Systematic Data Logging: Appends formatted row into categorized, color-coded Google Sheet.
 * 3. Live Backend Forwarding: Automatically relays the 39-sensor payload to our FastAPI backend:
 *    https://agrisense-backend-kb22.onrender.com/api/sensors/ingest
 * 4. Bidirectional Control Relay: Receives actuator states (Pump, Fan, Auto/Manual) from backend
 *    or Google Sheet control cells and returns them back to the ESP32 in JSON format!
 * ==============================================================================
 */

// -------------------- 1. CONFIGURATION --------------------
var CONFIG = {
  SHEET_NAME: "Live_Telemetry",
  CONTROLS_SHEET_NAME: "Edge_Controls",
  FASTAPI_BACKEND_URL: "https://agrisense-backend-kb22.onrender.com/api/sensors/ingest",
  BACKEND_TIMEOUT_MS: 5000,
  MAX_DATA_ROWS: 5000 // Automatically trims oldest rows to prevent Google Sheets lag
};

// -------------------- 2. SYSTEMATIC 39-SENSOR HEADER DEFINITION --------------------
var SENSOR_CATEGORIES = [
  { name: "METADATA", color: "#1e293b", cols: 3 },
  { name: "SOIL DYNAMICS & ROOT-ZONE (9)", color: "#166534", cols: 9 },
  { name: "NPK MACRONUTRIENTS (3)", color: "#7e22ce", cols: 3 },
  { name: "MICRO-CLIMATE & METEOROLOGY (10)", color: "#0369a1", cols: 10 },
  { name: "HYDRAULICS & WATER INFRASTRUCTURE (6)", color: "#1d4ed8", cols: 6 },
  { name: "CANOPY BIOMETRICS & PLANT HEALTH (4)", color: "#047857", cols: 4 },
  { name: "ENVIRONMENT & PEST SURVEILLANCE (7)", color: "#b45309", cols: 7 },
  { name: "ACTUATORS & EDGE CONTROL (6)", color: "#4338ca", cols: 6 }
];

var SYSTEMATIC_COLUMNS = [
  // Metadata (3)
  "Timestamp (IST)", "Ingestion Route", "Target Zone",
  
  // Category 1: Soil Dynamics (9)
  "Soil Moisture 1 - Zone A [%]",
  "Soil Moisture 2 - Zone B [%]",
  "Soil Moisture 3 - Zone C [%]",
  "Soil Moisture 4 - Zone D [%]",
  "Root-Zone Average Moisture [%]",
  "Root-Zone Soil Temp [°C]",
  "Soil Acidity/Alkalinity [pH]",
  "Soil Salinity EC [dS/m]",
  "Sub-surface Soil Oxygen [%]",

  // Category 2: NPK Macronutrients (3)
  "Soil Nitrogen (N) [mg/kg]",
  "Soil Phosphorus (P) [mg/kg]",
  "Soil Potassium (K) [mg/kg]",

  // Category 3: Micro-Climate & Meteorology (10)
  "Ambient Air Temp [°C]",
  "Air Relative Humidity [%]",
  "Barometric Pressure [hPa]",
  "Solar Sunlight [%]",
  "PAR Flux [µmol/m²/s]",
  "Solar Ultraviolet Index [0-12]",
  "Rainfall Intensity [%]",
  "Wind Velocity [km/h]",
  "Wind Direction [°]",
  "Thermodynamic Dew Point [°C]",

  // Category 4: Hydraulics & Water Infrastructure (6)
  "Water Reservoir Level [%]",
  "Water Temperature [°C]",
  "Water Salinity TDS [ppm]",
  "Reservoir Water pH",
  "Inline Drip Flow Rate [L/min]",
  "Cumulative Water Today [L]",

  // Category 5: Canopy Biometrics (4)
  "Leaf Canopy Wetness [%]",
  "NDVI Canopy Vigour [0-1]",
  "Vascular Sap Flow [g/h]",
  "Stem Dendrometer Dia [mm]",

  // Category 6: Environmental & Pest Intelligence (7)
  "Air Quality MQ-135 [idx]",
  "Carbon Dioxide CO2 [ppm]",
  "Combustible Gas MQ-2 [idx]",
  "Bio-Acoustic Pest Index",
  "Pheromone Pest Count [/day]",
  "Ground Frost Alert [°C]",
  "Enclosure Vibration",

  // Category 7: Actuators & Edge Control (6)
  "Pump State",
  "Fan State",
  "Valve A (Zone A)",
  "Valve B (Zone B)",
  "Automation Mode",
  "FastAPI Sync Relay"
];

// -------------------- 3. INITIALIZATION & FORMATTING --------------------
function setupSystematicSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME, 0);
  }

  // Clear existing headers if needed
  sheet.getRange(1, 1, 2, SYSTEMATIC_COLUMNS.length).clear();

  // Row 1: Merged Category Banners
  var colIndex = 1;
  for (var c = 0; c < SENSOR_CATEGORIES.length; c++) {
    var cat = SENSOR_CATEGORIES[c];
    var range = sheet.getRange(1, colIndex, 1, cat.cols);
    range.merge();
    range.setValue(cat.name);
    range.setBackground(cat.color);
    range.setFontColor("#ffffff");
    range.setFontWeight("bold");
    range.setHorizontalAlignment("center");
    range.setVerticalAlignment("middle");
    colIndex += cat.cols;
  }
  sheet.setRowHeight(1, 32);

  // Row 2: Systematic Column Headers
  var headerRange = sheet.getRange(2, 1, 1, SYSTEMATIC_COLUMNS.length);
  headerRange.setValues([SYSTEMATIC_COLUMNS]);
  headerRange.setBackground("#0f172a");
  headerRange.setFontColor("#f8fafc");
  headerRange.setFontWeight("bold");
  headerRange.setHorizontalAlignment("center");
  sheet.setRowHeight(2, 28);
  sheet.setFrozenRows(2);

  // Auto-fit column widths
  for (var i = 1; i <= SYSTEMATIC_COLUMNS.length; i++) {
    sheet.setColumnWidth(i, 140);
  }

  // Setup Edge Controls Sheet if missing
  setupControlsSheet(ss);

  return "✅ Systematic 39-Sensor Sheet initialized with 7 agronomic categories!";
}

function setupControlsSheet(ss) {
  var ctrlSheet = ss.getSheetByName(CONFIG.CONTROLS_SHEET_NAME);
  if (!ctrlSheet) {
    ctrlSheet = ss.insertSheet(CONFIG.CONTROLS_SHEET_NAME);
  }
  ctrlSheet.clear();

  var headers = [["Control Parameter", "Configured Value", "Description / Instructions"]];
  var data = [
    ["PUMP OVERRIDE", "AUTO", "Set to: AUTO, ON, or OFF to override pump from Google Sheet"],
    ["FAN OVERRIDE", "AUTO", "Set to: AUTO, ON, or OFF to override cooling fan"],
    ["AUTOMATION MODE", "AUTO", "Set to AUTO (Edge Closed-Loop) or MANUAL"],
    ["EMERGENCY STOP", "NO", "Set to YES to immediately kill all relays"]
  ];

  ctrlSheet.getRange(1, 1, 1, 3).setValues(headers).setBackground("#312e81").setFontColor("#fff").setFontWeight("bold");
  ctrlSheet.getRange(2, 1, data.length, 3).setValues(data);
  ctrlSheet.setColumnWidth(1, 200);
  ctrlSheet.setColumnWidth(2, 160);
  ctrlSheet.setColumnWidth(3, 380);
}

// -------------------- 4. MAIN HTTP INGESTION HANDLERS --------------------
function doGet(e) {
  return handleIncomingTelemetry(e ? e.parameter : {});
}

function doPost(e) {
  var params = {};
  if (e && e.postData && e.postData.contents) {
    try {
      params = JSON.parse(e.postData.contents);
    } catch(err) {
      params = e.parameter || {};
    }
  } else if (e && e.parameter) {
    params = e.parameter;
  }
  return handleIncomingTelemetry(params);
}

function handleIncomingTelemetry(params) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet || sheet.getLastRow() < 2) {
      setupSystematicSheet();
      sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    }

    // 1. Extract and standardize all 39 sensors with fallbacks
    var t = new Date();
    var timeStr = Utilities.formatDate(t, "Asia/Kolkata", "yyyy-MM-dd HH:mm:ss IST");
    var route = "Google Sheets Primary (Relayed to Site)";
    var zone = params.zone || "Zone A (Polyhouse)";

    // Category 1: Soil Dynamics (9)
    var soilA    = parseFloat(params.soilA || params.soil_moisture_1 || 35.0);
    var soilB    = parseFloat(params.soilB || params.soil_moisture_2 || 32.0);
    var soilC    = parseFloat(params.soilC || (soilA * 0.92 + 2));
    var soilD    = parseFloat(params.soilD || (soilB * 1.05 - 1));
    var soilAvg  = parseFloat(params.soilAvg || params.soil_average || ((soilA + soilB) / 2.0));
    var soilTemp = parseFloat(params.soilTemp || 24.5);
    var soilPH   = parseFloat(params.soilPH || params.soil_ph || 6.5);
    var soilEC   = parseFloat(params.soilEC || 1.15);
    var soilO2   = parseFloat(params.soilO2 || 19.2);

    // Category 2: NPK Macronutrients (3)
    var nitrogen   = parseFloat(params.nitrogen || 175.0);
    var phosphorus = parseFloat(params.phosphorus || 22.0);
    var potassium  = parseFloat(params.potassium || 165.0);

    // Category 3: Micro-Climate & Meteorology (10)
    var airTemp     = parseFloat(params.airTemp || params.air_temp || 28.5);
    var airHumidity = parseFloat(params.airHumidity || params.air_humidity || 60.0);
    var pressure    = parseFloat(params.pressure || 1012.0);
    var light       = parseFloat(params.light || params.light_pct || 65.0);
    var par         = parseFloat(params.par || 850.0);
    var uv          = parseFloat(params.uv || 5.5);
    var rain        = parseFloat(params.rain || params.rain_pct || 0.0);
    var wind        = parseFloat(params.wind || 8.5);
    var windDir     = parseFloat(params.windDir || 180.0);
    var dewPoint    = parseFloat(params.dewPoint || 19.5);

    // Category 4: Hydraulics & Water Infrastructure (6)
    var waterTank = parseFloat(params.waterTank || params.tankPct || params.tank_level_pct || 75.0);
    var waterTemp = parseFloat(params.waterTemp || 23.0);
    var tds       = parseFloat(params.tds || 340.0);
    var waterPH   = parseFloat(params.waterPH || 7.0);
    var waterFlow = parseFloat(params.waterFlow || (params.pump ? 4.2 : 0.0));
    var flow      = parseFloat(params.flow || 18.5);

    // Category 5: Canopy Biometrics (4)
    var leafWet = parseFloat(params.leafWet || 28.0);
    var ndvi    = parseFloat(params.ndvi || 0.76);
    var sapFlow = parseFloat(params.sapFlow || 45.0);
    var stemDia = parseFloat(params.stemDia || 12.6);

    // Category 6: Environmental & Pest Intelligence (7)
    var airQuality = parseFloat(params.airQuality || 28.0);
    var co2        = parseFloat(params.co2 || 430.0);
    var smoke      = parseFloat(params.smoke || 14.0);
    var pestMic    = parseFloat(params.pestMic || 12.0);
    var pestCount  = parseFloat(params.pestCount || 2.0);
    var frost      = parseFloat(params.frost || 8.5);
    var vibration  = parseFloat(params.vibration || 1.0);

    // Category 7: Actuators (6)
    var isPumpOn   = (params.pump === true || params.pump === "true" || params.pump_state === "true" || params.pump_state === true);
    var isFanOn    = (params.fan === true || params.fan === "true" || params.fan_state === "true" || params.fan_state === true);
    var isValveAOn = (params.valveA === true || params.valveA === "true");
    var isValveBOn = (params.valveB === true || params.valveB === "true");
    var autoMode   = (params.mode !== "manual");

    // 2. Relay the systematic 39-sensor telemetry directly to FastAPI Backend
    var backendRelaySuccess = false;
    var remotePumpCmd = isPumpOn;
    var remoteFanCmd = isFanOn;
    var remoteEmergencyStop = false;

    var backendPayload = {
      source: "google_sheets",
      route: "google_sheets",
      zone: zone,
      soilA: soilA, soilB: soilB, soilC: soilC, soilD: soilD, soilAvg: soilAvg,
      soilTemp: soilTemp, soilPH: soilPH, soilEC: soilEC, soilO2: soilO2,
      nitrogen: nitrogen, phosphorus: phosphorus, potassium: potassium,
      airTemp: airTemp, airHumidity: airHumidity, pressure: pressure,
      light: light, par: par, uv: uv, rain: rain, wind: wind, windDir: windDir, dewPoint: dewPoint,
      waterTank: waterTank, waterTemp: waterTemp, tds: tds, waterPH: waterPH,
      waterFlow: waterFlow, flow: flow, leafWet: leafWet, ndvi: ndvi,
      sapFlow: sapFlow, stemDia: stemDia, airQuality: airQuality, co2: co2,
      smoke: smoke, pestMic: pestMic, pestCount: pestCount, frost: frost,
      vibration: vibration,
      pump: isPumpOn, fan: isFanOn, valveA: isValveAOn, valveB: isValveBOn,
      mode: autoMode ? "auto" : "manual"
    };

    try {
      var fetchOptions = {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(backendPayload),
        muteHttpExceptions: true
      };
      var backendResp = UrlFetchApp.fetch(CONFIG.FASTAPI_BACKEND_URL, fetchOptions);
      if (backendResp.getResponseCode() === 200) {
        backendRelaySuccess = true;
        var respJson = JSON.parse(backendResp.getContentText());
        if (respJson.pump_command !== undefined) remotePumpCmd = respJson.pump_command;
        if (respJson.emergency_stop === true) remoteEmergencyStop = true;
      }
    } catch(backendErr) {
      Logger.log("Notice: Backend relay offline or sleeping: " + backendErr);
    }

    // 3. Check Edge Controls Sheet for local overrides
    var ctrlSheet = ss.getSheetByName(CONFIG.CONTROLS_SHEET_NAME);
    if (ctrlSheet && ctrlSheet.getLastRow() >= 2) {
      var ctrlVals = ctrlSheet.getRange(2, 1, 4, 2).getValues();
      for (var r = 0; r < ctrlVals.length; r++) {
        var param = String(ctrlVals[r][0]).toUpperCase();
        var val = String(ctrlVals[r][1]).toUpperCase().trim();
        if (param.indexOf("PUMP") !== -1) {
          if (val === "ON") remotePumpCmd = true;
          else if (val === "OFF") remotePumpCmd = false;
        } else if (param.indexOf("FAN") !== -1) {
          if (val === "ON") remoteFanCmd = true;
          else if (val === "OFF") remoteFanCmd = false;
        } else if (param.indexOf("EMERGENCY") !== -1 && val === "YES") {
          remoteEmergencyStop = true;
          remotePumpCmd = false;
          remoteFanCmd = false;
        }
      }
    }

    // 4. Append row with all systematic columns
    var rowData = [
      timeStr, route, zone,
      soilA, soilB, soilC, soilD, soilAvg, soilTemp, soilPH, soilEC, soilO2,
      nitrogen, phosphorus, potassium,
      airTemp, airHumidity, pressure, light, par, uv, rain, wind, windDir, dewPoint,
      waterTank, waterTemp, tds, waterPH, waterFlow, flow,
      leafWet, ndvi, sapFlow, stemDia,
      airQuality, co2, smoke, pestMic, pestCount, frost, vibration,
      isPumpOn ? "PUMP_ON" : "PUMP_OFF",
      isFanOn ? "FAN_ON" : "FAN_OFF",
      isValveAOn ? "VALVE_A_OPEN" : "VALVE_A_CLOSED",
      isValveBOn ? "VALVE_B_OPEN" : "VALVE_B_CLOSED",
      autoMode ? "AUTO" : "MANUAL",
      backendRelaySuccess ? "RELAYED_TO_FASTAPI_OK" : "QUEUED_LOCAL_ONLY"
    ];

    sheet.appendRow(rowData);

    // Auto-prune oldest rows if table exceeds limit
    if (sheet.getLastRow() > CONFIG.MAX_DATA_ROWS + 2) {
      sheet.deleteRows(3, 50);
    }

    // 5. Construct JSON response for ESP32
    var responseObj = {
      status: "success",
      source: "google_sheets",
      sheet_logged: true,
      relayed_to_backend: backendRelaySuccess,
      pump_command: remotePumpCmd,
      fan_command: remoteFanCmd,
      emergency_stop: remoteEmergencyStop,
      auto_mode: autoMode,
      timestamp: timeStr
    };

    return ContentService.createTextOutput(JSON.stringify(responseObj))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(error) {
    var errObj = {
      status: "error",
      message: error.toString(),
      source: "google_sheets"
    };
    return ContentService.createTextOutput(JSON.stringify(errObj))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// -------------------- 5. SPREADSHEET UI MENU --------------------
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🌾 AgriSense Master")
    .addItem("📊 Initialize Systematic 39-Sensor Sheet", "setupSystematicSheet")
    .addItem("🔄 Test Forward to FastAPI Backend", "testBackendRelay")
    .addSeparator()
    .addItem("⚡ Turn Pump ON", "menuPumpOn")
    .addItem("🛑 Turn Pump OFF", "menuPumpOff")
    .addItem("🌱 Set Mode to AUTO", "menuAuto")
    .addToUi();
}

function testBackendRelay() {
  var sample = {
    source: "google_sheets",
    soilA: 38.0, soilB: 35.0, soilAvg: 36.5, airTemp: 27.5, airHumidity: 65.0,
    pump: false, fan: false, mode: "auto"
  };
  try {
    var resp = UrlFetchApp.fetch(CONFIG.FASTAPI_BACKEND_URL, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(sample),
      muteHttpExceptions: true
    });
    SpreadsheetApp.getUi().alert("FastAPI Response (" + resp.getResponseCode() + "):\n" + resp.getContentText());
  } catch(e) {
    SpreadsheetApp.getUi().alert("Relay Test Failed:\n" + e.toString());
  }
}

function menuPumpOn() {
  setControlCell("PUMP OVERRIDE", "ON");
}
function menuPumpOff() {
  setControlCell("PUMP OVERRIDE", "OFF");
}
function menuAuto() {
  setControlCell("PUMP OVERRIDE", "AUTO");
  setControlCell("FAN OVERRIDE", "AUTO");
  setControlCell("EMERGENCY STOP", "NO");
}

function setControlCell(paramName, val) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.CONTROLS_SHEET_NAME);
  if (!sheet) return;
  var rows = sheet.getRange(2, 1, 4, 2).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).toUpperCase().indexOf(paramName) !== -1) {
      sheet.getRange(i + 2, 2).setValue(val);
      SpreadsheetApp.getUi().alert("Edge Control updated: " + paramName + " = " + val);
      return;
    }
  }
}
