const mongoose = require('mongoose');
const Feed = mongoose.model('Feed')

// 피드 데이터(플리, 데일리) 가져오기(모든 사람들)
const getFeedWithAll = async (req, res) => {
    try {
        const feeds = await Feed.find({ 
            postUserId: { $nin: req.user.block }
        }, {
            playlist: 1, daily: 1, type: 1
        }).populate({ 
            path: 'playlist', 
            select: {
                title: 1, songs: 1, comments: 1, likes: 1, image: 1, textcontent: 1
            },
            populate: {
                path: 'postUserId',
                select: {
                    name: 1, profileImage: 1
                }
            }
        }).populate({
            path:'daily', 
            select: { 
                textcontent: 1, comments: 1, likes: 1, image: 1, song: 1
            },
            populate: {
                path: 'postUserId',
                select: {
                    name: 1, profileImage: 1
                }
            }
        }).sort({ 'time': -1 }).limit(20)
        res.status(200).send(feeds)
    } catch (err) {
        return res.status(422).send(err.message);   
    }
}

// 다음 피드 데이터(플리, 데일리) 가져오기(모든 사람들)
const getNextFeedWithAll = async (req, res) => {
    try {
        const feeds = await Feed.find({ 
            postUserId: { $nin: req.user.block }
        }, {
            playlist: 1, daily: 1, type: 1
        }).populate({ 
            path: 'playlist', 
            select: {
                title: 1, songs: 1, comments: 1, likes: 1, image: 1, textcontent: 1
            },
            populate: {
                path: 'postUserId',
                select: {
                    name: 1, profileImage: 1
                }
            }
        }).populate({
            path:'daily', 
            select: { 
                textcontent: 1, comments: 1, likes: 1, image: 1 , song: 1
            },
            populate: {
                path: 'postUserId',
                select: {
                    name: 1, profileImage: 1
                }
            }
        }).sort({ 'time': -1 }).skip(20 * req.params.page).limit(20)
        res.status(200).send(feeds)
    } catch (err) {
        return res.status(422).send(err.message);   
    }
}

// 피드 데이터(플리, 데일리) 가져오기(팔로우한 사람들)
const getFeedWithFollowing = async (req, res) => {
    try {
        const feeds = await Feed.find({ 
            $and: [
                { 
                  $or: [
                    { postUserId: { $in: req.user.following } }, 
                    { postUserId: req.user._id } 
                  ]
                },
                { postUserId: { $nin: req.user.block }}
            ]
 
        }, {
            playlist: 1, daily: 1, type: 1
        }).populate({ 
            path: 'playlist', 
            select: {
                title: 1, songs: 1, comments: 1, likes: 1, image: 1, textcontent: 1
            },
            populate: {
                path: 'postUserId',
                select: {
                    name: 1, profileImage: 1
                }
            }
        }).populate({
            path:'daily', 
            select: { 
                textcontent: 1, comments: 1, likes: 1, image: 1, song: 1
            },
            populate: {
                path: 'postUserId',
                select: {
                    name: 1, profileImage: 1
                }
            }
        }).sort({ 'time': -1 }).limit(20)
        res.status(200).send(feeds)
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 다음 피드 데이터(플리, 데일리) 가져오기(팔로우한 사람들)
const getNextFeedWithFollowing = async (req, res) => { 
    try {
        const feeds = await Feed.find({ 
            $and: [
                { 
                  $or: [
                    { postUserId: { $in: req.user.following } }, 
                    { postUserId: req.user._id } 
                  ]
                },
                { postUserId: { $nin: req.user.block }}
            ]
        }, {
            playlist: 1, daily: 1, type: 1
        }).populate({ 
            path: 'playlist', 
            select: {
                title: 1, songs: 1, comments: 1, likes: 1, image: 1, textcontent: 1
            },
            populate: {
                path: 'postUserId',
                select: {
                    name: 1, profileImage: 1
                }
            }
        }).populate({
            path:'daily', 
            select: { 
                textcontent: 1, comments: 1, likes: 1, image: 1, song: 1
            },
            populate: {
                path: 'postUserId',
                select: {
                    name: 1, profileImage: 1
                }
            }
        }).sort({ 'time': -1 }).skip(20 * req.params.page).limit(20)
        res.status(200).send(feeds)
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

module.exports = {
    getFeedWithAll,
    getNextFeedWithAll,
    getFeedWithFollowing,
    getNextFeedWithFollowing
}