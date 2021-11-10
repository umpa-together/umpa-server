const express = require('express');
const router = express.Router();
const {
    getRecommendDJ,
    getRepresentSongs,
    setRepresentSongs,
    editRepresentSongs,
    getMainRecommendDJ
} = require('../controllers/dj')

router.get('/recommendDJ', getRecommendDJ)
router.get('/getSongs/:id', getRepresentSongs)
router.post('/setSongs', setRepresentSongs)
router.post('/editSongs', editRepresentSongs)
router.get('/mainRecommend', getMainRecommendDJ)

module.exports = router;
