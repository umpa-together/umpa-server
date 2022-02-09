const mongoose = require('mongoose');
const Playlist = mongoose.model('Playlist');
const Daily = mongoose.model('Daily');
const Theme = mongoose.model('Theme');

const themeLists = [
    '난 힙합이 너무 좋아, 중2병',
    '감성 터지는 플리 찾고 계신가요?',
    '힐링이 필요할때 듣는 노래',
    '하루를 마무리할 때 듣기 좋은 노래',
    '외힙 레전드 리스트를 찾습니다',
    '몸이 먼저 반응하는 레전드 비트',
    '아티스트 모음집'
]

// 테마 데이터 등록하기
const addThemeLists = async (req, res) => {
    try {
        themeLists.map(async (theme) => {
            await new Theme({
                title: theme
            }).save();
        })
        res.status(204).send();
    } catch (err) {
        return res.status(422).send(err.message);    
    }
}

// 데일리 accessedTime 추가
const accessedTime = async (req, res) => {
    try {
        const dailies = await Daily.find();
        dailies.map(async (item) => {
            const { _id: id } = item
            await Daily.findOneAndUpdate({
                _id: id
            }, {
                $set: {
                    accessedTime: new Date()
                }
            })
        })
        res.status(204).send();
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
        const playlists = await Playlist.find({
            "accessedTime": {
                $exists: true
            }
        }, {
            title: 1, image: 1, songs: 1
        }).sort({'accessedTime': -1}).limit(10)
        res.status(200).send(playlists)
    } catch (err) {
        return res.status(422).send(err.message);   
    }
}

// 최근에 본 데일리 가져오기
const getRecommendDaily = async (req, res) => {
    try {
        const dailies = await Daily.aggregate([
            {
                $sample: {
                    size: 10
                }
            },
            {
                $project: {
                    song: 1,
                    postUserId: 1
                }
            }
        ])
        res.status(200).send(dailies)
    } catch (err) {
        return res.status(422).send(err.message);   
    }
}

// 메인 DJ 추천
const getMainRecommendDJ = async (req, res) => {
    try {
        const playlist = await Playlist.aggregate([
            {
                $group: {
                    _id: "$postUserId",
                    totalCount: { $sum: 1 }
                }
            },
            {
                $match: {
                    $and: [{
                        _id: { $ne: req.user._id }
                    }, {
                        _id: { $nin: req.user.following }
                    }] 
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'postUser',
                },
            },
            {
                $project: {
                    totalCount: 1,
                    'postUser._id': 1,
                    'postUser.name': 1,
                    'postUser.profileImage': 1,
                    'postUser.genre': 1,
                }   
            },
            {
                $sort: {
                    totalCount: -1
                }
            }
        ])
        
        const result = playlist.map((item) => {
            return {
                _id: item.postUser[0]._id,
                name: item.postUser[0].name,
                profileImage: item.postUser[0].profileImage,
                genre: item.postUser[0].genre,
            }
        })
        const fixUsers = result.slice(0, 5);
        const randomUsers = result.slice(5, result.length).sort(() => Math.random() - 0.5).slice(0, 5)
        res.status(200).send(fixUsers.concat(randomUsers).sort(() => Math.random() - 0.5))
    } catch (err) {
        return res.status(422).send(err.message); 
    }
}

const getMainRecommendPlaylist = async (req, res) => {
    try {
        const theme = await Theme.aggregate([
            { $sample: { size: 4 } },
            { 
                $lookup: {
                    from: 'playlists',
                    localField: 'playlistId',
                    foreignField: '_id',
                    as: 'playlist',
                },
            },
            {
                $project: {
                    title: 1,
                    image: 1,
                    'playlist._id': 1,
                    'playlist.postUserId': 1,
                }
            }
        ])
        let result = []
        for (item of theme) {
            const { title, playlist, image } = item
            const idx = Math.floor(Math.random() * playlist.length);
            result.push({
                title: title,
                playlist: playlist[idx],
                image: image
            })
        }
        res.status(200).send(result)
    } catch (err) {
        return res.status(422).send(err.message); 
    }
}


module.exports = {
    addThemeLists,
    accessedTime,
    getAllPlaylists,
    getNextAllPlaylists,
    getAllDailies,
    getNextAllDailies,
    getRecentPlaylist,
    getRecommendDaily,
    getMainRecommendDJ,
    getMainRecommendPlaylist,
}