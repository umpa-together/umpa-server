const express = require('express');
const mongoose = require('mongoose');
const requireAuth = require('../middlewares/requireAuth');
const multer  = require('multer');
const multerS3 = require('multer-s3');
const aws = require('aws-sdk');
var admin = require('firebase-admin');

const Board = mongoose.model('Board');
const User = mongoose.model('User');
const Content = mongoose.model('boardContent');
const Song = mongoose.model('BoardSong');
const Notice = mongoose.model('Notice');
const Playlist = mongoose.model('Playlist');

const router = express.Router();
router.use(requireAuth);
require('date-utils');

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

// Account

router.get('/getMyInfo', async (req, res) => {
  const nowTime = new Date();
  try {
    const user = await User.findOneAndUpdate({ _id: req.user._id }, {$set: {accessedTime :nowTime}}).populate('following').populate('follower').populate('playlists').populate('curationposts');
    res.send(user);
  } catch (err) {
    return res.status(422).send(err.message); 
  }
});

router.get('/otheruser/:id', async(req, res) => {
  const user= await User.find({_id : req.params.id}).populate('following').populate('follower').populate('playlists').populate('curationposts');
  res.send(user[0]);
});

router.post('/editProfile', async(req, res) => {
  const { name, introduction } = req.body;
  try {
    const user = await User.findOneAndUpdate({_id: req.user._id}, {$set: {name: name, introduction: introduction}}, {new: true}).populate('following').populate('follower').populate('playlists').populate('curationposts');
    res.send(user);
  } catch (err) {
    return res.status(422).send(err.message); 
  }
})

router.post('/editProfileImage', upload.single('img'), async (req, res) => {
  const img = req.file.location;
  try {
    const user = await User.findOneAndUpdate({_id: req.user._id}, {$set: {profileImage: img}}, {new: true}).populate('following').populate('follower').populate('playlists').populate('curationposts');
    res.send(user);
  } catch (err) {
    return res.status(422).send(err.message); 
  }
});

router.post('/guide', async (req, res) => {
  const { type } = req.body;
  try {
    let user;
    if(type == 'playlist'){
      user = await User.findOneAndUpdate({_id: req.user._id}, {$set: {'playlistGuide': true}}, {new: true}).populate('following').populate('follower').populate('playlists').populate('curationposts');
    }else if(type == 'curation'){
      user = await User.findOneAndUpdate({_id: req.user._id}, {$set: {'curationGuide': true}}, {new: true}).populate('following').populate('follower').populate('playlists').populate('curationposts');
    }else if(type == 'board'){
      user = await User.findOneAndUpdate({_id: req.user._id}, {$set: {'boardGuide': true}}, {new: true}).populate('following').populate('follower').populate('playlists').populate('curationposts');
    }else if(type == 'create'){
      user = await User.findOneAndUpdate({_id: req.user._id}, {$set: {'createGuide': true}}, {new: true}).populate('following').populate('follower').populate('playlists').populate('curationposts');
    }
    res.send(user);
  } catch (err) {
    return res.status(422).send(err.message); 
  }
})

router.post('/addView', async (req, res) => {
  const { id } = req.body;
  try {
    let user;
    if(req.user._id != id){
      user = await User.findOneAndUpdate({_id: id}, {$inc: {songsView: 1}}, {new: true});
    }
    res.send(user);
  } catch (err) {
    return res.status(422).send(err.message); 
  }
});

