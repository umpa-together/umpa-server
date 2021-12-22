const mongoose = require('mongoose');
const Playlist = mongoose.model('Playlist');
const User = mongoose.model('User');
const Daily = mongoose.model('Daily');
const WeeklyPlaylist = mongoose.model('WeeklyPlaylist');
const WeeklyDaily = mongoose.model('WeeklyDaily');
const Hashtag = mongoose.model('Hashtag');

// time fields string -> Date 변경
const changeTime = async (req, res) => {
    try {
        const weekly = await WeeklyPlaylist.find()
        weekly.map(async (item) => {
            const { _id: id, time } = item
            await WeeklyPlaylist.findOneAndUpdate({
                _id: id
            }, {
                $set: {
                    time: new Date(time)
                }
            })
        })
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 모든 플리 가져오기
const getAllPlaylists = async (req, res) => {
    try {
        const playlists = await Playlist.find({}, {
            title: 1, hashtag: 1, image: 1,
        }).populate('postUserId', {
            name: 1, profileImage: 1
        }).sort({'time': -1}).limit(20);
        res.status(200).send(playlists)
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 모든 플리 페이징 
const getNextAllPlaylists = async (req, res) => {
    try {
        const playlists = await Playlist.find({}, {
            title: 1, hashtag: 1, image: 1,
        }).populate('postUserId', {
            name: 1, profileImage: 1
        }).sort({'time': -1}).skip(req.params.page*20).limit(20);
        res.status(200).send(playlists)
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 모든 데일리 가져오기
const getAllDailies = async (req, res) => {
    try {
        const dailys = await Daily.find({}, {
            hashtag: 1, image: 1
        }).populate('postUserId', {
            name: 1, profileImage: 1
        }).sort({'time': -1}).limit(20);
        res.status(200).send(dailys)
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 모든 데일리 페이징
const getNextAllDailies = async (req, res) => {
    try {
        const daily = await Daily.find({}, {
            hashtag: 1, image: 1
        }).populate('postUserId', {
            name: 1, profileImage: 1
        }).sort({'time': -1}).skip(req.params.page*20).limit(20);
        res.status(200).send(daily)
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 최근에 본 플리 가져오기
const getRecentPlaylist = async (req, res) => {
    try {
        const nowTime = new Date()
        const playlists = await Playlist.find({
            "accessedTime": {
                $exists: true
            }
        }, {
            title: 1, accessedTime: 1, image: 1, hashtag: 1
        }).populate('postUserId', {
            name: 1, profileImage: 1
        })
        playlists.sort(function(a, b) {
            if(nowTime.getTime() - a.accessedTime.getTime() > nowTime.getTime() - b.accessedTime.getTime())  return 1;
            if(nowTime.getTime() - a.accessedTime.getTime() < nowTime.getTime() - b.accessedTime.getTime())  return -1;
            return 0;
        });
        res.send(playlists.slice(0, 10))
    } catch (err) {
        return res.status(422).send(err.message);   
    }
}

// 위클리 플리, 데일리 가져오기
const getWeekly = async (req, res) => {
    try {
        const playlists = await Playlist.find({ 
            isWeekly: true 
        }, { 
            title: 1, hashtag: 1, image: 1 
        }).populate('postUserId', { 
            name: 1, profileImage: 1 
        })
        const dailies = await Daily.find({ 
            isWeekly: true 
        }, { 
            song: 1, image: 1 
        }).populate('postUserId', { 
            name: 1, profileImage: 1 
        })
        const result = [
            playlists,
            dailies
        ]
        res.send(result);
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 위클리 생성
const postWeekly = async (req, res) => {
    const nowTime = new Date()
    const weekly = await WeeklyPlaylist.find({
        time: {
            $gte: new Date(new Date().setDate(nowTime.getDate()-7))
        }
    })
    if (weekly.length !== 0) {
        return res.status(200).send()
    } else {
        try {
            // update weekly 
            const weeklyPlaylist = WeeklyPlaylist({
                playlist: [], 
                time: nowTime
            });
            const weeklyDaily = WeeklyDaily({
                daily: [], 
                time: nowTime
            })
            await Promise.all([
                Playlist.updateMany({ isWeekly: false }),
                Daily.updateMany({ isWeekly: false, nominate: 0 })
            ])
            const [playlist, daily] = await Promise.all([
                Playlist.find({}, { likes:1 ,views: 1, nominate: 1 }),
                Daily.find({}, { likes: 1, views: 1, nominate: 1})
            ])
            playlist.sort(function(a, b) {
                if((a.likes.length+Math.sqrt(a.views))/Math.pow(a.nominate+1,2)  > (b.likes.length+Math.sqrt(b.views))/Math.pow(b.nominate+1,2))  return -1;
                if((a.likes.length+Math.sqrt(a.views))/Math.pow(a.nominate+1,2)  < (b.likes.length+Math.sqrt(b.views))/Math.pow(b.nominate+1,2)) return 1;
                return 0;
            });
            daily.sort(function(a, b) {
                if((a.likes.length+Math.sqrt(a.views))/Math.pow(a.nominate+1,2)  > (b.likes.length+Math.sqrt(b.views))/Math.pow(b.nominate+1,2))  return -1;
                if((a.likes.length+Math.sqrt(a.views))/Math.pow(a.nominate+1,2)  < (b.likes.length+Math.sqrt(b.views))/Math.pow(b.nominate+1,2)) return 1;
                return 0;
            })

            const selectedPlaylist = playlist.slice(0,10);
            selectedPlaylist.forEach(async (item, index) => {
                try{
                    weeklyPlaylist.playlist.push(item._id)
                    await Playlist.findOneAndUpdate({ 
                        _id: item._id 
                    }, {
                        $inc: { nominate: 1 }, 
                        $set: { isWeekly: true }
                    });
                    if(index == selectedPlaylist.length-1)  await weeklyPlaylist.save();
                } catch (err) {
                    return res.status(422).send(err.message);
                }
            });
            const selectedDaily = daily.slice(0, 10);
            selectedDaily.forEach(async (item, index) => {
                try {
                    weeklyDaily.daily.push(item._id)
                    await Daily.findOneAndUpdate({ 
                        _id: item._id 
                    }, { 
                        $inc: { nominate: 1 }, 
                        $set: { isWeekly: true } 
                    });
                    if(index == selectedDaily.length-1) await weeklyDaily.save()
                } catch (err) {
                    return res.status(422).send(err.message);
                }
            })
            res.status(200).send()
        } catch (err) {
            return res.status(422).send(err.message);
        }
    }
}

// 메인 DJ 추천
const getMainRecommendDJ = async (req, res) => {
    try {
        const users = await User.find({ 
            $and: [{
                _id: { $ne: req.user._id }
            }, {
                _id: { $nin: req.user.following }
            }] 
        }, { 
            playlists: 1, songs: 1, myPlaylists: 1, profileImage: 1, name: 1, introduction: 1 
        }).populate('playlists', { 
            image: 1, songs: 1, postUserId: 1 
        })
        const me = await User.findOne({
            _id: req.user._id
        }, {
            playlists: 1, songs: 1, myPlaylists: 1
        }).populate('playlists', {
            songs: 1
        })
        const userScoreLists = []
        const { playlists, songs, myPlaylists } = me
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
    
            userScoreLists.push({ 
                score: userScore, 
                playlists: playlists, 
                songs: songs,
                id: id, 
                name: name, 
                introduction: introduction, 
                profileImage: profileImage 
            })
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


const getCurrentHashtag = async (req, res) => {
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
}

module.exports = {
    changeTime,
    getAllPlaylists,
    getNextAllPlaylists,
    getAllDailies,
    getNextAllDailies,
    getRecentPlaylist,
    getWeekly,
    postWeekly,
    getMainRecommendDJ,
    getCurrentHashtag
}