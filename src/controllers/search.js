const mongoose = require('mongoose');
const Playlist = mongoose.model('Playlist');
const User = mongoose.model('User');
const Hashtag = mongoose.model('Hashtag');
const Daily = mongoose.model('Daily')
const RecentKeyword = mongoose.model('RecentKeyword');

// 검색했을 때, 검색어가 포함된 플리, dj, 데일리, 해시태그 가져오기
const getAllContents = async (req, res) => {
    try {
        const term = req.params.term
        const [playlists, dj, daily, hashtag] = await Promise.all([
            Playlist.find({
                $or: [{
                    title: {
                        $regex: `${term}`
                    }
                }, {
                    textcontent: {
                        $regex: `${term}`
                    }
                }]
            }, {
                image: 1, title: 1, songs: 1, time:1,
            }).populate('postUserId', { 
                name: 1, profileImage: 1,
            }), 
            User.find({
                $or: [{
                    name: {
                        $regex: `${term}`
                    }
                }, {
                    realName: {
                        $regex: `${term}`
                    }
                }]
            }, { 
                profileImage: 1, name: 1, songs: 1,
            }), 
            Daily.find({
                textcontent: {
                    $regex: `${term}`
                }
            }, { 
                image: 1, song: 1 
            }).populate('postUserId', { 
                name: 1, profileImage : 1 
            }),
            Hashtag.find({
                hashtag: {
                    $regex: `${term}`
                }
            }, {
                hashtag: 1
            })
        ])
        const result = {
            playlist: playlists,
            dj: dj,
            daily: daily,
            hashtag: hashtag
        }
        res.status(200).send(result)
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 특정곡이 포함된 플레이리스트, 데일리, DJ 가져오기
const getSelectedContents = async (req, res) => {
    try { 
        const songId = req.params.id
        const [playlists, daily, dj] = await Promise.all([
            Playlist.find({
                songs: { 
                    $elemMatch: { id: songId }
                }
            }, {
                image: 1, title: 1, songs: 1, time: 1
            }).populate('postUserId', { 
                name: 1, profileImage: 1 
            }), 
            Daily.find({
                'song.id': songId
            }, { 
                image: 1, song: 1, time: 1
            }).populate('postUserId', { 
                name: 1, profileImage : 1 
            }),
            User.find({
                songs: { $elemMatch: { id: songId }}
            }, { 
                profileImage: 1, name: 1, songs: 1,
            })
        ])
        const result = {
            playlist: playlists,
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
        const id = req.params.id

        const hashtag = await Hashtag.aggregate([
            { $match: { _id: mongoose.Types.ObjectId(id) }},
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
                    'playlist.time': 1,
                    'playlist.image': 1,
                    'playlist.songs': 1,
                    'daily._id': 1,
                    'daily.time': 1,
                    'daily.image': 1,
                    'daily.song': 1,
                }
            }
        ])
        const result = {
            playlist: hashtag[0].playlist,
            daily: hashtag[0].daily
        }
        res.status(200).send(result)
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

const getRecentKeywords = async (req, res) => {
    try {
        const keywords = await RecentKeyword.find({
            postUserId: req.user._id
        }, {
            keyword: 1
        }).sort({time: -1});
        res.status(200).send(keywords);
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

module.exports = {
    getAllContents,
    getSelectedContents,
    getAllContentsWithHashatg,
    getRecentKeywords
}