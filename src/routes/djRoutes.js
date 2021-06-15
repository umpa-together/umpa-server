const express = require('express');
const mongoose = require('mongoose');
const requireAuth = require('../middlewares/requireAuth');
const User = mongoose.model('User');
const Playlist = mongoose.model('Playlist');
const router = express.Router();
router.use(requireAuth);

// DJ

router.get('/SimilarTaste', async (req, res) => {
    try {
        const users = await User.find({'songs': {$in : req.user.songs}});
        const resUser = users.filter(user => user._id.toString() != req.user._id.toString());
        res.send(resUser);
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.get('/recommendDJ', async (req, res) => {
    try {
        const myGenre = {};
        const userScore = [];
        for(let key in req.user.songs){
            req.user.songs[key].attributes.genreNames.map((item) => {
                if(item != '음악'){
                    if(!myGenre[item]){
                        myGenre[item] = 1/(req.user.songs[key].attributes.genreNames.length*req.user.songs.length);
                    }else{
                        myGenre[item] += (1/(req.user.songs[key].attributes.genreNames.length*req.user.songs.length));
                    }
                }});
        }
        const users = await User.find({}, {songs: 1, profileImage: 1, name: 1});
        for(let key in users){
            if(users[key]._id.toString() == req.user._id.toString())  continue;
            const tmpGenre = {};
            let tmpScore = 0;
            for(let song in users[key].songs){
                users[key].songs[song].attributes.genreNames.map((item) => {
                    if(item != '음악'){
                        if(!tmpGenre[item]){
                            tmpGenre[item] = 1/(users[key].songs[song].attributes.genreNames.length*users[key].songs.length);
                        }else{
                            tmpGenre[item] += (1/(users[key].songs[song].attributes.genreNames.length*users[key].songs.length));
                        }
                    }
                })
            }
            for(let genre in tmpGenre){
                if(myGenre[genre] != undefined){
                    tmpScore += (myGenre[genre] * tmpGenre[genre]);
                } 
            }
            const playlist = await Playlist.find({postUserId: users[key]._id}, {image: 1});
            userScore.push({_id: users[key]._id, score: tmpScore, name: users[key].name, profileImage: users[key].profileImage, songs: users[key].songs, playlist: playlist});
        }
        userScore.sort(function(a, b) {
            if(a.score > b.score) return -1;
            if(a.score < b.score) return 1;
            return 0;
        });
        res.send(userScore.filter(item => item.playlist.length >= 2).slice(0,10))

    } catch (err) {
        return res.status(422).send(err.message);
    }
});

// Songs

router.get('/getSongs/:id', async (req, res) => {
    try {
        const user = await User.findOne({_id: req.params.id});
        res.send(user.songs);
    } catch (err) { 
        return res.status(422).send(err.message); 
    }
});
  
router.post('/setSongs', async (req, res) => {
    const { songs } = req.body;
    try {
        const user = await User.findOneAndUpdate({_id: req.user._id}, {$push: {songs: songs}}, {new: true});
        res.send(user.songs);
    } catch (err) {
        return res.status(422).send(err.message); 
    }
});

router.post('/editSongs', async (req, res) =>{
    const { songs } = req.body;
    try {
        const user = await User.findOneAndUpdate({_id: req.user._id}, {$set: {songs: songs}}, {new: true});
        res.send(user.songs);
    } catch (err) {
        return res.status(422).send(err.message); 
    }
});
module.exports = router;