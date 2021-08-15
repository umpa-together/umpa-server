const express = require('express');
const mongoose = require('mongoose');
const requireAuth = require('../middlewares/requireAuth');
const User = mongoose.model('User');
const Playlist = mongoose.model('Playlist');
const router = express.Router();
router.use(requireAuth);

// DJ

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

router.get('/tmp', async (req, res) => {
    const users = await User.find({}, {playlists: 1, songs: 1, myPlaylists: 1, profileImage: 1, name: 1}).populate('playlists')
    const userScoreLists = []
    const { playlists, songs, myPlaylists, following } = req.user
    const songsId  = songs.map(({ id }) => id ) // score 5
    const myPlaylistsId = myPlaylists.map(({ id }) =>  id ) // score 4
    let playlistsId = [] // score 3

    for(let key in playlists){
        const { songs } = await Playlist.findOne({ _id: playlists[key] })
        playlistsId = playlistsId.concat(songs.map(({ id }) => id))
    }    

    users.forEach((user) => {
        if(user._id.toString() !== req.user._id.toString()){
            const { songs, myPlaylists, playlists } = user
            let userScore = 0
            const userSongsId = songs.map(({ id }) => id) // score 5 
            const userMyPlaylistsId = myPlaylists.map(({ id }) => id) // score 4
            let userPlaylistsId = [] // score 3
            let userPlaylistsLikeId = []
            playlists.map(({ songs }) => songs.map(({ id }) => (userPlaylistsId = userPlaylistsId.concat(id))))
            playlists.map(({ likes }) => (userPlaylistsLikeId = userPlaylistsLikeId.concat(likes)))
            songsId.filter((id) => {
                if(userSongsId.includes(id))    userScore += (25)
                if(userMyPlaylistsId.includes(id)) userScore += (20)
                if(userPlaylistsId.includes(id))    userScore += (15)
            })
            myPlaylistsId.filter((id) => {
                if(userSongsId.includes(id))    userScore += (20)
                if(userMyPlaylistsId.includes(id)) userScore += (16)
                if(userPlaylistsId.includes(id))    userScore += (9) 
            })
            playlistsId.filter((id) => {
                if(userSongsId.includes(id))    userScore += (15) 
                if(userMyPlaylistsId.includes(id)) userScore += (12)
                if(userPlaylistsId.includes(id))    userScore += (9) 
            })
            userPlaylistsLikeId.filter((id) => {
                if(id.toString() === req.user._id.toString()) userScore += 15
            })
            userScoreLists.push({ name: user.name, score: userScore, id: user._id, playlists: userPlaylistsId.length })
        }
    })
    userScoreLists.sort(function(a, b) {
        if(a.score > b.score) return -1;
        if(a.score < b.score) return 1;
        return 0;
    });
    let tmp = []
    let result = []
    userScoreLists.map((lists) => {
        if(!following.includes(lists.id))   tmp = tmp.concat(lists)
    })
    while(true){
        if(result.length === 10)    break
        const idx = Math.floor(Math.random() * users.length)
        if( tmp[idx] !== undefined && !result.includes(tmp[idx]) && tmp[idx].playlists > 0 )    result.push(tmp[idx])
    }
    console.log('-------------------------------')
    result.map(({ name }) => console.log(name))
    console.log('-------------------------------')
    //console.log(userScoreLists.slice(0,10))
    res.send(playlistsId)
})
module.exports = router;
