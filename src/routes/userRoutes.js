const express = require('express');
const multer  = require('multer');
const multerS3 = require('multer-s3');
const aws = require('aws-sdk');
const router = express.Router();

const s3 = new aws.S3({
  accessKeyId: process.env.AWS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: 'ap-northeast-2'
});

const upload = multer({
  storage: multerS3({
      s3,
      acl: 'public-read',
      bucket: 'umpa',
      metadata: function(req, file, cb) {
          cb(null, { fieldName: file.fieldname });
      },
      key: function(req, file, cb) {
          cb(null, Date.now().toString());
      }
  })
});

const {
  getMyInformation,
  getOtherInformation,
  editProfile,
  editProfileImage,
  follow,
  unFollow,
  getLikePlaylists,
  addSongInPlaylist,
  deleteSongInPlaylist,
} = require('../controllers/user')

router.get('/', getMyInformation)
router.get('/other/:id', getOtherInformation)
router.post('/editProfile', editProfile)
router.post('/editProfileImage', upload.single('img'), editProfileImage)
router.post('/follow/:id', follow)
router.delete('/follow/:id', unFollow)
router.get('/likePlaylists', getLikePlaylists)
router.post('/songinPlaylists', addSongInPlaylist)
router.get('/songinPlaylists/:time', deleteSongInPlaylist)

module.exports = router;