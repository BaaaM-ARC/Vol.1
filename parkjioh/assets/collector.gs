/**
 * collector.gs — optional visit collector for the Ji-oh Park profile site.
 *
 * Without this, visit logs live only in each visitor's own browser, so the
 * admin page can only ever show that one device. Deploying this script gives
 * you real cumulative stats across every visitor.
 *
 * Setup (about two minutes):
 *   1. Create a Google Sheet. Note its ID from the URL:
 *        docs.google.com/spreadsheets/d/<THIS_PART>/edit
 *   2. Extensions -> Apps Script, replace the contents with this file.
 *   3. Set SHEET_ID and SHARED_TOKEN below. Pick a long random token.
 *   4. Deploy -> New deployment -> Web app
 *        Execute as: Me
 *        Who has access: Anyone
 *      Copy the /exec URL.
 *   5. In assets/js/config.js set endpoint to that URL and token to the same
 *      SHARED_TOKEN.
 *
 * The token keeps casual readers out of the log; it is visible in the page
 * source, so treat these stats as non-sensitive.
 */

var SHEET_ID     = 'PUT_YOUR_SHEET_ID_HERE';
var SHARED_TOKEN = 'PUT_A_LONG_RANDOM_TOKEN_HERE';
var SHEET_NAME   = 'visits';
var MAX_RETURN   = 20000;

var COLUMNS = ['t', 'p', 'src', 'ref', 'd', 'b', 'os', 'lang', 'sw', 'vid', 'nv', 'tz'];

function sheet_() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(COLUMNS);
  }
  return sh;
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (String(body.token) !== SHARED_TOKEN) return json_({ ok: false, error: 'bad token' });
    var v = body.visit || {};
    var row = COLUMNS.map(function (c) { return v[c] === undefined ? '' : v[c]; });
    sheet_().appendRow(row);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (String(p.token) !== SHARED_TOKEN) return json_({ ok: false, error: 'bad token' });
  if (p.action !== 'list') return json_({ ok: true, hint: 'use ?action=list&token=...' });

  var sh = sheet_();
  var last = sh.getLastRow();
  if (last < 2) return json_({ visits: [] });
  var first = Math.max(2, last - MAX_RETURN + 1);
  var values = sh.getRange(first, 1, last - first + 1, COLUMNS.length).getValues();
  var visits = values.map(function (r) {
    var o = {};
    COLUMNS.forEach(function (c, i) { o[c] = r[i]; });
    o.t = Number(o.t);
    return o;
  }).filter(function (o) { return !!o.t; });
  return json_({ visits: visits });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
