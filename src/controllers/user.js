const mongoose = require('mongoose');
const User = mongoose.model('User');
const Notice = mongoose.model('Notice');
const Genre = mongoose.model('Genre');
const Playlist = mongoose.model('Playlist');
const Daily = mongoose.model('Daily');
const admin = require('firebase-admin');

const genreLists = [
    '국내 발라드',
    '국내 댄스/일렉',
    '국내 알앤비',
    '국내 힙합',
    '국내 인디',
    '국내 락/메탈',
    '어쿠스틱',
    '트로트',
    '해외 락/메탈',
    '해외 일렉',
    '해외 알앤비',
    '해외 힙합',
    'OST',
    'POP',
    '클래식',
    '재즈',
    'J-POP',
    '국악',
    '댄스',
    '아이돌',
    '뮤지컬',
    '국내포크',
    '해외포크',
    '뉴에이지',
    '월드뮤직',

]

// 장르 데이터 등록하기
const addGenreLists = async (req, res) => {
    try {
        genreLists.map(async (genre) => {
            await new Genre({
                genre: genre
            }).save();
        })
        res.status(200).send();
    } catch (err) {
        return res.status(422).send(err.message);    
    }
}

// 필요 없는 필드 지우기
const deleteField = async (req, res) => {
    try {
        const users = await User.updateMany({

        },{
            $unset: {
                myPlaylists: 1,
                playlistGuide: 1,
                curationGuide:1,
                boardGuide:1,
                createGuide:1,
                chats:1,
                boardBookmark:1,
                scrabContent:1,
                songsView:1,
                playlists:1,
                curationposts:1,
                dailys:1,
                relaysongs:1
            }
        })
        res.status(200).send(users)
    } catch (err) {
        return res.status(422).send(err.message);    
    }
}

// 내 정보 가져오기
const getMyInformation = async (req, res) => {
    const nowTime = new Date();
    try {
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
                genre: 1, 
                follower: 1,
                following: 1,
            },
        })
        const [playlist, daily] = await Promise.all([
            Playlist.find({
                postUserId: req.user._id
            }, {
                songs: 1, title: 1, hashtag: 1, image: 1, time: 1,
            }),
            Daily.find({
                postUserId: req.user._id
            }, {
                song: 1, image: 1, textcontent: 1, time: 1,
            })
        ])
        const contents = {
            playlist: playlist,
            daily: daily
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
            todaySong: 1,
            genre: 1, 
            follower: 1, 
            following: 1,
        })
        const [playlist, daily] = await Promise.all([
            Playlist.find({
                postUserId: req.params.id
            }, {
                songs: 1, title: 1, hashtag: 1, image: 1, time: 1,
            }),
            Daily.find({
                postUserId: req.params.id
            }, {
                song: 1, image: 1, textcontent: 1, time: 1,
            })
        ])
        const contents = {
            playlist: playlist,
            daily: daily
        }
        res.status(200).send([user, contents]);
    } catch (err) {
        return res.status(422).send(err.message); 
    }
}

