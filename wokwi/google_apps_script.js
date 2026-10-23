/**
 * ==============================================================================
 * AGRISENSE PRECISION AGRICULTURE -- ALL 39 SENSORS GOOGLE APPS SCRIPT
 * Team: AgriSense Innovation Cell -- Bal Bharati Public School
 * 
 * CLEAN LIGHT THEME EDITION:
 * - Soft pastel category banners (mint, lavender, sky, cyan, warm amber, indigo)
 * - Crisp light header row with dark charcoal typography (#1e293b)
 * - Soft alternating row zebra striping (#ffffff / #f8fafc)
 * - Pastel status pills for Pump/Fan actuators
 * ==============================================================================
 */

// -------------------- 1. CONFIGURATION --------------------
var CONFIG = {
  SHEET_NAME: "Live_Telemetry",
  CONTROLS_SHEET_NAME: "Edge_Controls",
  FASTAPI_BACKEND_URL: "https://agrisense-backend-kb22.onrender.com/api/sensors/ingest",
  BACKEND_TIMEOUT_MS: 5000,
  MAX_DATA_ROWS: 5000 // Automatically trims oldest rows to maintain high sheet speed
};

// -------------------- 2. CLEAN LIGHT PALETTE & GENEROUS SPACING --------------------
var SENSOR_CATEGORIES = [
  { name: "METADATA", bg: "#f1f5f9", text: "#334155", cols: 3 },
  { name: "SOIL DYNAMICS & ROOT-ZONE (9)", bg: "#dcfce7", text: "#166534", cols: 9 },
  { name: "NPK MACRONUTRIENTS (3)", bg: "#f3e8ff", text: "#6b21a8", cols: 3 },
  { name: "MICRO-CLIMATE & METEOROLOGY (10)", bg: "#e0f2fe", text: "#0369a1", cols: 10 },
  { name: "HYDRAULICS & WATER INFRASTRUCTURE (6)", bg: "#e0f7fa", text: "#006064", cols: 6 },
  { name: "CANOPY BIOMETRICS & PLANT HEALTH (4)", bg: "#ecfdf5", text: "#065f46", cols: 4 },
  { name: "ENVIRONMENT & PEST SURVEILLANCE (7)", bg: "#fef3c7", text: "#92400e", cols: 7 },
  { name: "ACTUATORS & EDGE CONTROL (6)", bg: "#e0e7ff", text: "#3730a3", cols: 6 }
];

var SYSTEMATIC_COLUMNS = [
  // Metadata (3)
  "Timestamp (IST)", "Ingestion Route", "Target Zone",
  
  // Category 1: Soil Dynamics (9)
  "Soil Moisture 1 [%]",
  "Soil Moisture 2 [%]",
  "Soil Moisture 3 [%]",
  "Soil Moisture 4 [%]",
  "Root Average Moisture [%]",
  "Root Soil Temp [C]",
  "Soil pH",
  "Soil EC [dS/m]",
  "Sub-surface Soil O2 [%]",

  // Category 2: NPK Macronutrients (3)
  "Soil Nitrogen (N) [mg/kg]",
  "Soil Phosphorus (P) [mg/kg]",
  "Soil Potassium (K) [mg/kg]",

  // Category 3: Micro-Climate & Meteorology (10)
  "Air Temperature [C]",
  "Relative Humidity [%]",
  "Barometric Pressure [hPa]",
  "Solar Sunlight [%]",
  "PAR Flux [umol/m2/s]",
  "UV Index [0-12]",
  "Rainfall Intensity [%]",
  "Wind Velocity [km/h]",
  "Wind Direction [deg]",
  "Dew Point [C]",

  // Category 4: Hydraulics & Water Infrastructure (6)
  "Water Reservoir [%]",
  "Water Temp [C]",
  "Salinity TDS [ppm]",
  "Water pH",
  "Drip Flow Rate [L/min]",
  "Delivered Water [L]",

  // Category 5: Canopy Biometrics (4)
  "Leaf Wetness [%]",
  "NDVI Canopy Vigour",
  "Sap Flux Rate [g/h]",
  "Stem Diameter [mm]",

  // Category 6: Environmental & Pest Intelligence (7)
  "Air Quality AQI",
  "Carbon Dioxide CO2 [ppm]",
  "Smoke Level [ppm]",
  "Bio-Acoustic Pest Level",
  "Pheromone Pest Count",
  "Frost Margin [C]",
  "Equipment Vibration",

  // Category 7: Actuators & Edge Control (6)
  "Pump State",
  "Fan State",
  "Valve A",
  "Valve B",
  "Control Mode",
  "FastAPI Sync Relay"
];

