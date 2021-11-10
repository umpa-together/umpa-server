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

router.get('/allDailys', getAllDailies)
router.get('/allDailys/:page', getNextAllDailies)
router.get('/Dailys', getDaily)
router.get('/Dailys/:page', getNextDaily)
router.post('/Daily', createDaily)
router.post('/editDaily', editDaily)
router.delete('/Daily/:id', deleteDaily)
router.post('/DailyimgUpload/:id', upload.fields([{name: 'img'}]), uploadImage);
router.get('/Daily/:id/:postUserId', getSelectedDaily)
router.post('/Dailycomment/:id', createComment)
router.delete('/Dailycomment/:id/:commentid', deleteComment)
router.post('/Dailyrecomment/:id/:commentid', createRecomment)
router.get('/Dailyrecomment/:commentid', getRecomment)
router.delete('/Dailyrecomment/:commentid', deleteRecomment)
router.post('/Dailylike/:id', likeDaily)
router.delete('/Dailylike/:id', unLikeDaily)
router.post('/Dailylikecomment/:Dailyid/:id', likeComment)
router.delete('/Dailylikecomment/:Dailyid/:id', unLikeComment)
router.post('/Dailylikerecomment/:commentid/:id', likeRecomment)
router.delete('/Dailylikerecomment/:commentid/:id', unLikeRecomment)

module.exports = router;

