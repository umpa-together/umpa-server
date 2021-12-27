const express = require('express');
const router = express.Router();
const {
    getHashtag,
    getAllContents,
    getAllContentsWithHashatg,
    getHashtagHint,
    getDJHint,
    getCurrentHashtag
} = require('../controllers/search')

router.get('/hashtag/:object', getHashtag)
router.get('/all/:id', getAllContents)
router.get('/hashtagAll/:term', getAllContentsWithHashatg)
router.get('/hashtagHint/:term', getHashtagHint)
router.get('/djHint/:term', getDJHint)
router.get('/currentHashtag', getCurrentHashtag)

module.exports = router;