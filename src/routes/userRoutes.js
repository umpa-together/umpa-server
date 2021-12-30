const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload')
const {
  addGenreLists,
  deleteField,
  getMyInformation,
  getOtherInformation,
  editProfile,
  editProfileImage,
  getFollow,
  follow,
  unFollow,
  getRepresentSongs,
  postRepresentSongs,
  editRepresentSongs,
  getGenreLists,
  postGenre
} = require('../controllers/user')

router.delete('/field', deleteField);
router.put('/genre', addGenreLists);
router.get('/', getMyInformation)
router.get('/other/:id', getOtherInformation)
router.post('/editProfile', editProfile)
router.post('/editProfileImage', upload('profileImage/').single('img'), editProfileImage)
router.get('/follow/:id', getFollow);
router.post('/follow/:id', follow)
router.delete('/follow/:id', unFollow)
router.get('/songs/:userId', getRepresentSongs)
router.post('/songs', postRepresentSongs)
router.post('/songs/edit', editRepresentSongs)
router.get('/genre', getGenreLists)
router.post('/genre', postGenre)

module.exports = router;