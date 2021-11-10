const express = require('express');
const multer  = require('multer');
const multerS3 = require('multer-s3');
const aws = require('aws-sdk');
const router = express.Router();
const {
    getAllPlaylists,
    getNextAllPlaylists,
    createPlaylist,
    editPlaylist,
    deletePlaylist,
    uploadImage,
    getSelectedPlaylist,
    createComment,
    deleteComment,
    createRecomment,
    getRecomment,
    deleteRecomment,
    likePlaylist,
    unLikePlaylist,
    likeComment,
    unLikeComment,
    likeRecomment,
    unLikeRecomment,
    createUserSong,
    deleteUserSong  
} = require('../controllers/playlist')

const s3 = new aws.S3({
    accessKeyId: process.env.AWS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: 'ap-northeast-2'
});

const upload = multer({
  storage: multerS3({
      s3,
      acl: 'public-read',
      bucket: 'umpa',
      metadata: function(req, file, cb) {
          cb(null, { fieldName: file.fieldname });
      },
      key: function(req, file, cb) {
          cb(null, Date.now().toString());
      }
  })
});

router.get('/all', getAllPlaylists)
router.get('/all/:page', getNextAllPlaylists)
router.post('/', createPlaylist)
router.post('/edit', editPlaylist)
router.delete('/:id', deletePlaylist)
router.post('/imgUpload', upload.fields([{name: 'img'}, {name: 'playlistId'}]), uploadImage)
router.get('/:id/:postUserId', getSelectedPlaylist)
router.post('/comment/:id', createComment)
router.delete('/comment/:id/:commentid', deleteComment)
router.get('/recomment/:commentid', getRecomment)
router.post('/recomment/:id/:commentid', createRecomment)
router.delete('/recomment/:commentid', deleteRecomment)
router.post('/like/:id', likePlaylist)
router.delete('/like/:id', unLikePlaylist)
router.post('/likecomment/:playlistid/:id', likeComment)
router.delete('/likecomment/:playlistid/:id', unLikeComment)
router.post('/likerecomment/:commentid/:id', likeRecomment)
router.delete('/likerecomment/:commentid/:id', unLikeRecomment)
router.post('/userSong/:playlistId', createUserSong)
router.delete('/userSong/:playlistId/:userSongId', deleteUserSong)

module.exports = router;