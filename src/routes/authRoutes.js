const express = require('express');
const router = express.Router();
const { 
    signUp,
    signIn,
    withdrawal,
    googleSignIn,
    appleSignIn,
    kakaoSignIn,
    naverSignIn,
    checkName
} = require('../controllers/auth')

router.post('/signUp', signUp);
router.post('/signIn', signIn);
router.delete('/withdrawal/:id', withdrawal);
router.post('/social/google', googleSignIn)
router.post('/social/apple', appleSignIn)
router.post('/social/kakao', kakaoSignIn);
router.post('/social/naver', naverSignIn);
router.post('/nickName/:name', checkName);
module.exports = router;