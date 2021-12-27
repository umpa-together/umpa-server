const express = require('express');
const multer  = require('multer');
const multerS3 = require('multer-s3');
const aws = require('aws-sdk');
const router = express.Router();
const { 
    getAllDailies,
    getNextAllDailies,
    getDaily,
    getNextDaily,
    createDaily,
    editDaily,
    deleteDaily,
    uploadImage,
    getSelectedDaily,
    createComment,
    deleteComment,
    createRecomment,
    getRecomment,
    deleteRecomment,
    likeDaily,
    unLikeDaily,
    likeComment,
    unLikeComment,
    likeRecomment,
    unLikeRecomment
} = require('../controllers/daily')

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
router.get('/recomment/:commentid', getRecomment)
router.get('/all', getAllDailies)
router.get('/all/:page', getNextAllDailies)
router.get('/Dailys', getDaily)
router.get('/Dailys/:page', getNextDaily)
router.post('/', createDaily)
router.post('/edit', editDaily)
router.delete('/:id', deleteDaily)
router.post('/imgUpload/:id', upload.fields([{name: 'img'}]), uploadImage);
router.get('/:id/:postUserId', getSelectedDaily)
router.post('/comment/:id', createComment)
router.delete('/comment/:id/:commentid', deleteComment)
router.post('/recomment/:id/:commentid', createRecomment)
router.delete('/recomment/:commentid', deleteRecomment)
router.post('/like/:id', likeDaily)
router.delete('/like/:id', unLikeDaily)
router.post('/likecomment/:Dailyid/:id', likeComment)
router.delete('/likecomment/:Dailyid/:id', unLikeComment)
router.post('/likerecomment/:commentid/:id', likeRecomment)
router.delete('/likerecomment/:commentid/:id', unLikeRecomment)

module.exports = router;

