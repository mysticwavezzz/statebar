const fs = require('fs');
const path = require('path');

const ROSTER_FILE = path.join(__dirname, '../../roster.json');

function getRoster() {
  try {
    if (fs.existsSync(ROSTER_FILE)) {
      return JSON.parse(fs.readFileSync(ROSTER_FILE, 'utf-8'));
    }
  } catch (e) {}
  return [
    { name: "Tyler_R", sbn: "8492018492", status: "Active", date: "08/19/2026" }
  ];
}

function saveRoster(roster) {
  try {
    fs.writeFileSync(ROSTER_FILE, JSON.stringify(roster, null, 2), 'utf-8');
  } catch (e) {}
}

function addBarLicense(name, sbn, status = "Active") {
  const roster = getRoster();
  const today = new Date();
  const dateStr = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
  
  const entry = {
    id: Date.now(),
    name: name,
    sbn: sbn || String(Math.floor(1000000000 + Math.random() * 9000000000)),
    status: status,
    date: dateStr
  };
  roster.push(entry);
  saveRoster(roster);
  return entry;
}

module.exports = { getRoster, saveRoster, addBarLicense };