// 프로필 정보 변경
const editProfile = async (req, res) => {
    const { nickName, name, introduction } = req.body;
    try {
        const user = await User.findOneAndUpdate({
            _id: req.user._id
        }, {
            $set: { 
                name: nickName, 
                realName: name, 
                introduction: introduction
            }
        }, {
            new: true,
            projection: {
                name: 1, 
                realName: 1, 
                introduction: 1, 
                songs: 1, 
                profileImage: 1,
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

// 프로필 이미지 변경
const editProfileImage = async (req, res) => {
    const img = req.file.location;
    try {
        const user = await User.findOneAndUpdate({
            _id: req.user._id
        }, {
            $set: { profileImage: img }
        }, {
            new: true,
            projection: {
                name: 1, 
                realName: 1, 
                introduction: 1, 
                songs: 1, 
                profileImage: 1,
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

// 팔로우 정보 가져오기
const getFollow =  async (req, res) => {
    try {
      const user = await User.findOne({
          _id: req.params.id
      }, {
          _id: 1
      }).populate('follower', {
        name: 1, profileImage:1,
      }).populate('following', {
        name: 1, profileImage:1,
      });
      res.status(200).send(user);
    } catch (err) {
        return res.status(422).send(err.message)
    }
}

// 팔로우하기
const follow = async (req, res) => {
    try {
        if(!JSON.stringify(req.user.following).includes(req.params.id)) {
            const user = await User.findOneAndUpdate({
                _id: req.params.id
            }, {
                $push : { follower : req.user._id }
            }, {
                upsert: true, 
                projection: {
                    name: 1, 
                    realName: 1, 
                    introduction: 1, 
                    songs: 1, 
                    profileImage: 1, 
                    todaySong: 1, 
                    noticetoken: 1,
                    genre: 1, 
                    follower: 1,
                    following: 1,
                }
            })
            res.status(200).send(user);
            await Promise.all([
                User.findOneAndUpdate({
                    _id: req.user._id
                }, {
                    $push : { following : req.params.id }
                }, {
                    upsert: true
                }),
                new Notice({ 
                    noticinguser: req.user._id, 
                    noticieduser: user._id, 
                    noticetype: 'follow', 
                    time: new Date()
                }).save()
            ])
    
            if(user.noticetoken !== null && user._id.toString() !== req.user._id.toString()){
                let message = {
                    notification: {
                        body: req.user.name + '님이 당신을 팔로우 합니다.',
                    },
                    token: user.noticetoken
                };
                try {
                    await admin.messaging().send(message).then((response)=> {}).catch((error)=>{console.log(error);});
                } catch (err) {
                    return res.status(422).send(err.message);
                }
            }
        } else {
            const user = await User.findOne({
                _id : req.params.id
            }, {
                name: 1, 
                realName: 1, 
                introduction: 1, 
                songs: 1, 
                profileImage: 1, 
                todaySong: 1, 
                noticetoken: 1,
                genre: 1, 
                follower: 1,
                following: 1,
            })
            res.status(200).send(user);
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
                todaySong: 1, 
                noticetoken: 1,
                genre: 1, 
                follower: 1,
                following: 1,
            }
        })
        res.status(200).send(user);
        await Promise.all([
            User.findOneAndUpdate({
                _id: req.user._id
            }, {
                $pull: { following :req.params.id }
            }, {
                new: true
            }), 
            Notice.findOneAndDelete({
                $and: [{ 
                    noticetype: 'follow' 
                }, { 
                    noticinguser: req.user._id 
                }, { 
                    noticieduser: req.params.id 
                }]
            }) 
        ]);
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
    const { songs } = req.body;
    try {
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

// 대표곡 수정
const editRepresentSongs = async (req, res) => {
    const { songs } = req.body;
    try {
        const user = await User.findOneAndUpdate({
            _id: req.user._id
        }, {
            $set: {
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

const getGenreLists = async (req, res) => {
    try {
        const genreLists = await Genre.find({}, {
            genre: 1
        })
        genreLists.sort(() => Math.random() - 0.5);
        res.status(200).send(genreLists);
    } catch (err) {
        return res.status(422).send(err.message); 
    }
}

const postGenre = async (req, res) => {
    try {
        const { genreLists } = req.body;
        req.user.genre.map(async (genre) => {
            await Genre.findOneAndUpdate({
                genre: genre
            }, {
                $pull: {
                    user: req.user._id
                }
            })
        })
        genreLists.map(async (genre) => {
            await Genre.findOneAndUpdate({
                genre: genre
            }, {
                $push: {
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

module.exports = {
    addGenreLists,
    deleteField,
    getMyInformation,
    getOtherInformation,
    editProfile,
    editProfileImage,
    getFollow,
    follow,
    unFollow,
    getRepresentSongs,
    postRepresentSongs,
    editRepresentSongs,
    getGenreLists,
    postGenre,
}