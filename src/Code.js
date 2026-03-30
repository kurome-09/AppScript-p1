const scriptProps = PropertiesService.getScriptProperties();
const SHEET_ID = scriptProps.getProperty('SHEET_ID'); 
const GEMINI_API_KEY = scriptProps.getProperty('GEMINI_API_KEY'); 
const FORM_URL = scriptProps.getProperty('FORM_URL'); 

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Metro Explorer')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return createJsonResponse({ success: false, message: "Invalid payload" });
    const data = JSON.parse(e.postData.contents);
    
    if (data.action === "getMetroData") return createJsonResponse(getMetroData());
    if (data.action === "recordVisit") return createJsonResponse(recordVisit(data));
    if (data.action === "getHistory") return createJsonResponse(getHistory(data));
    if (data.action === "suggestGem") return createJsonResponse(suggestGem(data));

    return createJsonResponse({ success: false, message: "Unknown action" });
  } catch (error) {
    return createJsonResponse({ success: false, message: "Backend crash: " + error.toString() });
  }
}

function createJsonResponse(responseObject) {
  return ContentService.createTextOutput(JSON.stringify(responseObject)).setMimeType(ContentService.MimeType.JSON);
}

// --- BUSINESS LOGIC ---

function getMetroData() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let stationSheet = ss.getSheetByName("Stations");
    if (!stationSheet) {
      stationSheet = ss.insertSheet("Stations");
      stationSheet.appendRow(["Station Name", "Latitude", "Longitude"]);
    }

    let fareSheet = ss.getSheetByName("Fares");
    if (!fareSheet) {
      fareSheet = ss.insertSheet("Fares");
      fareSheet.appendRow(["Source", "Destination", "Normal Fare", "Concession Fare", "Stations"]);
    }

    let stations =[];
    const stLastRow = stationSheet.getLastRow();
    if (stLastRow > 1) {
      stations = stationSheet.getRange(2, 1, stLastRow - 1, 3).getValues()
        .map(row => ({ name: String(row[0]).trim(), lat: parseFloat(row[1]), lon: parseFloat(row[2]) }))
        .filter(st => st.name && !isNaN(st.lat) && !isNaN(st.lon));
    }

    let fares =[];
    if (fareSheet.getLastRow() > 1) fares = fareSheet.getRange(2, 1, fareSheet.getLastRow() - 1, 5).getValues();

    return { success: true, stations: stations, fares: fares };
  } catch (err) { return { success: false, message: err.message }; }
}

function getHiddenGemsFromGemini(stationName, lat, lon) {
  if (!GEMINI_API_KEY) return { success: false, message: "Server missing Gemini API Key." };
  
  const prompt = `Act as a local expert in Noida/Greater Noida. I am at the ${stationName} NMRC metro station (Lat: ${lat}, Lon: ${lon}). 
  Give me exactly 4 truly hidden gems (secret cafes, unmapped alleys, quiet parks, local street food) within a 3km radius. 
  Return ONLY a raw JSON array of objects. No markdown, no backticks, no explanations.
  Format:[{"name": "String", "lat": Number, "lon": Number, "description": "Short 1 sentence description"}]`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const payload = { contents:[{ parts: [{ text: prompt }] }] };

  try {
    const response = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const json = JSON.parse(response.getContentText());
    if (json.error) throw new Error(json.error.message);

    let aiText = json.candidates[0].content.parts[0].text;
    aiText = aiText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const places = JSON.parse(aiText);
    return { success: true, places: places };
  } catch (err) {
    return { success: false, message: "AI failed to find gems: " + err.message };
  }
}

function recordVisit(data) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let historySheet = ss.getSheetByName("History");
    if (!historySheet) {
      historySheet = ss.insertSheet("History");
      historySheet.appendRow(["Timestamp", "Email", "Place", "Station"]);
    }
    historySheet.appendRow([new Date(), data.email, data.place, data.station]);

    const subject = "Rate your visit to " + data.place + "!";
    const htmlBody = `
      <div style="font-family: 'Space Grotesk', sans-serif; padding: 30px; border: 4px solid #000; max-width: 500px; background-color: #ffffff; color: #000;">
        <h2 style="text-transform: uppercase; margin-top: 0;">Hi Explorer!</h2>
        <p style="font-size: 16px; font-weight: 600;">We saw you just visited <strong>${data.place}</strong> near the ${data.station} metro station.</p>
        <p style="font-size: 16px;">Help the community by leaving a quick review and rating your experience!</p>
        
        <div style="text-align: center; margin-top: 30px; margin-bottom: 20px;">
          <a href="${FORM_URL}" style="background-color: #fce83a; color: #000000; padding: 15px 25px; text-decoration: none; font-weight: bold; font-size: 18px; border: 3px solid #000; box-shadow: 4px 4px 0px #000; display: inline-block; text-transform: uppercase;">Leave a Review</a>
        </div>
      </div>
    `;
    
    try { GmailApp.sendEmail(data.email, subject, "", { htmlBody: htmlBody, name: "Metro Explorer" }); } catch(e) { console.error(e); }

    return { success: true, message: "Saved and processed" };
  } catch(err) { return { success: false, message: err.message }; }
}

function getHistory(email) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const historySheet = ss.getSheetByName("History");
    if (!historySheet) return { success: true, history:[] };

    const rows = historySheet.getDataRange().getValues();
    const userEmail = String(email).toLowerCase().trim(); 
    
    const userHistory = rows.slice(1)
      .filter(row => String(row[1]).toLowerCase().trim() === userEmail)
      .map(row => ({ date: new Date(row[0]).toLocaleDateString(), place: row[2], station: row[3] }));

    return { success: true, history: userHistory.reverse() };
  } catch(err) { return { success: false, message: err.message }; }
}

function suggestGem(data) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let suggestSheet = ss.getSheetByName("Suggestions");
    if (!suggestSheet) {
      suggestSheet = ss.insertSheet("Suggestions");
      suggestSheet.appendRow(["Timestamp", "Email", "Suggested Place", "Nearest Station", "Description"]);
    }
    suggestSheet.appendRow([new Date(), data.email, data.place, data.station, data.description]);
    return { success: true, message: "Suggestion submitted to community!" };
  } catch(err) { return { success: false, message: err.message }; }
}