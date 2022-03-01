const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload')
const {
    addPlaylist,
    editPlaylist,
    deletePlaylist,
    uploadImage,
    getSelectedPlaylist,
    addComment,
    deleteComment,
    addRecomment,
    deleteRecomment,
    likesPlaylist,
    unlikesPlaylist,
    likescomment,
    unlikescomment,
    likesrecomment,
    unlikesrecomment,
} = require('../controllers/playlist')

router.post('/', addPlaylist)
router.post('/edit', editPlaylist)
router.delete('/:id', deletePlaylist)
router.post('/imgUpload', upload('playlist/').fields([{name: 'img'}, {name: 'playlistId'}]), uploadImage)
router.get('/:id/:postUserId', getSelectedPlaylist)
router.post('/comment/:id', addComment)
router.delete('/comment/:id/:commentId', deleteComment)
router.post('/recomment/:id/:commentId', addRecomment)
router.delete('/recomment/:id/:commentId', deleteRecomment)
router.post('/like/:id', likesPlaylist)
router.delete('/like/:id', unlikesPlaylist)
router.post('/likecomment/:playlistId/:id', likescomment)
router.delete('/likecomment/:playlistId/:id', unlikescomment)
router.post('/likerecomment/:playlistId/:id', likesrecomment)
router.delete('/likerecomment/:playlistId/:id', unlikesrecomment)

module.exports = router;