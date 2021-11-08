const express = require('express');
const mongoose = require('mongoose');
const requireAuth = require('../middlewares/requireAuth');

const Chatroom = mongoose.model('ChatRoom');
const Chatmsg= mongoose.model('ChatMsg');
const User = mongoose.model('User');

const router = express.Router();
router.use(requireAuth);

router.get('/chatList', async(req,res) => {
    try{
        const chatlist = await Chatroom.find({
            $and: [
                { participate: { $in: req.user._id } },
                { "messages.0" : { $exists : true } }
            ]
        }).populate('messages', {
            sender: 1, text: 1, time: 1, isRead: 1, song: 1,
        }).populate('participate', {
            name: 1, profileImage: 1
        }).sort({'time': -1}).limit(20)

        const nowTime = new Date();
        for(let key in chatlist){
            const chatTime = new Date(chatlist[key].time);
            const betweenTime = Math.floor((nowTime.getTime() - chatTime.getTime()) / 1000 / 60);
            if (betweenTime < 1){
                chatlist[key].time = '방금전';
            }else if (betweenTime < 60) {
                chatlist[key].time = `${betweenTime}분전`;
            }else{
                const betweenTimeHour = Math.floor(betweenTime / 60);
                if (betweenTimeHour < 24) {
                    chatlist[key].time = `${betweenTimeHour}시간전`;
                }else{
                    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                    if (betweenTimeDay < 365) {
                        chatlist[key].time =  `${betweenTimeDay}일전`;
                    }
                }
            }
        }
        res.send(chatlist);
    }catch(err){
        return res.status(422).send(err.message);
    }
})

router.get('/chatList/:page', async (req, res) => {
    try{
        const chatlist = await Chatroom.find({
            $and: [
                { participate: { $in: req.user._id } },
                { "messages.0" : { $exists : true } }
            ]
        }).populate('messages', {
            sender: 1, text: 1, time: 1, isRead: 1, song:1,
        }).populate('participate', {
            name: 1, profileImage: 1
        }).sort({'time': -1}).skip(req.params.page*20).limit(20);
        const nowTime = new Date();
        for(let key in chatlist){
            const chatTime = new Date(chatlist[key].time);
            const betweenTime = Math.floor((nowTime.getTime() - chatTime.getTime()) / 1000 / 60);
            if (betweenTime < 1){
                chatlist[key].time = '방금전';
            }else if (betweenTime < 60) {
                chatlist[key].time = `${betweenTime}분전`;
            }else{
                const betweenTimeHour = Math.floor(betweenTime / 60);
                if (betweenTimeHour < 24) {
                    chatlist[key].time = `${betweenTimeHour}시간전`;
                }else{
                    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                    if (betweenTimeDay < 365) {
                        chatlist[key].time =  `${betweenTimeDay}일전`;
                    }
                }
            }
        }
        res.send(chatlist);
    }catch(err){
        return res.status(422).send(err.message);
    }
})

router.post('/chat', async (req, res) => {
    const { participate } = req.body;
    try {
        const check = await Chatroom.findOne({
            $and: [
                { participate: { $in: participate }},
                { participate: { $in: req.user._id}}
            ]
        })
        if(check == null){
            const chat = await Chatroom({
                participate: [participate, req.user._id]
            }).save()
            res.send(chat);
        } else {
            const result = await Chatroom.findOne({
                $and:[
                    { participate: { $in: participate }},
                    { participate: { $in: req.user._id }}
                ]
            }).populate('messages', {
                sender: 1, text: 1, time: 1, isRead: 1, type: 1, song: 1,
            })
            res.send(result)
        }
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.get('/selectedChat/:chatid', async(req,res) => {
    try{
        await Chatmsg.updateMany({
            $and : [{
                chatroomId: req.params.chatid
            },{ 
                receiver: req.user._id
            },{
                isRead: false
            }]
        }, {$set : { isRead: true }});
        const chatroom = await Chatroom.findOne({
            _id: req.params.chatid
        }).populate('messages', {
            sender: 1, text: 1, time: 1, isRead: 1, type: 1, song: 1,
        })
        res.send(chatroom);
    }catch(err){
        return res.status(422).send(err.message);
    }
})

router.post('/blockchat', async(req,res) => {
    const { chatid } = req.body;
    try{  
        const chatroom = await Chatroom.findOneAndUpdate({
            _id: chatid
        }, {
            $push: { rejectPerson: req.user._id }
        }, { 
            new: true 
        }).populate('messages', {
            sender: 1, text: 1, time: 1, isRead: 1, type: 1, song: 1,
        })
        res.send(chatroom);
    }catch(err){
        return res.status(422).send(err.message);
    }
})

router.post('/unblockchat', async(req,res) => {
    const { chatid } = req.body;
    try{
        const chatroom = await Chatroom.findOneAndUpdate({
            _id: chatid
        }, { 
            $pull: { rejectPerson: req.user._id }
        },{
            new: true
        }).populate('messages', {
            sender: 1, text: 1, time: 1, isRead: 1, type: 1, song: 1,
        })
        res.send(chatroom);
    }catch(err){
        return res.status(422).send(err.message);
    }
})
router.post('/messages', async(req, res) => {
    var newDate = new Date()
    var time = newDate.toFormat('YYYY/MM/DD HH24:MI:SS');
    const { text, receiver } = req.body;
    try{
        var chat;
        const check = await Chatroom.findOne({
            $and: [
                { participate: { $in: receiver }},
                { participate: { $in: req.user._id}}
            ]
        })
        if(check == null){
            chat = await Chatroom({
                participate: [receiver, req.user._id]
            }).save()
        } else {
            chat = await Chatroom.findOne({
                $and:[
                    { participate: { $in: receiver }},
                    { participate: { $in: req.user._id }}
                ]
            }).populate('messages', {
                sender: 1, text: 1, time: 1, isRead: 1, type: 1, song: 1,
            })
        }

        const chatmsg = await Chatmsg({
            chatroomId: chat._id, 
            time, 
            type: 'text', 
            text: text, 
            sender: req.user._id, 
            receiver: receiver,
            isRead:false,
        }).save()
        chatroom = await Chatroom.findOneAndUpdate({
            _id: chat._id,
        }, {
            $push: { messages: chatmsg }, 
            $set: { time }
        }, { 
            new:true 
        }).populate('messages', {
            sender: 1, text: 1, time: 1, isRead: 1, type: 1, song:1,
        });
        const targetuser = await User.findOne({ _id: receiver });
        if( targetuser.noticetoken != null  && targetuser._id.toString() != req.user._id.toString()){
            var message = {
                notification : {
                    title: targetuser.name,
                    body : text,
                },
                token : targetuser.noticetoken
            };
            try {
                admin.messaging().send(message).then((response)=> {}).catch((error)=>{console.log(error);});
            } catch (err) {
                return res.status(422).send(err.message);
            }
        }
        res.send(chatroom)
    }catch(err){
        console.log(err)
    }
})

router.get('/messages', async(req, res) => {
    try {
        const messages = await Chatmsg.countDocuments({
            $and: [{
                receiver: req.user._id
            }, {
                isRead: false
            }]
        })
        res.send({ messagesNum: messages })
    } catch (err) {
        console.log(err.message)
        return res.status(422).send(err.message);
    }
})

module.exports = router;