const mongoose = require('mongoose');
const User = mongoose.model('User');
const Notice = mongoose.model('Notice');
const Genre = mongoose.model('Genre');
const Playlist = mongoose.model('Playlist');
const Daily = mongoose.model('Daily');
const RelayPlaylist = mongoose.model('RelayPlaylist');
const RelaySong = mongoose.model('RelaySong');
const Guide = mongoose.model('Guide');
const pushNotification = require('../middlewares/notification');
const addNotice = require('../middlewares/notice');

// 내 정보 가져오기
const getMyInformation = async (req, res) => {
    try {
        const nowTime = new Date();
        const user = await User.findOneAndUpdate({ 
            _id: req.user._id 
        }, {
            $set: { accessedTime: nowTime }
        }, {
            new: true, 
            projection: {
                name: 1, 
                realName: 1, 
                introduction: 1, 
                songs: 1, 
                profileImage: 1,
                backgroundImage: 1,
                genre: 1, 
                follower: 1,
                following: 1,
                guide: 1,
                block: 1
            },
        })
        let relayPlaylist = []
        const [playlist, daily, relaySong] = await Promise.all([
            Playlist.find({
                postUserId: req.user._id
            }, {
                songs: 1, title: 1, hashtag: 1, image: 1, time: 1, likes: 1, postUserId: 1,
            }).sort({ time: -1 }),
            Daily.find({
                postUserId: req.user._id
            }, {
                song: 1, image: 1, textcontent: 1, time: 1, likes: 1, postUserId: 1,
            }).sort({ time: -1 }),
            RelaySong.find({
                $and: [{
                    postUserId: req.user._id
                }, {
                    approved: true
                }]
            }, {
                playlistId: 1, song: 1
            }).sort({ time: -1 })
        ])
        for (const item of relaySong) {
            const { song, playlistId } = item
            const playlist = await RelayPlaylist.findOne({
                _id: playlistId
            }, {
                title: 1, createdTime: 1, image: 1, likes: 1
            })
            relayPlaylist.push({
                playlist,
                song
            })
        }
        const contents = {
            playlist: playlist,
            daily: daily,
            relay: relayPlaylist
        }
        res.status(200).send([user, contents]);
    } catch (err) {
        return res.status(422).send(err.message); 
    }
}

// 다른 유저 정보 가져오기
const getOtherInformation = async (req, res) => {
    try {
        const user = await User.findOne({
            _id : req.params.id
        }, {
            name: 1, 
            realName: 1,
            introduction: 1, 
            songs: 1, 
            profileImage: 1, 
            backgroundImage: 1,
            todaySong: 1,
            genre: 1, 
            follower: 1, 
            following: 1,
        })
        let relayPlaylist = []
        const [playlist, daily, relaySong] = await Promise.all([
            Playlist.find({
                postUserId: req.params.id
            }, {
                songs: 1, title: 1, hashtag: 1, image: 1, time: 1, postUserId: 1, likes: 1,
            }).sort({ time: -1 }),
            Daily.find({
                postUserId: req.params.id
            }, {
                song: 1, image: 1, textcontent: 1, time: 1, likes: 1, postUserId: 1,
            }).sort({ time: -1 }),
            RelaySong.find({
                $and: [{
                    postUserId: req.params.id
                }, {
                    approved: true
                }]
            }, {
                playlistId: 1, song: 1
            }).sort({ time: -1 })
        ])
        for (const item of relaySong) {
            const { song, playlistId } = item
            const playlist = await RelayPlaylist.findOne({
                _id: playlistId
            }, {
                title: 1, createdTime: 1, image: 1, likes: 1
            })
            relayPlaylist.push({
                playlist,
                song
            })
        }
        const contents = {
            playlist: playlist,
            daily: daily,
            relay: relayPlaylist
        }
        res.status(200).send([user, contents]);
    } catch (err) {
        return res.status(422).send(err.message); 
    }
}

