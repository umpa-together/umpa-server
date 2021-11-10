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

router.get('/searchHashtag/:object', getHashtag)
router.get('/searchAll/:id', getAllContents)
router.get('/searchHashtagAll/:term', getAllContentsWithHashatg)
router.get('/hashtagHint/:term', getHashtagHint)
router.get('/djHint/:term', getDJHint)
router.get('/currentHashtag', getCurrentHashtag)

module.exports = router;