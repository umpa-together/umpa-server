const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = mongoose.model('User');
const Notice = mongoose.model('Notice');
const StorySong = mongoose.model('StorySong');
const RelaySong = mongoose.model('RelaySong');
const RelayPlaylist = mongoose.model('RelayPlaylist');
const RelayComment = mongoose.model('RelayComment');
const RelayRecomment = mongoose.model('RelayRecomment');
const Genre = mongoose.model('Genre');
const RecentKeyword = mongoose.model('RecentKeyword');
const Playlist = mongoose.model('Playlist');
const PlaylistComment = mongoose.model('PlaylistComment');
const PlaylistRecomment = mongoose.model('PlaylistRecomment');
const Daily = mongoose.model('Daily');
const DailyComment = mongoose.model('DailyComment');
const DailyRecomment = mongoose.model('DailyRecomment');
const AddedSong = mongoose.model('AddedSong');
const AddedPlaylist = mongoose.model('AddedPlaylist');
const Hashtag = mongoose.model('Hashtag');
const Feed = mongoose.model('Feed');
const request = require('request');

const signUp = async (req, res) => {
    const { email, password } = req.body;
    try{
        const user = await new User({ 
            email, 
            password,
        }).save();
        const token = jwt.sign({ userId: user._id }, process.env.TOKEN_SECRET);
        res.status(201).send({ token });
    }catch (err) {
        return res.status(422).send(err.message);
    }
}

const signIn = async (req, res) => {
    const { email, password } = req.body;
    if(!email || !password){
        return res.status(422).send({ error: 'Must provide email and password' });
    }
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(422).send({ error: 'Email not found' });
    }
    try{
        await user.comparePassword(password);
        const token = jwt.sign({ userId: user._id }, process.env.TOKEN_SECRET);
        res.status(200).send({ token });
    }catch (err) {
        return res.status(422).send(err.message);
    }
}

