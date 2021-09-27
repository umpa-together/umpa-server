const express = require('express');
const mongoose = require('mongoose');
const Playlist = mongoose.model('Playlist');
const User = mongoose.model('User');
const Hashtag = mongoose.model('Hashtag');
const Daily = mongoose.model('Daily')

const requireAuth = require('../middlewares/requireAuth');

const router = express.Router();
router.use(requireAuth);

router.get('/searchHashtag/:object', async (req, res) => {
    try {
        const hashtag = await Hashtag.aggregate([
            { $match: { hashtag: req.params.object }},
            { 
                $lookup: {
                    from: 'playlists',
                    localField: 'playlistId',
                    foreignField: '_id',
                    as: 'playlist',
                },
            },
            {
                $lookup: {
                    from: 'dailies',
                    localField: 'dailyId',
                    foreignField: '_id',
                    as: 'daily'
                }
            },
            {
                $project: {
                    _id: 1,
                    hashtag: 1,
                    'playlist._id': 1,
                    'playlist.title': 1,
                    'playlist.hashtag': 1,
                    'playlist.image': 1,
                    'playlist.postUserId': 1,
                    'daily._id': 1,
                    'daily.title': 1,
                    'daily.hashtag': 1,
                    'daily.image': 1,
                    'daily.song': 1,
                    'daily.postUserId': 1
                }
            }
        ])
        res.send(hashtag[0]);
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.get('/searchAll/:id', async (req, res) => {
    try {
        const playlists = await Playlist.find({
            songs: { $elemMatch: { id: req.params.id }}
        }, {image: 1, title: 1, hashtag: 1}).populate('postUserId', { name: 1, profileImage: 1 })
        
        const dj = await User.find({
            songs: { $elemMatch: { id: req.params.id }}
        }, { profileImage: 1, name: 1, songs: 1 })
        
        const daily = await Daily.find({
            'song.id': req.params.id 
        }, { image: 1, song: 1 }).populate('postUserId', { name: 1, profileImage : 1 })

        const result = {
            playlists: playlists,
            dj: dj,
            daily: daily
        }

        res.send(result)
    } catch (err) {
        return res.status(422).send(err.message);
    }
})

router.get('/searchHashtagAll/:term', async (req, res) => {
    try {
        //const hashtag = await Hashtag.findOne({hashtag :req.params.term}).populate('playlistId', { image: 1, title: 1, hashtag: 1, postUserId: 1 }).populate('dailyId', { image: 1, song: 1, postUserId: 1 });
        const hashtag = await Hashtag.aggregate([
            { $match: { hashtag: req.params.term }},
            {
                $lookup: {
                    from: 'playlists',
                    localField: 'playlistId',
                    foreignField: '_id',
                    as: 'playlist'
                }
            },
            {
                $lookup: {
                    from: 'dailies',
                    localField: 'dailyId',
                    foreignField: '_id',
                    as: 'daily'
                }
            },
            {
                $project: {
                    _id: 1,
                    hashtag: 1,
                    'playlist._id': 1,
                    'playlist.title': 1,
                    'playlist.hashtag': 1,
                    'playlist.image': 1,
                    'playlist.postUserId': 1,
                    'daily._id': 1,
                    'daily.image': 1,
                    'daily.song': 1,
                    'daily.postUserId': 1
                }
            }
        ])
        const playlists = hashtag[0].playlist
        const daily = hashtag[0].daily
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
        const hint = await Hashtag.find({hashtag: {$regex: `${req.params.term}`}}).populate('playlistId', { _id: 1 }).populate('dailyId', { _id: 1});
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

router.get('/currentHashtag', async (req, res) => {
    try {
        const hashtag = await Hashtag.aggregate([
            { $sample: { size: 10 } },
            { 
                $lookup: {
                    from: 'playlists',
                    localField: 'playlistId',
                    foreignField: '_id',
                    as: 'playlist',
                },
            },
            {
                $lookup: {
                    from: 'dailies',
                    localField: 'dailyId',
                    foreignField: '_id',
                    as: 'daily'
                }
            },
            {
                $project: {
                    _id: 1,
                    hashtag: 1,
                    'playlist._id': 1,
                    'playlist.title': 1,
                    'playlist.hashtag': 1,
                    'playlist.image': 1,
                    'playlist.postUserId': 1,
                    'daily._id': 1,
                    'daily.title': 1,
                    'daily.hashtag': 1,
                    'daily.image': 1,
                    'daily.song': 1,
                    'daily.postUserId': 1
                }
            }
        ])
        res.send(hashtag)
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

module.exports = router;