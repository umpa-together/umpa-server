const mongoose = require('mongoose');
const User = mongoose.model('User');
const StorySong = mongoose.model('StorySong');

// 오늘의 스토리 포스팅
const postStory = async (req, res) => {
    const { song } = req.body;
    try {
        const storySong = await new StorySong({
            postUserId: req.user._id,
            song: song,
            time: new Date()
        }).save();
        res.status(200).send(storySong);
        await User.findOneAndUpdate({
            _id: req.user._id
        }, {
            $push: { todaySong: storySong._id }
        }, {
            new: true
        });
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
            User.findOneAndUpdate({
                _id: req.user._id
            }, {
                $pull: { todaySong: storyId }
            })
        ])
        res.status(200).send();
    } catch (err) {
        return res.status(422).send(err.message); 
    }
}

// 내 스토리 조회 
const getMyStory = async (req, res) => {
    const nowTime = new Date()
    try {
        if (req.user.todaySong.length === 0) {
            res.status(200).send([null, []]);
        } else {
            const lastStory = req.user.todaySong[req.user.todaySong.length-1];
            const tomorrowTime = new Date(new Date().setDate(lastStory.time.getDate()+1))
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
                            'view.profileImage': 1
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
        const storySongs = await StorySong.find({
            $and: [
                {
                    time: {
                        $gte: new Date(new Date().setDate(nowTime.getDate()-1))
                    }
                },
                {
                    postUserId: {
                        $ne: req.user._id
                    }
                }

            ]
            
        }, {
            view: 1, song: 1
        }).populate('postUserId', {
            name: 1,
            profileImage: 1
        })
        storySongs.map((story) => {
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
        const storySongs = await StorySong.find({
            $and: [
                {
                    time: {
                        $gte: new Date(new Date().setDate(nowTime.getDate()-1))
                    }
                }, 
                {
                    postUserId: { 
                        $in: req.user.following
                    }
                }
            ]
            
        }, {
            view: 1, song: 1
        }).populate('postUserId', {
            name: 1,
            profileImage: 1
        })
        storySongs.map((story) => {
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
            _id: storyId
        }).exec(async (_, data) => {
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
            res.status(200).send()
        })
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
        res.send(story.todaySong)
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
    getStoryCalendar
}