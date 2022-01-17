const express = require('express');
const router = express.Router();
const {
    addThemeLists,
    accessedTime,
    getAllPlaylists,
    getNextAllPlaylists,
    getAllDailies,
    getNextAllDailies,
    getRecentPlaylist,
    getRecentDaily,
    getMainRecommendDJ,
    getMainRecommendPlaylist
} = require('../controllers/main')

router.put('/theme', addThemeLists);
router.get('/accessedTime', accessedTime);
router.get('/playlist', getAllPlaylists);
router.get('/playlist/:page', getNextAllPlaylists);
router.get('/daily', getAllDailies);
router.get('/daily/:page', getNextAllDailies);
router.get('/recent-playlists', getRecentPlaylist);
router.get('/recent-dailies', getRecentDaily);
router.get('/recommend-playlists', getMainRecommendPlaylist);
router.get('/recommend-dj', getMainRecommendDJ);

module.exports = router;