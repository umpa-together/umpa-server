const express = require('express');
const mongoose = require('mongoose');
const multer  = require('multer');
const multerS3 = require('multer-s3');
const aws = require('aws-sdk');
var admin = require('firebase-admin');

const Playlist = mongoose.model('Playlist');
const Comment = mongoose.model('PlaylistComment');
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
// get all playlists

router.get('/allPlaylists', async (req, res) => {
    const playlists = await Playlist.find().populate('postUserId').sort({'time': -1}).limit(20);
    res.send(playlists)
})

router.get('/allPlaylists/:page', async (req, res) => {
    const playlist = await Playlist.find().populate('postUserId').sort({'time': -1}).skip(req.params.page*20).limit(20);
    res.send(playlist)
})

router.get('/playlists', async(req,res) => {
    const playlist = await Playlist.find({$or: [{postUserId:{$in:req.user.following}}, {postUserId:req.user._id}]}).populate('postUserId').sort({'time': -1}).limit(20);    
    res.send(playlist);
});

router.get('/playlists/:page', async (req, res) => {
    const playlist = await Playlist.find({$or: [{postUserId:{$in:req.user.following}}, {postUserId:req.user._id}]}).populate('postUserId').sort({'time': -1}).skip(req.params.page*20).limit(20);
    res.send(playlist)
})

