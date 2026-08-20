const fs = require('fs');
const path = require('path');

const APPS_FILE = path.join(__dirname, '../../applications.json');

function getApplications() {
  try {
    if (fs.existsSync(APPS_FILE)) {
      const data = JSON.parse(fs.readFileSync(APPS_FILE, 'utf-8'));
      if (Array.isArray(data)) return data;
    }
  } catch (e) {}
  return [];
}

function saveApplications(apps) {
  try {
    fs.writeFileSync(APPS_FILE, JSON.stringify(apps, null, 2), 'utf-8');
  } catch (e) {}
}

function addApplication(appData) {
  const apps = getApplications();
  const entry = {
    id: appData.id || Date.now(),
    type: appData.type || "Bar Transfer",
    robloxUser: appData.robloxUser || appData.petitioner,
    discordUser: appData.discordUser || appData.applicant?.tag || appData.applicant?.username || 'Unknown',
    stateFrom: appData.stateFrom || appData.respondent || 'State of Firestone',
    evidence: appData.evidence || appData.filingLink || '',
    status: appData.status || "Pending Review",
    date: new Date().toLocaleDateString()
  };
  apps.push(entry);
  saveApplications(apps);
  return entry;
}

module.exports = {
  getApplications,
  saveApplications,
  addApplication
};