const withdrawal = async (req, res) => {
    try {
        const id = req.params.id
        const user = await User.findById(id, {
            following: 1, follower: 1, genre: 1
        })
        // ?????? user ???????????? ??????
        user.genre.forEach(async (genreName) => {
            await Genre.findOneAndUpdate({
                genre: genreName
            }, {
                $pull: {
                    user: mongoose.Types.ObjectId(id)
                }
            })        
        })

        // ????????? follower ???????????? ??????
        user.following.forEach(async (following) => {
            await User.findOneAndUpdate({
                _id: following
            }, {
                $pull: {
                    follower: mongoose.Types.ObjectId(id)
                }
            })
        })

        // ????????? following ???????????? ??????
        user.follower.forEach(async (follower) => {
            await User.findOneAndUpdate({
                _id: follower
            }, {
                $pull: {
                    following: mongoose.Types.ObjectId(id)
                }
            })
        })

        // ?????? ????????? ??????
        // ????????? ??? ??????
        // ????????? ?????? ??????
        // ?????? ??? ??????
        // ?????? ?????????????????? ??????
        // ?????? ??????
        // ?????? ??????
        // ????????? ??????
        await Promise.all([
            RecentKeyword.deleteMany({
                postUserId: mongoose.Types.ObjectId(id)
            }),
            StorySong.deleteMany({
                postUserId: mongoose.Types.ObjectId(id)
            }),
            RelaySong.deleteMany({
                postUserId: mongoose.Types.ObjectId(id)
            }),
            AddedSong.deleteMany({
                postUserId: mongoose.Types.ObjectId(id)
            }),
            AddedPlaylist.deleteMany({
                postUserId: mongoose.Types.ObjectId(id)
            }),
            Feed.deleteMany({
                postUserId: mongoose.Types.ObjectId(id)
            }),
            Notice.deleteMany({
                $or: [{
                    noticinguser: mongoose.Types.ObjectId(id)
                }, {
                    noticeduser: mongoose.Types.ObjectId(id)
                }]
            }),
            User.deleteOne({
                _id: id
            }),
        ])

        // ????????? ?????? postUserId ???????????? ??????
        const relayPlaylist = await RelayPlaylist.find({}, {
            postUserId: 1
        })
        relayPlaylist.forEach(async (eachPlaylist) => {
            await RelayPlaylist.findOneAndUpdate({
                _id: eachPlaylist._id
            }, {
                $pull: {
                    postUserId: mongoose.Types.ObjectId(id)
                }
            })
        })

        // ????????? ????????? ????????? ????????? ??? ????????? ?????? ????????? ??????
        const relayComments = await RelayComment.aggregate([
            {
                $match: {
                    postUserId: mongoose.Types.ObjectId(id)
                }
            }, {
                $project: {
                    _id: 1, relayId: 1
                }
            }
        ])
        relayComments.forEach(async (comment) => {
            const { _id: id, relayId } = comment
            const recomments = await RelayRecomment.find({
                parentCommentId: id
            })  
            await Promise.all([
                RelayPlaylist.findOneAndUpdate({
                    _id: relayId
                }, {
                    $pullAll: { comments: [id].concat(recomments.map((recomment) => recomment._id))}
                }),
                RelayRecomment.deleteMany({
                    parentCommentId: id
                })
            ])
        })
        
        // ?????? ????????? ????????? ????????? ?????? ??????
        // ?????? ????????? ????????? ????????? ????????? ??????
        await Promise.all([
            RelayComment.deleteMany({
                postUserId: mongoose.Types.ObjectId(id)
            }),
            RelayRecomment.deleteMany({
                postUserId: mongoose.Types.ObjectId(id)
            })
        ])

        // ?????? ?????? ??? ?????? ?????? ??????
        const playlist = await Playlist.aggregate([
            {
                $match: {
                    postUserId: mongoose.Types.ObjectId(id)
                }
            }, {
                $project: {
                    comments: 1, hashtag: 1
                }
            }
        ])
        // ?????? ????????? ????????? ?????? ????????? ?????????, ?????? ?????? ??????, ????????? ????????? ??????, ????????????
        playlist.forEach(async (item) => {
            const { _id: id, comments, hashtag } = item
            comments.forEach(async (comment) => {
                await Promise.all([
                    PlaylistComment.findOneAndDelete({
                        _id: comment
                    }),
                    PlaylistRecomment.findOneAndDelete({
                        _id: comment
                    })
                ])
            })
            await Promise.all([
                AddedPlaylist.deleteMany({
                    playlistId: mongoose.Types.ObjectId(id)
                }),
                Notice.deleteMany({
                    playlist: mongoose.Types.ObjectId(id)
                })
            ])  
            hashtag.forEach(async (text) => {
                await Hashtag.findOneAndUpdate({
                    hashtag: text
                }, {
                    $pull: {
                        playlistId: mongoose.Types.ObjectId(id)
                    }
                })
            })
        })

        // ?????? ????????? ????????? ????????? ??? ????????? ?????? ????????? ??????
        const playlistComments = await PlaylistComment.aggregate([
            {
                $match: {
                    postUserId: mongoose.Types.ObjectId(id)
                }
            }, {
                $project: {
                    playlistId: 1
                }
            }
        ])
        playlistComments.forEach(async (comment) => {
            const { _id: id, playlistId } = comment
            const recomments = await PlaylistRecomment.find({
                parentCommentId: id
            }, {
                _id: 1
            })
            await Promise.all([
                Playlist.findOneAndUpdate({
                    _id: playlistId
                }, {
                    $pullAll: { comments: [id].concat(recomments.map((recomment) => recomment._id))}
                }),
                PlaylistRecomment.deleteMany({
                    parentCommentId: id
                })
            ])
        })

        // ?????? ????????? ????????? ?????? ??????
        // ?????? ????????? ????????? ????????? ??????
        // ?????? ????????? ?????? ??????
        await Promise.all([
            PlaylistComment.deleteMany({
                postUserId: mongoose.Types.ObjectId(id)
            }),
            PlaylistRecomment.deleteMany({
                postUserId: mongoose.Types.ObjectId(id)
            }),
            Playlist.deleteMany({
                postUserId: mongoose.Types.ObjectId(id)
            }),
        ])

        // ????????? ??? ?????? ?????? ??????
        const daily = await Daily.aggregate([
            {
                $match: {
                    postUserId: mongoose.Types.ObjectId(id)
                }
            }, {
                $project: {
                    comments: 1, hashtag: 1
                }
            }
        ])

        // ?????? ????????? ???????????? ?????? ????????? ?????????, ???????????? ????????? ??????, ????????????
        daily.forEach(async (item) => {
            const { _id: id, comments, hashtag } = item
            comments.forEach(async (comment) => {
                await Promise.all([
                    DailyComment.findOneAndDelete({
                        _id: comment
                    }),
                    DailyRecomment.findOneAndDelete({
                        _id: comment
                    })
                ])
            })
            await Notice.deleteMany({
                daily: mongoose.Types.ObjectId(id)
            })
            hashtag.forEach(async (text) => {
                await Hashtag.findOneAndUpdate({
                    hashtag: text
                }, {
                    $pull: {
                        dailyId: mongoose.Types.ObjectId(id)
                    }
                })
            })
        })

        // ?????? ???????????? ????????? ????????? ??? ????????? ?????? ????????? ??????
        const dailyComments = await DailyComment.aggregate([
            {
                $match: {
                    postUserId: mongoose.Types.ObjectId(id)
                }
            }, {
                $project: {
                    dailyId: 1
                }
            }
        ])
        dailyComments.forEach(async (comment) => {
            const { _id: id, dailyId } = comment
            const recomments = await DailyRecomment.find({
                parentCommentId: id
            }, {
                _id: 1
            })
            await Promise.all([
                Daily.findOneAndUpdate({
                    _id: dailyId
                }, {
                    $pullAll: { comments: [id].concat(recomments.map((recomment) => recomment._id))}
                }),
                DailyRecomment.deleteMany({
                    parentCommentId: id
                })
            ])
        })

        // ?????? ????????? ?????????
        // ?????? ???????????? ????????? ?????? ??????
        // ?????? ???????????? ????????? ????????? ??????
        await Promise.all([
            Daily.deleteMany({
                postUserId: mongoose.Types.ObjectId(id)
            }),
            DailyComment.deleteMany({
                postUserId: mongoose.Types.ObjectId(id)
            }),
            DailyRecomment.deleteMany({
                postUserId: mongoose.Types.ObjectId(id)
            }),
        ])
        res.status(204).send()
    } catch (err) {
        return res.status(422).send(err.message);
    }
} 

