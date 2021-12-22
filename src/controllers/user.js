const mongoose = require('mongoose');
const User = mongoose.model('User');
const Notice = mongoose.model('Notice');
const Playlist = mongoose.model('Playlist');
const admin = require('firebase-admin');
require('date-utils');

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
                name: 1, realName: 1, introduction: 1, songs: 1, profileImage: 1, myPlaylists: 1,
            },
        }).populate('playlists', {
            title: 1, hashtag: 1, image: 1,
        }).populate('dailys', {

        });
        res.status(200).send(user);
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
            name: 1, realName: 1, introduction: 1, songs: 1, profileImage: 1, todaySong: 1
        }).populate('playlists', {
            title: 1, hashtag: 1, image: 1,
        }).populate('dailys', {

        });
        res.status(200).send(user);
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
                name: 1, realName: 1, introduction: 1, songs: 1, profileImage: 1, myPlaylists: 1,
            },
        }).populate('playlists', {
            title: 1, hashtag: 1, image: 1,
        }).populate('dailys', {

        });
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
                name: 1, realName: 1, introduction: 1, songs: 1, profileImage: 1, myPlaylists: 1,
            },
        }).populate('playlists', {
            title: 1, hashtag: 1, image: 1,
        }).populate('dailys', {

        });
        res.status(200).send(user);
    } catch (err) {
        return res.status(422).send(err.message); 
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
                    name: 1, realName: 1, introduction: 1, songs: 1, profileImage: 1, todaySong: 1, noticetoken: 1
                }
            }).populate('playlists', {
                title: 1, hashtag: 1, image: 1,
            }).populate('dailys', {
    
            });
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
                name: 1, realName: 1, introduction: 1, songs: 1, profileImage: 1, todaySong: 1
            }).populate('playlists', {
                title: 1, hashtag: 1, image: 1,
            }).populate('dailys', {
    
            });
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
                name: 1, realName: 1, introduction: 1, songs: 1, profileImage: 1, todaySong: 1, noticetoken: 1
            }
        }).populate('playlists', {
            title: 1, hashtag: 1, image: 1,
        }).populate('dailys', {

        });
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




const getLikePlaylists = async (req, res) => {
    try {
        const playlists = await Playlist.find({likes: {$in : req.user._id}}, {title: 1, hashtag: 1, image: 1, postUserId: 1});
        res.send(playlists.reverse())
    } catch (err) {
        return res.status(422).send(err.message); 
    }
}

const addSongInPlaylist = async (req, res) => {
    const { song } = req.body;
    var newDate = new Date()
    var time = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
    try {
        song.time = time;
        const user = await User.findOneAndUpdate({_id: req.user._id}, {$push: {myPlaylists: song}}, {new: true});
        res.send(user.myPlaylists);
    } catch (err) {
        return res.status(422).send(err.message); 
    }
}

const deleteSongInPlaylist = async (req, res) => {
    try {
        const user = await User.findOne({_id: req.user._id});
        user.myPlaylists = user.myPlaylists.filter((item) => item.time !=req.params.time)
        res.send(user.myPlaylists)
        user.save();
    } catch (err) {
        return res.status(422).send(err.message); 
    }
}

module.exports = {
    getMyInformation,
    getOtherInformation,
    editProfile,
    editProfileImage,
    follow,
    unFollow,
    getRepresentSongs,
    postRepresentSongs,
    editRepresentSongs,
    getLikePlaylists,
    addSongInPlaylist,
    deleteSongInPlaylist,
}