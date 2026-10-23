/**
 * AGRISENSE PRECISION AGRICULTURE -- ALL 39 SENSORS
 * Google Apps Script (Pure ASCII, Short Lines)
 */

var CONFIG = {
  SHEET_NAME: "Live_Telemetry",
  CONTROLS_SHEET_NAME: "Edge_Controls",
  FASTAPI_BACKEND_URL:
    "https://agrisense-backend-kb22.onrender.com" +
    "/api/sensors/ingest",
  BACKEND_TIMEOUT_MS: 5000,
  MAX_DATA_ROWS: 5000
};

var SENSOR_CATEGORIES = [
  {
    name: "METADATA",
    bg: "#f1f5f9",
    text: "#334155",
    cols: 3
  },
  {
    name: "SOIL DYNAMICS & ROOT-ZONE (9)",
    bg: "#dcfce7",
    text: "#166534",
    cols: 9
  },
  {
    name: "NPK MACRONUTRIENTS (3)",
    bg: "#f3e8ff",
    text: "#6b21a8",
    cols: 3
  },
  {
    name: "MICRO-CLIMATE & METEOROLOGY (10)",
    bg: "#e0f2fe",
    text: "#0369a1",
    cols: 10
  },
  {
    name: "HYDRAULICS & WATER INFRASTRUCTURE (6)",
    bg: "#e0f7fa",
    text: "#006064",
    cols: 6
  },
  {
    name: "CANOPY BIOMETRICS & PLANT HEALTH (4)",
    bg: "#ecfdf5",
    text: "#065f46",
    cols: 4
  },
  {
    name: "ENVIRONMENT & PEST SURVEILLANCE (7)",
    bg: "#fef3c7",
    text: "#92400e",
    cols: 7
  },
  {
    name: "ACTUATORS & EDGE CONTROL (6)",
    bg: "#e0e7ff",
    text: "#3730a3",
    cols: 6
  }
];

var SYSTEMATIC_COLUMNS = [
  "Timestamp (IST)",
  "Ingestion Route",
  "Target Zone",
  "Soil Moisture 1 [%]",
  "Soil Moisture 2 [%]",
  "Soil Moisture 3 [%]",
  "Soil Moisture 4 [%]",
  "Root Average Moisture [%]",
  "Root Soil Temp [C]",
  "Soil pH",
  "Soil EC [dS/m]",
  "Sub-surface Soil O2 [%]",
  "Soil Nitrogen (N) [mg/kg]",
  "Soil Phosphorus (P) [mg/kg]",
  "Soil Potassium (K) [mg/kg]",
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
  "Water Reservoir [%]",
  "Water Temp [C]",
  "Salinity TDS [ppm]",
  "Water pH",
  "Drip Flow Rate [L/min]",
  "Delivered Water [L]",
  "Leaf Wetness [%]",
  "NDVI Canopy Vigour",
  "Sap Flux Rate [g/h]",
  "Stem Diameter [mm]",
  "Air Quality AQI",
  "Carbon Dioxide CO2 [ppm]",
  "Smoke Level [ppm]",
  "Bio-Acoustic Pest Level",
  "Pheromone Pest Count",
  "Frost Margin [C]",
  "Equipment Vibration",
  "Pump State",
  "Fan State",
  "Valve A",
  "Valve B",
  "Control Mode",
  "FastAPI Sync Relay"
];

var MIN_COLUMN_WIDTHS = [
  170, 185, 120,
  135, 135, 135, 135,
  160, 145, 100, 130, 165,
  175, 180, 175,
  145, 155, 175, 140, 170, 125, 150, 145, 135, 135,
  150, 135, 140, 100, 160, 145,
  140, 150, 145, 145,
  135, 180, 140, 175, 160, 140, 155,
  110, 110, 100, 100, 120, 175
];

function onOpen() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu("AgriSense Controls")
      .addItem(
        "Fix Spacing",
        "reformatExistingSheet"
      )
      .addItem(
        "Init 39 Sensors",
        "setupSystematicSheet"
      )
      .addToUi();
  } catch(e) {}
}

function reformatExistingSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet() ||
              ss.getSheetByName(CONFIG.SHEET_NAME) ||
              ss.getSheets()[0];

  try {
    sheet.getRange(
      1, 1, 2,
      Math.max(sheet.getMaxColumns(), SYSTEMATIC_COLUMNS.length)
    ).breakApart();
  } catch(e) {}

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

  var colCount = SYSTEMATIC_COLUMNS.length;
  var headerRange = sheet.getRange(2, 1, 1, colCount);
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

  var lastRow = sheet.getLastRow();
  if (lastRow > 2) {
    for (var r = 3; r <= lastRow; r++) {
      sheet.setRowHeight(r, 26);
      var rRange = sheet.getRange(r, 1, 1, colCount);
      rRange.setFontSize(10);
      rRange.setFontColor("#1e293b");
      rRange.setVerticalAlignment("middle");
      rRange.setHorizontalAlignment("center");
      rRange.setBackground(r % 2 === 0 ? "#ffffff" : "#f8fafc");
    }
  }

  sheet.getRange(1, 1, Math.max(lastRow, 2), colCount)
    .setBorder(
      true, true, true, true, true, true,
      "#e2e8f0",
      SpreadsheetApp.BorderStyle.SOLID
    );

  for (var i = 0; i < MIN_COLUMN_WIDTHS.length; i++) {
    sheet.setColumnWidth(i + 1, MIN_COLUMN_WIDTHS[i]);
  }

  setupControlsSheet(ss);
  return "Success: Sheet spacing and theme updated!";
}

function setupSystematicSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet() ||
              ss.getSheetByName(CONFIG.SHEET_NAME) ||
              ss.getSheets()[0];

  try {
    sheet.getRange(
      1, 1, 2,
      Math.max(sheet.getMaxColumns(), SYSTEMATIC_COLUMNS.length)
    ).breakApart();
  } catch(e) {}
  sheet.getRange(1, 1, 2, SYSTEMATIC_COLUMNS.length).clear();

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

  var colCount = SYSTEMATIC_COLUMNS.length;
  var headerRange = sheet.getRange(2, 1, 1, colCount);
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

  var headers = [
    ["Control Parameter", "Configured Value", "Instructions"]
  ];
  var data = [
    ["PUMP OVERRIDE", "AUTO", "AUTO, ON, or OFF for pump"],
    ["FAN OVERRIDE", "AUTO", "AUTO, ON, or OFF for fan"],
    ["AUTOMATION MODE", "AUTO", "Type AUTO or MANUAL"],
    ["EMERGENCY STOP", "NO", "Type YES to kill all relays"]
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
    .setBorder(
      true, true, true, true, true, true,
      "#cbd5e1",
      SpreadsheetApp.BorderStyle.SOLID
    );

  ctrlSheet.setColumnWidth(1, 180);
  ctrlSheet.setColumnWidth(2, 150);
  ctrlSheet.setColumnWidth(3, 380);
}

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
    var sheet = ss.getSheetByName(CONFIG.SHEET_NAME) ||
                ss.getSheets()[0];

    if (!sheet || sheet.getLastRow() < 2) {
      setupSystematicSheet();
      sheet = ss.getSheetByName(CONFIG.SHEET_NAME) ||
              ss.getSheets()[0];
    }

    var t = new Date();
    var timeStr = Utilities.formatDate(
      t, "Asia/Kolkata", "yyyy-MM-dd HH:mm:ss"
    );
    var route = "Google Sheets (Relayed)";
    var zone = params.zone || "Zone A";

    var pS1 = params.soilA || params.soil_moisture_1 || 35.0;
    var soilA = parseFloat(pS1);
    var pS2 = params.soilB || params.soil_moisture_2 || 32.0;
    var soilB = parseFloat(pS2);
    var soilC = parseFloat(params.soilC || (soilA * 0.92 + 2));
    var soilD = parseFloat(params.soilD || (soilB * 1.05 - 1));
    var pSAvg = params.soilAvg || params.soil_average ||
      ((soilA + soilB) / 2.0);
    var soilAvg = parseFloat(pSAvg);
    var soilTemp = parseFloat(params.soilTemp || 24.5);
    var pPH = params.soilPH || params.soil_ph || 6.5;
    var soilPH = parseFloat(pPH);
    var soilEC   = parseFloat(params.soilEC || 1.15);
    var soilO2   = parseFloat(params.soilO2 || 19.2);

    var nitrogen   = parseFloat(params.nitrogen || 175.0);
    var phosphorus = parseFloat(params.phosphorus || 22.0);
    var potassium  = parseFloat(params.potassium || 165.0);

    var pAT = params.airTemp || params.air_temp || 28.5;
    var airTemp = parseFloat(pAT);
    var pAH = params.airHumidity || params.air_humidity || 60;
    var airHumidity = parseFloat(pAH);
    var pressure    = parseFloat(params.pressure || 1012.0);
    var pL = params.light || params.light_pct || 65.0;
    var light = parseFloat(pL);
    var par         = parseFloat(params.par || 850.0);
    var uv          = parseFloat(params.uv || 5.5);
    var pR = params.rain || params.rain_pct || 0.0;
    var rain = parseFloat(pR);
    var wind        = parseFloat(params.wind || 8.5);
    var windDir     = parseFloat(params.windDir || 180.0);
    var dewPoint    = parseFloat(params.dewPoint || 19.5);

    var pWT = params.waterTank || params.tankPct || 75.0;
    var waterTank = parseFloat(pWT);
    var waterTemp = parseFloat(params.waterTemp || 23.0);
    var tds       = parseFloat(params.tds || 340.0);
    var waterPH   = parseFloat(params.waterPH || 7.0);
    var pWF = params.waterFlow || (params.pump ? 4.2 : 0.0);
    var waterFlow = parseFloat(pWF);
    var flow      = parseFloat(params.flow || 18.5);

    var leafWet = parseFloat(params.leafWet || 28.0);
    var ndvi    = parseFloat(params.ndvi || 0.76);
    var sapFlow = parseFloat(params.sapFlow || 45.0);
    var stemDia = parseFloat(params.stemDia || 12.6);

    var airQuality = parseFloat(params.airQuality || 28.0);
    var co2        = parseFloat(params.co2 || 430.0);
    var smoke      = parseFloat(params.smoke || 14.0);
    var pestMic    = parseFloat(params.pestMic || 12.0);
    var pestCount  = parseFloat(params.pestCount || 2.0);
    var frost      = parseFloat(params.frost || 8.5);
    var vibration  = parseFloat(params.vibration || 1.0);

    var isPumpOn = (params.pump === true ||
      params.pump === "true");
    var isFanOn = (params.fan === true ||
      params.fan === "true");
    var isValveAOn = (params.valveA === true ||
      params.valveA === "true");
    var isValveBOn = (params.valveB === true ||
      params.valveB === "true");
    var edgeMode = params.mode ||
      (params.auto_mode ? "auto" : "manual");

    var controlOverrides = readControlsSheet(ss);
    if (controlOverrides.pumpOverride !== null) {
      isPumpOn = controlOverrides.pumpOverride;
    }
    if (controlOverrides.fanOverride !== null) {
      isFanOn = controlOverrides.fanOverride;
    }
    if (controlOverrides.modeOverride !== null) {
      edgeMode = controlOverrides.modeOverride;
    }

    var backendSyncResult = forwardToFastApi({
      source: "google_sheets",
      route: "google_sheets_primary",
      timestamp: timeStr,
      zone: zone,
      soilA: soilA, soilB: soilB, soilC: soilC, soilD: soilD,
      soilAvg: soilAvg, soilTemp: soilTemp, soilPH: soilPH,
      soilEC: soilEC, soilO2: soilO2,
      nitrogen: nitrogen,
      phosphorus: phosphorus,
      potassium: potassium,
      airTemp: airTemp,
      airHumidity: airHumidity,
      pressure: pressure,
      light: light, par: par, uv: uv, rain: rain, wind: wind,
      windDir: windDir, dewPoint: dewPoint,
      waterTank: waterTank, waterTemp: waterTemp, tds: tds,
      waterPH: waterPH, waterFlow: waterFlow, flow: flow,
      leafWet: leafWet,
      ndvi: ndvi,
      sapFlow: sapFlow,
      stemDia: stemDia,
      airQuality: airQuality,
      co2: co2,
      smoke: smoke,
      pestMic: pestMic,
      pestCount: pestCount, frost: frost, vibration: vibration,
      pump: isPumpOn, fan: isFanOn, valveA: isValveAOn,
      valveB: isValveBOn, mode: edgeMode
    });

    if (backendSyncResult &&
        backendSyncResult.pump_command !== undefined) {
      isPumpOn = backendSyncResult.pump_command;
    }
    if (backendSyncResult &&
        backendSyncResult.fan_command !== undefined) {
      isFanOn = backendSyncResult.fan_command;
    }
    if (backendSyncResult &&
        backendSyncResult.auto_mode !== undefined) {
      edgeMode = backendSyncResult.auto_mode ? "auto" : "manual";
    }

    var relayStatus = (backendSyncResult &&
      backendSyncResult.status === "success")
      ? "Relayed (HTTP 200)"
      : "Buffered in Sheet";

    var row = [
      timeStr, route, zone,
      soilA, soilB, soilC, soilD,
      soilAvg, soilTemp, soilPH, soilEC, soilO2,
      nitrogen, phosphorus, potassium,
      airTemp, airHumidity, pressure, light, par, uv, rain, wind,
      windDir, dewPoint,
      waterTank, waterTemp, tds, waterPH, waterFlow, flow,
      leafWet, ndvi, sapFlow, stemDia,
      airQuality, co2, smoke,
      pestMic, pestCount, frost, vibration,
      isPumpOn ? "ON" : "OFF",
      isFanOn ? "ON" : "OFF",
      isValveAOn ? "OPEN" : "CLOSED",
      isValveBOn ? "OPEN" : "CLOSED",
      edgeMode.toUpperCase(),
      relayStatus
    ];

    sheet.appendRow(row);

    var lastRow = sheet.getLastRow();
    sheet.setRowHeight(lastRow, 26);
    var rowRange = sheet.getRange(lastRow, 1, 1, row.length);
    rowRange.setFontSize(10)
      .setFontColor("#1e293b")
      .setVerticalAlignment("middle")
      .setHorizontalAlignment("center");

    var rowBg = (lastRow % 2 === 0) ? "#ffffff" : "#f8fafc";
    rowRange.setBackground(rowBg);

    sheet.getRange(lastRow, 43, 1, 1)
      .setBackground(isPumpOn ? "#dcfce7" : "#f1f5f9")
      .setFontColor(isPumpOn ? "#15803d" : "#64748b")
      .setFontWeight("bold");

    sheet.getRange(lastRow, 44, 1, 1)
      .setBackground(isFanOn ? "#e0f2fe" : "#f1f5f9")
      .setFontColor(isFanOn ? "#0284c7" : "#64748b")
      .setFontWeight("bold");

    rowRange.setBorder(
      true, true, true, true, true, true,
      "#e2e8f0",
      SpreadsheetApp.BorderStyle.SOLID
    );

    if (lastRow > CONFIG.MAX_DATA_ROWS) {
      sheet.deleteRows(3, 50);
    }

    var responseObj = {
      status: "success",
      timestamp: timeStr,
      source: "google_sheets_primary",
      logged_row: lastRow,
      backend_relayed: (backendSyncResult &&
        backendSyncResult.status === "success"),
      pump: isPumpOn,
      fan: isFanOn,
      valveA: isValveAOn,
      valveB: isValveBOn,
      auto_mode: (edgeMode === "auto"),
      emergency_stop: controlOverrides.emergencyStop
    };

    return ContentService.createTextOutput(
      JSON.stringify(responseObj)
    )
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function forwardToFastApi(payload) {
  try {
    var options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    var response = UrlFetchApp.fetch(
      CONFIG.FASTAPI_BACKEND_URL, options
    );
    var code = response.getResponseCode();
    if (code === 200 || code === 201) {
      return JSON.parse(response.getContentText());
    }
  } catch(e) {}
  return null;
}

function readControlsSheet(ss) {
  var res = {
    pumpOverride: null,
    fanOverride: null,
    modeOverride: null,
    emergencyStop: false
  };
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