// add playlist
router.post('/playlist', requireAuth, async (req, res) =>{
    const { title, songs, hashtag } = req.body;
    var newDate = new Date()
    var time = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
    try {
        const playlist = new Playlist({ postUser: req.user.name, postUserId: req.user._id, title, time, songs, hashtag });
        res.send(playlist._id);
        hashtag.forEach(async(text) => {
            try{
            const hashtagr = await Hashtag.findOne({hashtag: text});
            if (hashtagr == null) {
                const hashtagn = new Hashtag({hashtag: text, playlistId: playlist._id, time});
                await hashtagn.save();
            }else{
                await Hashtag.findOneAndUpdate({hashtag: text}, {$set :{time :time}, $push : {playlistId : playlist._id} } );
           }
           }catch (err){
            return res.status(422).send(err.message);
           }
        });
        playlist.save();
        await User.findOneAndUpdate({_id:req.user._id}, {$push:{playlists:playlist._id}}, {new:true})

    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.post('/editPlaylist', async (req, res) => {
    const { title, textcontent, songs, hashtag, playlistId } = req.body;
    var newDate = new Date()
    var time = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
    try {
        const playlist = await Playlist.findOne({_id: playlistId});
        const prevHashtag = playlist.hashtag;
        
        for(let key in prevHashtag){
            await Hashtag.findOneAndUpdate({hashtag: prevHashtag[key]}, {$pull: {playlistId: playlistId}})
        }

        for(let key in hashtag){
            const hashtagr = await Hashtag.findOne({hashtag: hashtag[key]})
            if(hashtagr == null){
                const hashtagn = new Hashtag({hashtag: hashtag[key], playlistId: playlistId, time});
                await hashtagn.save();
            }else{
                await Hashtag.findOneAndUpdate({hashtag: hashtag[key]}, {$set : {time :time}, $push : {playlistId : playlistId} } );   
            }
        }
        await Playlist.findOneAndUpdate({_id: playlistId}, {$set: {title, textcontent, songs, hashtag}})
        res.send(playlist)
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.delete('/playlist/:id', async(req, res) => {
    try {
        const [playlist] = await Promise.all([Playlist.findOneAndDelete({_id : req.params.id}), Comment.deleteMany({playlistid : req.params.id}), Notice.deleteMany({playlist:req.params.id}),User.findOneAndUpdate({_id:req.user._id}, {$pull:{playlists:req.params.id}}, {new:true}) ]);
        const hashtag = playlist.hashtag
        for(let key in hashtag){
            await Hashtag.findOneAndUpdate({hashtag: hashtag[key]}, {$pull: {playlistId: req.params.id}})
        }
        res.send(playlist);
    } catch (err) {
        return res.status(422).send(err.message);
    }
});
// image Upload
router.post('/imgUpload', upload.fields([{name: 'img'}, {name: 'playlistId'}]), async (req, res) => {
    const img = req.files['img'][0].location;
    const { playlistId } = req.body;
    try {
        const playlist = await Playlist.findOneAndUpdate({_id: playlistId}, {$set: {image: img}});
        res.send(playlist);
    } catch (err) {
        return res.status(422).send(err.message);
    }
});


// get current playlist detail
router.get('/playlist/:id/:postUserId', requireAuth, async(req,res) => {
    const nowTime = new Date();
    let playlist, comments;
    if(req.params.postUserId == req.user._id){
        [playlist , comments] = await Promise.all([Playlist.findOneAndUpdate({_id: req.params.id }, {$set: {accessedTime :nowTime}}).populate('postUserId'), Comment.find({$and : [{playlistId:req.params.id},{parentcommentId:""}]}).populate('postUserId')])
    }else{
        [playlist , comments] = await Promise.all([ Playlist.findOneAndUpdate({_id:req.params.id}, {$inc: {views:1},  $set: {accessedTime :nowTime}}, {returnNewDocument: true }).populate('postUserId'), Comment.find({$and : [{playlistId:req.params.id},{parentcommentId:""}]}).populate('postUserId')])
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
    res.send([playlist, comments]);    
});

// add comment
router.post('/comment/:id', requireAuth, async(req,res) =>{
    const { text } = req.body;
    var newDate = new Date()
    var time = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
    const nowTime = new Date();
    try {
        const newComment = new Comment({ playlistId: req.params.id, postUser :req.user.name, postUserId: req.user._id, text, time });
        await newComment.save();
        let [playlist, comments]=  await Promise.all([Playlist.findOneAndUpdate({_id:req.params.id}, {$push: {comments:newComment._id}}, {returnNewDocument: true }).populate('postUserId'), Comment.find({$and : [{playlistId:req.params.id},{parentcommentId:""}]}).populate('postUserId')]);
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
        res.send([playlist, comments]);
        if(playlist.postUserId._id.toString() != req.user._id.toString()){
            try {
                const notice  = new Notice({ noticinguser:req.user._id, noticieduser : playlist.postUserId._id, noticetype :'pcom', time, playlist:req.params.id, playlistcomment:newComment._id });
                notice.save();
            } catch (err) {
                return res.status(422).send(err.message);
            }
        }
        const targetuser = await User.findOne({_id:playlist.postUserId._id});
        if( targetuser.noticetoken != null  && targetuser._id.toString() != req.user._id.toString()){
            var message = {
                notification : {
                    title: playlist.title,
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

router.delete('/comment/:id/:commentid', async(req,res) =>{
    try {
        await Comment.deleteMany({$or: [{_id : req.params.commentid}, {parentcommentId:req.params.commentid} ]});
        let [playlist , b, comments] = await Promise.all( [Playlist.findOneAndUpdate({_id:req.params.id},{$pull:{comments:req.params.commentid}}, {returnNewDocument: true }).populate('postUserId'), Notice.deleteMany({$and: [{ playlist:req.params.id }, { playlistcomment: req.params.commentid }]}) ,Comment.find({$and : [{playlistId:req.params.id},{parentcommentId:""}]}).populate('postUserId') ])
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
        res.send([playlist, comments]);

    } catch (err) {
        return res.status(422).send(err.message);
    }
});

//recomment
router.post('/recomment/:id/:commentid', requireAuth, async(req,res) =>{
    const { text } = req.body;
    var newDate = new Date()
    var time = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
    const nowTime = new Date();
    try {
        const comment = new Comment({ playlistId: req.params.id, parentcommentId:req.params.commentid, postUser :req.user.name, postUserId: req.user._id, text, time });
        await comment.save();
        const parentcomment = await Comment.findOneAndUpdate({_id : req.params.commentid},{$push:{recomments:comment._id}}).populate('playlistId');
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
                const notice  = new Notice({ noticinguser:req.user._id,  noticieduser:parentcomment.postUserId, noticetype:'precom', time, playlist:req.params.id, playlistcomment:req.params.commentid, playlistrecomment:comment._id });
                await notice.save();
            } catch (err) {
                return res.status(422).send(err.message);
            }
        }
        const targetuser = await User.findOne({_id:parentcomment.postUserId});

        if( targetuser.noticetoken != null  && targetuser._id.toString() != req.user._id.toString()){
            var message = {
                notification : {
                    title: parentcomment.playlistId.title,
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

router.get('/recomment/:commentid', async(req,res) =>{
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

router.delete('/recomment/:commentid', async(req,res) =>{
    try {
        const comment= await Comment.findOneAndDelete({_id : req.params.commentid});
        await Comment.findOneAndUpdate({_id : comment.parentcommentId},{$pull:{recomments:req.params.commentid}})
        let [comments] = await Promise.all( [Comment.find({parentcommentId:comment.parentcommentId}).populate('postUserId'), Notice.deleteMany({$and: [{ playlist:comment.playlistId }, { playlistcomment: mongoose.Types.ObjectId(comment.parentcommentId) }, { playlistrecomment:comment._id }]})])
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
router.post('/like/:id' , async(req,res) =>{
    var newDate = new Date()
    var noticeTime = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
    try{
        await Playlist.findOneAndUpdate({_id : req.params.id}, {$push : {likes : req.user._id}});
        let like = await Playlist.find({_id : req.params.id}).populate('postUserId');

        res.send(like[0]);

        if(like[0].postUserId._id.toString() != req.user._id.toString()){
            try {
                const notice  = new Notice({ noticinguser:req.user._id, noticieduser:like[0].postUserId, noticetype:'plike', time: noticeTime, playlist:like[0]._id });
                await notice.save();
            } catch (err) {
                return res.status(422).send(err.message);
            }
        }
        const targetuser = await User.findOne({_id:like[0].postUserId});
        if( targetuser.noticetoken != null  && targetuser._id.toString() != req.user._id.toString()){
            var message = {
                notification : {
                    body : req.user.name+' 님이 ' + like[0].title + ' 플레이리스트를 좋아합니다.',
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

router.delete('/like/:id' , async(req,res) =>{
    try{
        await Playlist.findOneAndUpdate({_id :req.params.id}, {$pull :{ likes:req.user._id}}, {new :true});
        let [like] = await Promise.all( [Playlist.find({_id :req.params.id}).populate('postUserId'), Notice.findOneAndDelete({$and: [{ playlist:req.params.id}, { noticetype:'plike' }, { noticinguser:req.user._id }]}) ])

        res.send(like[0]);
        await Notice.findOneAndDelete({$and: [{ noticinguser:req.user._id }, { playlist:req.params.id}, { noticetype:'plike' }]});
    }catch(err){
        return res.status(422).send(err.message);
    }
});

//like comments
router.post('/likecomment/:playlistid/:id' , async(req,res) =>{
    try{
        const like =  await Comment.findOneAndUpdate({_id : req.params.id}, {$push : {likes : req.user._id}}, {new:true});
        const comments = await Comment.find({$and : [{playlistId:req.params.playlistid},{parentcommentId:""}]}).populate('postUserId');
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
                const notice  = new Notice({ noticinguser:req.user._id, noticieduser:like.postUserId, noticetype:'pcomlike', time, playlist:req.params.playlistid, playlistcomment:req.params.id });
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

router.delete('/likecomment/:playlistid/:id' , async(req,res) =>{
    try{
        const like = await Comment.findOneAndUpdate({_id :req.params.id}, {$pull :{ likes:req.user._id}} , {new :true});
        let [comments] = await Promise.all( [Comment.find({$and : [{playlistId:req.params.playlistid},{parentcommentId:""}]}).populate('postUserId'), Notice.findOneAndDelete({$and: [{ playlist:req.params.playlistid }, { playlistcomment: req.params.id }, { noticinguser:req.user._id }, { noticetype:'pcomlike' }, { noticieduser:like.postUserId }]}) ])
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
        await Notice.findOneAndDelete({$and: [{ playlist:req.params.playlistid }, { playlistcomment: req.params.id }, { noticinguser:req.user._id }, { noticetype:'pcomlike' }, { noticieduser:like.postUserId }]});
    }catch(err){
        return res.status(422).send(err.message);
    }
});

//like recomments
router.post('/likerecomment/:commentid/:id' , async(req,res) =>{
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
                const notice  = new Notice({ noticinguser:req.user._id, noticieduser:like.postUserId, noticetype:'precomlike', time, playlist:like.playlistId, playlistcomment:req.params.commentid, playlistrecomment:like._id });
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

router.delete('/likerecomment/:commentid/:id' , async(req,res) =>{
    try{
        const like =await Comment.findOneAndUpdate({_id :req.params.id}, {$pull :{ likes:req.user._id}} , {new :true});
        let [comments] = await Promise.all( [Comment.find({parentcommentId:req.params.commentid}).populate('postUserId'), Notice.findOneAndDelete({$and: [{ playlist:like.playlistId }, { playlistcomment: req.params.commentid }, { playlistrecomment:req.params.id }, { noticinguser:req.user._id }, { noticetype:'precomlike' }, { noticieduser:like.postUserId }]}) ])
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