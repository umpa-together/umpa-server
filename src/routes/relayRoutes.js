const express = require('express');
const router = express.Router();

const {
    postRelayPlaylist,
    getCurrentRelay,
    getSelectedRelay,
    postRelaySong,
    getRelaySong,
    likeRelaySong,
    unlikeRelaySong,
} = require('../controllers/relay')

router.post('/', postRelayPlaylist);
router.get('/', getCurrentRelay);
router.get('/:id', getSelectedRelay);
router.post('/song/:playlistId', postRelaySong);
router.get('/song/:playlistId', getRelaySong);
router.post('/like/:songId', likeRelaySong);
router.post('/unlike/:songId', unlikeRelaySong);

module.exports = router;