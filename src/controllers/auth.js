const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = mongoose.model('User');
const Notice = mongoose.model('Notice');
const StorySong = mongoose.model('StorySong');
const RelaySong = mongoose.model('RelaySong');
const RelayPlaylist = mongoose.model('RelayPlaylist');
const Genre = mongoose.model('Genre');
const RecentKeyword = mongoose.model('RecentKeyword');
const Playlist = mongoose.model('Playlist');
const PlaylistComment = mongoose.model('PlaylistComment');
const Daily = mongoose.model('Daily');
const DailyComment = mongoose.model('DailyComment');
const AddedSong = mongoose.model('AddedSong');
const AddedPlaylist = mongoose.model('AddedPlaylist');
const Hashtag = mongoose.model('Hashtag');
const Feed = mongoose.model('Feed');
const request = require('request');
const bcrypt = require('bcrypt');

const signUp = async (req, res) => {
    const { email, password } = req.body;
    try{
        const user = await new User({ 
            email, 
            password 
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

        // 장르 user 필드에서 삭제
        for(genreName of user.genre) {
            await Genre.findOneAndUpdate({
                genre: genreName
            }, {
                $pull: {
                    user: mongoose.Types.ObjectId(id)
                }
            })
        }

        // 상대방 follower 필드에서 삭제
        for (following of user.following) {
            await User.findOneAndUpdate({
                _id: following
            }, {
                $pull: {
                    follower: mongoose.Types.ObjectId(id)
                }
            })
        }

        // 상대방 following 필드에서 삭제
        for (follower of user.follower) {
            await User.findOneAndUpdate({
                _id: follower
            }, {
                $pull: {
                    following: mongoose.Types.ObjectId(id)
                }
            })
        }

        // 최근 검색어 삭제
        // 스토리 곡 삭제
        // 릴레이 음악 삭제
        // 담은 곡 삭제
        // 담은 플레이리스트 삭제
        // 피드 삭제
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
            })
        ])

        // 릴레이 플리 postUserId 필드에서 삭제
        const relayPlaylist = await RelayPlaylist.find({}, {
            postUserId: 1
        })
        for (eachPlaylist of relayPlaylist) {
            await RelayPlaylist.findOneAndUpdate({
                _id: eachPlaylist._id
            }, {
                $pull: {
                    postUserId: mongoose.Types.ObjectId(id)
                }
            })
        }

        // 플리 삭제 및 관련 댓글 삭제
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
        for(item of playlist) {
            const { _id: id, comments, hashtag } = item
            for(comment of comments){
                await PlaylistComment.findOneAndDelete({
                    _id: comment
                })
            }
            await AddedPlaylist.deleteMany({
                playlistId: id
            })
            for(text of hashtag) {
                await Hashtag.findOneAndUpdate({
                    hashtag: text
                }, {
                    $pull: {
                        playlistId: mongoose.Types.ObjectId(id)
                    }
                })
            }
        }
        await Playlist.deleteMany({
            postUserId: mongoose.Types.ObjectId(id)
        })
        const playlistComments = await PlaylistComment.aggregate([
            {
                $match: {
                    postUserId: mongoose.Types.ObjectId(id)
                }
            }, {
                $project: {
                    recomments: 1
                }
            }
        ])
        for (item of playlistComments) {
            const { recomments } = item
            for (recomment of recomments) {
                await PlaylistComment.findOneAndDelete({
                    _id: recomment
                })
            }
        }
        await PlaylistComment.deleteMany({
            postUserId: mongoose.Types.ObjectId(id)
        })

        // 데일리 및 관련 댓글 삭제
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
        for(item of daily) {
            const { _id: id, comments, hashtag } = item
            for(comment of comments){
                await DailyComment.findOneAndDelete({
                    _id: comment
                })
            }
            for(hash of hashtag) {
                await Hashtag.findOneAndUpdate({
                    hashtag: hash
                }, {
                    $pull: {
                        dailyId: mongoose.Types.ObjectId(id)
                    }
                })
            }
        }
        await Daily.deleteMany({
            postUserId: mongoose.Types.ObjectId(id)
        })
        const dailyComments = await DailyComment.aggregate([
            {
                $match: {
                    postUserId: mongoose.Types.ObjectId(id)
                }
            }, {
                $project: {
                    recomments: 1
                }
            }
        ])
        for (item of dailyComments) {
            const { recomments } = item
            for (recomment of recomments) {
                await DailyComment.findOneAndDelete({
                    _id: recomment
                })
            }
        }
        await DailyComment.deleteMany({
            postUserId: mongoose.Types.ObjectId(id)
        })

        // 알림 삭제
        await Notice.deleteMany({
            $or: [{
                noticinguser: mongoose.Types.ObjectId(id)
            }, {
                noticieduser: mongoose.Types.ObjectId(id)
            }]
        })

        // 아이디 삭제
        await User.deleteOne({
            _id: id
        })
        res.status(204).send()
    } catch (err) {
        return res.status(422).send(err.message);
    }
} 

const googleSignIn = async (req, res) => {
    const user = await User.findOne({ email: req.params.email });
    if(user == null){
        res.status(200).send([false, req.params.email, req.params.id]);
    }else{
        try{
            await user.comparePassword(req.params.id);
            const token = jwt.sign({ userId: user._id }, process.env.TOKEN_SECRET);
            res.status(200).send([token, req.params.email, req.params.id]);
        } catch (err) {
            return res.status(422).send(err.message);
        }
    }
}

const appleSignIn = async (req, res) => {
    const user = await User.findOne({ email: req.params.email });
    if(user == null){
        res.status(200).send([false, req.params.email, req.params.id]);
    }else{
        try{
            await user.comparePassword(req.params.id.toString());
            const token = jwt.sign({ userId: user._id }, process.env.TOKEN_SECRET);
            res.status(200).send([token, req.params.email, req.params.id]);
        } catch (err) {
            return res.status(422).send(err.message);
        }
    }
}

const kakaoSignIn = async (req, res) => {
    let kakaoOption = {
        url: "https://kapi.kakao.com/v2/user/me",
        method: 'GET',
        headers: {
            'Authorization' : 'Bearer ' + req.params.token
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
    let naverOption = {
        url: "https://openapi.naver.com/v1/nid/me",
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + req.params.token
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