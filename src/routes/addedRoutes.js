const express = require('express');
const router = express.Router();
const { 
    changeData,
    postAddedSong,
    getAddedSong,
    postAddedPlaylist,
    getAddedPlaylist
} = require('../controllers/added')

router.post('/change', changeData);
router.post('/', postAddedSong);
router.get('/', getAddedSong);
router.post('/playlist', postAddedPlaylist);
router.get('/playlist', getAddedPlaylist);

module.exports = router;