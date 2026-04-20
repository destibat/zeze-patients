const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const config = require('../config/env');

const TYPES_AUTORISES = {
  photo: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  examen: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'],
};

const stockage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(config.upload.path));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const nom = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, nom);
  },
});

const filtrePhoto = (req, file, cb) => {
  if (TYPES_AUTORISES.photo.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Seules les images JPG, PNG et WebP sont acceptées pour les photos'), false);
  }
};

const filtreExamen = (req, file, cb) => {
  if (TYPES_AUTORISES.examen.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formats acceptés : PDF, JPG, PNG, GIF'), false);
  }
};

const uploadPhoto = multer({
  storage: stockage,
  fileFilter: filtrePhoto,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo
}).single('photo');

const uploadExamen = multer({
  storage: stockage,
  fileFilter: filtreExamen,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 Mo
}).single('fichier');

// Wrapper pour gérer les erreurs Multer proprement
const gererUpload = (uploadFn) => (req, res, next) => {
  uploadFn(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ succes: false, message: 'Fichier trop volumineux' });
      }
      return res.status(400).json({ succes: false, message: err.message });
    }
    if (err) {
      return res.status(400).json({ succes: false, message: err.message });
    }
    next();
  });
};

module.exports = {
  uploadPhoto: gererUpload(uploadPhoto),
  uploadExamen: gererUpload(uploadExamen),
};
