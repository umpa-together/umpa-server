const express = require('express');
const router = express.Router();
const {
    getAllPlaylists,
    getNextAllPlaylists,
    getAllDailies,
    getNextAllDailies,
    getRecentPlaylist,
    getRecommendDaily,
    getMainRecommendDJ,
    getMainRecommendPlaylist
} = require('../controllers/main')

router.get('/playlist', getAllPlaylists);
router.get('/playlist/:page', getNextAllPlaylists);
router.get('/daily', getAllDailies);
router.get('/daily/:page', getNextAllDailies);
router.get('/recent-playlists', getRecentPlaylist);
router.get('/recommend-dailies', getRecommendDaily);
router.get('/recommend-playlists', getMainRecommendPlaylist);
router.get('/recommend-dj', getMainRecommendDJ);

module.exports = router;