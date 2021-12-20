const express = require('express');
const router = express.Router();

const {
    postRelayPlaylist,
    getCurrentRelay,
    postRelaySong,
    getRelaySong,
    likeRelaySong,
    unlikeRelaySong,
} = require('../controllers/relay')

router.post('/', postRelayPlaylist);
router.get('/', getCurrentRelay);
router.post('/song/:playlistId', postRelaySong);
router.get('/song/:playlistId', getRelaySong);
router.post('/like/:songId', likeRelaySong);
router.post('/unlike/:songId', unlikeRelaySong);

module.exports = router;