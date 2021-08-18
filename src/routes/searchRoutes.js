const express = require('express');
const mongoose = require('mongoose');
const Playlist = mongoose.model('Playlist');
const User = mongoose.model('User');
const Hashtag = mongoose.model('Hashtag');
const Daily = mongoose.model('Daily')

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
        const playList = await Hashtag.findOne({hashtag :req.params.object}).populate('playlistId');
        res.send(playList);
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.get('/searchAll/:id', async (req, res) => {
    try {
        const playlists = await Playlist.find({
            songs: { $elemMatch: { id: req.params.id }}
        }, {image: 1})
        
        const dj = await User.find({
            songs: { $elemMatch: { id: req.params.id}}
        }, {profileImage: 1})
        
        const result = {
            playlists: playlists,
            dj: dj
        }
        res.send(result)
    } catch (err) {
        return res.status(422).send(err.message);
    }
})

router.get('/searchHashtagAll/:term', async (req, res) => {
    try {
        const hashtag = await Hashtag.findOne({hashtag :req.params.term}).populate('playlistId', {image: 1}).populate('dailyId', {image: 1});
        const playlists = hashtag.playlistId
        const daily = hashtag.dailyId
        const result = {
            playlists: playlists,
            daily: daily
        }
        res.send(result)
    } catch (err) {
        return res.status(422).send(err.message);
    }
})

router.get('/hashtagHint/:term', async (req, res) => {
    try {
        const hint = await Hashtag.find({hashtag: {$regex: `${req.params.term}`}}).populate('playlistId').populate('dailyId');
        let resultHint = [];
        for(let key in hint){
            if(hint[key].playlistId.length !== 0 || hint[key].dailyId.length !== 0)    resultHint.push(hint[key])
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

router.get('/searchDJ/:id', async (req, res) => {
    try {
        //const users = await User.find({'songs.id' : {$regex:`${req.params.id}`}});
        const users = await User.find({'songs.id' : req.params.id});
        const user = users.filter(user => user._id.toString() != req.user._id.toString());
        res.send(user);
    } catch (err) {
        return res.status(422).send(err.message);
    }
})

router.get('/currentHashtag', async (req, res) => {
    try {
        const hashtag = await Hashtag.aggregate([{$sample: { size: 10 }}])
        const resultHashtag = await Hashtag.populate(hashtag, {path: "playlistId"});
        res.send(resultHashtag)
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

module.exports = router;