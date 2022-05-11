const express = require('express');
const router = express.Router();
const {
    getAllContents,
    getNextSongResult,
    getSelectedContents,
    getAllContentsWithHashatg,
    getRecentKeywords,
    deleteRecentKeyword,
    deleteAllRecentKeyword,
} = require('../controllers/search')

router.get('/keyword', getRecentKeywords);
router.delete('/keyword/:id', deleteRecentKeyword);
router.delete('/keywordAll', deleteAllRecentKeyword);
router.get('/next/:next', getNextSongResult);
router.get('/:term', getAllContents);
router.get('/song/:id', getSelectedContents);
router.get('/hashtag/:id', getAllContentsWithHashatg);

module.exports = router;