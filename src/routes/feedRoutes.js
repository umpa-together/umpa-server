const express = require('express');
const router = express.Router();
const {
    getFeedWithAll,
    getNextFeedWithAll,
    getFeedWithFollowing,
    getNextFeedWithFollowing
} = require('../controllers/feed')

router.get('/following', getFeedWithFollowing)
router.get('/following/:page', getNextFeedWithFollowing)
router.get('/', getFeedWithAll)
router.get('/:page', getNextFeedWithAll)

module.exports = router;