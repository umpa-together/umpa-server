const express = require('express');
const router = express.Router();
const { 
    postAddedSong,
    getAddedSong,
    deleteAddedSong,
    postAddedPlaylist,
    getAddedPlaylist,
    deleteAddedPlaylist,
} = require('../controllers/added')

router.post('/', postAddedSong);
router.get('/', getAddedSong);
router.delete('/:id', deleteAddedSong);
router.post('/playlist/:id', postAddedPlaylist);
router.get('/playlist', getAddedPlaylist);
router.delete('/playlist/:id', deleteAddedPlaylist);

module.exports = router;