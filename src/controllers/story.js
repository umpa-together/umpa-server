const mongoose = require('mongoose');
const User = mongoose.model('User');
const StorySong = mongoose.model('StorySong');
const Notice = mongoose.model('Notice');
const pushNotification = require('../middlewares/notification');
const addNotice = require('../middlewares/notice');

// 오늘의 스토리 포스팅
const postStory = async (req, res) => {
    const { song } = req.body;
    try {
        const storySong = await new StorySong({
            postUserId: req.user._id,
            song: song,
            time: new Date()
        }).save();
        res.status(201).send(storySong);
    } catch (err) {
        return res.status(422).send(err.message); 
    }
}

// 오늘의 스토리 삭제
const deleteStory = async (req, res) => {
    try {
        const storyId = req.params.storyId
        await Promise.all([
            StorySong.findOneAndDelete({
                _id: storyId
            }),
            Notice.deleteMany({
                storysong: storyId
            })
        ])
        res.status(204).send();
    } catch (err) {
        return res.status(422).send(err.message); 
    }
}

// 내 스토리 조회 
const getMyStory = async (req, res) => {
    const nowTime = new Date()
    try {
        const lastStory = await StorySong.findOne({
            postUserId: req.user._id
        }, {
            view: 1, song: 1, time: 1, likes: 1
        }).populate('postUserId', {
            name: 1,
            profileImage: 1
        }).sort({ time: -1 }).limit(1);
        if (lastStory === null) {
            res.status(200).send([null, []]);
        } else {
            let tomorrowTime = new Date(
                lastStory.time.getFullYear(),
                lastStory.time.getMonth(),
                lastStory.time.getDate() + 1,
                lastStory.time.getHours(),
                lastStory.time.getMinutes(),
                lastStory.time.getSeconds(),
                lastStory.time.getMilliseconds(),
            )
            if(nowTime <= tomorrowTime) {
                const { _id: id } = lastStory
                const viewer = await StorySong.aggregate([
                    {
                        $match: {
                            _id: id
                        }
                    },
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'view',
                            foreignField: '_id',
                            as: 'view',
                        }
                    },
                    {
                        $project: {
                            'view.name': 1,
                            'view.profileImage': 1,
                            'view.songs': 1,
                            'view._id': 1
                        }
                    }
                ])
                res.status(200).send([lastStory, viewer[0].view]);
            } else {
                res.status(200).send([null, []]);
            }
        }
    } catch (err) {
        return res.status(422).send(err.message); 
    }
}

// 다른 사람 스토리 조회 (모든 사람)
const getOtherStoryWithAll = async (req, res) => {
    const nowTime = new Date()
    try {
        let readUser = [];
        let unReadUser = [];
        let date = new Date(
            nowTime.getFullYear(),
            nowTime.getMonth(),
            nowTime.getDate() - 1,
            nowTime.getHours(),
            nowTime.getMinutes(),
            nowTime.getSeconds(),
            nowTime.getMilliseconds(),
        )
        const storySongs = await StorySong.find({
            $and: [
                {
                    time: {
                        $gte: new Date(date)
                    }
                },
                {
                    $and: [{
                        postUserId: {
                            $ne: req.user._id
                        }
                    }, {
                        postUserId: { 
                            $nin: req.user.block 
                        }
                    }]
                }
            ]
        }, {
            view: 1, song: 1, likes: 1
        }).populate('postUserId', {
            name: 1,
            profileImage: 1
        })
        storySongs.forEach((story) => {
            const { view } = story
            if(view.includes(req.user._id)) {
                readUser.push(story)
            } else {
                unReadUser.push(story)
            }
        })
        res.status(200).send(unReadUser.concat(readUser));
    } catch (err) {
        return res.status(422).send(err.message); 
    }
}

