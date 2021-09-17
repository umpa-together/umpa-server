const express = require('express');
const mongoose = require('mongoose');
const requireAuth = require('../middlewares/requireAuth');

const Chatroom = mongoose.model('Chatroom');
const Chatmsg= mongoose.model('Chatmsg');
const User= mongoose.model('User');

const router = express.Router();
router.use(requireAuth);



router.get('/chatlist', async(req,res) => {

    try{

        const chatlist = await Chatroom.find({participate:{$in:req.user._id}}).populate('messages').populate('participate');
        res.send(chatlist);
    }catch(err){
        return res.status(422).send(err.message);
    }

})

router.post('/chat', async (req, res) => {
    const { participate } = req.body;
    var newDate = new Date()
    var time = newDate.toFormat('YYYY/MM/DD HH24:MI:SS');
    try {
       
        const check = await Chatroom.findOne({$and:[{ participate:{$in:participate}  },{ participate:{$in:req.user._id}  }]})
        console.log('1')
        if(check == null || check == undefined){
            const chat = await Chatroom({participate:[participate, req.user._id]}).save()
            await User.findOneAndUpdate({_id: participate},{$push: {chats: chat}}, {new: true})
            await User.findOneAndUpdate({_id: req.user._id},{$push: {chats: chat}}, {new: true})

            res.send(chat);
        }
        else{
            const result = await Chatroom.findOne({$and:[{ participate:{$in:participate}  },{ participate:{$in:req.user._id}  }]}).populate('messages')
            

            res.send(result)
        }
      
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.get('/gotochat/:chatid', async(req,res) => {

    try{

        await Chatmsg.updateMany({$and : [{chatroomid:req.params.chatid},{isRead:false}]}, {$set : {isRead:true}});
        const chatroom = await Chatroom.findOne({_id:req.params.chatid}).populate('messages')

        res.send(chatroom);
    }catch(err){
        return res.status(422).send(err.message);
    }

})
router.post('/blockchat', async(req,res) => {
    
    const { chatid } = req.body;

    try{
        
        const chatroom = await Chatroom.findOneAndUpdate({_id:chatid}, {$push:{Rejectperson: req.user._id}},{new: true}).populate('messages')

        res.send(chatroom);
    }catch(err){
        return res.status(422).send(err.message);
    }

})

router.post('/unblockchat', async(req,res) => {
    
    const { chatid } = req.body;

    try{
        
        const chatroom = await Chatroom.findOneAndUpdate({_id:chatid}, {$pull:{Rejectperson: req.user._id}},{new: true}).populate('messages')

        res.send(chatroom);
    }catch(err){
        return res.status(422).send(err.message);
    }

})

module.exports = router;
