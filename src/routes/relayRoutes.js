const express = require('express');
const router = express.Router();

const {
    postRelayPlaylist,
    postRepresentSong,
    updateApprovedSong,
    getCurrentRelay,
    getRelayLists,
    getNextRelayLists,
    getSelectedRelay,
    postRelaySong,
    getRelaySong,
    likeRelaySong,
    unlikeRelaySong,
    likeRelayPlaylist,
    unLikeRelayPlaylist,
    addComment,
    deleteComment,
    addRecomment,
    deleteRecomment,
    likeComment,
    unLikeComment,
    likeRecomment,
    unLikeRecomment
} = require('../controllers/relay')

router.post('/', postRelayPlaylist);
router.post('/:id', postRepresentSong);
router.get('/approve', updateApprovedSong);
router.get('/', getCurrentRelay);
router.get('/lists', getRelayLists);
router.get('/lists/:page', getNextRelayLists);
router.get('/:id', getSelectedRelay);
router.post('/song/:playlistId', postRelaySong);
router.get('/song/:playlistId', getRelaySong);
router.put('/songs-like/:songId', likeRelaySong);
router.put('/songs-unlike/:songId', unlikeRelaySong);
router.put('/playlists-like/:id', likeRelayPlaylist);
router.put('/playlists-unlike/:id', unLikeRelayPlaylist);
router.post('/comment/:id', addComment);
router.delete('/comment/:id/:commentId', deleteComment);
router.post('/recomment/:id/:commentId', addRecomment);
router.delete('/recomment/:id/:commentId', deleteRecomment);
router.put('/comments-like/:relayId/:id', likeComment);
router.put('/comments-unlike/:relayId/:id', unLikeComment);
router.put('/recomments-like/:relayId/:id', likeRecomment);
router.put('/recomments-unlike/:relayId/:id', unLikeRecomment);

module.exports = router;