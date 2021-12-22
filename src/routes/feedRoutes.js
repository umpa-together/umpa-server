const express = require('express');
const router = express.Router();
const {
    AddFeeds,
    getFeedWithAll,
    getNextFeedWithAll,
    getFeedWithFollowing,
    getNextFeedWithFollowing
} = require('../controllers/feed')

router.post('/new', AddFeeds)
router.get('/', getFeedWithAll)
router.get('/:page', getNextFeedWithAll)
router.get('/following', getFeedWithFollowing)
router.get('/following/:page', getNextFeedWithFollowing)

module.exports = router;