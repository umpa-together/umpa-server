const express = require('express');
const router = express.Router();
const { 
    searchSong, 
    searchArtist, 
    searchAlbum,  
    searchNext, 
    searchHint 
} = require('../controllers/appleMusic')
  
router.get('/search/:songname', searchSong);
router.get('/searchartist/:artistname', searchArtist);
router.get('/searchalbum/:albumname', searchAlbum);
router.get('/searchNext/:next', searchNext);
router.get('/searchHint/:term', searchHint);

module.exports = router;