const express = require('express');
const mongoose = require('mongoose');
const requireAuth = require('../middlewares/requireAuth');
var admin = require('firebase-admin');
var serviceAccount = require('./umpa-4bdbc-firebase-adminsdk-z9vqj-20c1660b78.json');

const Notice = mongoose.model('Notice');
const User = mongoose.model('User');

const router = express.Router();
require('date-utils');

admin.initializeApp({
    credential : admin.credential.cert(serviceAccount)
});
router.use(requireAuth);

router.get('/notice', async(req,res) => {
    const nowTime = new Date();
    try {
        const notice = await Notice.find({ noticieduser: req.user._id })
        .sort({'time': -1}).limit(20)
        .populate('noticinguser', { profileImage: 1, name: 1 })
        .populate('playlist', { title: 1, image: 1, postUserId: 1 })
        .populate('playlistcomment', { text: 1 })
        .populate('playlistrecomment', { text: 1 })
        .populate('daily', { textcontent: 1, image: 1, postUserId: 1 })
        .populate('dailycomment', { text: 1 })
        .populate('dailyrecomment', { text: 1 })
        .populate('board', { name: 1,  })
        .populate('boardcontent', { content: 1 })
        .populate('boardcomment', { comment: 1 })
        .populate('boardrecomment', { comment: 1 })
        .populate('boardsong', { song: 1 });

        for(let key in notice){
            const noticeTime = new Date(notice[key].time);
            const betweenTime = Math.floor((nowTime.getTime() - noticeTime.getTime()) / 1000 / 60);
            if (betweenTime < 1){
                notice[key]['time'] = '방금전';
            }else if (betweenTime < 60) {
                notice[key]['time'] = `${betweenTime}분전`;
            }else{
                const betweenTimeHour = Math.floor(betweenTime / 60);
                if (betweenTimeHour < 24) {
                    notice[key]['time'] = `${betweenTimeHour}시간전`;
                }else{
                    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                    if (betweenTimeDay < 30) {
                        notice[key]['time'] =  `${betweenTimeDay}일전`;
                    } else {
                        const betweenMonthDay = Math.floor(betweenTime / 60 / 24 / 24);
                        notice[key]['time'] = `${betweenMonthDay}달전`;
                    }
                }
            }
        }
        res.send(notice);
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.get('/nextNotice/:page', async (req, res) => {
    const nowTime = new Date();
    try{
        const notice = await Notice.find({ noticieduser: req.user._id })
        .sort({'time': -1}).skip(req.params.page * 20).limit(20)
        .populate('noticinguser', { profileImage: 1, name: 1 })
        .populate('playlist', { title: 1, image: 1, postUserId: 1 })
        .populate('playlistcomment', { text: 1 })
        .populate('playlistrecomment', { text: 1 })
        .populate('daily', { textcontent: 1, image: 1, postUserId: 1 })
        .populate('dailycomment', { text: 1 })
        .populate('dailyrecomment', { text: 1 })
        .populate('board', { name: 1,  })
        .populate('boardcontent', { content: 1 })
        .populate('boardcomment', { comment: 1 })
        .populate('boardrecomment', { comment: 1 })
        .populate('boardsong', { song: 1 });

        for(let key in notice){
            const noticeTime = new Date(notice[key].time);
            const betweenTime = Math.floor((nowTime.getTime() - noticeTime.getTime()) / 1000 / 60);
            if (betweenTime < 1){
                notice[key]['time'] = '방금전';
            }else if (betweenTime < 60) {
                notice[key]['time'] = `${betweenTime}분전`;
            }else{
                const betweenTimeHour = Math.floor(betweenTime / 60);
                if (betweenTimeHour < 24) {
                    notice[key]['time'] = `${betweenTimeHour}시간전`;
                }else{
                    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                    if (betweenTimeDay < 30) {
                        notice[key]['time'] =  `${betweenTimeDay}일전`;
                    } else {
                        const betweenMonthDay = Math.floor(betweenTime / 60 / 24 / 24);
                        notice[key]['time'] = `${betweenMonthDay}달전`;
                    }
                }
            }
        }
        res.send(notice);
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.put('/notice/:id', async(req,res) =>{
    try{
        const notice = await Notice.findOneAndUpdate({ _id: req.params.id }, { isRead: true })
        res.send(notice)
    }catch(err){
        return res.status(422).send(err.message);
    }
});

router.put('/setnotice/:noticetoken', async(req,res) => {
    try {
     const response = await User.findOneAndUpdate({_id:req.user._id}, {$set: {noticetoken: req.params.noticetoken}}, {new: true});
     res.send(response);
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.put('/deletenotice', async(req,res) => {
    try {
     const response = await User.findOneAndUpdate({_id:req.user._id}, {$set: {noticetoken: null}}, {new: true});
     res.send(response);
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

module.exports = router;