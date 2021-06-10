const express = require('express');
const mongoose = require('mongoose');
const requireAuth = require('../middlewares/requireAuth');
const multer  = require('multer');
const multerS3 = require('multer-s3');
const aws = require('aws-sdk');
var admin = require('firebase-admin');

const Board = mongoose.model('Board');
const Content = mongoose.model('boardContent');
const Comment = mongoose.model('BoardComment');
const ReComment = mongoose.model('BoardReComment')
const Song = mongoose.model('BoardSong');
const User = mongoose.model('User');
const Notice = mongoose.model('Notice');

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

// board

router.post('/createBoard', async (req, res) => {
    const { name, introduction, genre } = req.body;
    var newDate = new Date()
    var time = newDate.toFormat('YYYY/MM/DD HH24:MI:SS');
    try{
        const board = Board({ name, introduction, genre, time, email: req.user.email, creatorId: req.user._id });
        res.send(board);
        board.save();
    }catch (err) {
        return res.status(422).send(err.message);
    }
});

router.post('/pushBookmark', async (req, res) => {
    const { id } = req.body;
    try{
        const [currentBoard] = await Promise.all([Board.findOneAndUpdate({_id: id}, {$push: {pick: req.user._id}}, {new: true}), User.findOneAndUpdate({_id: req.user._id}, {$push: {boardBookmark: mongoose.Types.ObjectId(id)}})]);
        res.send(currentBoard);
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.delete('/deleteBookmark/:id', async (req, res) => {
    try {
        const [currentBoard] = await Promise.all([Board.findOneAndUpdate({_id: req.params.id}, {$pull: {pick :req.user._id}}, {new: true}), User.findOneAndUpdate({'_id': req.user._id}, {$pull: {boardBookmark: mongoose.Types.ObjectId(req.params.id)}})]);
        res.send(currentBoard);
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.get('/getBoard/:name', async(req, res) => {
    const board = await Board.find({name: {$regex:`${req.params.name}`}});
    res.send(board);
});

router.get('/getSelectedBoard/:id', async(req, res) => {
    const board = await Board.findOne({_id: req.params.id});
    res.send(board);
});

router.get('/getPopularBoard', async (req, res) => {
    const board = await Board.find();
    board.sort(function(a, b){
        if(a.pick.length  > b.pick.length)  return -1;
        if(a.pick.length  < b.pick.length) return 1;
        return 0;
    })
    res.send(board.slice(0,60));
});

router.get('/getCurrentBoard/:boardId', async(req, res) => {
    const contents = await Content.find({boardId: req.params.boardId, 'isDeleted': false}).sort({'time': -1}).limit(20).populate('postUserId');
    const nowTime = new Date();
    for(let key in contents){
        const commentTime = new Date(contents[key].time);
        const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
        if (betweenTime < 1){
            contents[key]['time'] = '방금전';
        }else if (betweenTime < 60) {
            contents[key]['time'] = `${betweenTime}분전`;
        }else{
            const betweenTimeHour = Math.floor(betweenTime / 60);
            if (betweenTimeHour < 24) {
                contents[key]['time'] = `${betweenTimeHour}시간전`;
            }else{
                const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                if (betweenTimeDay < 365) {
                    contents[key]['time'] =  `${betweenTimeDay}일전`;
                }
            }        
        }
    }
    res.send(contents);
});

router.get('/nextContents/:boardId/:page', async (req, res) => {
    const contents = await Content.find({boardId: req.params.boardId, 'isDeleted' : false}).sort({'time': -1}).skip(req.params.page*20).limit(20).populate('postUserId');
    const nowTime = new Date();
    for(let key in contents){
        const commentTime = new Date(contents[key].time);
        const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
        if (betweenTime < 1){
            contents[key]['time'] = '방금전';
        }else if (betweenTime < 60) {
            contents[key]['time'] = `${betweenTime}분전`;
        }else{
            const betweenTimeHour = Math.floor(betweenTime / 60);
            if (betweenTimeHour < 24) {
                contents[key]['time'] = `${betweenTimeHour}시간전`;
            }else{
                const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                if (betweenTimeDay < 365) {
                    contents[key]['time'] =  `${betweenTimeDay}일전`;
                }
            }        
        }
    }
    res.send(contents);
});


// content

router.post('/createContent', async (req, res) => {
    const { title, content, boardId } = req.body;
    var newDate = new Date()
    var time = newDate.toFormat('YYYY/MM/DD HH24:MI:SS');
    try {
        const newContent = await new Content({ title, content, postUser: req.user.name, postUserId: req.user._id, boardId, time }).save();
        res.send(newContent);
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.delete('/deleteContent/:contentId/:boardId', async (req, res) => {
    try {
        const content = await Content.findOneAndUpdate({_id: req.params.contentId}, {$set: {'isDeleted': true}}, {new: true});
        const contents = await Content.find({boardId: req.params.boardId, 'isDeleted': false}).sort({'time': -1}).limit(20).populate('postUserId');
        const nowTime = new Date();
        for(let key in contents){
            const commentTime = new Date(contents[key].time);
            const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
            if (betweenTime < 1){
                contents[key]['time'] = '방금전';
            }else if (betweenTime < 60) {
                contents[key]['time'] = `${betweenTime}분전`;
            }else{
                const betweenTimeHour = Math.floor(betweenTime / 60);
                if (betweenTimeHour < 24) {
                    contents[key]['time'] = `${betweenTimeHour}시간전`;
                }else{
                    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                    if (betweenTimeDay < 365) {
                        contents[key]['time'] =  `${betweenTimeDay}일전`;
                    }
                }        
            }
        }
        res.send(contents);
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.post('/boardImgUpload', upload.fields([{name: 'img'}, {name: 'contentId'}]), async (req, res) => {
    const { contentId, boardId } = req.body;
    const img = req.files['img'];
    let imgArr = [];
    if(img != undefined)    img.forEach((item) => imgArr.push(item.location));
    try {
        if(imgArr.length != 0)  await Content.findOneAndUpdate({_id: contentId }, {$set: {image: imgArr}}, {new: true});
        const contents = await Content.find({boardId: boardId, 'isDeleted': false}).sort({'time': -1}).limit(20).populate('postUserId');
        const nowTime = new Date();
        for(let key in contents){
            const commentTime = new Date(contents[key].time);
            const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
            if (betweenTime < 1){
                contents[key]['time'] = '방금전';
            }else if (betweenTime < 60) {
                contents[key]['time'] = `${betweenTime}분전`;
            }else{
                const betweenTimeHour = Math.floor(betweenTime / 60);
                if (betweenTimeHour < 24) {
                    contents[key]['time'] = `${betweenTimeHour}시간전`;
                }else{
                    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                    if (betweenTimeDay < 365) {
                        contents[key]['time'] =  `${betweenTimeDay}일전`;
                    }
                }        
            }
        }
        res.send(contents);
    } catch (err) {
        return res.status(422).send(err.message);
    }
    
});

router.post('/likeContent', async (req, res) => {
    const { contentId } = req.body;
    var newDate = new Date()
    var time = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
    try {
        await Content.findOneAndUpdate({_id: contentId}, {$push: {'likes': req.user._id}}, {new: true});
        const currentContent = await Content.find({_id: contentId}).populate('postUserId');
        const nowTime = new Date();
        const contentTime = new Date(currentContent[0].time);
        const betweenTime = Math.floor((nowTime.getTime() - contentTime.getTime()) / 1000 / 60);
        if (betweenTime < 1){
            currentContent[0]['time'] = '방금전';
        }else if (betweenTime < 60) {
            currentContent[0]['time'] = `${betweenTime}분전`;
        }else{
            const betweenTimeHour = Math.floor(betweenTime / 60);
            if (betweenTimeHour < 24) {
                currentContent[0]['time'] = `${betweenTimeHour}시간전`;
            }else{
                const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                if (betweenTimeDay < 365) {
                    currentContent[0]['time'] =  `${betweenTimeDay}일전`;
                }
            }        
        }
        res.send(currentContent[0]);
        if(currentContent[0].postUserId._id.toString() != req.user._id.toString()){
            try {
                const notice  = new Notice({ noticinguser: req.user._id, noticieduser:currentContent[0].postUserId._id, noticetype:'blike', time, board:currentContent[0].boardId, boardcontent:currentContent[0]._id });
                notice.save();
            } catch (err) {
                return res.status(422).send(err.message);
            }
        }

        const targetuser = await User.findOne({_id:currentContent[0].postUserId._id});
        if( targetuser.noticetoken != null  && targetuser._id.toString() != req.user._id.toString()){
            var message = {
                notification : {
                    body : req.user.name+' 님이 게시글' + currentContent[0].content + '을 좋아합니다.',
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

router.post('/unlikeContent', async (req, res) => {
    const { contentId } = req.body;
    var newDate = new Date()
    var time = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
    try {
        await Content.findOneAndUpdate({_id: contentId}, {$pull: {'likes': req.user._id}}, {new: true});
        const currentContent = await Content.find({_id: contentId}).populate('postUserId');
        const nowTime = new Date();
        const contentTime = new Date(currentContent[0].time);
        const betweenTime = Math.floor((nowTime.getTime() - contentTime.getTime()) / 1000 / 60);
        if (betweenTime < 1){
            currentContent[0]['time'] = '방금전';
        }else if (betweenTime < 60) {
            currentContent[0]['time'] = `${betweenTime}분전`;
        }else{
            const betweenTimeHour = Math.floor(betweenTime / 60);
            if (betweenTimeHour < 24) {
                currentContent[0]['time'] = `${betweenTimeHour}시간전`;
            }else{
                const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                if (betweenTimeDay < 365) {
                    currentContent[0]['time'] =  `${betweenTimeDay}일전`;
                }
            }        
        }
        res.send(currentContent[0]);
        await Notice.findOneAndDelete({$and: [{ board:currentContent[0].boardId }, { noticetype:'blike' }, { noticinguser:req.user._id }, { boardcontent:currentContent[0]._id }]});
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.post('/scrabContent', async (req, res) => {
    const { id } = req.body;
    try {
        await Content.findOneAndUpdate({_id: id}, {$push: {scrabs: req.user._id}}, {new: true});
        const [currentContent] = await Promise.all([Content.find({_id: id}).populate('postUserId'),  User.findOneAndUpdate({ _id: req.user._id }, {$push: {scrabContent: req.user._id}}, {new: true})]);
        const nowTime = new Date();
        const contentTime = new Date(currentContent[0].time);
        const betweenTime = Math.floor((nowTime.getTime() - contentTime.getTime()) / 1000 / 60);
        if (betweenTime < 1){
            currentContent[0]['time'] = '방금전';
        }else if (betweenTime < 60) {
            currentContent[0]['time'] = `${betweenTime}분전`;
        }else{
            const betweenTimeHour = Math.floor(betweenTime / 60);
            if (betweenTimeHour < 24) {
                currentContent[0]['time'] = `${betweenTimeHour}시간전`;
            }else{
                const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                if (betweenTimeDay < 365) {
                    currentContent[0]['time'] =  `${betweenTimeDay}일전`;
                }
            }        
        }
        res.send(currentContent[0]);
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.delete('/deleteScrabContent/:id', async (req, res) => {
    try {
        await Promise.all([Content.findOneAndUpdate({_id: req.params.id}, {$pull: {scrabs: req.user._id}}, {new: true}), User.findOneAndUpdate({_id: req.user._id}, {$pull: {scrabContent: {_id: mongoose.Types.ObjectId(req.user._id)}}}, {new: true})]);
        const currentContent = await Content.find({_id: req.params.id}).populate('postUserId');
        const nowTime = new Date();
        const contentTime = new Date(currentContent[0].time);
        const betweenTime = Math.floor((nowTime.getTime() - contentTime.getTime()) / 1000 / 60);
        if (betweenTime < 1){
            currentContent[0]['time'] = '방금전';
        }else if (betweenTime < 60) {
            currentContent[0]['time'] = `${betweenTime}분전`;
        }else{
            const betweenTimeHour = Math.floor(betweenTime / 60);
            if (betweenTimeHour < 24) {
                currentContent[0]['time'] = `${betweenTimeHour}시간전`;
            }else{
                const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                if (betweenTimeDay < 365) {
                    currentContent[0]['time'] =  `${betweenTimeDay}일전`;
                }
            }        
        }
        res.send(currentContent[0]);
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.get('/getCurrentContent/:id', async(req, res) => {
    try{
        //const [currentContent, currentComment, currentReComment] = await Promise.all([Content.find({_id: req.params.id}).populate('postUserId'),  Comment.find({'contentId': req.params.id}).limit(20).populate('postUserId'), ReComment.find({contentId: req.params.id}).populate('postUserId')]);
        const [currentContent, currentComment, currentReComment] = await Promise.all([Content.find({_id: req.params.id}).populate('postUserId'),  Comment.find({'contentId': req.params.id}).populate('postUserId'), ReComment.find({contentId: req.params.id}).populate('postUserId')]);
        
        if(currentContent.length == 0){
            res.send([[], []]);
            return;
        }
        const nowTime = new Date();
        const commentTime = new Date(currentContent[0].time);
        const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
        
        for(let key in currentComment){
            const commentTime = new Date(currentComment[key].time);
            const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
            if (betweenTime < 1){
                currentComment[key]['time'] = '방금전';
            }else if (betweenTime < 60) {
                currentComment[key]['time'] = `${betweenTime}분전`;
            }else{
                const betweenTimeHour = Math.floor(betweenTime / 60);
                if (betweenTimeHour < 24) {
                    currentComment[key]['time'] = `${betweenTimeHour}시간전`;
                }else{
                    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                    if (betweenTimeDay < 365) {
                        currentComment[key]['time'] =  `${betweenTimeDay}일전`;
                    }
                }        
            }
        }
        for(let key in currentReComment){
            const commentTime = new Date(currentReComment[key].time);
            const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
            if (betweenTime < 1){
                currentReComment[key]['time'] = '방금전';
            }else if (betweenTime < 60) {
                currentReComment[key]['time'] = `${betweenTime}분전`;
            }else{
                const betweenTimeHour = Math.floor(betweenTime / 60);
                if (betweenTimeHour < 24) {
                    currentReComment[key]['time'] = `${betweenTimeHour}시간전`;
                }else{
                    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                    if (betweenTimeDay < 365) {
                        currentReComment[key]['time'] =  `${betweenTimeDay}일전`;
                    }
                }        
            }
        }
        for(let key in currentComment){
            for(let val in currentReComment){
                if(currentReComment[val].parentId.toString() == currentComment[key]._id.toString()){
                    if(!currentReComment[val].isDeleted)    currentComment[key].comments.push(currentReComment[val]);
                }
            }
        }
        if (betweenTime < 1){
            currentContent[0]['time'] = '방금전';
        }else if (betweenTime < 60) {
            currentContent[0]['time'] = `${betweenTime}분전`;
        }else{
            const betweenTimeHour = Math.floor(betweenTime / 60);
            if (betweenTimeHour < 24) {
                currentContent[0]['time'] = `${betweenTimeHour}시간전`;
            }else{
                const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                if (betweenTimeDay < 365) {
                    currentContent[0]['time'] =  `${betweenTimeDay}일전`;
                }
            }        
        }
        
        res.send([currentContent[0], currentComment]);
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.get('/nextComments/:id/:page', async(req, res) => {
    try{
        const comments = await Comment.find({'contentId': req.params.id}).skip(req.params.page*20).limit(20);
        res.send(comments);
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.get('/getSearchContent/:id/:text', async (req, res) => {
    try{
        const resContent = [];
        const contents = await Content.find({boardId: req.params.id}).populate('postUserId');
        for(let key in contents){
            if(!contents[key].isDeleted && (contents[key].content.includes(req.params.text) || contents[key].title.includes(req.params.text))){
                resContent.push(contents[key]);
            }
        }
        resContent.sort(function(a, b){
            if(a.time  > b.time)  return -1;
            if(a.time  < b.time) return 1;
            return 0;
        })
        res.send(resContent);
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

// comment

router.post('/createComment', async (req, res) => {
    const { comment, contentId } = req.body;
    var newDate = new Date()
    var time = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
    try {
        const newComment = await new Comment({ contentId, comment, time, postUser: req.user.name, postUserId: req.user._id }).save();
        //const currentContent = await Content.findOneAndUpdate({_id: contentId}, {$push: {comments: req.user._id}}, {new: true}).populate('postUserId');
        const [currentContent, currentComment, reComment] = await Promise.all([Content.findOneAndUpdate({_id: contentId}, {$push: {comments: req.user._id}}, {new: true}).populate('postUserId'),Comment.find({'contentId': contentId}).limit(20).populate('postUserId'), ReComment.find({contentId:contentId}).populate('postUserId')])
        const nowTime = new Date();
        const contentTime = new Date(currentContent.time);
        const betweenTime = Math.floor((nowTime.getTime() - contentTime.getTime()) / 1000 / 60);
        for(let key in currentComment){
            const commentTime = new Date(currentComment[key].time);
            const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
            if (betweenTime < 1){
                currentComment[key]['time'] = '방금전';
            }else if (betweenTime < 60) {
                currentComment[key]['time'] = `${betweenTime}분전`;
            }else{
                const betweenTimeHour = Math.floor(betweenTime / 60);
                if (betweenTimeHour < 24) {
                    currentComment[key]['time'] = `${betweenTimeHour}시간전`;
                }else{
                    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                    if (betweenTimeDay < 365) {
                        currentComment[key]['time'] =  `${betweenTimeDay}일전`;
                    }
                }        
            }
        }
        for(let key in reComment){
            const commentTime = new Date(reComment[key].time);
            const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
            if (betweenTime < 1){
                reComment[key]['time'] = '방금전';
            }else if (betweenTime < 60) {
                reComment[key]['time'] = `${betweenTime}분전`;
            }else{
                const betweenTimeHour = Math.floor(betweenTime / 60);
                if (betweenTimeHour < 24) {
                    reComment[key]['time'] = `${betweenTimeHour}시간전`;
                }else{
                    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                    if (betweenTimeDay < 365) {
                        reComment[key]['time'] =  `${betweenTimeDay}일전`;
                    }
                }        
            }
        }
        for(let key in currentComment){
            for(let val in reComment){
                if(reComment[val].parentId.toString() == currentComment[key]._id.toString()){
                    if(!reComment[val].isDeleted)    currentComment[key].comments.push(reComment[val]);
                }
            }
        }
        if (betweenTime < 1){
            currentContent['time'] = '방금전';
        }else if (betweenTime < 60) {
            currentContent['time'] = `${betweenTime}분전`;
        }else{
            const betweenTimeHour = Math.floor(betweenTime / 60);
            if (betweenTimeHour < 24) {
                currentContent['time'] = `${betweenTimeHour}시간전`;
            }else{
                const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                if (betweenTimeDay < 365) {
                    currentContent['time'] =  `${betweenTimeDay}일전`;
                }
            }        
        }

        res.send([currentContent, currentComment]);
        //newComment.save(); 
        if(currentContent.postUserId._id.toString() != req.user._id.toString()){
            try {
                const notice = new Notice({ noticinguser:req.user._id, noticieduser:currentContent.postUserId, noticetype:'bcom', time, board:currentContent.boardId, boardcontent:currentContent._id, boardcomment: mongoose.Types.ObjectId(newComment._id) });
                await notice.save();
            } catch (err) {
                return res.status(422).send(err.message);
            }
        }        
        
        const targetuser = await User.findOne({_id:currentContent.postUserId});

        if( targetuser.noticetoken != null  && targetuser._id.toString() != req.user._id.toString()){
            var message = {
                notification : {
                    title: currentContent.title,
                    body : req.user.name+'님이 ' + comment + ' 댓글을 달았습니다.',
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

router.delete('/deleteComment/:contentId/:commentId', async (req, res) => {    
    try {
        const [currentContent, c, reComment] = await Promise.all([Content.find({_id: req.params.contentId}).populate('postUserId'), Comment.findOneAndUpdate({_id: req.params.commentId}, {$set: {isDeleted: true}}, {new: true}), ReComment.find({contentId: req.params.contentId}).populate('postUserId')]);
        //await Comment.findOneAndUpdate({_id: req.params.commentId}, {$set: {isDeleted: true}}, {new: true});
        //let currentContent = await Content.findOne({_id: req.params.contentId});
        const nowTime = new Date();
        const commentTime = new Date(currentContent[0].time);
        const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
        
        if (betweenTime < 1){
            currentContent[0]['time'] = '방금전';
        }else if (betweenTime < 60) {
            currentContent[0]['time'] = `${betweenTime}분전`;
        }else{
            const betweenTimeHour = Math.floor(betweenTime / 60);
            if (betweenTimeHour < 24) {
                currentContent[0]['time'] = `${betweenTimeHour}시간전`;
            }else{
                const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                if (betweenTimeDay < 365) {
                    currentContent[0]['time'] =  `${betweenTimeDay}일전`;
                }
            }        
        }
        
        currentContent[0].comments.splice(currentContent[0].comments.findIndex(element => element == req.user_id), 1);
        const currentComment = await Comment.find({contentId: req.params.contentId}).populate('postUserId');
        for(let key in currentComment){
            const commentTime = new Date(currentComment[key].time);
            const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
            if (betweenTime < 1){
                currentComment[key]['time'] = '방금전';
            }else if (betweenTime < 60) {
                currentComment[key]['time'] = `${betweenTime}분전`;
            }else{
                const betweenTimeHour = Math.floor(betweenTime / 60);
                if (betweenTimeHour < 24) {
                    currentComment[key]['time'] = `${betweenTimeHour}시간전`;
                }else{
                    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                    if (betweenTimeDay < 365) {
                        currentComment[key]['time'] =  `${betweenTimeDay}일전`;
                    }
                }        
            }
        }
        for(let key in reComment){
            const commentTime = new Date(reComment[key].time);
            const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
            if (betweenTime < 1){
                reComment[key]['time'] = '방금전';
            }else if (betweenTime < 60) {
                reComment[key]['time'] = `${betweenTime}분전`;
            }else{
                const betweenTimeHour = Math.floor(betweenTime / 60);
                if (betweenTimeHour < 24) {
                    reComment[key]['time'] = `${betweenTimeHour}시간전`;
                }else{
                    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                    if (betweenTimeDay < 365) {
                        reComment[key]['time'] =  `${betweenTimeDay}일전`;
                    }
                }        
            }
        }
        for(let key in currentComment){
            for(let val in reComment){
                if(reComment[val].parentId.toString() == currentComment[key]._id.toString()){
                    if(!reComment[val].isDeleted)   currentComment[key].comments.push(reComment[val]);
                }
            }
        }
        res.send([currentContent[0], currentComment]);
        await Notice.findOneAndDelete({$and: [{ board:currentContent[0].boardId }, { noticetype:'bcom' }, { noticinguser:req.user._id }, { boardcontent:currentContent[0]._id }, { boardcomment:req.params.commentId }]});
        currentContent[0].save();
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.post('/createReComment', async (req, res) => {
    const { comment, contentId, commentId } = req.body;
    var newDate = new Date()
    var time = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
    try {
        const newReComment = await new ReComment({postUserId: req.user._id, comment, time, parentId: commentId, contentId: contentId}).save();
        const [parentComment, c, reComment] = await Promise.all([Comment.findOne({ _id: commentId }), Content.findOneAndUpdate({_id: contentId}, {$push: {comments: req.user._id}}, {new: true}), ReComment.find({contentId: contentId}).populate('postUserId')]);
        //parentComment = Comment.findOneAndUpdate({ _id: commentId }, {$push: {comments: newReComment}}, {new:true})
        //const parentComment = await Comment.findOneAndUpdate({ _id: commentId }, {$push: {comments: newReComment}}, {new:true});
        //const currentContent = await Content.findOneAndUpdate({_id: contentId}, {$push: {comments: req.user._id}}, {new: true});
        let [currentComment,currentContent] = await Promise.all([Comment.find({contentId: contentId}).populate('postUserId'), Content.find({_id: contentId}).populate('postUserId')]);

        const nowTime = new Date();
        const contentTime = new Date(currentContent[0].time);
        const betweenTime = Math.floor((nowTime.getTime() - contentTime.getTime()) / 1000 / 60);

        for(let key in currentComment){
            const commentTime = new Date(currentComment[key].time);
            const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
            if (betweenTime < 1){
                currentComment[key]['time'] = '방금전';
            }else if (betweenTime < 60) {
                currentComment[key]['time'] = `${betweenTime}분전`;
            }else{
                const betweenTimeHour = Math.floor(betweenTime / 60);
                if (betweenTimeHour < 24) {
                    currentComment[key]['time'] = `${betweenTimeHour}시간전`;
                }else{
                    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                    if (betweenTimeDay < 365) {
                        currentComment[key]['time'] =  `${betweenTimeDay}일전`;
                    }
                }
            }
        }

        for(let key in reComment){
            const commentTime = new Date(reComment[key].time);
            const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
            if (betweenTime < 1){
                reComment[key]['time'] = '방금전';
            }else if (betweenTime < 60) {
                reComment[key]['time'] = `${betweenTime}분전`;
            }else{
                const betweenTimeHour = Math.floor(betweenTime / 60);
                if (betweenTimeHour < 24) {
                    reComment[key]['time'] = `${betweenTimeHour}시간전`;
                }else{
                    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                    if (betweenTimeDay < 365) {
                        reComment[key]['time'] =  `${betweenTimeDay}일전`;
                    }
                }
            }
        }
        for(let key in currentComment){
            for(let val in reComment){
                if(reComment[val].parentId.toString() == currentComment[key]._id.toString()){
                    if(!reComment[val].isDeleted)   currentComment[key].comments.push(reComment[val]);
                }
            }
        }

        if (betweenTime < 1){
            currentContent[0]['time'] = '방금전';
        }else if (betweenTime < 60) {
            currentContent[0]['time'] = `${betweenTime}분전`;
        }else{
            const betweenTimeHour = Math.floor(betweenTime / 60);
            if (betweenTimeHour < 24) {
                currentContent[0]['time'] = `${betweenTimeHour}시간전`;
            }else{
                const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                if (betweenTimeDay < 365) {
                    currentContent[0]['time'] =  `${betweenTimeDay}일전`;
                }
            }
        }

        res.send([currentContent[0], currentComment]);
        if(parentComment.postUserId.toString() != req.user._id.toString()){
            try {
                const notice = new Notice({ noticinguser:req.user._id, noticieduser:parentComment.postUserId, noticetype:'brecom', time, board:currentContent[0].boardId, boardcontent:contentId, boardrecomment : mongoose.Types.ObjectId(newReComment._id)});
                await notice.save();
            } catch (err) {
                return res.status(422).send(err.message);
            }
        }
        const targetuser = await User.findOne({_id:parentComment.postUserId});
        if( targetuser.noticetoken != null  && targetuser._id.toString() != req.user._id.toString()){
            var message = {
                notification : {
                    title: currentContent.title,
                    body : req.user.name+ '님이 ' + comment + ' 대댓글을 달았습니다.',
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

router.delete('/deleteRecomment/:contentId/:commentId', async (req, res) => {
    try {
        const [targetComment, currentContent] = await Promise.all([ReComment.findOneAndUpdate({ _id: req.params.commentId }, {isDeleted: true}, {new:true}), Content.find({_id: req.params.contentId}).populate('postUserId')]);
        //const targetComment = await Comment.findOneAndUpdate({ 'comments._id': req.params.commentId }, {$pull: {comments: {_id: req.params.commentId}}}, {new:true});
        //let currentContent = await Content.findOne({_id: req.params.contentId});
        const nowTime = new Date();
        const commentTime = new Date(currentContent[0].time);
        const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
        
        if (betweenTime < 1){
            currentContent[0]['time'] = '방금전';
        }else if (betweenTime < 60) {
            currentContent[0]['time'] = `${betweenTime}분전`;
        }else{
            const betweenTimeHour = Math.floor(betweenTime / 60);
            if (betweenTimeHour < 24) {
                currentContent[0]['time'] = `${betweenTimeHour}시간전`;
            }else{
                const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                if (betweenTimeDay < 365) {
                    currentContent[0]['time'] =  `${betweenTimeDay}일전`;
                }
            }        
        }


        currentContent[0].comments.splice(currentContent[0].comments.findIndex(element => element == req.user_id), 1);
        const [currentComment, reComment] = await Promise.all([Comment.find({contentId: req.params.contentId}).populate('postUserId'), ReComment.find({contentId: req.params.contentId}).populate('postUserId')]);
        for(let key in currentComment){
            const commentTime = new Date(currentComment[key].time);
            const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
            if (betweenTime < 1){
                currentComment[key]['time'] = '방금전';
            }else if (betweenTime < 60) {
                currentComment[key]['time'] = `${betweenTime}분전`;
            }else{
                const betweenTimeHour = Math.floor(betweenTime / 60);
                if (betweenTimeHour < 24) {
                    currentComment[key]['time'] = `${betweenTimeHour}시간전`;
                }else{
                    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                    if (betweenTimeDay < 365) {
                        currentComment[key]['time'] =  `${betweenTimeDay}일전`;
                    }
                }        
            }
        }
        
        for(let key in reComment){
            const commentTime = new Date(reComment[key].time);
            const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
            if (betweenTime < 1){
                reComment[key]['time'] = '방금전';
            }else if (betweenTime < 60) {
                reComment[key]['time'] = `${betweenTime}분전`;
            }else{
                const betweenTimeHour = Math.floor(betweenTime / 60);
                if (betweenTimeHour < 24) {
                    reComment[key]['time'] = `${betweenTimeHour}시간전`;
                }else{
                    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                    if (betweenTimeDay < 365) {
                        reComment[key]['time'] =  `${betweenTimeDay}일전`;
                    }
                }        
            }
        }
        for(let key in currentComment){
            for(let val in reComment){
                if(reComment[val].parentId.toString() == currentComment[key]._id.toString()){
                    if(!reComment[val].isDeleted)   currentComment[key].comments.push(reComment[val]);
                }
            }
        }
        
        
        res.send([currentContent[0], currentComment]);
        currentContent[0].save();
        await Notice.findOneAndDelete({$and: [{ board:currentContent[0].boardId }, { noticetype:'brecom' }, { noticinguser:req.user._id }, { boardcontent:currentContent[0]._id }, { boardrecomment : req.params.commentId }]});
    } catch (err) {
        return res.status(422).send(err.message);
    }
})

router.post('/likeComment', async (req, res) => {
    const { contentId, commentId } = req.body;
    var newDate = new Date()
    var time = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
    try {
        const targetComment = await Comment.findOneAndUpdate({'_id': commentId}, {$push: {'likes': req.user._id}}, {new:true});
        const [currentComment, currentContent, reComment] = await Promise.all([Comment.find({contentId: contentId}).populate('postUserId'), Content.findOne({_id:contentId}), ReComment.find({contentId: contentId}).populate('postUserId')]);
        //const currentComment = await Comment.find({contentId: contentId});
        //const currentContent = await Content.findOne({_id:contentId});
        const nowTime = new Date();
        for(let key in currentComment){
            const commentTime = new Date(currentComment[key].time);
            const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
            if (betweenTime < 1){
                currentComment[key]['time'] = '방금전';
            }else if (betweenTime < 60) {
                currentComment[key]['time'] = `${betweenTime}분전`;
            }else{
                const betweenTimeHour = Math.floor(betweenTime / 60);
                if (betweenTimeHour < 24) {
                    currentComment[key]['time'] = `${betweenTimeHour}시간전`;
                }else{
                    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                    if (betweenTimeDay < 365) {
                        currentComment[key]['time'] =  `${betweenTimeDay}일전`;
                    }
                }        
            }
        }
        
        for(let key in reComment){
            const commentTime = new Date(reComment[key].time);
            const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
            if (betweenTime < 1){
                reComment[key]['time'] = '방금전';
            }else if (betweenTime < 60) {
                reComment[key]['time'] = `${betweenTime}분전`;
            }else{
                const betweenTimeHour = Math.floor(betweenTime / 60);
                if (betweenTimeHour < 24) {
                    reComment[key]['time'] = `${betweenTimeHour}시간전`;
                }else{
                    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                    if (betweenTimeDay < 365) {
                        reComment[key]['time'] =  `${betweenTimeDay}일전`;
                    }
                }        
            }
        }
        for(let key in currentComment){
            for(let val in reComment){
                if(reComment[val].parentId.toString() == currentComment[key]._id.toString()){
                    if(!reComment[val].isDeleted)    currentComment[key].comments.push(reComment[val]);
                }
            }
        }
        
        
        res.send(currentComment);
        if(targetComment.postUserId.toString() != req.user._id.toString()){
            try {
                const notice  = new Notice({ noticinguser:req.user._id, noticieduser:targetComment.postUserId, noticetype:'bcomlike', time, board:currentContent.boardId, boardcontent:targetComment.contentId, boardcomment:commentId });
                await notice.save();
            } catch (err) {
                return res.status(422).send(err.message);
            }
        }

        const targetuser = await User.findOne({_id:targetComment.postUserId});
        if( targetuser.noticetoken != null  && targetuser._id.toString() != req.user._id.toString()){
            var message = {
                notification : {
                    title: currentContent.title,
                    body : req.user.name+'님이 ' + targetComment.comment + ' 댓글을 좋아합니다.',
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

router.post('/unlikeComment', async (req, res) => {
    const { contentId, commentId } = req.body;
    var newDate = new Date()
    var time = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
    try {
        const targetComment = await Comment.findOneAndUpdate({'_id': commentId}, {$pull: {'likes': req.user._id}}, {new:true});
        const [currentComment, currentContent, reComment] = await Promise.all([Comment.find({contentId: contentId}).populate('postUserId'), Content.findOne({_id:contentId}), ReComment.find({contentId: contentId}).populate('postUserId')]);
        //const currentComment = await Comment.find({contentId: contentId});
        //const currentContent = await Content.findOne({_id:contentId});
        const nowTime = new Date();
        for(let key in currentComment){
            const commentTime = new Date(currentComment[key].time);
            const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
            if (betweenTime < 1){
                currentComment[key]['time'] = '방금전';
            }else if (betweenTime < 60) {
                currentComment[key]['time'] = `${betweenTime}분전`;
            }else{
                const betweenTimeHour = Math.floor(betweenTime / 60);
                if (betweenTimeHour < 24) {
                    currentComment[key]['time'] = `${betweenTimeHour}시간전`;
                }else{
                    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                    if (betweenTimeDay < 365) {
                        currentComment[key]['time'] =  `${betweenTimeDay}일전`;
                    }
                }        
            }
        }
        
        for(let key in reComment){
            const commentTime = new Date(reComment[key].time);
            const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
            if (betweenTime < 1){
                reComment[key]['time'] = '방금전';
            }else if (betweenTime < 60) {
                reComment[key]['time'] = `${betweenTime}분전`;
            }else{
                const betweenTimeHour = Math.floor(betweenTime / 60);
                if (betweenTimeHour < 24) {
                    reComment[key]['time'] = `${betweenTimeHour}시간전`;
                }else{
                    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                    if (betweenTimeDay < 365) {
                        reComment[key]['time'] =  `${betweenTimeDay}일전`;
                    }
                }        
            }
        }
        for(let key in currentComment){
            for(let val in reComment){
                if(reComment[val].parentId.toString() == currentComment[key]._id.toString()){
                    if(!reComment[val].isDeleted)   currentComment[key].comments.push(reComment[val]);
                }
            }
        }
        
        res.send(currentComment);
        await Notice.findOneAndDelete({$and: [{ board:currentContent.boardId }, { noticetype:'bcomlike' }, { noticinguser:req.user._id }, { boardcontent: contentId }, { boardcomment : commentId }]});
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.post('/likeRecomment', async (req, res) => {
    const { contentId, commentId } = req.body;
    var newDate = new Date()
    var time = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
    try {
        await ReComment.findOneAndUpdate({_id: commentId}, {$push: {likes: req.user._id}}, {new: true});
        //const [targetComment, currentComment, reComment, currentContent] = await Promise.all([Comment.find({'comments._id': commentId}, {'comments.$': 1}), Comment.find({contentId: contentId}).populate('postUserId'), ReComment.find({contentId:contentId}).populate('postUserId'), Content.findOne({_id:contentId})]);
        const [targetComment, currentComment, reComment, currentContent] = await Promise.all([ReComment.findOne({_id: commentId}), Comment.find({contentId: contentId}).populate('postUserId'), ReComment.find({contentId:contentId}).populate('postUserId'), Content.findOne({_id:contentId})]);
        
        //const targetComment = await Comment.find({'comments._id': commentId}, {'comments.$': 1})
        //const currentComment = await Comment.find({contentId: contentId});
        //const currentContent = await Content.findOne({_id:contentId});
        
        const nowTime = new Date();
        for(let key in currentComment){
            const commentTime = new Date(currentComment[key].time);
            const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
            if (betweenTime < 1){
                currentComment[key]['time'] = '방금전';
            }else if (betweenTime < 60) {
                currentComment[key]['time'] = `${betweenTime}분전`;
            }else{
                const betweenTimeHour = Math.floor(betweenTime / 60);
                if (betweenTimeHour < 24) {
                    currentComment[key]['time'] = `${betweenTimeHour}시간전`;
                }else{
                    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                    if (betweenTimeDay < 365) {
                        currentComment[key]['time'] =  `${betweenTimeDay}일전`;
                    }
                }        
            }
        }
        
        for(let key in reComment){
            const commentTime = new Date(reComment[key].time);
            const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
            if (betweenTime < 1){
                reComment[key]['time'] = '방금전';
            }else if (betweenTime < 60) {
                reComment[key]['time'] = `${betweenTime}분전`;
            }else{
                const betweenTimeHour = Math.floor(betweenTime / 60);
                if (betweenTimeHour < 24) {
                    reComment[key]['time'] = `${betweenTimeHour}시간전`;
                }else{
                    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                    if (betweenTimeDay < 365) {
                        reComment[key]['time'] =  `${betweenTimeDay}일전`;
                    }
                }        
            }
        }
        for(let key in currentComment){
            for(let val in reComment){
                if(reComment[val].parentId.toString() == currentComment[key]._id.toString()){
                    if(!reComment[val].isDeleted)    currentComment[key].comments.push(reComment[val]);
                }
            }
        }
        
        
        res.send(currentComment);
        if(targetComment.postUserId.toString() != req.user._id.toString()){
            try {
                const notice  = new Notice({ noticinguser:req.user._id, noticieduser:targetComment.postUserId, noticetype:'brecomlike', time, board:currentContent.boardId, boardcontent:contentId, boardrecomment : commentId });
                await notice.save();
            } catch (err) {
                return res.status(422).send(err.message);
            }
        }
        const targetuser = await User.findOne({_id:targetComment.postUserId});
        if( targetuser.noticetoken != null  && targetuser._id.toString() != req.user._id.toString()){
            var message = {
                notification : {
                    title: currentContent.title,
                    body : req.user.name+'님이 ' + targetComment.comment + ' 대댓글을 좋아합니다.',
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

router.post('/unlikeRecomment', async (req, res) => {
    const { contentId, commentId } = req.body;
    var newDate = new Date()
    var time = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
    try {
        await ReComment.findOneAndUpdate({_id: commentId}, {$pull: {likes: req.user._id}}, {new: true});
        const [targetComment, currentComment, reComment, currentContent] = await Promise.all([Comment.find({'comments._id': commentId}, {'comments.$': 1}), Comment.find({contentId: contentId}).populate('postUserId'), ReComment.find({contentId:contentId}).populate('postUserId'), Content.findOne({_id:contentId})]);
        //const targetComment = await Comment.find({'comments._id': commentId}, {'comments.$': 1})
        //const currentComment = await Comment.find({contentId: contentId});
        //const currentContent = await Content.findOne({_id:contentId});
        
        const nowTime = new Date();
        for(let key in currentComment){
            const commentTime = new Date(currentComment[key].time);
            const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
            if (betweenTime < 1){
                currentComment[key]['time'] = '방금전';
            }else if (betweenTime < 60) {
                currentComment[key]['time'] = `${betweenTime}분전`;
            }else{
                const betweenTimeHour = Math.floor(betweenTime / 60);
                if (betweenTimeHour < 24) {
                    currentComment[key]['time'] = `${betweenTimeHour}시간전`;
                }else{
                    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                    if (betweenTimeDay < 365) {
                        currentComment[key]['time'] =  `${betweenTimeDay}일전`;
                    }
                }        
            }
        }
        
        for(let key in reComment){
            const commentTime = new Date(reComment[key].time);
            const betweenTime = Math.floor((nowTime.getTime() - commentTime.getTime()) / 1000 / 60);
            if (betweenTime < 1){
                reComment[key]['time'] = '방금전';
            }else if (betweenTime < 60) {
                reComment[key]['time'] = `${betweenTime}분전`;
            }else{
                const betweenTimeHour = Math.floor(betweenTime / 60);
                if (betweenTimeHour < 24) {
                    reComment[key]['time'] = `${betweenTimeHour}시간전`;
                }else{
                    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
                    if (betweenTimeDay < 365) {
                        reComment[key]['time'] =  `${betweenTimeDay}일전`;
                    }
                }        
            }
        }
        for(let key in currentComment){
            for(let val in reComment){
                if(reComment[val].parentId.toString() == currentComment[key]._id.toString()){
                    if(!reComment[val].isDeleted)    currentComment[key].comments.push(reComment[val]);
                }
            }
        }
        
        res.send(currentComment);
        await Notice.findOneAndDelete({$and: [{ board:currentContent.boardId }, { noticetype:'brecomlike' }, { noticinguser:req.user._id }, { boardcontent: contentId }, { boardrecomment : commentId }]});
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

// Song

router.post('/addSong', async (req, res) => {
    const { boardId, song } = req.body;
    var newDate = new Date()
    var time = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
    try {
        const newSong = new Song({ postUser: req.user.name, postUserId: req.user._id, time, song, boardId });
        await newSong.save();
        res.send(newSong);
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.post('/likeSong', async(req, res) => {
    const { id, boardName, boardId } = req.body;
    var newDate = new Date()
    var noticeTime = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
    try {
        const targetSong = await Song.findOneAndUpdate({_id: id}, {$push: {likes: req.user._id}}, {new: true});
        const songs = await Song.find({boardId: boardId}).populate('postUserId');
        const nowTime = new Date();
        let deleteSongs = []
        let time = {}
        for(let key in songs){
            const songTime = new Date(songs[key].time);
            const millisec = parseInt(nowTime - songTime) / 1000;
            const hour = parseInt(millisec/60/60);
            const min = parseInt(millisec/60);
            const sec = parseInt(millisec-(min*60));
            if(hour >= 24){
                deleteSongs.push(songs[key]);
            }else{
                if(hour > 0){
                    time[songs[key]._id] = hour+"시간 전";
                }else if(min > 0){
                    time[songs[key]._id] = min+"분 전";
                }else{
                    time[songs[key]._id] = sec+"초 전";
                }
            }
        }
        const resSongs = songs.filter(item=> deleteSongs.includes(item) == false);
        songs.sort(function(a, b){
            if(a.likes.length  > b.likes.length)  return -1;
            if(a.likes.length  < b.likes.length) return 1;
            return 0;
        })
        res.send([resSongs, songs]);
        if(targetSong.postUserId.toString() != req.user._id.toString()){
            try {
                const currentBoard = await Board.findOne({_id: boardId});
                const notice  = new Notice({ noticinguser:req.user._id, noticieduser:targetSong.postUserId, noticetype:'bsonglike', time: noticeTime, board: currentBoard._id, boardsong: targetSong._id });
                await notice.save();
            } catch (err) {
                return res.status(422).send(err.message);
            }
        }

        const targetuser = await User.findOne({_id:targetSong.postUserId});
        if( targetuser.noticetoken != null  && targetuser._id.toString() != req.user._id.toString()){
            var message = {
                notification : {
                    title: boardName,
                    body : req.user.name+' 님이' + targetSong.song.attributes.artistName + ' - ' + targetSong.song.attributes.name + ' 을 좋아합니다.',
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

router.delete('/unlikeSong/:id/:boardId', async(req, res) => {
    try {
        const targetSong = await Song.findOneAndUpdate({_id: req.params.id}, {$pull: {likes: req.user._id}}, {new: true});
        const songs = await Song.find({boardId: req.params.boardId}).populate('postUserId');
        const nowTime = new Date();
        let deleteSongs = []
        let time = {}
        for(let key in songs){
            const songTime = new Date(songs[key].time);
            const millisec = parseInt(nowTime - songTime) / 1000;
            const hour = parseInt(millisec/60/60);
            const min = parseInt(millisec/60);
            const sec = parseInt(millisec-(min*60));
            if(hour >= 24){
                deleteSongs.push(songs[key]);
            }else{
                if(hour > 0){
                    time[songs[key]._id] = hour+"시간 전";
                }else if(min > 0){
                    time[songs[key]._id] = min+"분 전";
                }else{
                    time[songs[key]._id] = sec+"초 전";
                }
            }
        }
        const resSongs = songs.filter(item=> deleteSongs.includes(item) == false);
        songs.sort(function(a, b){
            if(a.likes.length  > b.likes.length)  return -1;
            if(a.likes.length  < b.likes.length) return 1;
            return 0;
        })
        res.send([resSongs, songs]);
        const currentBoard = await Board.findOne({ _id: req.params.boardId });
        await Notice.findOneAndDelete({$and: [{ board:currentBoard._id }, { noticetype:'bsonglike' }, { noticinguser:req.user._id }, { boardsong: targetSong._id }]});    
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.post('/addSongView', async(req, res) => {
    const { id, boardId, postUserId } = req.body;
    try {
        if(req.user._id.toString() != postUserId.toString()){
            await Song.findOneAndUpdate({_id: id}, {$inc: {views: 1}}, {new: true});
        }
        const chartSongs = await Song.find({boardId: boardId}).populate('postUserId');
        chartSongs.sort(function(a, b){
            if(a.likes.length  > b.likes.length)  return -1;
            if(a.likes.length  < b.likes.length) return 1;
            return 0;
        })
        res.send(chartSongs);
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.get('/getMusicArchive/:boardId', async(req, res) => {
    try {
        const songs = await Song.find({boardId: req.params.boardId}).populate('postUserId');
        const nowTime = new Date();
        let deleteSongs = []
        let time = {}
        for(let key in songs){
            const songTime = new Date(songs[key].time);
            const millisec = parseInt(nowTime - songTime) / 1000;
            const hour = parseInt(millisec/60/60);
            const min = parseInt(millisec/60);
            const sec = parseInt(millisec-(min*60));
            if(hour >= 24){
                deleteSongs.push(songs[key]);
            }else{
                if(hour > 0){
                    time[songs[key]._id] = hour+"시간 전";
                }else if(min > 0){
                    time[songs[key]._id] = min+"분 전";
                }else{
                    time[songs[key]._id] = sec+"초 전";
                }
            }
        }
        const resSongs = songs.filter(item=> deleteSongs.includes(item) == false);
        res.send([resSongs, time]);
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.get('/getMusicChart/:boardId', async(req, res) => {
    try {
        const songs = await Song.find({boardId: req.params.boardId}).populate('postUserId');
        songs.sort(function(a, b){
            if(a.likes.length  > b.likes.length)  return -1;
            if(a.likes.length  < b.likes.length) return 1;
            return 0;
        })
        res.send(songs);
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

module.exports = router;
