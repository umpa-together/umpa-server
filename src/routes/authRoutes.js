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

router.post('/signup', signUp);
router.post('/signin', signIn);
router.get('/googleIdToken/:email/:id', googleSignIn)
router.get('/appleIdToken/:email/:id', appleSignIn)
router.get('/kakaoInfo/:token', kakaoSignIn);
router.get('/naverInfo/:token', naverSignIn);
router.get('/checkName/:name', checkName);

module.exports = router;