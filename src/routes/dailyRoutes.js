const express = require('express');
const mongoose = require('mongoose');
const multer  = require('multer');
const multerS3 = require('multer-s3');
const aws = require('aws-sdk');
var admin = require('firebase-admin');

const Daily = mongoose.model('Daily');
const Comment = mongoose.model('DailyComment');

const User = mongoose.model('User');
const Notice = mongoose.model('Notice');
const Hashtag = mongoose.model('Hashtag');

const requireAuth = require('../middlewares/requireAuth');
require('date-utils');

const router = express.Router();
router.use(requireAuth);

var s3 = new aws.S3({
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

// get all Dailys

router.get('/allDailys', async (req, res) => {
    const dailys = await Daily.find().populate('postUserId').sort({'time': -1}).limit(20);
    res.send(dailys)
})

router.get('/allDailys/:page', async (req, res) => {
    const daily = await Daily.find().populate('postUserId').sort({'time': -1}).skip(req.params.page*20).limit(20);
    res.send(daily)
})

router.get('/Dailys', async(req,res) => {
    const daily = await Daily.find({$or: [{postUserId:{$in:req.user.following}}, {postUserId:req.user._id}]}).populate('postUserId').sort({'time': -1}).limit(20);    
    res.send(daily);
});

router.get('/Dailys/:page', async (req, res) => {
    const daily = await Daily.find({$or: [{postUserId:{$in:req.user.following}}, {postUserId:req.user._id}]}).populate('postUserId').sort({'time': -1}).skip(req.params.page*20).limit(20);
    res.send(daily)
})

// add Daily
router.post('/Daily', requireAuth, async (req, res) =>{
    const {  textcontent, songs, hashtag } = req.body;
    var newDate = new Date()
    var time = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
    try {
        const daily = new Daily({ postUserId: req.user._id,  textcontent, time, song:songs, hashtag });
        res.send(daily._id);
        hashtag.forEach(async(text) => {
            try{
            const hashtagr = await Hashtag.findOne({hashtag: text});
            if (hashtagr == null) {
                const hashtagn = new Hashtag({hashtag: text, dailyId: daily._id, time});
                await hashtagn.save();
            }else{
                await Hashtag.findOneAndUpdate({hashtag: text}, {$set :{time :time}, $push : {dailyId : daily._id} } );
           }
           }catch (err){
            return res.status(422).send(err.message);
           }
        });
        daily.save();
        await User.findOneAndUpdate({_id:req.user._id}, {$push:{Dailys:daily._id}}, {new:true})

    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.post('/editDaily', async (req, res) => {
    const {  textcontent, songs, hashtag, DailyId } = req.body;
    var newDate = new Date()
    var time = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
    try {
        const daily = await Daily.findOne({_id: DailyId});
        const prevHashtag = Daily.hashtag;
        
        for(let key in prevHashtag){
            await Hashtag.findOneAndUpdate({hashtag: prevHashtag[key]}, {$pull: {DailyId: DailyId}})
        }

        for(let key in hashtag){
            const hashtagr = await Hashtag.findOne({hashtag: hashtag[key]})
            if(hashtagr == null){
                const hashtagn = new Hashtag({hashtag: hashtag[key], dailyId: DailyId, time});
                await hashtagn.save();
            }else{
                await Hashtag.findOneAndUpdate({hashtag: hashtag[key]}, {$set : {time :time}, $push : {dailyId : DailyId} } );   
            }
        }
        await Daily.findOneAndUpdate({_id: DailyId}, {$set: { textcontent, song:songs, hashtag}})
        res.send(daily)
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.delete('/Daily/:id', async(req, res) => {
    try {
        const [daily] = await Promise.all([Daily.findOneAndDelete({_id : req.params.id}), Comment.deleteMany({dailyid : req.params.id}), Notice.deleteMany({daily:req.params.id}),User.findOneAndUpdate({_id:req.user._id}, {$pull:{dailys:req.params.id}}, {new:true}) ]);
        const hashtag = daily.hashtag
        for(let key in hashtag){
            await Hashtag.findOneAndUpdate({hashtag: hashtag[key]}, {$pull: {DailyId: req.params.id}})
        }
        res.send(daily) ;
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

// image Upload
router.post('/DailyimgUpload', upload.fields([{name: 'img'}, {name: 'DailyId'}]), async (req, res) => {
    const img = req.files['img'];
    let imgArr = [];
    if(img != undefined)    img.forEach((item) => imgArr.push(item.location))
    const { DailyId } = req.body;
    try {
        const daily  = await Daily.findOneAndUpdate({_id: DailyId}, {$set: {image: imgArr}});
        res.send(daily);
    } catch (err) {
        return res.status(422).send(err.message);
    }
});


// get current Daily detail
router.get('/Daily/:id/:postUserId', requireAuth, async(req,res) => {
    const nowTime = new Date();
    let daily , comments;
    if(req.params.postUserId == req.user._id){
        [daily  , comments] = await Promise.all([Daily.findOne({_id: req.params.id }).populate('postUserId'), Comment.find({$and : [{dailyId:req.params.id},{parentcommentId:""}]}).populate('postUserId')])
    }else{
        [daily  , comments] = await Promise.all([ Daily.findOneAndUpdate({_id:req.params.id}, {$inc :{views:1 }}, {returnNewDocument: true }).populate('postUserId'), Comment.find({$and : [{dailyId:req.params.id},{parentcommentId:""}]}).populate('postUserId')])
    }
    for(let key in comments){
        const commentTime = new Date(comments[key].time);
        const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
        if (betweenTime < 1){
            comments[key]['time'] = '방금전';
        }else if (betweenTime < 60) {
            comments[key]['time'] = `${betweenTime}분전`;
        }else{
            const betweenTimeHour = Math.floor(betweenTime / 60);
            if (betweenTimeHour < 24) {
                comments[key]['time'] = `${betweenTimeHour}시간전`;
            }else{
                const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                if (betweenTimeDay < 365) {
                    comments[key]['time'] =  `${betweenTimeDay}일전`;
                }
            }
        }
    }
    res.send([daily , comments]);    
});

// add comment
router.post('/Dailycomment/:id', requireAuth, async(req,res) =>{
    const { text } = req.body;
    var newDate = new Date()
    var time = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
    const nowTime = new Date();

    try {
        const newComment = new Comment({ dailyId: req.params.id, postUserId: req.user._id, text, time });
        await newComment.save();

        let [daily , comments]=  await Promise.all([Daily.findOneAndUpdate({_id:req.params.id}, {$push: {comments:newComment._id}}, {returnNewDocument: true }).populate('postUserId'), Comment.find({$and : [{dailyId:req.params.id},{parentcommentId:""}]}).populate('postUserId')]);
        for(let key in comments){
            const commentTime = new Date(comments[key].time);
            const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
            if (betweenTime < 1){
                comments[key]['time'] = '방금전';
            }else if (betweenTime < 60) {
                comments[key]['time'] = `${betweenTime}분전`;
            }else{
                const betweenTimeHour = Math.floor(betweenTime / 60);
                if (betweenTimeHour < 24) {
                    comments[key]['time'] = `${betweenTimeHour}시간전`;
                }else{
                    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                    if (betweenTimeDay < 365) {
                        comments[key]['time'] =  `${betweenTimeDay}일전`;
                    }
                }
            }
        }
        res.send([daily , comments]);
        if(daily.postUserId._id.toString() != req.user._id.toString()){
            try {
                const notice  = new Notice({ noticinguser:req.user._id, noticieduser : daily.postUserId._id, noticetype :'pcom', time, Daily:req.params.id, Dailycomment:newComment._id });
                notice.save();
            } catch (err) {
                return res.status(422).send(err.message);
            }
        }
        const targetuser = await User.findOne({_id:daily.postUserId._id});
        if( targetuser.noticetoken != null  && targetuser._id.toString() != req.user._id.toString()){
            var message = {
                notification : {
                    title: daily.textcontent,
                    body : req.user.name+'님이 ' + text + ' 댓글을 달았습니다.',
                },
                token : targetuser.noticetoken
            };
            try {
                await admin.messaging().send(message).then((response)=> {}).catch((error)=>{console.log(error);});
            } catch (err) {
                return res.status(422).send(err.message);
            }
        }
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.delete('/Dailycomment/:id/:commentid', async(req,res) =>{
    try {
        await Comment.deleteMany({$or: [{_id : req.params.commentid}, {parentcommentId:req.params.commentid} ]});
        let [daily , b, comments] = await Promise.all( [Daily.findOneAndUpdate({_id:req.params.id},{$pull:{comments:req.params.commentid}}, {returnNewDocument: true }).populate('postUserId'), Notice.deleteMany({$and: [{ Daily:req.params.id }, { Dailycomment: req.params.commentid }]}) ,Comment.find({$and : [{dailyId:req.params.id},{parentcommentId:""}]}).populate('postUserId') ])
        const nowTime = new Date();
        for(let key in comments){
            const commentTime = new Date(comments[key].time);
            const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
            if (betweenTime < 1){
                comments[key]['time'] = '방금전';
            }else if (betweenTime < 60) {
                comments[key]['time'] = `${betweenTime}분전`;
            }else{
                const betweenTimeHour = Math.floor(betweenTime / 60);
                if (betweenTimeHour < 24) {
                    comments[key]['time'] = `${betweenTimeHour}시간전`;
                }else{
                    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                    if (betweenTimeDay < 365) {
                        comments[key]['time'] =  `${betweenTimeDay}일전`;
                    }
                }
            }
        }
        res.send([daily, comments]);

    } catch (err) {
        return res.status(422).send(err.message);
    }
});

//recomment
router.post('/Dailyrecomment/:id/:commentid', requireAuth, async(req,res) =>{
    const { text } = req.body;
    var newDate = new Date()
    var time = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
    const nowTime = new Date();
    try {
        const comment = new Comment({ dailyId: req.params.id, parentcommentId:req.params.commentid, postUserId: req.user._id, text, time });
        await comment.save();
        const parentcomment = await Comment.findOneAndUpdate({_id : req.params.commentid},{$push:{recomments:comment._id}}).populate('dailyId');
        const comments = await Comment.find({parentcommentId:req.params.commentid}).populate('postUserId');
        for(let key in comments){
            const commentTime = new Date(comments[key].time);
            const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
            if (betweenTime < 1){
                comments[key]['time'] = '방금전';
            }else if (betweenTime < 60) {
                comments[key]['time'] = `${betweenTime}분전`;
            }else{
                const betweenTimeHour = Math.floor(betweenTime / 60);
                if (betweenTimeHour < 24) {
                    comments[key]['time'] = `${betweenTimeHour}시간전`;
                }else{
                    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                    if (betweenTimeDay < 365) {
                        comments[key]['time'] =  `${betweenTimeDay}일전`;
                    }
                }
            }
        }
        res.send(comments);

        if(parentcomment.postUserId.toString() != req.user._id.toString()){
            try {
                const notice  = new Notice({ noticinguser:req.user._id,  noticieduser:parentcomment.postUserId, noticetype:'precom', time, Daily:req.params.id, Dailycomment:req.params.commentid, Dailyrecomment:comment._id });
                await notice.save();
            } catch (err) {
                return res.status(422).send(err.message);
            }
        }
        const targetuser = await User.findOne({_id:parentcomment.postUserId});

        if( targetuser.noticetoken != null  && targetuser._id.toString() != req.user._id.toString()){
            var message = {
                notification : {
                    title: parentcommen.dailyId.textcontent,
                    body : req.user.name+'님이 ' + text + ' 대댓글을 달았습니다.',
                },
                token : targetuser.noticetoken
            };
            try {
                await admin.messaging().send(message).then((response)=> {}).catch((error)=>{console.log(error);});
            } catch (err) {
                return res.status(422).send(err.message);
            }
        }
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.get('/Dailyrecomment/:commentid', async(req,res) =>{
    try {
        const nowTime = new Date();
        const comments = await Comment.find({parentcommentId:req.params.commentid}).populate('postUserId');
        for(let key in comments){
            const commentTime = new Date(comments[key].time);
            const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
            if (betweenTime < 1){
                comments[key]['time'] = '방금전';
            }else if (betweenTime < 60) {
                comments[key]['time'] = `${betweenTime}분전`;
            }else{
                const betweenTimeHour = Math.floor(betweenTime / 60);
                if (betweenTimeHour < 24) {
                    comments[key]['time'] = `${betweenTimeHour}시간전`;
                }else{
                    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                    if (betweenTimeDay < 365) {
                        comments[key]['time'] =  `${betweenTimeDay}일전`;
                    }
                }
            }
        }
        res.send(comments);
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.delete('/Dailyrecomment/:commentid', async(req,res) =>{
    try {
        const comment= await Comment.findOneAndDelete({_id : req.params.commentid});
        await Comment.findOneAndUpdate({_id : comment.parentcommentId},{$pull:{recomments:req.params.commentid}})
        let [comments] = await Promise.all( [Comment.find({parentcommentId:comment.parentcommentId}).populate('postUserId'), Notice.deleteMany({$and: [{ Daily:comment.dailyId }, { Dailycomment: mongoose.Types.ObjectId(comment.parentcommentId) }, { Dailyrecomment:comment._id }]})])
        const nowTime = new Date();
        for(let key in comments){
            const commentTime = new Date(comments[key].time);
            const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
            if (betweenTime < 1){
                comments[key]['time'] = '방금전';
            }else if (betweenTime < 60) {
                comments[key]['time'] = `${betweenTime}분전`;
            }else{
                const betweenTimeHour = Math.floor(betweenTime / 60);
                if (betweenTimeHour < 24) {
                    comments[key]['time'] = `${betweenTimeHour}시간전`;
                }else{
                    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                    if (betweenTimeDay < 365) {
                        comments[key]['time'] =  `${betweenTimeDay}일전`;
                    }
                }
            }
        }
        res.send(comments);
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

// like
router.post('/Dailylike/:id' , async(req,res) =>{
    var newDate = new Date()
    var noticeTime = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
    try{
        await Daily.findOneAndUpdate({_id : req.params.id}, {$push : {likes : req.user._id}});
        let like = await Daily.find({_id : req.params.id}).populate('postUserId');

        res.send(like[0]);

        if(like[0].postUserId._id.toString() != req.user._id.toString()){
            try {
                const notice  = new Notice({ noticinguser:req.user._id, noticieduser:like[0].postUserId, noticetype:'plike', time: noticeTime, Daily:like[0]._id });
                await notice.save();
            } catch (err) {
                return res.status(422).send(err.message);
            }
        }
        const targetuser = await User.findOne({_id:like[0].postUserId});
        if( targetuser.noticetoken != null  && targetuser._id.toString() != req.user._id.toString()){
            var message = {
                notification : {
                    body : req.user.name+' 님이 ' + like[0].textcontent + ' 플레이리스트를 좋아합니다.',
                },
                token : targetuser.noticetoken,
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

router.delete('/Dailylike/:id' , async(req,res) =>{
    try{
        await Daily.findOneAndUpdate({_id :req.params.id}, {$pull :{ likes:req.user._id}}, {new :true});
        let [like] = await Promise.all( [Daily.find({_id :req.params.id}).populate('postUserId'), Notice.findOneAndDelete({$and: [{ daily:req.params.id}, { noticetype:'plike' }, { noticinguser:req.user._id }]}) ])
        res.send(like[0]);
        await Notice.findOneAndDelete({$and: [{ noticinguser:req.user._id }, { daily:req.params.id}, { noticetype:'plike' }]});
    }catch(err){
        return res.status(422).send(err.message);
    }
});

//like comments
router.post('/Dailylikecomment/:Dailyid/:id' , async(req,res) =>{
    try{
        const like =  await Comment.findOneAndUpdate({_id : req.params.id}, {$push : {likes : req.user._id}}, {new:true});
        const comments = await Comment.find({$and : [{dailyId:req.params.Dailyid},{parentcommentId:""}]}).populate('postUserId');
        const nowTime = new Date();
        var time = nowTime.toFormat('YYYY-MM-DD HH24:MI:SS');
        for(let key in comments){
            const commentTime = new Date(comments[key].time);
            const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
            if (betweenTime < 1){
                comments[key]['time'] = '방금전';
            }else if (betweenTime < 60) {
                comments[key]['time'] = `${betweenTime}분전`;
            }else{
                const betweenTimeHour = Math.floor(betweenTime / 60);
                if (betweenTimeHour < 24) {
                    comments[key]['time'] = `${betweenTimeHour}시간전`;
                }else{
                    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                    if (betweenTimeDay < 365) {
                        comments[key]['time'] =  `${betweenTimeDay}일전`;
                    }
                }        
            }
        }
        res.send(comments);
        if(like.postUserId.toString() != req.user._id.toString()){
            try {
                const notice  = new Notice({ noticinguser:req.user._id, noticieduser:like.postUserId, noticetype:'pcomlike', time, Daily:req.params.Dailyid, Dailycomment:req.params.id });
                await notice.save();
            } catch (err) {
                return res.status(422).send(err.message);
            }
        }

        const targetuser = await User.findOne({_id:like.postUserId});

        if( targetuser.noticetoken != null  && targetuser._id.toString() != req.user._id.toString()){
            var message = {
                notification : {
                    body : req.user.name+'님이 ' + like.text + ' 댓글을 좋아합니다.',
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

router.delete('/Dailylikecomment/:Dailyid/:id' , async(req,res) =>{
    try{
        const like = await Comment.findOneAndUpdate({_id :req.params.id}, {$pull :{ likes:req.user._id}} , {new :true});
        let [comments] = await Promise.all( [Comment.find({$and : [{dailyId:req.params.Dailyid},{parentcommentId:""}]}).populate('postUserId'), Notice.findOneAndDelete({$and: [{ Daily:req.params.Dailyid }, { Dailycomment: req.params.id }, { noticinguser:req.user._id }, { noticetype:'pcomlike' }, { noticieduser:like.postUserId }]}) ])
        const nowTime = new Date();
        for(let key in comments){
            const commentTime = new Date(comments[key].time);
            const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
            if (betweenTime < 1){
                comments[key]['time'] = '방금전';
            }else if (betweenTime < 60) {
                comments[key]['time'] = `${betweenTime}분전`;
            }else{
                const betweenTimeHour = Math.floor(betweenTime / 60);
                if (betweenTimeHour < 24) {
                    comments[key]['time'] = `${betweenTimeHour}시간전`;
                }else{
                    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                    if (betweenTimeDay < 365) {
                        comments[key]['time'] =  `${betweenTimeDay}일전`;
                    }
                }        
            }
        }
        res.send(comments);
        await Notice.findOneAndDelete({$and: [{ Daily:req.params.dailyid }, { Dailycomment: req.params.id }, { noticinguser:req.user._id }, { noticetype:'pcomlike' }, { noticieduser:like.postUserId }]});
    }catch(err){
        return res.status(422).send(err.message);
    }
});

//like recomments
router.post('/Dailylikerecomment/:commentid/:id' , async(req,res) =>{
    var newDate = new Date()
    var time = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
    try{
        const like =  await Comment.findOneAndUpdate({_id : req.params.id}, {$push : {likes : req.user._id}}, {new:true});
        let comments = await Comment.find({parentcommentId:req.params.commentid}).populate('postUserId');
        const nowTime = new Date();
        for(let key in comments){
            const commentTime = new Date(comments[key].time);
            const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
            if (betweenTime < 1){
                comments[key]['time'] = '방금전';
            }else if (betweenTime < 60) {
                comments[key]['time'] = `${betweenTime}분전`;
            }else{
                const betweenTimeHour = Math.floor(betweenTime / 60);
                if (betweenTimeHour < 24) {
                    comments[key]['time'] = `${betweenTimeHour}시간전`;
                }else{
                    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                    if (betweenTimeDay < 365) {
                        comments[key]['time'] =  `${betweenTimeDay}일전`;
                    }
                }        
            }
        }
        res.send(comments);
        if(like.postUserId._id.toString() != req.user._id.toString()){
            try {
                const notice  = new Notice({ noticinguser:req.user._id, noticieduser:like.postUserId, noticetype:'precomlike', time, Daily:like.dailyId, Dailycomment:req.params.commentid, Dailyrecomment:like._id });
                await notice.save();
            } catch (err) {
                return res.status(422).send(err.message);
            }
        }
        const targetuser = await User.findOne({_id:like.postUserId});

        if( targetuser.noticetoken != null  && targetuser._id.toString() != req.user._id.toString()){
            var message = {
                notification : {
                    body : req.user.name+'님이 ' + like.text + ' 대댓글을 좋아합니다.',
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

router.delete('/Dailylikerecomment/:commentid/:id' , async(req,res) =>{
    try{
        const like =await Comment.findOneAndUpdate({_id :req.params.id}, {$pull :{ likes:req.user._id}} , {new :true});
        let [comments] = await Promise.all( [Comment.find({parentcommentId:req.params.commentid}).populate('postUserId'), Notice.findOneAndDelete({$and: [{ Daily:like.dailyId }, { Dailycomment: req.params.commentid }, { Dailyrecomment:req.params.id }, { noticinguser:req.user._id }, { noticetype:'precomlike' }, { noticieduser:like.postUserId }]}) ])
        const nowTime = new Date();
        for(let key in comments){
            const commentTime = new Date(comments[key].time);
            const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
            if (betweenTime < 1){
                comments[key]['time'] = '방금전';
            }else if (betweenTime < 60) {
                comments[key]['time'] = `${betweenTime}분전`;
            }else{
                const betweenTimeHour = Math.floor(betweenTime / 60);
                if (betweenTimeHour < 24) {
                    comments[key]['time'] = `${betweenTimeHour}시간전`;
                }else{
                    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                    if (betweenTimeDay < 365) {
                        comments[key]['time'] =  `${betweenTimeDay}일전`;
                    }
                }        
            }
        }
        res.send(comments);
    }catch(err){
        return res.status(422).send(err.message);
    }
});

module.exports = router;