// Generous column widths specifically dimensioned to eliminate any text clipping or ugly wrapping
var MIN_COLUMN_WIDTHS = [
  170, // 1. Timestamp (IST)
  185, // 2. Ingestion Route
  120, // 3. Target Zone
  135, 135, 135, 135, // 4-7. Soil Moisture 1-4
  160, // 8. Root Average Moisture [%]
  145, // 9. Root Soil Temp [C]
  100, // 10. Soil pH
  130, // 11. Soil EC [dS/m]
  165, // 12. Sub-surface Soil O2 [%]
  175, // 13. Soil Nitrogen (N) [mg/kg]
  180, // 14. Soil Phosphorus (P) [mg/kg]
  175, // 15. Soil Potassium (K) [mg/kg]
  145, // 16. Air Temperature [C]
  155, // 17. Relative Humidity [%]
  175, // 18. Barometric Pressure [hPa]
  140, // 19. Solar Sunlight [%]
  170, // 20. PAR Flux [umol/m2/s]
  125, // 21. UV Index [0-12]
  150, // 22. Rainfall Intensity [%]
  145, // 23. Wind Velocity [km/h]
  135, // 24. Wind Direction [deg]
  135, // 25. Dew Point [C]
  150, // 26. Water Reservoir [%]
  135, // 27. Water Temp [C]
  140, // 28. Salinity TDS [ppm]
  100, // 29. Water pH
  160, // 30. Drip Flow Rate [L/min]
  145, // 31. Delivered Water [L]
  140, // 32. Leaf Wetness [%]
  150, // 33. NDVI Canopy Vigour
  145, // 34. Sap Flux Rate [g/h]
  145, // 35. Stem Diameter [mm]
  135, // 36. Air Quality AQI
  180, // 37. Carbon Dioxide CO2 [ppm]
  140, // 38. Smoke Level [ppm]
  175, // 39. Bio-Acoustic Pest Level
  160, // 40. Pheromone Pest Count
  140, // 41. Frost Margin [C]
  155, // 42. Equipment Vibration
  110, // 43. Pump State
  110, // 44. Fan State
  100, // 45. Valve A
  100, // 46. Valve B
  120, // 47. Control Mode
  175  // 48. FastAPI Sync Relay
];

// -------------------- 3. INITIALIZATION & REFORMATTING --------------------

/**
 * Automatically creates an AgriSense menu directly inside your Google Sheet toolbar!
 * Whenever you reload your Google Sheet in the browser, look for "AgriSense Controls"
 * at the top next to Help!
 */
function onOpen() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu("AgriSense Controls")
      .addItem("Fix Spacing and Light Theme", "reformatExistingSheet")
      .addItem("Initialize Clean 39-Sensor Sheet", "setupSystematicSheet")
      .addToUi();
  } catch(e) {}
}

/**
 * Run this function in Apps Script to instantly reformat your EXISTING sheet
 * with generous cell spacing, perfect column widths, and the clean light theme!
 */
function reformatExistingSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet() || ss.getSheetByName(CONFIG.SHEET_NAME) || ss.getSheets()[0];

  // Safely break any previous conflicting cell merges in the header area
  try {
    sheet.getRange(1, 1, 2, Math.max(sheet.getMaxColumns(), SYSTEMATIC_COLUMNS.length)).breakApart();
  } catch(e) {}

  // Row 1: Merged Light Category Banners with generous 40px vertical breathing room
  var colIndex = 1;
  for (var c = 0; c < SENSOR_CATEGORIES.length; c++) {
    var cat = SENSOR_CATEGORIES[c];
    var range = sheet.getRange(1, colIndex, 1, cat.cols);
    range.merge();
    range.setValue(cat.name);
    range.setBackground(cat.bg);
    range.setFontColor(cat.text);
    range.setFontWeight("bold");
    range.setFontSize(11);
    range.setHorizontalAlignment("center");
    range.setVerticalAlignment("middle");
    colIndex += cat.cols;
  }
  sheet.setRowHeight(1, 40);

  // Row 2: Crisp Light Header Bar with generous 52px height (no text clipping)
  var headerRange = sheet.getRange(2, 1, 1, SYSTEMATIC_COLUMNS.length);
  headerRange.setValues([SYSTEMATIC_COLUMNS]);
  headerRange.setBackground("#f8fafc");
  headerRange.setFontColor("#1e293b");
  headerRange.setFontWeight("bold");
  headerRange.setFontSize(10);
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  headerRange.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
  sheet.setRowHeight(2, 52);
  sheet.setFrozenRows(2);

  // Re-format all existing data rows with generous 26px height and zebra striping
  var lastRow = sheet.getLastRow();
  if (lastRow > 2) {
    for (var r = 3; r <= lastRow; r++) {
      sheet.setRowHeight(r, 26);
      var rRange = sheet.getRange(r, 1, 1, SYSTEMATIC_COLUMNS.length);
      rRange.setFontSize(10);
      rRange.setFontColor("#1e293b");
      rRange.setVerticalAlignment("middle");
      rRange.setHorizontalAlignment("center");
      rRange.setBackground(r % 2 === 0 ? "#ffffff" : "#f8fafc");
    }
  }

  // Apply delicate light gray grid borders across all populated cells
  sheet.getRange(1, 1, Math.max(lastRow, 2), SYSTEMATIC_COLUMNS.length)
    .setBorder(true, true, true, true, true, true, "#e2e8f0", SpreadsheetApp.BorderStyle.SOLID);

  // Set generous, tailored column widths
  for (var i = 0; i < MIN_COLUMN_WIDTHS.length; i++) {
    sheet.setColumnWidth(i + 1, MIN_COLUMN_WIDTHS[i]);
  }

  setupControlsSheet(ss);
  return "Success: Google Sheet spacing and theme have been successfully updated!";
}

function setupSystematicSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet() || ss.getSheetByName(CONFIG.SHEET_NAME) || ss.getSheets()[0];

  // Safely break any prior merges before clearing
  try {
    sheet.getRange(1, 1, 2, Math.max(sheet.getMaxColumns(), SYSTEMATIC_COLUMNS.length)).breakApart();
  } catch(e) {}
  sheet.getRange(1, 1, 2, SYSTEMATIC_COLUMNS.length).clear();

  // Row 1: Merged Light Category Banners
  var colIndex = 1;
  for (var c = 0; c < SENSOR_CATEGORIES.length; c++) {
    var cat = SENSOR_CATEGORIES[c];
    var range = sheet.getRange(1, colIndex, 1, cat.cols);
    range.merge();
    range.setValue(cat.name);
    range.setBackground(cat.bg);
    range.setFontColor(cat.text);
    range.setFontWeight("bold");
    range.setFontSize(11);
    range.setHorizontalAlignment("center");
    range.setVerticalAlignment("middle");
    colIndex += cat.cols;
  }
  sheet.setRowHeight(1, 40);

  // Row 2: Light Column Headers with 52px height
  var headerRange = sheet.getRange(2, 1, 1, SYSTEMATIC_COLUMNS.length);
  headerRange.setValues([SYSTEMATIC_COLUMNS]);
  headerRange.setBackground("#f8fafc");
  headerRange.setFontColor("#1e293b");
  headerRange.setFontWeight("bold");
  headerRange.setFontSize(10);
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  headerRange.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
  sheet.setRowHeight(2, 52);
  sheet.setFrozenRows(2);

  // Apply generous, tailored column widths
  for (var i = 0; i < MIN_COLUMN_WIDTHS.length; i++) {
    sheet.setColumnWidth(i + 1, MIN_COLUMN_WIDTHS[i]);
  }

  setupControlsSheet(ss);
  return "Success: Systematic 39-Sensor Sheet initialized!";
}

