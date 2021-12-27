const express = require('express');
const router = express.Router();
const { 
    signUp,
    signIn,
    googleSignIn,
    appleSignIn,
    kakaoSignIn,
    naverSignIn,
    checkName
} = require('../controllers/auth')

router.post('/signUp', signUp);
router.post('/signIn', signIn);
router.get('/social/google/:email/:id', googleSignIn)
router.get('/social/apple/:email/:id', appleSignIn)
router.get('/social/kakao/:token', kakaoSignIn);
router.get('/social/naver/:token', naverSignIn);
router.get('/nickName/:name', checkName);

module.exports = router;