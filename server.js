const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from root directory
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/database.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'database.html'));
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` Mayflower State Bar Workstation Local Host Online!`);
  console.log(` Main Desktop:     http://localhost:${PORT}`);
  console.log(` Hidden Database: http://localhost:${PORT}/database.html`);
  console.log(`=======================================================`);
});