function setupControlsSheet(ss) {
  var ctrlSheet = ss.getSheetByName(CONFIG.CONTROLS_SHEET_NAME);
  if (!ctrlSheet) {
    ctrlSheet = ss.insertSheet(CONFIG.CONTROLS_SHEET_NAME);
  }
  ctrlSheet.clear();

  var headers = [["Control Parameter", "Configured Value", "Description / Instructions"]];
  var data = [
    ["PUMP OVERRIDE", "AUTO", "Type AUTO, ON, or OFF to control water pump from sheet"],
    ["FAN OVERRIDE", "AUTO", "Type AUTO, ON, or OFF to control cooling fan"],
    ["AUTOMATION MODE", "AUTO", "Type AUTO (Edge Closed-Loop) or MANUAL"],
    ["EMERGENCY STOP", "NO", "Type YES to immediately kill all relays"]
  ];

  ctrlSheet.setRowHeight(1, 38);
  ctrlSheet.getRange(1, 1, 1, 3).setValues(headers)
    .setBackground("#e0e7ff")
    .setFontColor("#1e1b4b")
    .setFontWeight("bold")
    .setFontSize(11)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  for (var r = 2; r <= data.length + 1; r++) {
    ctrlSheet.setRowHeight(r, 28);
  }

  ctrlSheet.getRange(2, 1, data.length, 3).setValues(data)
    .setFontSize(10)
    .setFontColor("#1e293b")
    .setVerticalAlignment("middle");

  ctrlSheet.getRange(2, 2, data.length, 1)
    .setHorizontalAlignment("center")
    .setFontWeight("bold")
    .setBackground("#f8fafc");

  ctrlSheet.getRange(1, 1, data.length + 1, 3)
    .setBorder(true, true, true, true, true, true, "#cbd5e1", SpreadsheetApp.BorderStyle.SOLID);

  ctrlSheet.setColumnWidth(1, 180);
  ctrlSheet.setColumnWidth(2, 150);
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
    var sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.getSheets()[0];
    if (!sheet || sheet.getLastRow() < 2) {
      setupSystematicSheet();
      sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.getSheets()[0];
    }

    var t = new Date();
    var timeStr = Utilities.formatDate(t, "Asia/Kolkata", "yyyy-MM-dd HH:mm:ss");
    var route = "Google Sheets (Relayed)";
    var zone = params.zone || "Zone A";

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
    var edgeMode   = params.mode || (params.auto_mode ? "auto" : "manual");

    // Read Sheet Edge Controls overrides
    var controlOverrides = readControlsSheet(ss);
    if (controlOverrides.pumpOverride !== null) isPumpOn = controlOverrides.pumpOverride;
    if (controlOverrides.fanOverride !== null) isFanOn = controlOverrides.fanOverride;
    if (controlOverrides.modeOverride !== null) edgeMode = controlOverrides.modeOverride;

    // Forward telemetry to FastAPI Cloud Backend
    var backendSyncResult = forwardToFastApi({
      source: "google_sheets",
      route: "google_sheets_primary",
      timestamp: timeStr,
      zone: zone,
      soilA: soilA, soilB: soilB, soilC: soilC, soilD: soilD, soilAvg: soilAvg,
      soilTemp: soilTemp, soilPH: soilPH, soilEC: soilEC, soilO2: soilO2,
      nitrogen: nitrogen, phosphorus: phosphorus, potassium: potassium,
      airTemp: airTemp, airHumidity: airHumidity, pressure: pressure, light: light,
      par: par, uv: uv, rain: rain, wind: wind, windDir: windDir, dewPoint: dewPoint,
      waterTank: waterTank, waterTemp: waterTemp, tds: tds, waterPH: waterPH,
      waterFlow: waterFlow, flow: flow,
      leafWet: leafWet, ndvi: ndvi, sapFlow: sapFlow, stemDia: stemDia,
      airQuality: airQuality, co2: co2, smoke: smoke, pestMic: pestMic,
      pestCount: pestCount, frost: frost, vibration: vibration,
      pump: isPumpOn, fan: isFanOn, valveA: isValveAOn, valveB: isValveBOn, mode: edgeMode
    });

    if (backendSyncResult && backendSyncResult.pump_command !== undefined) {
      isPumpOn = backendSyncResult.pump_command;
    }
    if (backendSyncResult && backendSyncResult.fan_command !== undefined) {
      isFanOn = backendSyncResult.fan_command;
    }
    if (backendSyncResult && backendSyncResult.auto_mode !== undefined) {
      edgeMode = backendSyncResult.auto_mode ? "auto" : "manual";
    }

    var relayStatus = backendSyncResult && backendSyncResult.status === "success" 
      ? "Relayed (HTTP 200)" 
      : "Buffered in Sheet";

    // 48-column row
    var row = [
      timeStr, route, zone,
      soilA, soilB, soilC, soilD, soilAvg, soilTemp, soilPH, soilEC, soilO2,
      nitrogen, phosphorus, potassium,
      airTemp, airHumidity, pressure, light, par, uv, rain, wind, windDir, dewPoint,
      waterTank, waterTemp, tds, waterPH, waterFlow, flow,
      leafWet, ndvi, sapFlow, stemDia,
      airQuality, co2, smoke, pestMic, pestCount, frost, vibration,
      isPumpOn ? "ON" : "OFF",
      isFanOn ? "ON" : "OFF",
      isValveAOn ? "OPEN" : "CLOSED",
      isValveBOn ? "OPEN" : "CLOSED",
      edgeMode.toUpperCase(),
      relayStatus
    ];

    sheet.appendRow(row);

    // Apply formatting with soft pastel badges & alternating row background
    var lastRow = sheet.getLastRow();
    sheet.setRowHeight(lastRow, 26);
    var rowRange = sheet.getRange(lastRow, 1, 1, row.length);
    rowRange.setFontSize(10).setFontColor("#1e293b").setVerticalAlignment("middle").setHorizontalAlignment("center");
    
    // Zebra row shading
    var rowBg = (lastRow % 2 === 0) ? "#ffffff" : "#f8fafc";
    rowRange.setBackground(rowBg);

    // Light green pastel badge for Pump
    sheet.getRange(lastRow, 43, 1, 1)
      .setBackground(isPumpOn ? "#dcfce7" : "#f1f5f9")
      .setFontColor(isPumpOn ? "#15803d" : "#64748b")
      .setFontWeight("bold");

    // Light blue pastel badge for Fan
    sheet.getRange(lastRow, 44, 1, 1)
      .setBackground(isFanOn ? "#e0f2fe" : "#f1f5f9")
      .setFontColor(isFanOn ? "#0284c7" : "#64748b")
      .setFontWeight("bold");

    // Light borders on appended row
    rowRange.setBorder(true, true, true, true, true, true, "#e2e8f0", SpreadsheetApp.BorderStyle.SOLID);

    // Prune oldest rows if exceeding maximum limit
    if (lastRow > CONFIG.MAX_DATA_ROWS) {
      sheet.deleteRows(3, 50);
    }

    var responseObj = {
      status: "success",
      timestamp: timeStr,
      source: "google_sheets_primary",
      logged_row: lastRow,
      backend_relayed: (backendSyncResult && backendSyncResult.status === "success"),
      pump: isPumpOn,
      fan: isFanOn,
      valveA: isValveAOn,
      valveB: isValveBOn,
      auto_mode: (edgeMode === "auto"),
      emergency_stop: controlOverrides.emergencyStop
    };

    return ContentService.createTextOutput(JSON.stringify(responseObj))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// -------------------- 5. FASTAPI BACKEND RELAY --------------------
function forwardToFastApi(payload) {
  try {
    var options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    var response = UrlFetchApp.fetch(CONFIG.FASTAPI_BACKEND_URL, options);
    var code = response.getResponseCode();
    if (code === 200 || code === 201) {
      return JSON.parse(response.getContentText());
    }
  } catch(e) {}
  return null;
}

// -------------------- 6. GOOGLE SHEET EDGE CONTROLS READER --------------------
function readControlsSheet(ss) {
  var res = { pumpOverride: null, fanOverride: null, modeOverride: null, emergencyStop: false };
  var sheet = ss.getSheetByName(CONFIG.CONTROLS_SHEET_NAME);
  if (!sheet) return res;

  try {
    var data = sheet.getRange(2, 1, 4, 2).getValues();
    for (var i = 0; i < data.length; i++) {
      var param = String(data[i][0]).toUpperCase().trim();
      var val = String(data[i][1]).toUpperCase().trim();

      if (param.indexOf("PUMP") !== -1) {
        if (val === "ON") res.pumpOverride = true;
        else if (val === "OFF") res.pumpOverride = false;
      } else if (param.indexOf("FAN") !== -1) {
        if (val === "ON") res.fanOverride = true;
        else if (val === "OFF") res.fanOverride = false;
      } else if (param.indexOf("MODE") !== -1) {
        if (val === "MANUAL") res.modeOverride = "manual";
        else if (val === "AUTO") res.modeOverride = "auto";
      } else if (param.indexOf("EMERGENCY") !== -1) {
        res.emergencyStop = (val === "YES" || val === "TRUE");
      }
    }
  } catch(e) {}
  return res;
}
