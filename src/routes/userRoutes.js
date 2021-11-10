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
  getMyBookmark,
  getMyContent,
  getMyComment,
  getMyScrab,
  getMyBoardSongs,
  getLikePlaylists,
  addSongInPlaylist,
  deleteSongInPlaylist,
  createStory,
  deleteStory,
  getMyStory,
  getOtherStory,
  readStory,
  getStoryCalendar
} = require('../controllers/user')

router.get('/', getMyInformation)
router.get('/other/:id', getOtherInformation)
router.post('/editProfile', editProfile)
router.post('/editProfileImage', upload.single('img'), editProfileImage)
router.post('/follow/:id', follow)
router.delete('/follow/:id', unFollow)
router.get('/bookmark', getMyBookmark)
router.get('/content', getMyContent)
router.get('/comment', getMyComment)
router.get('/scrab', getMyScrab)
router.get('/boardSongs', getMyBoardSongs)
router.get('/likePlaylists', getLikePlaylists)
router.post('/songinPlaylists', addSongInPlaylist)
router.get('/songinPlaylists/:time', deleteSongInPlaylist)
router.post('/story', createStory)
router.delete('/story', deleteStory)
router.get('/myStory', getMyStory)
router.get('/otherStory', getOtherStory)
router.get('/storyView/:id', readStory)
router.get('/storyCalendar/:id', getStoryCalendar)

module.exports = router;