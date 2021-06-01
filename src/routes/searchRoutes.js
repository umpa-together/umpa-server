const express = require('express');
const mongoose = require('mongoose');
const Playlist = mongoose.model('Playlist');
const User = mongoose.model('User');
const Hashtag = mongoose.model('Hashtag');

const requireAuth = require('../middlewares/requireAuth');

const router = express.Router();
router.use(requireAuth);

router.get('/initPlaylist', async (req, res) => {
    try {
        const playlistNum= await Playlist.countDocuments();
        res.send({playlistNum});
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.get('/searchSongOrArtist/:id', async (req, res) => {
    try {
        const foundPlaylist = []
        const playList = await Playlist.find().populate('postUserId', {profileImage: 1});
        for(let key in playList){
            for(let song in playList[key].songs){
                if(playList[key].songs[song].id == req.params.id){
                    foundPlaylist.push(playList[key]);
                    break;
                }
            }
        }
        res.send(foundPlaylist);
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.get('/searchHashtag/:object', async (req, res) => {
    try {
        const playList = await Hashtag.find({hashtag :req.params.object}).populate('playlistId');
        res.send(playList.playlistId);
    } catch (err) {
        return res.status(422).send(err.message);
    }
});


router.get('/hashtagHint/:term', async (req, res) => {
    try {
        const hint = await Hashtag.find({hashtag: {$regex: `${req.params.term}`}}).populate('playlistId');
        let resultHint = [];
        for(let key in hint){
            if(hint[key].playlistId.length != 0)    resultHint.push(hint[key])
        }
        res.send(resultHint);
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.get('/djHint/:term', async (req, res) => {
    try {
        const hint = await User.find({name: {$regex: `${req.params.term}`, $options:'i'}});
        res.send(hint);
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.get('/searchDJ/:songName', async (req, res) => {
    try {
        const users = await User.find({'songs.attributes.name' : {$regex:`${req.params.songName}`}});
        const user = users.filter(user => user._id.toString() != req.user._id.toString());
        user.sort(function(a, b){
            if(a.songsView  > b.songsView)  return -1;
            if(a.songsView  < b.songsView) return 1;
            return 0;
        })
        res.send(user);
    } catch (err) {
        return res.status(422).send(err.message);
    }
})

router.get('/currentHashtag', async (req, res) => {
    try {
        const hashtag = await Hashtag.find().sort( { time: -1 } ).limit(30).populate('playlistId');
        const resultHashtag = [];
        for(let key in hashtag){
            if(hashtag[key].playlistId.length != 0){
                if(resultHashtag.length != 0 && 
                    resultHashtag[resultHashtag.length-1].playlistId[resultHashtag[resultHashtag.length-1].playlistId.length-1]._id != hashtag[key].playlistId[hashtag[key].playlistId.length-1]._id){
                    resultHashtag.push(hashtag[key])
                }else if(resultHashtag.length == 0){
                    resultHashtag.push(hashtag[key])
                }
            } 
            if(resultHashtag.length == 10)  break;

            //if(hashtag[key].playlistId.length != 0) resultHashtag.push(hashtag[key])
            //if(resultHashtag.length == 10)  break;
        }
        res.send(resultHashtag);
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

module.exports = router;