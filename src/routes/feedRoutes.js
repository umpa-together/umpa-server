const express = require('express');
const mongoose = require('mongoose');

const Playlist = mongoose.model('Playlist');
const Feed = mongoose.model('Feed')
const Daily = mongoose.model('Daily')
const requireAuth = require('../middlewares/requireAuth');
require('date-utils');

const router = express.Router();
router.use(requireAuth);

// add playlists, dailys in feed
router.get('/addFeeds', async(req, res) => {
    const [playlist, daily] = await Promise.all([Playlist.find({}, { _id: 1, time: 1, postUserId: 1 }), Daily.find({}, { _id: 1, time: 1, postUserId: 1 })])
    playlist.map((item) => {
        Feed.create({
            playlist: item._id,
            time: item.time,
            type: 'playlist',
            postUser: item.postUserId
        })
    })
    daily.map((item) => {
        Feed.create({
            daily: item._id,
            time: item.time,
            type: 'daily',
            postUser: item.postUserId
        })
    })
})

router.get('/feeds', async(req, res) => {
    const feeds = await Feed.find({ 
        $or: [
            { postUser: { $in: req.user.following } }, 
            { postUser: req.user._id } 
        ]
    }, {
        playlist: 1, daily: 1, type: 1
    }).populate({ 
        path: 'playlist', 
        select: {
            title: 1, songs: 1, comments: 1, hashtag: 1, likes: 1, image: 1
        },
        populate: {
            path: 'postUserId',
            select: {
                name: 1, profileImage: 1
            }
        }
    })
    .populate({
        path:'daily', 
        select: { 
            textcontent: 1, comments: 1, hashtag: 1, likes: 1, image: 1, song: 1
        },
        populate: {
            path: 'postUserId',
            select: {
                name: 1, profileImage: 1
            }
        }
    })
    .sort({ 'time': -1 }).limit(20)
    res.send(feeds)
})

router.get('/feeds/:page', async(req, res) => {
    const feeds = await Feed.find({ 
        $or: [
            { postUser: { $in: req.user.following } }, 
            { postUser: req.user._id } 
        ]
    }, {
        playlist: 1, daily: 1, type: 1
    }).populate({ 
        path: 'playlist', 
        select: {
            title: 1, songs: 1, comments: 1, hashtag: 1, likes: 1, image: 1, song: 1
        },
        populate: {
            path: 'postUserId',
            select: {
                name: 1, profileImage: 1
            }
        }
    })
    .populate({
        path:'daily', 
        select: { 
            textcontent: 1, comments: 1, hashtag: 1, likes: 1, image: 1 
        },
        populate: {
            path: 'postUserId',
            select: {
                name: 1, profileImage: 1
            }
        }
    })
    .skip(20 * req.params.page).sort({ 'time': -1 }).limit(20)
    res.send(feeds)
})

module.exports = router;