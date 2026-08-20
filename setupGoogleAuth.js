const express = require('express');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents'
];

const CREDENTIALS_PATH = path.join(__dirname, 'client_secret.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

if (!fs.existsSync(CREDENTIALS_PATH)) {
  console.error('❌ client_secret.json is missing!');
  process.exit(1);
}

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
const { client_id, client_secret } = credentials.installed || credentials.web;

const port = 3000;
const redirectUri = `http://localhost:${port}/oauth2callback`;

const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirectUri
);

const app = express();

app.get('/', (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
  res.redirect(authUrl);
});

app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.send('Authorization failed: No code returned.');
  }

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    console.log('\n✅ Successfully authenticated Google Account! Saved token.json\n');
    res.send('<h2>✅ Success! Google Account connected. You can close this browser tab now.</h2>');
    setTimeout(() => process.exit(0), 1000);
  } catch (err) {
    console.error('Error retrieving access token:', err);
    res.send(`Error during authentication: ${err.message}`);
  }
});

app.listen(port, () => {
  console.log(`\n--- GOOGLE ACCOUNT AUTHENTICATION SERVER RUNNING ---`);
  console.log(`Open your browser and visit: http://localhost:${port}\n`);
});
