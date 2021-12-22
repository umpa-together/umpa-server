const express = require('express');
const router = express.Router();
const {
    getAllContents,
    getAllContentsWithHashatg,
    getHashtagHint,
    getDJHint,
    getHashtag,
} = require('../controllers/search')

router.get('/:id', getAllContents)
router.get('/hashtag/:term', getAllContentsWithHashatg)
router.get('/hashtagHint/:term', getHashtagHint)
router.get('/djHint/:term', getDJHint)

/*
router.get('/hashtag/:term', getHashtag)
*/
module.exports = router;