// 다른 사람 스토리 조회 (팔로우한 사람)
const getOtherStoryWithFollowing = async (req, res) => {
    const nowTime = new Date()
    try {
        let readUser = [];
        let unReadUser = [];
        let date = new Date(
            nowTime.getFullYear(),
            nowTime.getMonth(),
            nowTime.getDate() - 1,
            nowTime.getHours(),
            nowTime.getMinutes(),
            nowTime.getSeconds(),
            nowTime.getMilliseconds(),
        )
        const storySongs = await StorySong.find({
            $and: [
                {
                    time: {
                        $gte: new Date(date)
                    }
                }, 
                {
                    $and: [{
                        postUserId: { 
                            $in: req.user.following
                        }
                    }, {
                        postUserId: { 
                            $nin: req.user.block 
                        }
                    }]
                }
            ]
            
        }, {
            view: 1, song: 1, likes: 1
        }).populate('postUserId', {
            name: 1,
            profileImage: 1
        })
        storySongs.forEach((story) => {
            const { view } = story
            if(view.includes(req.user._id)) {
                readUser.push(story)
            } else {
                unReadUser.push(story)
            }
        })
        res.status(200).send(unReadUser.concat(readUser));
    } catch (err) {
        return res.status(422).send(err.message); 
    }
}

// 스토리 조회시 view 배열에 추가
const readStory = async (req, res) => {
    try {
        const storyId = req.params.storyId
        StorySong.findOne({
            $and: [{
                _id: storyId
            }, {
                postUserId: { $ne: req.user._id }
            }]
        }).exec(async (_, data) => {
            if (data) {
                const { view } = data
                if(!view.includes(req.user._id)) {
                    await StorySong.findOneAndUpdate({
                        _id: storyId
                    }, {
                        $push: {
                            view: req.user._id
                        }
                    })
                }
            }
        })
        res.status(204).send()
    } catch (err) {
        return res.status(422).send(err.message); 
    }  
}

// 스토리 아카이브 조회
const getStoryCalendar = async (req, res) => {
    const userId = req.params.userId
    try {
        const story = await User.findOne({
            _id: userId
        }, {
            todaySong: 1
        }).populate('todaySong', {
            song: 1, time: 1
        });
        res.status(200).send(story.todaySong)
    } catch (err) {
        return res.status(422).send(err.message); 
    }
}

// 스토리 좋아요
const likeStory = async (req, res) => {
    try {
        const storyId = req.params.id
        const story = await StorySong.findById(storyId, {
            likes: 1, song: 1
        }).populate('postUserId', {
            noticetoken: 1
        })
        if (story) {
            if(!story.likes.includes(req.user._id)) {
                await StorySong.findOneAndUpdate({
                    _id: storyId
                }, {
                    $addToSet: {
                        likes: req.user._id
                    }
                })
            }
            res.status(204).send()
            const targetuser = story.postUserId
            addNotice({
                noticinguser: req.user._id,
                noticeduser: targetuser._id,
                noticetype: 'story',
                storysong: storyId
            })
            pushNotification(targetuser, req.user._id, `${req.user.name}님이 회원님의 스토리(오늘의 곡)를 좋아합니다`)
        } else {
            res.status(400).send()
        }
    } catch (err) {
        return res.status(422).send(err.message); 
    }
}

// 스토리 좋아요 취소
const unlikeStory = async (req, res) => {
    try {
        const storyId = req.params.id
        const story = await StorySong.findById(storyId, {
            likes: 1, postUserId: 1
        })
        if (story) {
            await Promise.all([
                StorySong.findOneAndUpdate({
                    _id: storyId
                }, {
                    $pull: {
                        likes: req.user._id
                    }
                }),
                Notice.findOneAndDelete({
                    $and: [{
                        storysong: storyId
                    }, {
                        noticinguser: req.user._id
                    }, {
                        noticetype: 'story'
                    }, {
                        noticeduser: story.postUserId
                    }]
                })
            ])
            res.status(204).send()
        } else {
            res.status(400).send()
        }
    } catch (err) {
        return res.status(422).send(err.message);  
    }
}

module.exports = {
    postStory,
    deleteStory,
    getMyStory,
    getOtherStoryWithAll,
    getOtherStoryWithFollowing,
    readStory,
    getStoryCalendar,
    likeStory,
    unlikeStory
}