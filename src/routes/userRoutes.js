const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload')
const {
  getMyInformation,
  getOtherInformation,
  editProfile,
  editProfileImage,
  follow,
  unFollow,
  getRepresentSongs,
  postRepresentSongs,
  editRepresentSongs,

  getLikePlaylists,
  addSongInPlaylist,
  deleteSongInPlaylist,
} = require('../controllers/user')

router.get('/', getMyInformation)
router.get('/other/:id', getOtherInformation)
router.post('/editProfile', editProfile)
router.post('/editProfileImage', upload('profileImage/').single('img'), editProfileImage)
router.post('/follow/:id', follow)
router.delete('/follow/:id', unFollow)
router.get('/songs/:userId', getRepresentSongs)
router.post('/songs', postRepresentSongs)
router.post('/songs/edit', editRepresentSongs)

router.get('/likePlaylists', getLikePlaylists)
router.post('/songinPlaylists', addSongInPlaylist)
router.get('/songinPlaylists/:time', deleteSongInPlaylist)

module.exports = router;