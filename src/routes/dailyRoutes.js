const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload')
const { 
    changeTime,
    addDaily,
    editDaily,
    deleteDaily,
    uploadImage,
    getSelectedDaily,
    addComment,
    deleteComment,
    addreComment,
    getRecomment,
    deleteRecomment,
    likeDaily,
    unLikeDaily,
    likeComment,
    unLikeComment,
    likeRecomment,
    unLikeRecomment
} = require('../controllers/daily')

router.get('/time', changeTime);
router.get('/recomment/:commentid', getRecomment)
router.post('/', addDaily)
router.post('/edit', editDaily)
router.delete('/:id', deleteDaily)
router.post('/imgUpload/:id', upload('daily/').fields([{name: 'img'}]), uploadImage);
router.get('/:id/:postUserId', getSelectedDaily)
router.post('/comment/:id', addComment)
router.delete('/comment/:id/:commentid', deleteComment)
router.post('/recomment/:id/:commentid', addreComment)
router.delete('/recomment/:commentid', deleteRecomment)
router.post('/like/:id', likeDaily)
router.delete('/like/:id', unLikeDaily)
router.post('/likecomment/:Dailyid/:id', likeComment)
router.delete('/likecomment/:Dailyid/:id', unLikeComment)
router.post('/likerecomment/:commentid/:id', likeRecomment)
router.delete('/likerecomment/:commentid/:id', unLikeRecomment)

module.exports = router;