// 프로필 정보 변경
const editProfile = async (req, res) => {
    try {
        const { nickName, name, introduction, genre, songs } = req.body;
        req.user.genre.forEach(async (genre) => {
            await Genre.findOneAndUpdate({
                genre: genre
            }, {
                $pull: {
                    user: req.user._id
                }
            })
        })
        genre.forEach(async (genre) => {
            await Genre.findOneAndUpdate({
                genre: genre
            }, {
                $addToSet: {
                    user: req.user._id
                }
            })
        })
        const user = await User.findOneAndUpdate({
            _id: req.user._id
        }, {
            $set: { 
                name: nickName, 
                realName: name, 
                introduction: introduction,
                genre: genre,
                songs: songs
            }
        }, {
            new: true,
            projection: {
                name: 1, 
                realName: 1, 
                introduction: 1, 
                songs: 1, 
                profileImage: 1,
                backgroundImage: 1,
                genre: 1, 
                follower: 1,
                following: 1,
                guide: 1,
                block: 1
            },
        })
        res.status(200).send(user);
    } catch (err) {
        return res.status(422).send(err.message); 
    }
}

// 프로필 이미지, 배경 변경 변경
const editImage = async (req, res) => {
    try {
        let query = {}
        if (req.files['profileImage']) {
            query.profileImage = req.files['profileImage'][0].location
        }
        if (req.files['backgroundImage']) {
            query.backgroundImage = req.files['backgroundImage'][0].location
        }
        await User.findOneAndUpdate({
            _id: req.user._id
        }, {
            $set: query
        }, {
            new: true,
        })
        res.status(204).send();
    } catch (err) {
        return res.status(422).send(err.message); 
    }
}

// 팔로우 정보 가져오기
const getFollow =  async (req, res) => {
    try {
      const user = await User.findOne({
          _id: req.params.id
      }, {
          _id: 1
      }).populate('follower', {
        name: 1, profileImage:1, songs: 1,
      }).populate('following', {
        name: 1, profileImage:1, songs: 1,
      });
      res.status(200).send(user);
    } catch (err) {
        return res.status(422).send(err.message)
    }
}

