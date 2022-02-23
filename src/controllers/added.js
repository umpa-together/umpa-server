const mongoose = require('mongoose');
const User = mongoose.model('User');
const AddedSong = mongoose.model('AddedSong');
const AddedPlaylist = mongoose.model('AddedPlaylist');
const pushNotification = require('../middlewares/notification');
const Playlist = mongoose.model('Playlist');

// user.myPlaylists에 있는 데이터 addedSong으로 바꾸기
const changeData = async (req, res) => {
    try {
        const users = await User.find()
        users.map(async (user) => {
            const { myPlaylists, _id: id } = user
            if (myPlaylists) {
                for(const song of myPlaylists) {
                    const time = song.time
                    delete song.time
                    await new AddedSong({
                        postUserId: id,
                        song: song,
                        time: new Date(time)
                    }).save();
                }
            }
        })
        res.status(204).send();
    } catch (err) {
        return res.status(422).send(err.message);   
    }
}

// 곡 담기
const postAddedSong = async (req, res) => {
    try {
        const { song } = req.body;
        await new AddedSong({
            postUserId: req.user._id,
            song: song,
            time: new Date()
        }).save();
        res.status(201).send();
    } catch (err) {
        return res.status(422).send(err.message);   
    }
}

// 담은 곡 가져오기
const getAddedSong = async (req, res) => {
    try {
        const songLists = await AddedSong.find({
            postUserId: req.user._id
        }, {
            song: 1
        }).sort({ time: -1 })
        res.status(200).send(songLists)
    } catch (err) {
        return res.status(422).send(err.message);   
    }
}

// 담은 곡 삭제
const deleteAddedSong = async (req, res) => {
    try {
        const songId = req.params.id
        await AddedSong.findOneAndDelete({
            _id: songId
        })
        const songLists = await AddedSong.find({
            postUserId: req.user._id
        }, {
            song: 1
        }).sort({ time: -1 })
        res.status(200).send(songLists)
    } catch (err) {
        return res.status(422).send(err.message);   
    }
}

// 플레이리스트 담기
const postAddedPlaylist = async (req, res) => {
    try {
        const playlistId = req.params.id;
        const [newAdded, playlist] = await Promise.all([
            new AddedPlaylist({
                postUserId: req.user._id,
                playlistId: playlistId,
                time: new Date()
            }).save(),
            Playlist.findById(playlistId, {
                _id: 1,
            }).populate('postUserId', {
                noticetoken: 1, _id: 1
            })
        ])
        await newAdded.populate('playlistId', {
            title: 1, songs: 1, image: 1, time : 1
        }).execPopulate();
        const result = {
            _id: newAdded._id,
            playlistId: newAdded.playlistId
        }
        pushNotification(playlist.postUserId, req.user._id, `${req.user.name}님이 회원님의 플레이리스트를 저장했습니다`)
        res.status(201).send(result);
    } catch (err) {
        return res.status(422).send(err.message);   
    }
}

// 담은 플레이리스트 가져오기
const getAddedPlaylist = async (req, res) => {
    try {
        const playlists = await AddedPlaylist.find({
            postUserId: req.user._id
        }, {
            _id: 1
        }).populate('playlistId', {
            title: 1, songs: 1, image: 1, time : 1, postUserId: 1
        }).sort({ time: -1 })
        res.status(200).send(playlists)
    } catch (err) {
        return res.status(422).send(err.message);   
    }
}

// 담은 플레이리스트 삭제
const deleteAddedPlaylist = async (req, res) => {
    try {
        const playlistId = req.params.id
        await AddedPlaylist.findOneAndDelete({
            _id: playlistId
        })
        res.status(204).send()
    } catch (err) {
        return res.status(422).send(err.message);    
    }
}

module.exports = {
    changeData,
    postAddedSong,
    getAddedSong,
    deleteAddedSong,
    postAddedPlaylist,
    getAddedPlaylist,
    deleteAddedPlaylist
}