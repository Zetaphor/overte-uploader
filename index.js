const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const app = express();
app.use(express.static('static'));
const PORT = process.env.PORT || 3000;

// Multer setup
const storage = multer.diskStorage({
  destination: path.join(__dirname, 'uploads'),
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  fs.readdir('/app/uploads/', (err, files) => {
    if (err) throw err;
    res.sendFile(path.join(__dirname, 'index.html'));
  });
});

function spaceStringToBytes(str) {
  const units = {
      B: 1,
      KB: Math.pow(2, 10),
      MB: Math.pow(2, 20),
      GB: Math.pow(2, 30),
      TB: Math.pow(2, 40)
  };

  const regex = /(\d+\.?\d*)([A-Z]+)/i;
  const match = regex.exec(str);

  if (!match || !units[match[2].toUpperCase()]) {
      throw new Error("Invalid space string");
  }

  return parseFloat(match[1]) * units[match[2].toUpperCase()];
}

const MAX_FILE_SIZE = process.env.MAX_FILE_SIZE || "256MB";
const maxFileSize = spaceStringToBytes(MAX_FILE_SIZE);

const TOTAL_SPACE = process.env.TOTAL_SPACE || "512MB";
const totalSpace = spaceStringToBytes(TOTAL_SPACE);

app.get('/files', (req, res) => {
  fs.readdir(path.join(__dirname, 'uploads'), (err, filenames) => {
    if (err) throw err;

    let usedSpace = 0;
    const filteredFilenames = filenames.filter(filename => filename !== '.gitkeep');
    const filesWithDetails = filteredFilenames.map(filename => {
      const filePath = path.join(path.join(__dirname, 'uploads'), filename);
      const stats = fs.statSync(filePath);
      usedSpace += stats.size;
      return {
        name: filename,
        size: stats.size,
        created: stats.birthtime,
        updated: stats.mtime
      };
    });

    res.json({
      files: filesWithDetails,
      totalSpace: totalSpace,
      usedSpace: usedSpace,
      maxFileSize: maxFileSize
    });
  });
});

app.post('/upload', upload.single('file'), (req, res) => {
  console.log(path.join(__dirname, 'uploads'))
  if (req.file.size > maxFileSize) {
    fs.unlinkSync(req.file.path);  // delete the uploaded file
    return res.status(413).send('File exceeds the maximum allowed size.');
  }

  res.redirect('/');
});


app.post('/delete', (req, res) => {
  const { fileName } = req.body;
  fs.unlink(path.join(__dirname, 'uploads', fileName), (err) => {
    if (err) throw err;
    res.redirect('/');
  });
});

app.post('/rename', (req, res) => {
  const { oldName, newName } = req.body;
  fs.rename(
    path.join(__dirname, 'uploads', oldName),
    path.join(__dirname, 'uploads', newName),
    (err) => {
      if (err) throw err;
      res.redirect('/');
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
