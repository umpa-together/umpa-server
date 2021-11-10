const express = require('express');
const router = express.Router();
const { 
    searchSong, 
    searchArtist, 
    searchAlbum,  
    searchNext, 
    searchHint 
} = require('../controllers/appleMusic')
  
router.get('/song/:songname', searchSong);
router.get('/artist/:artistname', searchArtist);
router.get('/album/:albumname', searchAlbum);
router.get('/next/:next', searchNext);
router.get('/hint/:term', searchHint);

module.exports = router;