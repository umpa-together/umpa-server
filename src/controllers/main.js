const mongoose = require('mongoose');
const Playlist = mongoose.model('Playlist');
const User = mongoose.model('User');
const Daily = mongoose.model('Daily');
const AddedSong = mongoose.model('AddedSong');
const Theme = mongoose.model('Theme');

const themeLists = [
    '음파에서 추천하는 꼭 들어야 하는 플리',
    '시원한 여름날이 생각나는 플리',
    '무념무상 나는 이거 들을거야',
    '작업하면서 틀어놔!',
    '어디서 들어본 듯한 노래들이 요기에'
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
const getRecentDaily = async (req, res) => {
    try {
        const dailes = await Daily.find({
            "accessedTime": {
                $exists: true
            }
        }, {
            song: 1, postUserId: 1
        }).sort({'accessedTime': -1}).limit(10)
        res.status(200).send(dailes)
    } catch (err) {
        return res.status(422).send(err.message);   
    }
}

// 메인 DJ 추천
const getMainRecommendDJ = async (req, res) => {
    try {
        const userScoreLists = []
        const { songs } = req.user
        const songId = [] // score 5
        const addedSongId = [] // score 4
        const playlistsId = [] // score 3
        const myPlaylist = await Playlist.aggregate([
            {
                $match: {
                    postUserId: req.user._id
                }
            }, {
                $project: {
                    songs: 1
                }
            }
        ])
        const addedSongs = await AddedSong.aggregate([
            {
                $match: {
                    postUserId: req.user._id
                }
            }, {
                $project: {
                    song: 1
                }
            }
        ])
        songs.map(({ id }) => songId.push(id))
        myPlaylist.map(({ songs }) => songs.map(({ id }) => playlistsId.push(id)))
        addedSongs.map(({ song }) => addedSongId.push(song.id))

        const users = await User.find({ 
            $and: [{
                _id: { $ne: req.user._id }
            }, {
                _id: { $nin: req.user.following }
            }] 
        }, { 
            songs: 1, profileImage: 1, name: 1, genre: 1
        })
        for (const user of users){
            const { songs, _id: id, genre, name, profileImage } = user
            let userScore = 0
            const userSongId = [] // score 5
            const userAddedSongId = [] // score 4
            const userPlaylistId = [] // score 3
            const userPlaylists = await Playlist.aggregate([
                {
                    $match: {
                        postUserId: user._id
                    }
                }, {
                    $project: {
                        songs: 1
                    }
                }
            ])
            const userAddedSong = await AddedSong.aggregate([
                {
                    $match: {
                        postUserId: user._id
                    }
                }, {
                    $project: {
                        song: 1
                    }
                }
            ])
            songs.map(({ id }) => userSongId.push(id))
            userPlaylists.map(({ songs }) => songs.map(({ id }) => userPlaylistId.push(id)))
            userAddedSong.map(({ song }) => userAddedSongId.push(song.id))
            songId.filter((id) => {
                if(userSongId.includes(id)) userScore += 25
                if(userAddedSongId.includes(id))    userScore += 20
                if(userPlaylistId.includes(id)) userScore += 15
            })
            userAddedSong.filter((id) => {
                if(userSongId.includes(id)) userScore += 20
                if(userAddedSongId.includes(id))    userScore += 16
                if(userPlaylistId.includes(id)) userScore += 12
            })
            userPlaylistId.filter((id) => {
                if(userSongId.includes(id)) userScore += 15
                if(userAddedSongId.includes(id))    userScore += 12
                if(userPlaylistId.includes(id)) userScore += 9
            })
            userScoreLists.push({ 
                _id: id,
                score: userScore, 
                genre: genre,
                name: name, 
                profileImage: profileImage,
                playlistCount: userPlaylists.length
            })
        }
        userScoreLists.sort(function(a, b) {
            if(a.score > b.score) return -1;
            if(a.score < b.score) return 1;
            return 0;
        });
        userScoreLists.sort(function(a, b) {
            if((a.score === 0 && b.score === 0) && (a.playlistCount > b.playlistCount)) return -1;
            if((a.score === 0 && b.score === 0) && (a.playlistCount < b.playlistCount)) return 1;
            return 0;
        })
        const result = userScoreLists.slice(0,10).map((user) => {
            delete user.score
            delete user.playlistCount
            return user
        })
        res.status(200).send(result)
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
    getRecentDaily,
    getMainRecommendDJ,
    getMainRecommendPlaylist,
}