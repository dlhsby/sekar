/**
 * SEKAR sheet sync — Apps Script Web App bridge.
 *
 * Why: an org policy (iam.disableServiceAccountKeyCreation) blocks service-account
 * keys, so the backend can't call the Sheets API directly. This Apps Script runs
 * AS YOU (no key needed) and exposes a tiny token-protected endpoint the backend
 * `npm run sheet:pull` / `sheet:push` calls.
 *
 * SETUP (one time):
 *   1. Open the spreadsheet → Extensions → Apps Script.
 *   2. Paste this whole file (replace any default Code.gs content).
 *   3. Set a shared secret: change SHARED_TOKEN below to a long random string.
 *   4. Deploy → New deployment → type "Web app":
 *        - Execute as: Me
 *        - Who has access: Anyone   (the token is what protects it)
 *      Copy the Web app URL.
 *   5. In apps/be/.env.local set:
 *        SEKAR_SHEET_WEBAPP_URL=<the /exec URL>
 *        SEKAR_SHEET_WEBAPP_TOKEN=<the same SHARED_TOKEN>
 *
 * Re-deploy (Manage deployments → edit → new version) after editing this script.
 */

// CHANGE THIS to a long random string, and mirror it in SEKAR_SHEET_WEBAPP_TOKEN.
var SHARED_TOKEN = 'CHANGE_ME_to_a_long_random_string';

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

/** GET → returns every tab's values: { tabs: [{ title, rows }] }. */
function doGet(e) {
  if (!e || !e.parameter || e.parameter.token !== SHARED_TOKEN) {
    return json_({ error: 'unauthorized' });
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tabs = ss.getSheets().map(function (sh) {
    return { title: sh.getName(), rows: sh.getDataRange().getDisplayValues() };
  });
  return json_({ tabs: tabs });
}

/**
 * POST { token, updates:[{ range:"'Tab'!A1[:B2]", values:[[...]] }] }
 * → applies each update, returns { ok, applied }.
 */
function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ error: 'bad json' });
  }
  if (!body || body.token !== SHARED_TOKEN) return json_({ error: 'unauthorized' });
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var applied = 0;
  (body.updates || []).forEach(function (u) {
    var m = String(u.range).match(/^'?(.*?)'?!(.+)$/); // "'Tab Name'!A1:B2"
    if (!m) return;
    var sh = ss.getSheetByName(m[1]);
    if (!sh) return;
    sh.getRange(m[2]).setValues(u.values);
    applied++;
  });
  return json_({ ok: true, applied: applied });
}
