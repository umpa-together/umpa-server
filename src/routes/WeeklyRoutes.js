const express = require('express');
const router = express.Router();
const {
    getWeeklyPlaylist,
    createWeekly,
    getWeekly,
    getRecentPlaylist,
    getMusicArchive
} = require('../controllers/weekly')

router.get('/WeekPlaylist', getWeeklyPlaylist)
router.post('/Weekly', createWeekly)
router.get('/Weekly', getWeekly)
router.get('/recent', getRecentPlaylist)
router.get('/musicArchive', getMusicArchive)


module.exports = router;