// 팔로우하기
const follow = async (req, res) => {
    try {
        const user = await User.findOneAndUpdate({
            _id: req.params.id
        }, {
            $addToSet : { follower : req.user._id }
        }, {
            new: true,
            projection: {
                name: 1, 
                realName: 1, 
                introduction: 1, 
                songs: 1, 
                profileImage: 1, 
                backgroundImage: 1,
                todaySong: 1, 
                noticetoken: 1,
                genre: 1, 
                follower: 1,
                following: 1,
                guide: 1
            }
        })
        const me = await User.findOneAndUpdate({
            _id: req.user._id
        }, {
            $addToSet : { following : req.params.id }
        }, {
            new: true,
            projection: {
                name: 1, 
                realName: 1, 
                introduction: 1, 
                songs: 1, 
                profileImage: 1,
                backgroundImage: 1,
                genre: 1, 
                follower: 1,
                following: 1,
                guide: 1,
                block: 1
            }
        })
        res.status(200).send([me, user]);
        if(!JSON.stringify(req.user.following).includes(req.params.id)) {
            addNotice({
                noticinguser: req.user._id,
                noticeduser: user._id,
                noticetype: 'follow',
            })
            pushNotification(user, req.user._id, `${req.user.name}님이 회원님을 팔로우하기 시작했습니다`)
        }
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 언팔로우하기
const unFollow = async (req, res) => {
    try{
        const user = await User.findOneAndUpdate({
            _id: req.params.id
        }, {
            $pull : { follower : req.user._id }
        }, {
            new: true,
            projection: {
                name: 1, 
                realName: 1, 
                introduction: 1, 
                songs: 1, 
                profileImage: 1, 
                backgroundImage: 1,
                todaySong: 1, 
                noticetoken: 1,
                genre: 1, 
                follower: 1,
                following: 1,
                guide: 1
            }
        })
        const [me] = await Promise.all([
            User.findOneAndUpdate({
                _id: req.user._id
            }, {
                $pull: { following :req.params.id }
            }, {
                new: true,
                projection: {
                    name: 1, 
                    realName: 1, 
                    introduction: 1, 
                    songs: 1, 
                    profileImage: 1,
                    backgroundImage: 1,
                    genre: 1, 
                    follower: 1,
                    following: 1,
                    guide: 1,
                    block: 1
                }
            }), 
            Notice.findOneAndDelete({
                $and: [{ 
                    noticetype: 'follow' 
                }, { 
                    noticinguser: req.user._id 
                }, { 
                    noticeduser: req.params.id 
                }]
            }) 
        ]);
        res.status(200).send([me, user]);
    }catch(err){
        return res.status(422).send(err.message);
    }
}

// userId에 맞는 대표곡 가져오기
const getRepresentSongs = async (req, res) => {
    try {
        const user = await User.findOne({
            _id: req.params.userId
        }, {
            songs: 1
        });
        res.status(200).send(user.songs);
    } catch (err) { 
        return res.status(422).send(err.message); 
    }
}

// 대표곡 설정
const postRepresentSongs = async (req, res) => {
    try {
        const { songs } = req.body;
        const user = await User.findOneAndUpdate({
            _id: req.user._id
        }, {
            $push: {
                songs: songs
            }
        }, {
            new: true
        });
        res.status(200).send(user.songs);
    } catch (err) {
        return res.status(422).send(err.message); 
    }
}

// 장르 목록 가져오기
const getGenreLists = async (req, res) => {
    try {
        const genreLists = await Genre.find({}, {
            genre: 1
        })
        res.status(200).send(genreLists);
    } catch (err) {
        return res.status(422).send(err.message); 
    }
}

// 장르 올리기
const postGenre = async (req, res) => {
    try {
        const { genreLists } = req.body;
        req.user.genre.forEach(async (genre) => {
            await Genre.findOneAndUpdate({
                genre: genre
            }, {
                $pull: {
                    user: req.user._id
                }
            })
        })
        genreLists.forEach(async (genre) => {
            await Genre.findOneAndUpdate({
                genre: genre
            }, {
                $addToSet: {
                    user: req.user._id
                }
            })
        })
        const user = await User.findOneAndUpdate({ 
            _id: req.user._id 
        }, {
            $set: { genre: genreLists }
        }, {
            new: true, 
            projection: {
                name: 1, 
                realName: 1, 
                introduction: 1, 
                songs: 1, 
                profileImage: 1,
                backgroundImage: 1,
                genre: 1, 
                follower: 1,
                following: 1,
            },
        })
        res.status(200).send(user);
    } catch (err) {
        return res.status(422).send(err.message); 
    }
}

const getGuide = async (req, res) => {
    try {
        const type = req.params.type
        const guide = await Guide.find({
            type
        }, {
            image: 1
        })
        res.status(200).send(guide)
    } catch (err) {
        return res.status(422).send(err.message); 
    }
}

const blockUser = async (req, res) => {
    const id = req.params.id
    try {
        const user = await User.findOneAndUpdate({
            _id: req.user._id
        }, {
            $addToSet: { block: id }
        }, {
            new: true,
            projection: {
                name: 1, 
                realName: 1, 
                introduction: 1, 
                songs: 1, 
                profileImage: 1,
                backgroundImage: 1,
                genre: 1, 
                follower: 1,
                following: 1,
                guide: 1,
                block: 1
            },
        });
        res.status(200).send(user)
    } catch (err) {
        return res.status(422).send(err.message);
    }   
}

const unblockUser = async (req, res) => {
    const id = req.params.id
    try {
        const user = await User.findOneAndUpdate({
            _id: req.user._id
        }, {
            $pull: { block: id }
        }, {
            new: true,
            projection: {
                name: 1, 
                realName: 1, 
                introduction: 1, 
                songs: 1, 
                profileImage: 1,
                backgroundImage: 1,
                genre: 1, 
                follower: 1,
                following: 1,
                guide: 1,
                block: 1
            },
        });
        res.status(200).send(user)
    } catch (err) {
        return res.status(422).send(err.message);
    }   
}

module.exports = {
    getMyInformation,
    getOtherInformation,
    editProfile,
    editImage,
    getFollow,
    follow,
    unFollow,
    getRepresentSongs,
    postRepresentSongs,
    getGenreLists,
    postGenre,
    getGuide,
    blockUser,
    unblockUser
}