const googleSignIn = async (req, res) => {
    const { email, id } = req.body
    const user = await User.findOne({ email });
    if(user == null){
        res.status(200).send([false, email, id]);
    }else{
        try{
            await user.comparePassword(id);
            const token = jwt.sign({ userId: user._id }, process.env.TOKEN_SECRET);
            res.status(200).send([token, email, id]);
        } catch (err) {
            return res.status(422).send(err.message);
        }
    }
}

const appleSignIn = async (req, res) => {
    const { email, id } = req.body
    const user = await User.findOne({ email });
    if(user == null){
        res.status(200).send([false, email, id]);
    }else{
        try{
            await user.comparePassword(id.toString());
            const token = jwt.sign({ userId: user._id }, process.env.TOKEN_SECRET);
            res.status(200).send([token, email, id]);
        } catch (err) {
            return res.status(422).send(err.message);
        }
    }
}

const kakaoSignIn = async (req, res) => {
    const { token } = req.body
    let kakaoOption = {
        url: "https://kapi.kakao.com/v2/user/me",
        method: 'GET',
        headers: {
            'Authorization' : 'Bearer ' + token
        },
    }
    try{
        request(kakaoOption, async (err, response, body) => {
            try{
                const bodytemp = await JSON.parse(body);
                const user = await User.findOne({ email: bodytemp.kakao_account.email });
                if(user == null){
                    res.status(200).send([false, bodytemp.kakao_account.email, bodytemp.id.toString()]);
                } else {

                    
                    const renewalDate = new Date('2022-02-11')
                    if( renewalDate > user.accessedTime) {
                        user.password = bodytemp.id.toString();
                        await user.save();
                    }else {
                       await user.comparePassword(bodytemp.id.toString());
                    }
                    const token = jwt.sign({ userId: user._id }, process.env.TOKEN_SECRET);
                    res.status(200).send([token, bodytemp.kakao_account.email, bodytemp.id.toString()])
                }
            } catch (err) {
                return res.status(422).send(err.message);
            }
        })
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

const naverSignIn = async (req, res) => {
    const { token } = req.body
    let naverOption = {
        url: "https://openapi.naver.com/v1/nid/me",
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        },
    }
    try {
        request(naverOption, async (err, response, body) => {
            try {
                body = await JSON.parse(body);
                const user = await User.findOne({ email: body.response.email });
                if(user == null){
                    res.status(200).send([false, body.response.email, body.response.id]);
                }else{
                    await user.comparePassword(body.response.id);
                    const token = jwt.sign({ userId: user._id }, process.env.TOKEN_SECRET);
                    res.status(200).send([token, body.response.email, body.response.id]);
                }
            } catch (err) {
                return res.status(422).send(err.message);
            }
        })
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

const checkName = async (req, res) => {
    try {
        const user = await User.findOne({ name: req.params.name });
        res.status(200).send(user == null)
    } catch (err) {
        return res.status(422).send(err.message); 
    }   
}

module.exports = {
    signUp,
    signIn,
    withdrawal,
    googleSignIn,
    appleSignIn,
    kakaoSignIn,
    naverSignIn,
    checkName
}