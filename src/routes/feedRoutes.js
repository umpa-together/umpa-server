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
router.get('/following', getFeedWithFollowing)
router.get('/following/:page', getNextFeedWithFollowing)
router.get('/', getFeedWithAll)
router.get('/:page', getNextFeedWithAll)

module.exports = router;