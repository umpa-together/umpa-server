const express = require('express');
const router = express.Router();
const {
    AddFeeds,
    getFeed,
    getNextFeed
} = require('../controllers/feed')

router.get('/addFeeds', AddFeeds)
router.get('/feeds', getFeed)
router.get('/feeds/:page', getNextFeed)

module.exports = router;