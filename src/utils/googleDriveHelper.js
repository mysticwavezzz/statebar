const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents'
];

const TOKEN_PATH = path.join(__dirname, '../../token.json');
const CREDENTIALS_PATH = path.join(__dirname, '../../client_secret.json');

/**
 * Get authenticated Google OAuth2 client using User Account refresh token
 */
async function getAuthClient() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(`client_secret.json missing at ${CREDENTIALS_PATH}`);
  }

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris ? redirect_uris[0] : 'urn:ietf:wg:oauth:2.0:oob'
  );

  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  }

  throw new Error('token.json missing. Run one-time authentication script.');
}

/**
 * Creates an initial Draft Copy of the Google Doc template when /contract is run.
 */
async function createDraftGoogleDoc({ clientName, scope }) {
  const auth = await getAuthClient();
  const drive = google.drive({ version: 'v3', auth });
  const docs = google.docs({ version: 'v1', auth });

  const templateId = process.env.GOOGLE_TEMPLATE_DOC_ID || '1CQyazd-CgKZMSSMk-LwAJCiDxqRgidsxC6u8qJ5Tgxs';
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '1VBGswRVGzcIISXzf8D8cp7IzJBrp8AtM';

  // 1. Copy Template Doc
  const docName = `Retainer Agreement - ${clientName} (Draft)`;
  const copyResponse = await drive.files.copy({
    fileId: templateId,
    requestBody: {
      name: docName,
      parents: [folderId]
    }
  });

  const docId = copyResponse.data.id;

  // 2. Make document readable by anyone with link
  await drive.permissions.create({
    fileId: docId,
    requestBody: {
      role: 'reader',
      type: 'anyone'
    }
  });

  // 3. Fill basic info in Draft
  const replacements = [
    { search: '{{CLIENT_NAME}}', replace: clientName },
    { search: '{{SCOPE_OF_REPRESENTATION}}', replace: scope || 'Civil Representation' },
    { search: '{{CLIENT_NAME_UPPER}}', replace: clientName.toUpperCase() }
  ];

  const requests = replacements.map(r => ({
    replaceAllText: {
      containsText: { text: r.search, matchCase: true },
      replaceText: r.replace
    }
  }));

  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: { requests }
  });

  const docUrl = `https://docs.google.com/document/d/${docId}/edit`;
  return { docId, docUrl };
}

/**
 * Updates the existing Draft Google Doc with final signature details, exports PDF, and uploads PDF to Drive.
 */
async function finalizeAndSignGoogleDoc({ docId, clientName, robloxUsername, discordUsername, scope }) {
  const auth = await getAuthClient();
  const drive = google.drive({ version: 'v3', auth });
  const docs = google.docs({ version: 'v1', auth });

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '1VBGswRVGzcIISXzf8D8cp7IzJBrp8AtM';

  // 1. Rename Doc from Draft to Final
  const finalDocName = `Retainer Agreement - ${clientName} (${robloxUsername})`;
  await drive.files.update({
    fileId: docId,
    requestBody: { name: finalDocName }
  });

  // 2. Fill in Signature and Contact Placeholders
  const replacements = [
    { search: '{{CLIENT_ROBLOX_USER}}', replace: robloxUsername },
    { search: '{{CLIENT_DISCORD_USER}}', replace: discordUsername },
    { search: '{{CLIENT_SIGNATURE}}', replace: clientName }
  ];

  const requests = replacements.map(r => ({
    replaceAllText: {
      containsText: { text: r.search, matchCase: true },
      replaceText: r.replace
    }
  }));

  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: { requests }
  });

  const docUrl = `https://docs.google.com/document/d/${docId}/edit`;

  // 3. Export PDF
  const pdfFileName = `Retainer_Agreement_${robloxUsername.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  const pdfPath = path.join(__dirname, `../../${pdfFileName}`);
  const res = await drive.files.export(
    { fileId: docId, mimeType: 'application/pdf' },
    { responseType: 'arraybuffer' }
  );

  const pdfBuffer = Buffer.from(res.data);
  fs.writeFileSync(pdfPath, pdfBuffer);

  // 4. Upload PDF file back to Google Drive folder
  let pdfDriveUrl = null;
  try {
    const stream = require('stream');
    const bufferStream = new stream.PassThrough();
    bufferStream.end(pdfBuffer);

    const pdfFile = await drive.files.create({
      requestBody: {
        name: pdfFileName,
        parents: [folderId],
        mimeType: 'application/pdf'
      },
      media: {
        mimeType: 'application/pdf',
        body: bufferStream
      },
      fields: 'id, webViewLink'
    });

    const pdfFileId = pdfFile.data.id;
    pdfDriveUrl = pdfFile.data.webViewLink;

    await drive.permissions.create({
      fileId: pdfFileId,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });
  } catch (uerr) {
    console.error('[PDF Drive Upload Error]:', uerr.message);
  }

  return { docUrl, docId, pdfPath, pdfDriveUrl };
}

module.exports = { getAuthClient, createDraftGoogleDoc, finalizeAndSignGoogleDoc };
