const mongoose = require('mongoose');
const User = mongoose.model('User');
const Playlist = mongoose.model('Playlist');
require('date-utils');

const getRecommendDJ = async (req, res) => {
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
}

const getRepresentSongs = async (req, res) => {
    try {
        const user = await User.findOne({_id: req.params.id});
        res.send(user.songs);
    } catch (err) { 
        return res.status(422).send(err.message); 
    }
}

const setRepresentSongs = async (req, res) => {
    const { songs } = req.body;
    try {
        const user = await User.findOneAndUpdate({_id: req.user._id}, {$push: {songs: songs}}, {new: true});
        res.send(user.songs);
    } catch (err) {
        return res.status(422).send(err.message); 
    }
}

const editRepresentSongs = async (req, res) => {
    const { songs } = req.body;
    try {
        const user = await User.findOneAndUpdate({_id: req.user._id}, {$set: {songs: songs}}, {new: true});
        res.send(user.songs);
    } catch (err) {
        return res.status(422).send(err.message); 
    }
}

const getMainRecommendDJ = async (req, res) => {
    try {
        const users = await User.find({ $and: [{_id: {$ne: req.user._id}}, {_id: {$nin: req.user.following}}] }, 
            { playlists: 1, songs: 1, myPlaylists: 1, profileImage: 1, name: 1, introduction: 1 }).populate('playlists', { image: 1, songs: 1, postUserId: 1 })
        const userScoreLists = []
        const { playlists, songs, myPlaylists } = req.user
        
        const songsId  = songs.map(({ id }) => id ) // score 5
        const myPlaylistsId = myPlaylists.map(({ id }) =>  id ) // score 4
        const playlistsId = [] // score 3
        playlists.map(({ songs }) => songs.map(({ id }) => playlistsId.push(id)))
        
        users.forEach((user) => {
            const { songs, myPlaylists, playlists, name, introduction, _id: id, profileImage } = user
            const userSongsId = songs.map(({ id }) => id) // score 5 
            const userMyPlaylistsId = myPlaylists.map(({ id }) => id) // score 4
            let userPlaylistsId = [] // score 3
            // let userPlaylistsLikeId = []
            let userScore = 0
            
            playlists.map(({ songs }) => songs.map(({ id }) => userPlaylistsId.push(id)))
            // playlists.map(({ likes }) => userPlaylistsLikeId.push(likes))
            
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
            // userPlaylistsLikeId.filter((id) => {
            //     if(id.toString() === req.user._id.toString()) userScore += 15
            // })
    
            userScoreLists.push({ score: userScore, playlists: playlists, songs: songs,
                id: id, name: name, introduction: introduction, profileImage: profileImage })
        })
    
        userScoreLists.sort(function(a, b) {
            if(a.score > b.score) return -1;
            if(a.score < b.score) return 1;
            return 0;
        });
        userScoreLists.sort(function(a, b) {
            if((a.score === 0 && b.score === 0) && (a.playlists.length > b.playlists.length)) return -1;
            if((a.score === 0 && b.score === 0) && (a.playlists.length < b.playlists.length)) return 1;
            return 0;
        })
        res.send(userScoreLists)
    } catch (err) {
        return res.status(422).send(err.message); 
    }
}

module.exports = {
    getRecommendDJ,
    getRepresentSongs,
    setRepresentSongs,
    editRepresentSongs,
    getMainRecommendDJ
}