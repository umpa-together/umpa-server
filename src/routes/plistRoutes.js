const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload')
const {
    changeTime,
    changeLikes,
    addPlaylist,
    editPlaylist,
    deletePlaylist,
    uploadImage,
    getSelectedPlaylist,
    addComment,
    deleteComment,
    addreComment,
    getRecomment,
    deleteRecomment,
    likesPlaylist,
    unlikesPlaylist,
    likescomment,
    unlikescomment,
    likesrecomment,
    unlikesrecomment,
    //createUserSong,
    //deleteUserSong  
} = require('../controllers/playlist')

router.get('/recomment/:commentid', getRecomment)
router.get('/time', changeTime)
router.get('/changelikes', changeLikes)
router.post('/', addPlaylist)
router.post('/edit', editPlaylist)
router.delete('/:id', deletePlaylist)
router.post('/imgUpload', upload('playlist/').fields([{name: 'img'}, {name: 'playlistId'}]), uploadImage)
router.get('/:id/:postUserId', getSelectedPlaylist)
router.post('/comment/:id', addComment)
router.delete('/comment/:id/:commentid', deleteComment)
router.post('/recomment/:id/:commentid', addreComment)
router.delete('/recomment/:commentid', deleteRecomment)
router.post('/like/:id', likesPlaylist)
router.delete('/like/:id', unlikesPlaylist)
router.post('/likecomment/:playlistid/:id', likescomment)
router.delete('/likecomment/:playlistid/:id', unlikescomment)
router.post('/likerecomment/:commentid/:id', likesrecomment)
router.delete('/likerecomment/:commentid/:id', unlikesrecomment)
//router.post('/userSong/:playlistId', createUserSong)
//router.delete('/userSong/:playlistId/:userSongId', deleteUserSong)

module.exports = router;