router.post('/follow/:id', async(req,res) =>{
  var newDate = new Date()
  var time = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
  try{
    const result = await User.findOneAndUpdate({_id: req.params.id}, {$push : { follower : req.user._id }}, {upsert:true}).populate('follower').populate('following');
    res.send(result);
    await User.findOneAndUpdate({_id: req.user._id}, {$push : {following : req.params.id}}, {upsert:true});
    const notice  = new Notice({ noticinguser:req.user._id, noticieduser:result._id, noticetype:'follow', time });
    notice.save();

    if(result.noticetoken != null  && result._id.toString() != req.user._id.toString()){
      var message = {
          notification : {
              body : req.user.name+'님이 당신을 팔로우 합니다.',
          },
          token : result.noticetoken
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

router.delete('/follow/:id', async(req,res) =>{
  try{
    const result = await User.findOneAndUpdate({_id: req.params.id}, {$pull : { follower : req.user._id}}, {new:true}).populate('follower').populate('following');
    res.send(result);
    await Promise.all([User.findOneAndUpdate({_id : req.user._id}, {$pull : {following :req.params.id}}, {new:true}), Notice.findOneAndDelete({$and: [{ noticetype:'follow' }, { noticinguser:req.user._id }, { noticieduser:req.params.id }]}) ]);

  }catch(err){
      return res.status(422).send(err.message);
  }
});

router.post('/follower', async(req,res) =>{
  const { follower } = req.body;
  try{
    const result = await User.find({_id: {$in : follower}}).populate('follower');
    res.send(result);
  }catch(err){
      return res.status(422).send(err.message);
  }
});

router.post('/following', async(req,res) =>{
  const { following } = req.body;
  try{
    const result = await User.find({_id: {$in : following}}).populate('following');
    res.send(result);
  }catch(err){
      return res.status(422).send(err.message);
  }
});

// Board

router.get('/getMyBookmark', async (req, res) => {
  try {
    const result = [];
    for(let key in req.user.boardBookmark){
      const board = await Board.findOne({_id: req.user.boardBookmark[key]}, {name: 1, introduction: 1, pick: 1});
      result.push(board);
    }
    res.send(result);
  } catch (err) {
    return res.status(422).send(err.message); 
  }
});

router.get('/getMyContent', async (req, res) => {
  try {
    await Content.find({postUserId: req.user._id}).populate('boardId').exec((err, data) => {
      data.sort(function(a, b){
        if(a.time  > b.time)  return -1;
        if(a.time < b.time) return 1;
        return 0;
      });
      res.send(data);
    });
  } catch (err) {
    return res.status(422).send(err.message); 
  }
});

router.get('/getMyComment', async (req, res) => {
  try {
    await Content.find({comments: req.user._id}).populate('boardId').exec((err, data) => {
      data.sort(function(a, b){
        if(a.time  > b.time)  return -1;
        if(a.time < b.time) return 1;
        return 0;
      });
      res.send(data);
    });
  } catch (err) {
    return res.status(422).send(err.message); 
  }
});

router.get('/getMyScrab', async (req, res) => {
  try {
    await Content.find({scrabs: req.user._id}).populate('boardId').exec((err, data) => {
      data.sort(function(a, b){
        if(a.time  > b.time)  return -1;
        if(a.time < b.time) return 1;
        return 0;
      });
      res.send(data);
    });
  } catch (err) { 
    return res.status(422).send(err.message); 
  }
});

router.get('/getMyBoardSongs', async (req, res) => {
  try {
    const Songs = await Song.find({postUserId: req.user._id}).populate('boardId', {name: 1});
    res.send(Songs);
  } catch (err) {
    return res.status(422).send(err.message); 
  }
});

router.get('/getLikePlaylists', async (req, res) => {
  try {
    const playlists = await Playlist.find({likes: {$in : req.user._id}}, {title: 1, hashtag: 1, image: 1, postUserId: 1});
    res.send(playlists.reverse())
  } catch (err) {
    return res.status(422).send(err.message); 
  }
})

router.post('/addSonginPlaylists', async (req, res) => {
  const { song } = req.body;
  var newDate = new Date()
  var time = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
  try {
    song.time = time;
    const user = await User.findOneAndUpdate({_id: req.user._id}, {$push: {myPlaylists: song}}, {new: true});
    res.send(user.myPlaylists);
  } catch (err) {
    return res.status(422).send(err.message); 
  }
})

router.get('/deleteSonginPlaylists/:time', async (req, res) => {
  try {
    const user = await User.findOne({_id: req.user._id});
    user.myPlaylists = user.myPlaylists.filter((item) => item.time !=req.params.time)
    res.send(user.myPlaylists)
    user.save();
  } catch (err) {
    return res.status(422).send(err.message); 
  }
})

router.post('/Story', async (req, res) => {
  const { song } = req.body;
  var newDate = new Date()
  var time = newDate.toFormat('YYYY-MM-DD');
  try {
    const storySong = {'time': time, 'song': song, 'view': [], 'id': req.user._id};
    res.send(storySong);
    await User.findOneAndUpdate({_id: req.user._id}, {$push: {todaySong: storySong}}, {new: true});
  } catch (err) {
    return res.status(422).send(err.message); 
  }
});

router.delete('/Story', async (req, res) => {
  try {
    const user = await User.findOne({_id: req.user._id});
    await User.findOneAndUpdate({_id: req.user._id}, {$pull: {todaySong: user.todaySong[user.todaySong.length-1]}}, {new: true});
    res.send('null');
  } catch (err) {
    return res.status(422).send(err.message); 
  }
})

router.get('/MyStory', async (req, res) => {
  var newDate = new Date()
  var time = newDate.toFormat('YYYY-MM-DD');
  try {
    const user = await User.findOne({_id: req.user._id});
    const storyViewUsers = [];
    if(user.todaySong[user.todaySong.length-1].time == time){
      const view = user.todaySong[user.todaySong.length-1].view
      for(let key in view) {
        const viewUser = await User.findOne({_id: view[key]}, {name: 1, profileImage: 1})
        storyViewUsers.push(viewUser)
      }
      res.send([user.todaySong[user.todaySong.length-1], storyViewUsers]);
    }else{
      res.send([null, storyViewUsers]);
    }
  } catch (err) {
    return res.status(422).send(err.message); 
  }
});

router.get('/OtherStory', async (req, res) => {
  var newDate = new Date()
  var time = newDate.toFormat('YYYY-MM-DD');
  try {
    let readUser = [];
    let unReadUser = [];
    const me = await User.findOne({_id: req.user._id});
    if(me.todaySong != undefined && me.todaySong[me.todaySong.length-1].time == time){
        let storyUser = {'id': req.user._id, 'name': req.user.name, 'profileImage': req.user.profileImage, 'song': req.user.todaySong[req.user.todaySong.length-1]};
        unReadUser.push(storyUser)
    }
    User.find({_id: req.user._id}).populate('following').exec((err, data)=> {
      for(let key in data[0].following){
        const user = data[0].following[key];
        if(user.todaySong != undefined){
          if(user.todaySong.length!=0 && user.todaySong[user.todaySong.length-1].time == time){
            let storyUser = {'id': user._id, 'name': user.name, 'profileImage': user.profileImage, 'song': user.todaySong[user.todaySong.length-1] };
            if(user.todaySong[user.todaySong.length-1].view.map(u => u._id.toString()).includes(req.user._id.toString())){
              readUser.push(storyUser);
            }else{
              unReadUser.push(storyUser);
            }
          }
        }
      }
      res.send(unReadUser.concat(readUser));
    });
  } catch (err) {
    return res.status(422).send(err.message); 
  }
});

router.get('/StoryView/:id', async (req, res) => {
  var newDate = new Date()
  var time = newDate.toFormat('YYYY-MM-DD')
  const userId = req.params.id
  try {
    const user = await User.findOne({_id: userId});
    if(user.todaySong[user.todaySong.length-1].view.toString().includes(req.user._id)){
      res.send('null')
    }else{
      await User.findOneAndUpdate({_id: userId, 'todaySong.time': time}, {$push: {'todaySong.$.view': req.user._id}}, {new: true});
      res.send(user);
    }
  } catch (err) {
    return res.status(422).send(err.message); 
  }
});

router.get('/StoryCalendar/:id', async (req, res) => {
  const userId = req.params.id
  try {
    const story = await User.findOne({_id: userId}, {todaySong: 1});
    res.send(story.todaySong)
  } catch (err) {
    return res.status(422).send(err.message); 
  }
})


module.exports = router;