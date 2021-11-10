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

router.get('/getMyInfo', getMyInformation)
router.get('/otheruser/:id', getOtherInformation)
router.post('/editProfile', editProfile)
router.post('/editProfileImage', upload.single('img'), editProfileImage)
router.post('/follow/:id', follow)
router.delete('/follow/:id', unFollow)
router.get('/getMyBookmark', getMyBookmark)
router.get('/getMyContent', getMyContent)
router.get('/getMyComment', getMyComment)
router.get('/getMyScrab', getMyScrab)
router.get('/getMyBoardSongs', getMyBoardSongs)
router.get('/getLikePlaylists', getLikePlaylists)
router.post('/addSonginPlaylists', addSongInPlaylist)
router.get('/deleteSonginPlaylists/:time', deleteSongInPlaylist)
router.post('/Story', createStory)
router.delete('/Story', deleteStory)
router.get('/MyStory', getMyStory)
router.get('/OtherStory', getOtherStory)
router.get('/StoryView/:id', readStory)
router.get('/StoryCalendar/:id', getStoryCalendar)

module.exports = router;