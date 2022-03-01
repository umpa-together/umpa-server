const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload')
const {
  getMyInformation,
  getOtherInformation,
  editProfile,
  editImage,
  getFollow,
  follow,
  unFollow,
  getRepresentSongs,
  postRepresentSongs,
  getGenreLists,
  postGenre,
  getGuide,
  blockUser,
  unblockUser
} = require('../controllers/user')

router.get('/', getMyInformation)
router.get('/other/:id', getOtherInformation)
router.post('/editProfile', editProfile)
router.post('/editImage', upload('profileImage/').fields([{name: 'profileImage'}, {name: 'backgroundImage'}]), editImage)
router.get('/follow/:id', getFollow);
router.post('/follow/:id', follow)
router.delete('/follow/:id', unFollow)
router.get('/songs/:userId', getRepresentSongs)
router.post('/songs', postRepresentSongs)
router.get('/guide/:type', getGuide)
router.get('/genre', getGenreLists)
router.post('/genre', postGenre)
router.put('/block/:id', blockUser)
router.put('/unblock/:id', unblockUser)

module.exports = router;