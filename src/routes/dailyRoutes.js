const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload')
const { 
    addDaily,
    editDaily,
    deleteDaily,
    uploadImage,
    getSelectedDaily,
    addComment,
    deleteComment,
    addRecomment,
    deleteRecomment,
    likeDaily,
    unLikeDaily,
    likeComment,
    unLikeComment,
    likeRecomment,
    unLikeRecomment
} = require('../controllers/daily')

router.post('/', addDaily)
router.post('/edit', editDaily)
router.delete('/:id', deleteDaily)
router.post('/imgUpload', upload('daily/').fields([{name: 'img'}, {name: 'dailyId'}]), uploadImage);
router.get('/:id/:postUserId', getSelectedDaily)
router.post('/comment/:id', addComment)
router.delete('/comment/:id/:commentId', deleteComment)
router.post('/recomment/:id/:commentId', addRecomment)
router.delete('/recomment/:id/:commentId', deleteRecomment)
router.post('/like/:id', likeDaily)
router.delete('/like/:id', unLikeDaily)
router.post('/likecomment/:dailyId/:id', likeComment)
router.delete('/likecomment/:dailyId/:id', unLikeComment)
router.post('/likerecomment/:dailyId/:id', likeRecomment)
router.delete('/likerecomment/:dailyId/:id', unLikeRecomment)

module.exports = router;

