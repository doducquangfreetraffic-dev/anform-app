import { google, type Auth } from 'googleapis';

let _client: Auth.OAuth2Client | null = null;

export function getOAuth2Client(): Auth.OAuth2Client {
  if (_client) return _client;
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob',
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });
  _client = oauth2Client;
  return oauth2Client;
}

export function getSheets() {
  return google.sheets({ version: 'v4', auth: getOAuth2Client() });
}

export function getDrive() {
  return google.drive({ version: 'v3', auth: getOAuth2Client() });
}

export function getScript() {
  return google.script({ version: 'v1', auth: getOAuth2Client() });
}
