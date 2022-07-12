const mongoose = require('mongoose');
const Playlist = mongoose.model('Playlist');
const User = mongoose.model('User');
const Hashtag = mongoose.model('Hashtag');
const Daily = mongoose.model('Daily')
const RecentKeyword = mongoose.model('RecentKeyword');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const privateKey = fs.readFileSync("./AppleMusic_AuthKey.p8");
const request = require('request');

const token = jwt.sign({}, privateKey, {
    algorithm: "ES256",
    expiresIn: "180d",
    issuer: process.env.APPLEMUSIC_ISSUER_ID, //your 10-character Team ID, obtained from your developer account
    header: {
      alg: "ES256",
      kid: process.env.APPLEMUSIC_API_KEY_ID //your MusicKit Key ID
    }
});

// 검색했을 때, 검색어가 포함된 곡, 플리, dj, 데일리, 해시태그 가져오기
const getAllContents = async (req, res) => {
    try {
        const term = req.params.term
        const appleOption = {
            url: 'https://api.music.apple.com/v1/catalog/kr/search',
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            qs: {
                term: term,
                limit: 20,
            }
        }
        request(appleOption, async (err, response, body) => {
            const song = await JSON.parse(body).results.songs;
            const keyword = await RecentKeyword.findOne({
                $and: [{
                    keyword: term,
                }, {
                    postUserId: req.user._id
                }]
            })
            if(keyword) {
                await RecentKeyword.findOneAndUpdate({
                    keyword: term
                }, {
                    $set: {
                        time: new Date()
                    }
                }, {
                    new: true
                })
            } else {
                await new RecentKeyword({
                    keyword: term,
                    postUserId: req.user._id,
                    time: new Date()
                }).save()
            }
            let next, searchResult
            let songResult = []
            if (song !== undefined) {
                [next, searchResult] = await Promise.all([
                    JSON.parse(body).results.songs.next,
                    JSON.parse(body).results.songs.data
                ])
                for(const song of searchResult) {
                    const { id } = song
                    const [playlists, daily] = await Promise.all([
                        Playlist.find({
                            songs: { 
                                $elemMatch: { id: id }
                            }
                        }, {
                            _id: 1
                        }),
                        Daily.find({
                            'song.id': id
                        }, { 
                            _id: 1
                        })
                    ])
                    songResult.push({
                        song: song,
                        playlistCount: playlists.length,
                        dailyCount: daily.length
                    })
                }   
                next = next !== undefined ? next.substr(22) : null
            } else {
                next = null
            }
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
                    image: 1, title: 1, songs: 1, time:1, postUserId: 1,
                }), 
                User.find({
                    $or: [{
                        name: {
                            $regex: `${term}`,
                            $options: 'i'
                        }
                    }, {
                        realName: {
                            $regex: `${term}`
                        }
                    }]
                }, { 
                    profileImage: 1, name: 1, songs: 1
                }), 
                Daily.find({
                    textcontent: {
                        $regex: `${term}`
                    }
                }, { 
                    image: 1, song: 1, textcontent: 1, postUserId: 1,
                }),
                Hashtag.find({
                    hashtag: {
                        $regex: `${term}`
                    }
                }, {
                    hashtag: 1,
                    playlistId: 1,
                    dailyId: 1
                })
            ])
            const result = {
                playlist: playlists,
                dj: dj,
                daily: daily,
                hashtag: hashtag.filter((item) => item.playlistId.length + item.dailyId.length > 0),
                song: songResult,
                next: next
            }
            res.status(200).send(result)
        });
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 검색했을 때, 검색어가 포함된 곡 다음 부분 가져오기
const getNextSongResult = async (req, res) => {
    try {
        const appleOption = {
            url: 'https://api.music.apple.com/v1/catalog/kr/search?' + req.params.next,
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            qs: {
                limit: 20,
            }
        }
        request(appleOption, async (err, response, body) => {
            const [next, searchResult] = await Promise.all([
                JSON.parse(body).results.songs.next,
                JSON.parse(body).results.songs.data
            ])
            let songResult = []
            for(const song of searchResult) {
                const { id } = song
                const [playlists, daily] = await Promise.all([
                    Playlist.find({
                        songs: { 
                            $elemMatch: { id: id }
                        }
                    }, {
                        _id: 1
                    }),
                    Daily.find({
                        'song.id': id
                    }, { 
                        _id: 1
                    })
                ])
                songResult.push({
                    song: song,
                    playlistCount: playlists.length,
                    dailyCount: daily.length
                })
            }  
            res.send([songResult, next !== undefined ? next.substr(22) : null]);
        });
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
                image: 1, title: 1, songs: 1, time: 1, postUserId: 1,
            }),
            Daily.find({
                'song.id': songId
            }, { 
                image: 1, song: 1, textcontent: 1, postUserId: 1,
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
                    'daily.image': 1,
                    'daily.song': 1,
                    'daily.textcontent': 1,
                    'daily.postUserId': 1
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

const deleteRecentKeyword = async (req, res) => {
    try {
        const id = req.params.id
        await RecentKeyword.findOneAndDelete({
            _id: id
        });
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

const deleteAllRecentKeyword = async (req, res) => {
    try {
        await RecentKeyword.deleteMany({
            postUserId: req.user._id
        });

        res.status(200).send([]);
    } catch (err) {
        return res.status(422).send(err.message);
    }
}
module.exports = {
    getAllContents,
    getNextSongResult,
    getSelectedContents,
    getAllContentsWithHashatg,
    getRecentKeywords,
    deleteRecentKeyword,
    deleteAllRecentKeyword,
}