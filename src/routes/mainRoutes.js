const express = require('express');
const router = express.Router();
const {
    changeTime,
    getAllPlaylists,
    getNextAllPlaylists,
    getAllDailies,
    getNextAllDailies,
    getRecentPlaylist,
    getWeekly,
    postWeekly,
    getMainRecommendDJ,
    getCurrentHashtag
} = require('../controllers/main')

router.get('/time', changeTime);
router.get('/playlist', getAllPlaylists);
router.get('/playlist/:page', getNextAllPlaylists);
router.get('/daily', getAllDailies);
router.get('/daily/:page', getNextAllDailies);
router.get('/recent', getRecentPlaylist);
router.get('/weekly', getWeekly);
router.post('/weekly', postWeekly);
router.get('/recommendDJ', getMainRecommendDJ);
router.get('/hashtag', getCurrentHashtag);

module.exports = router;