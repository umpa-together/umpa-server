const mongoose = require('mongoose');
const RelayPlaylist = mongoose.model('RelayPlaylist');
const RelaySong = mongoose.model('RelaySong');

const titleLists = [
    '크리스마스에 듣기 좋은',
    '축제 시즌이면 생각나는',
    '한 때는 내가 사랑했던',
    '힘이 들 때 위로가 되는 곡',
    '너 내 깐부.. 맞지?',
]

// 주제곡을 통한 플레이리스트 업로드
const postRelayPlaylist = async (req, res) => {
    try {
        Object.values(titleLists).forEach(async(item) => {
            await new RelayPlaylist({
                title: item,
                createdTime: new Date()
            }).save()
        })
        res.status(200).send('hello world')
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 대표곡 설정
const postRepresentSong = async (req, res) => {
    try {
        const { song } = req.body;
        const id = req.params.id;
        await RelayPlaylist.findOneAndUpdate({
            _id: id
        }, {
            $set: {
                representSong: song
            }
        })
        res.status(200).send('hello world')
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 기간 끝난 플레이리스트 곡 승인
const updateApprovedSong = async (req, res) => {
    try {
        const nowTime = new Date();
        const relayPlaylists = await RelayPlaylist.find({}, {
            createdTime: 1
        });
        Object.values(relayPlaylists).forEach(async (item) => {
            const { createdTime, _id } = item
            const postTime = new Date(createdTime);
            const betweenTime = Math.floor((nowTime.getTime() - postTime.getTime()) / 1000 / 60 / 60 / 24);
            if (betweenTime > 4) {
                const songs = await RelaySong.aggregate([
                    {
                        $match: {
                            playlistId: _id
                        }
                    }, 
                    {
                        $project: {
                            likeCount: { $size: "$like" },
                            unlikeCount: { $size: "$unlike" },
                            song: 1,
                        }
                    }
                ])
                Object.values(songs).forEach((song) => {
                    song.score = song.likeCount / (song.likeCount + song.unlikeCount)
                })
                songs.sort(function(a, b)  {
                    if (a.score > b.score) return -1;
                    if (a.score < b.score) return 1;
                    return 0;
                });
                songs.slice(0, 6).map(async (song) => {
                    const { _id: id } = song
                    await RelaySong.findOneAndUpdate({ 
                        _id: id
                    }, {
                        $set: {
                            approved: true
                        }
                    })
                })
            }
        })
        res.status(200).send()
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 현재 릴레이가 진행중인 플레이리스트 가져오기(늘 2개, 4일 유지 2일 간격 생산)
const getCurrentRelay = async (req, res) => {
    try {
        const nowTime = new Date();
        const relayPlaylists = await RelayPlaylist.find();
        let target = []
        let result = []
        Object.values(relayPlaylists).forEach((item) => {
            const { _id, createdTime } = item
            const postTime = new Date(createdTime);
            const betweenTime = Math.floor((nowTime.getTime() - postTime.getTime()) / 1000 / 60 / 60 / 24);
            if (0 <= betweenTime && betweenTime <= 4) {
                result.push(item)
            }
        })
        res.status(200).send(result);
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 완성된 리스트 가저오기
const getRelayLists = async (req, res) => {
    try {
        const nowTime = new Date();
        const relayPlaylists = await RelayPlaylist.find({}, {
            title: 1, postUserId: 1, image: 1, createdTime: 1
        }).sort({'createdTime': -1});
        let current = []
        let complete = []
        Object.values(relayPlaylists).forEach((item) => {
            const { createdTime } = item
            const postTime = new Date(createdTime);
            const betweenTime = Math.floor((nowTime.getTime() - postTime.getTime()) / 1000 / 60 / 60 / 24);
            if (betweenTime <= 4) {
                current.push(item)
            } else {
                complete.push(item)
            }
        })
        res.status(200).send(current.concat(complete))
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 선택한 릴레이 정보 가져오기
const getSelectedRelay = async (req, res) => {
    try {
        const relayPlaylistId = req.params.id;
        const relayPlaylist = await RelayPlaylist.findOne({
            _id: relayPlaylistId
        }, {
            postUserId: 1, title: 1, createdTime: 1, image: 1, representSong: 1
        });
        const songs = await RelaySong.aggregate([
            {
                $match: {
                    playlistId: mongoose.Types.ObjectId(relayPlaylistId)
                }
            }, 
            {
                $project: {
                    likeCount: { $size: "$like" },
                    unlikeCount: { $size: "$unlike" },
                    song: 1,
                }
            }
        ])
        songs.map((song) => {
            song.score = song.likeCount / (song.likeCount + song.unlikeCount)
        })
        songs.sort(function(a, b)  {
            if (a.score > b.score) return -1;
            if (a.score < b.score) return 1;
            return 0;
        });
        songs.map((song) => {
            delete song.likeCount
            delete song.unlikeCount
            delete song.score
        })
        const result = {
            playlist: relayPlaylist,
            songs: songs.slice(0, 6)
        }
        res.status(200).send(result)
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 릴레이 플레이리스트에 곡 올리기
const postRelaySong = async (req, res) => {
    try {
        const playlistId = req.params.playlistId
        const { song } = req.body;
        const [relaySong] = await Promise.all([
            new RelaySong({
                postUserId: req.user._id,
                playlistId,
                song,
                time: new Date
            }).save(),
            RelayPlaylist.findOneAndUpdate({
                _id: playlistId
            }, {
                $push: { postUserId: req.user._id }
            }, {
                new: true
            })
        ])
        res.status(200).send(relaySong);
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 스와이프할 릴레이 곡 가져오기
const getRelaySong = async (req, res) => {
    try {
        const playlistId = req.params.playlistId
        const songs = await RelaySong.find({
            $and: [{
                playlistId: playlistId
            }, {
                postUserId: { $ne: req.user._id }
            }]
        }, {
            song: 1,
            like: 1,
            unlike: 1
        }).populate('postUserId', {
            name: 1, profileImage: 1
        })
        const result = songs.map((item) => {
            const { like, unlike, _id, song, postUserId } = item
            if(!like.includes(req.user._id) && !unlike.includes(req.user._id)) {
                return {
                    _id: _id,
                    song: song,
                    postUserId: postUserId
                }
            }
        })
        res.status(200).send(result[0] === undefined ? [] : result)
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 곡 스와이프 좋아요
const likeRelaySong = async (req, res) => {
    try {
        const songId = req.params.songId
        const relaySong = await RelaySong.findOneAndUpdate({
            _id: songId
        }, {
            $push: { like: req.user._id }
        }, {
            new: true
        })
        res.status(200).send(relaySong);
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 곡 스와이프 싫어요
const unlikeRelaySong = async (req, res) =>{
    try {
        const songId = req.params.songId
        const relaySong = await RelaySong.findOneAndUpdate({
            _id: songId
        }, {
            $push: { unlike: req.user._id }
        }, {
            new: true
        })
        res.status(200).send(relaySong);
    } catch (err) {
        return res.status(422).send(err.message);
    } 
}

module.exports = {
    postRelayPlaylist,
    postRepresentSong,
    updateApprovedSong,
    getCurrentRelay,
    getRelayLists,
    getSelectedRelay,
    postRelaySong,
    getRelaySong,
    likeRelaySong,
    unlikeRelaySong,
}