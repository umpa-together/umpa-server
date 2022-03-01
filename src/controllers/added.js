const mongoose = require('mongoose');
const AddedSong = mongoose.model('AddedSong');
const AddedPlaylist = mongoose.model('AddedPlaylist');

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
        const newAdded = await new AddedPlaylist({
            postUserId: req.user._id,
            playlistId: playlistId,
            time: new Date()
        }).save()
        await newAdded.populate('playlistId', {
            title: 1, songs: 1, image: 1, time : 1
        }).execPopulate();
        const result = {
            _id: newAdded._id,
            playlistId: newAdded.playlistId
        }
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
    postAddedSong,
    getAddedSong,
    deleteAddedSong,
    postAddedPlaylist,
    getAddedPlaylist,
    deleteAddedPlaylist
}