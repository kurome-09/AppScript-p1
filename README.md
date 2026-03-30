# Metro Explorer: Hidden Gem Tracker

A serverless web application built on Google Apps Script that helps commuters discover AI-curated hidden gems near metro stations.

## Architecture
* **Frontend:** HTML, CSS, Vanilla JS, Leaflet.js (Served via GAS `HtmlService`)
* **Backend:** Google Apps Script (`Code.js`)
* **Database:** Google Sheets API
* **AI Engine:** Google Gemini 2.5 Flash API

---

## Setup Guide

### Step 1: Database Setup (Google Sheets)
1. Create a new Google Sheet.
2. Copy the **Sheet ID** from the URL. 
   *(Example: `https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit`)*
3. You do not need to create tabs manually; the script will auto-generate `Stations`, `Fares`, `History`, and `Suggestions` on first run.
4. **Important:** You must manually populate the `Stations` tab with CSV data (Station Name, Latitude, Longitude) for the map to work.

### Step 2: Form Setup (Google Forms)
1. Create a Google Form for user reviews.
2. Go to **Settings > Responses** and **TURN OFF** "Restrict to users in [Your Organization]".
3. Click **Send > Link**, copy the URL.

### Step 3: Apps Script Initialization
1. In your Google Sheet, click **Extensions > Apps Script**.
2. Delete the default `Code.gs` file.
3. Create two new files: `Code.gs` and `Index.html`.
4. Copy the contents from `src/Code.js` into `Code.gs`.
5. Copy the contents from `src/Index.html` into `Index.html`.
6. Go to **Project Settings** (Gear Icon) and check the box for **"Show 'appsscript.json' manifest file in editor"**.
7. Copy the contents of `appsscript.json` from this repo into the editor.

### Step 4: Environment Variables (CRITICAL)
Do not hardcode keys. Go to **Project Settings > Script Properties** and add:
* `SHEET_ID`: (From Step 1)
* `GEMINI_API_KEY`: (Get this from Google AI Studio)
* `FORM_URL`: (From Step 2)

### Step 5: The Authorization Run
Before deploying, Google needs you to accept permissions.
1. Open `Code.gs`.
2. Select the `getMetroData` function from the top dropdown.
3. Click **Run**.
4. A popup will appear. Click **Review Permissions > Advanced > Go to Metro Explorer (unsafe) > Allow**.

### Step 6: Deployment
1. Click the blue **Deploy** button (Top Right).
2. Select **New deployment**.
3. Click the Gear Icon and select **Web app**.
4. **Execute as:** `Me` *(Crucial: This bypasses user permission errors)*.
5. **Who has access:** `Anyone`.
6. Click **Deploy**.

Copy the resulting Web App URL. Your app is live.

---

## Security Notes
* **Authentication:** Currently, the app uses a trust-based email input system. To upgrade to strict Auth, change the deployment setting to "Execute as: User accessing the web app" and use `Session.getActiveUser().getEmail()` in the backend.

## Project Strcuture
```
metro-explorer/
│
├── .gitignore               # Keeps your secrets out of GitHub
├── .env.example             # Tells future-you what keys are needed
├── appsscript.json          # The GAS Manifest file (Crucial for permissions)
├── README.md                # The Amnesia-Proof Setup Guide
│
└── src/                     # Your actual source code
    ├── Code.js              # (GAS uses .js locally, it becomes .gs online)
    └── Index.html           # Your frontend
```