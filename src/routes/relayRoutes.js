const express = require('express');
const router = express.Router();

const {
    postRelayPlaylist,
    postRepresentSong,
    updateApprovedSong,
    getCurrentRelay,
    getRelayLists,
    getSelectedRelay,
    postRelaySong,
    getRelaySong,
    likeRelaySong,
    unlikeRelaySong,
} = require('../controllers/relay')

router.post('/', postRelayPlaylist);
router.post('/:id', postRepresentSong);
router.get('/approve', updateApprovedSong);
router.get('/', getCurrentRelay);
router.get('/lists', getRelayLists);
router.get('/:id', getSelectedRelay);
router.post('/song/:playlistId', postRelaySong);
router.get('/song/:playlistId', getRelaySong);
router.post('/like/:songId', likeRelaySong);
router.post('/unlike/:songId', unlikeRelaySong);

module.exports = router;