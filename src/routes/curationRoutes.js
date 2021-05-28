const express = require('express');
const mongoose = require('mongoose');
const Curation = mongoose.model('Curation');
const Curationpost = mongoose.model('CurationPost');
const User = mongoose.model('User');
const Notice = mongoose.model('Notice');

const requireAuth = require('../middlewares/requireAuth');
var admin = require('firebase-admin');
const router = express.Router();
require('date-utils');
router.use(requireAuth);

// get curationposts (mainpage)
router.get('/curationposts', async(req,res) => {
    const curationposts = await Curationpost.find({ $and: [{  postUserId:{$in:req.user.following}}, {hidden:false} ]} ).populate('postUserId');
    curationposts.reverse();
    res.send(curationposts);
});

//post Curation
router.post('/curationpost/:id', async (req, res) =>{
    const { isSong, object, textcontent,  hidden } = req.body;
    var newDate = new Date()
    var time = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
    try {
        const curationpost = new Curationpost({ isSong, object, hidden , postUser: req.user.name, postUserId: req.user._id, time, textcontent, songoralbumid:req.params.id });
        curationpost.save();

        const curation = await Curation.findOneAndUpdate({ songoralbumid:req.params.id }, {$push: { participate:req.user._id }},  {new:true});

        const curationposts = await Curationpost.find({songoralbumid:req.params.id}).populate('postUserId');
        res.send([curation, curationposts ]);
        await User.findOneAndUpdate({_id:req.user._id}, {$push:{curationposts:curationpost._id}}, {new:true});
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

// delete Curation
router.delete('/curationpost/:id', async (req, res) =>{
    try {
        const curationpost = await Curationpost.findOneAndDelete({_id:req.params.id});
        const [curationposts, curation] = await Promise.all([Curationpost.find({songoralbumid:curationpost.songoralbumid}).populate('postUserId'), Curation.findOneAndUpdate({songoralbumid:curationpost.songoralbumid},{$pull:{participate:curationpost.postUserId}}, {new:true}),User.findOneAndUpdate({_id:req.user._id}, {$pull:{curationposts:curationpost._id}}, {new:true})]);
        res.send([curation, curationposts]);
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

// like Curation post
router.post('/curationpostlike/:id/:songoralbumid', async(req,res) =>{
    var newDate = new Date()
    var noticeTime = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
    try{
        const curationpost = await Curationpost.findOneAndUpdate({_id : req.params.id}, {$push : {likes : req.user._id}}, {new:true});
        const [curation, curationposts] = await Promise.all([Curation.findOne({songoralbumid:req.params.songoralbumid}), Curationpost.find({songoralbumid:req.params.songoralbumid}).populate('postUserId')]);
        res.send([curation, curationposts]);
        if(curationpost.postUserId.toString() != req.user._id.toString()){
            try {
                const notice  = new Notice({ noticinguser:req.user._id, noticieduser:curationpost.postUserId, noticetype:'culike', time: noticeTime, curationpost:curationpost._id });
                await notice.save();
            } catch (err) {
                return res.status(422).send(err.message);
            }
        }
        const targetuser = await User.findOne({_id:curationpost.postUserId});
        if( targetuser.noticetoken != null  && targetuser._id.toString() != req.user._id.toString()){
            var message = {
                notification : {
                    title: curation.object.attributes.artistName + ' - ' + curation.object.attributes.name,
                    body : req.user.name + '님이 큐레이션을 좋아합니다.',
                },
                token : targetuser.noticetoken
            };
            try {
                await admin.messaging().send(message).then((response)=> {}).catch((error)=>{console.log(error);});
            } catch (err) {
                return res.status(422).send(err.message);
            }
        }
    }catch(err){
        return res.status(422).send(err.message);
    }
});

// unlike Curation post
router.delete('/curationpostlike/:id/:songoralbumid', async(req,res) =>{
    try{
        const curationpost =  await Curationpost.findOneAndUpdate({_id : req.params.id}, {$pull : {likes : req.user._id}}, {new:true});
        const [curationposts, curation] = await Promise.all([Curationpost.find({songoralbumid:req.params.songoralbumid}).populate('postUserId'), Curation.findOne({songoralbumid:req.params.songoralbumid})]);
        res.send([curation, curationposts]);
        await Notice.findOneAndDelete({$and: [{ curationpost:curationpost._id }, { noticinguser:req.user._id }, { noticetype:'culike' }, { noticieduser:curationpost.postUserId }]});
    }catch(err){
        return res.status(422).send(err.message);
    }
});

// getCuration
router.post('/curation/:id', async (req, res) =>{
    const { isSong, object } = req.body;
    try {
        const [check,curationpost] = await Promise.all([Curation.findOne({songoralbumid:req.params.id}),Curationpost.find({songoralbumid:req.params.id}).populate('postUserId')])
        if(check == null){
            const curation = new Curation({isSong, object, songoralbumid:req.params.id});
            await curation.save();
            res.send([curation,[]]);
        }else{
            res.send([check,curationpost]);
        }
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

// get MyCuration
router.get('/mycurationpost/:id/', async (req, res) =>{
    try {
        const curationpost = await Curationpost.findOne({$and :[{ songoralbumid: req.params.id }, { postUserId: req.user._id }]}).populate('postUserId');
        res.send(curationpost);
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

module.exports = router;