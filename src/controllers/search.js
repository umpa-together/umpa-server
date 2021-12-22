const mongoose = require('mongoose');
const Playlist = mongoose.model('Playlist');
const User = mongoose.model('User');
const Hashtag = mongoose.model('Hashtag');
const Daily = mongoose.model('Daily')

// 음악을 이용해 검색했을 때, 음악이 포함된 플리, dj, 데일리 가져오기
const getAllContents = async (req, res) => {
    try {
        const [playlists, dj, daily] = await Promise.all([
            Playlist.find({
                songs: { 
                    $elemMatch: { id: req.params.id }
                }
            }, {
                image: 1, title: 1, hashtag: 1
            }).populate('postUserId', { 
                name: 1, profileImage: 1 
            }), 
            User.find({
                songs: { $elemMatch: { id: req.params.id }}
            }, { 
                profileImage: 1, name: 1, songs: 1 
            }), 
            Daily.find({
                'song.id': req.params.id 
            }, { 
                image: 1, song: 1 
            }).populate('postUserId', { 
                name: 1, profileImage : 1 
            })
        ])
        const result = {
            playlists: playlists,
            dj: dj,
            daily: daily
        }
        res.status(200).send(result)
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 해시태그를 이용해 검색했을 때, 해시태그가 포함된 플리와 데일리 가져오기
const getAllContentsWithHashatg = async (req, res) => {
    try {
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
        res.status(200).send(result)
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 검색할 때, 해시태그 힌트 가져오기 (플레이리스트와 데일리의 갯수가 적어도 1개 이상인 것)
const getHashtagHint = async (req, res) => {
    try {
        const hint = await Hashtag.find({
            hashtag: {
                $regex: `${req.params.term}`
            }
        }).populate('playlistId', { 
            _id: 1 
        }).populate('dailyId', { 
            _id: 1
        });
        let resultHint = [];
        hint.map((item) => {
            const { playlistId: playlist, dailyId: daily } = item
            if (playlist.length !== 0 || daily.length !== 0) {
                resultHint.push(item)
            }
        })
        res.status(200).send(resultHint);
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 검색할 때, DJ 힌트 가져오기 
const getDJHint = async (req, res) => {
    try {
        const hint = await User.find({
            name: {
                $regex: `${req.params.term}`, 
                $options:'i'
            }
        }, {
            name: 1, realName: 1, profileImage: 1
        });
        res.status(200).send(hint);
    } catch (err) {
        return res.status(422).send(err.message);
    }
}







// 플리, 데일리 안에서 해시태그 눌렀을 때 해시태그가 포함된 플리, 데일리 가져오기
const getHashtag = async (req, res) => {
    try {
        const hashtag = await Hashtag.aggregate([
            { $match: { hashtag: req.params.term }},
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
        res.status(200).send(hashtag[0]);
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

module.exports = {
    getAllContents,
    getAllContentsWithHashatg,
    getHashtagHint,
    getDJHint,
    getHashtag,
}