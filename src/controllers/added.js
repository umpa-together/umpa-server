const mongoose = require('mongoose');
const User = mongoose.model('User');
const Added = mongoose.model('AddedSong');

// user.myPlaylists에 있는 데이터 addedSong으로 바꾸기
const changeData = async (req, res) => {
    try {
        const users = await User.find()
        users.map(async (user) => {
            const { myPlaylists, _id: id } = user
            if (myPlaylists) {
                myPlaylists.map(async (song) => {
                    const time = song.time
                    delete song.time
                    await new Added({
                        postUserId: id,
                        song: song,
                        time: new Date(time)
                    }).save();
                })
            }
        })
    } catch (err) {
        return res.status(422).send(err.message);   
    }
}

// 곡 담기
const postAddedSong = async (req, res) => {
    try {
        const { song } = req.body;
        await new Added({
            postUserId: req.user._id,
            song: song,
            time: new Date()
        }).save();
        res.status(200).send();
    } catch (err) {
        return res.status(422).send(err.message);   
    }
}

// 담은 곡 가져오기
const getAddedSong = async (req, res) => {
    try {
        const songLists = await Added.find({
            postUserId: req.user._id
        }, {
            song: 1
        })
        res.status(200).send(songLists)
    } catch (err) {
        return res.status(422).send(err.message);   
    }
}

// 플레이리스트 담기
const postAddedPlaylist = async (req, res) => {
    try {
        
    } catch (err) {
        return res.status(422).send(err.message);   
    }
}

// 담은 플레이리스트 가져오기
const getAddedPlaylist = async (req, res) => {
    try {
        
    } catch (err) {
        return res.status(422).send(err.message);   
    }
}

module.exports = {
    changeData,
    postAddedSong,
    getAddedSong,
    postAddedPlaylist,
    getAddedPlaylist
}