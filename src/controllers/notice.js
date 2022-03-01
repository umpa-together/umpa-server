const mongoose = require('mongoose');
const Notice = mongoose.model('Notice');
const User = mongoose.model('User');
const Announcement = mongoose.model('Announcement');

// 알림 데이터 받아오기
const getNotice = async (req, res) => {
    try {
        const notice = await Notice.find({ 
            noticeduser: req.user._id 
        }, {
            noticetype: 1, time: 1
        }).populate('noticinguser', { 
            profileImage: 1, name: 1 
        }).populate('playlist', { 
            title: 1, image: 1, postUserId: 1, songs:1
        }).populate('playlistcomment', { 
            text: 1 
        }).populate('playlistrecomment', { 
            text: 1 
        }).populate('daily', { 
            textcontent: 1, image: 1, postUserId: 1 
        }).populate('dailycomment', { 
            text: 1 
        }).populate('dailyrecomment', { 
            text: 1 
        }).populate('relay', {
            title: 1, image: 1
        }).populate('relaycomment', {
            text: 1
        }).populate('relayrecomment', {
            text: 1
        }).populate('relaysong', {
            song: 1
        }).populate('storysong', {
            song: 1
        }).sort({ 'time': -1 }).limit(20)
        res.status(200).send(notice);
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 알림 데이터 페이징 받아오기
const getNextNotice = async (req, res) => {
    try{
        const notice = await Notice.find({ 
            noticeduser: req.user._id 
        }, {
            noticetype: 1, time: 1
        }).populate('noticinguser', { 
            profileImage: 1, name: 1 
        }).populate('playlist', { 
            title: 1, image: 1, postUserId: 1, songs:1
        }).populate('playlistcomment', { 
            text: 1 
        }).populate('playlistrecomment', { 
            text: 1 
        }).populate('daily', { 
            textcontent: 1, image: 1, postUserId: 1 
        }).populate('dailycomment', { 
            text: 1 
        }).populate('dailyrecomment', { 
            text: 1 
        }).populate('relay', {
            title: 1
        }).populate('relaycomment', {
            text: 1
        }).populate('relayrecomment', {
            text: 1
        }).populate('relaysong', {
            song: 1
        }).populate('storysong', {
            song: 1
        }).sort({ 'time': -1 }).skip(req.params.page * 20).limit(20)
        res.status(200).send(notice);
    } catch (err) {
        return res.status(422).send(err.message);
    }   
}

// 알림 읽기
const readNotice = async (req, res) => {
    try{
        await Notice.findOneAndUpdate({ 
            _id: req.params.id 
        }, { 
            isRead: true 
        })
        res.status(204).send();
    }catch(err){
        return res.status(422).send(err.message);
    }
}

// 알림 토큰 설정
const setNotice = async (req, res) => {
    try {
        await User.findOneAndUpdate({
            _id: req.user._id
        }, {
            $set: { noticetoken: req.params.noticetoken }
        }, {
            new: true
        });
        res.status(204).send();
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 알림 토큰 해제
const deleteNotice = async (req, res) => {
    try {
        await User.findOneAndUpdate({
            _id: req.user._id
        }, {
            $set: { noticetoken: null }
        }, {
            new: true
        });
        res.status(204).send();
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 공지사항 가져오기
const getAnnouncement = async (req, res) => {
    try {
        const announcements = await Announcement.find({
        }).sort({ 'time': -1 })
        res.status(200).send(announcements)
    } catch (err) {
        return res.status(422).send(err.message); 
    }
}

// 공지사항 작성 
const postAnnouncement = async (req, res) => {
    try {
        const { title, content } = req.body;
        const announcement = await Announcement({
            title,
            content,
            time: new Date()
        }).save()
        res.status(201).send(announcement)
    } catch (err) {
        return res.status(422).send(err.message); 
    }
}


module.exports = {
    getNotice,
    getNextNotice,
    readNotice,
    setNotice,
    deleteNotice,
    getAnnouncement,
    postAnnouncement
}