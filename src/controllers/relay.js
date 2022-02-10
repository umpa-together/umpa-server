const mongoose = require('mongoose');
const RelayPlaylist = mongoose.model('RelayPlaylist');
const RelaySong = mongoose.model('RelaySong');
const Comment = mongoose.model('RelayComment')
const Recomment = mongoose.model('RelayRecomment')
const Notice = mongoose.model('Notice');
const admin = require('firebase-admin');

// 주제곡을 통한 플레이리스트 업로드
const postRelayPlaylist = async (req, res) => {
    try {
        const { lists } = req.body
        for (const item of lists) {
            const { title, template, opacityTop, opacityBottom } = item
            await new RelayPlaylist({
                title,
                template,
                opacityTop,
                opacityBottom,
                createdTime: new Date()
            }).save()
        }
        res.status(204).send()
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
        res.status(204).send()
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 기간 끝난 플레이리스트 곡 승인
const updateApprovedSong = async (req, res) => {
    try {
        const nowTime = new Date();
        const relayPlaylists = await RelayPlaylist.find({
            approved: false
        }, {
            createdTime: 1, title: 1
        });
        for(const item of relayPlaylists) {
            const { createdTime, _id: relayId, title } = item
            const postTime = new Date(createdTime);
            const betweenTime = Math.floor((nowTime.getTime() - postTime.getTime()) / 1000 / 60 / 60 / 24);
            if (betweenTime > 4) {
                const [songs] = await Promise.all([
                    RelaySong.aggregate([
                        {
                            $match: {
                                playlistId: relayId
                            }
                        }, 
                        {
                            $lookup: {
                                from: 'users',
                                localField: 'postUserId',
                                foreignField: '_id',
                                as: 'postUserId',
                            }
                        },
                        {
                            $project: {
                                likeCount: { $size: "$like" },
                                unlikeCount: { $size: "$unlike" },
                                song: 1,
                                "postUserId._id": 1,
                                "postUserId.noticetoken": 1
                            }
                        }
                    ]),
                    RelayPlaylist.findOneAndUpdate({
                        _id: relayId
                    }, {
                        $set: {
                            approved: true
                        }
                    })
                ])
                songs.forEach((song) => {
                    song.score = song.likeCount / (song.likeCount + song.unlikeCount)
                })
                songs.sort(function(a, b)  {
                    if (a.score > b.score) return -1;
                    if (a.score < b.score) return 1;
                    return 0;
                });
                for (const song of songs) {
                    const { _id: id, postUserId, song: { attributes: { name, artistName } } } = song
                    await Promise.all([
                        RelaySong.findOneAndUpdate({ 
                            _id: id
                        }, {
                            $set: {
                                approved: true
                            }
                        }), 
                        new Notice({
                            noticieduser: postUserId[0]._id,
                            noticetype: 'relay',
                            time: nowTime,
                            relay: relayId,
                            relaysong: id
                        }).save()
                    ])
                    if(postUserId[0].noticetoken !== null) {
                        const message = {
                            notification: {
                                title: title.join(' '),
                                body: `${name} - ${artistName} 곡이 릴레이 플레이리스트에 선정되었습니다.`
                            },
                            token: postUserId[0].noticetoken
                        }
                        try {
                            await admin.messaging().send(message).then((response)=> {}).catch((error)=>{console.log(error, 'zz');});
                        } catch (err) {
                            console.log("HERE")
                            return res.status(422).send(err.message);
                        }
                    }
                }
            }
        }
        res.status(204).send()
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 현재 릴레이가 진행중인 플레이리스트 가져오기(늘 2개, 4일 유지 2일 간격 생산)
const getCurrentRelay = async (req, res) => {
    try {
        const nowTime = new Date();
        const relayPlaylists = await RelayPlaylist.find({});
        let result = []

        const promise = relayPlaylists.map(async (item) => {
            const { createdTime, _id, title, isBackground, representSong, 
                image, postUserId, opacityTop, opacityBottom, template, youtubeUrl } = item
            const postTime = new Date(createdTime);
            const betweenTime = Math.floor((nowTime.getTime() - postTime.getTime()) / 1000 / 60 / 60 / 24);

            if (0 <= betweenTime && betweenTime < 4) {
                let evaluateCount = [];
                let swipeSongs = [];
                const songs = await RelaySong.find({
                    $and: [{
                        playlistId: _id
                    }, {
                        postUserId: { $ne: req.user._id }
                    }]
                }, {
                    playlistId: 1,
                    song: 1,
                    like: 1,
                    unlike: 1,
                }).populate('postUserId', {
                    name: 1, profileImage: 1
                })
                songs.forEach((el) => {
                    const { like, unlike, _id, song, postUserId, playlistId} = el
                    like.concat(unlike).forEach((person) => {
                        if(!evaluateCount.includes(person.toString())) {
                           evaluateCount.push(person.toString())
                        }
                    })
                    if(!like.includes(req.user._id) && !unlike.includes(req.user._id)) {
                        const songObject = {
                            _id: _id,
                            song: song,
                            postUserId: postUserId,
                            playlistId
                        }
                        swipeSongs.push(songObject)
                    }
                })
                const relayPlaylist = {
                    title, 
                    isBackground,
                    representSong,
                    image,
                    evaluateCount: evaluateCount.length,
                    postUserId,
                    createdTime,
                    opacityTop,
                    opacityBottom,
                    template,
                    youtubeUrl,
                    _id: _id,
                    relaySong: swipeSongs,
                 }        
                result.push(relayPlaylist);
            }
        })

        await Promise.all(promise);

        res.status(200).send(result);
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 완성된 리스트 가저오기
const getRelayLists = async (req, res) => {
    try {
        const nowTime = new Date();
        const [relayPlaylists, relaysongs] = await Promise.all([
            RelayPlaylist.find({}, {
              title: 1, postUserId: 1, image: 1, createdTime: 1, hashtags:1,
            }).sort({'createdTime': -1}), 
            RelaySong.find({},{
              like:1, unlike:1, playlistId:1 
            })
        ]);
        let current = []
        let complete = []
        Object.values(relayPlaylists).forEach((item) => {
            const { title, image, postUserId, hashtags, createdTime, _id } = item;
            const postTime = new Date(createdTime);
            const betweenTime = Math.floor((nowTime.getTime() - postTime.getTime()) / 1000 / 60 / 60 / 24);
            let evaluateCount = [];
            relaysongs.forEach((song) => {
                const { like, unlike, playlistId } = song
                if(_id.toString() === playlistId.toString()) {
                    like.concat(unlike).forEach((person) => {
                        if(!evaluateCount.includes(person.toString())) {
                            evaluateCount.push(person.toString())
                        }
                    })
                } 
            })
            const playlist = {
                title, 
                createdTime,
                image,
                postUserId,
                evaluateCount: evaluateCount.length,
                _id,
                hashtags,
            }   
            if (betweenTime <= 4) {
                current.push(playlist)
            } else {
                complete.push(playlist)
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
        let evaluateCount = [];
        const [relayPlaylist, songs, comments, recomments] = await Promise.all([
            RelayPlaylist.findOne({
                _id: relayPlaylistId
            }, {
                postUserId: 1, title: 1, createdTime: 1, image: 1, representSong: 1, likes: 1, youtubeUrl: 1, hashtags: 1, comments: 1
            }),
            RelaySong.aggregate([
                {
                    $match: {
                        playlistId: mongoose.Types.ObjectId(relayPlaylistId)
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'postUserId',
                        foreignField: '_id',
                        as: 'postUserId',
                    }
                },
                {
                    $project: {
                        like: 1,
                        unlike: 1,
                        likeCount: { $size: "$like" },
                        unlikeCount: { $size: "$unlike" },
                        song: 1,
                        'postUserId.name': 1,
                        'postUserId.profileImage': 1,
                        'postUserId._id': 1,
                        'postUserId.genre': 1
                    }
                }
            ]),
            Comment.find({
                relayId: relayPlaylistId
            }, {
                text: 1, time: 1, likes: 1, recomment: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
            Recomment.find({
                relayId: relayPlaylistId
            }, {
                parentCommentId: 1, text: 1, time: 1, likes: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
        ])

        for(let comment of comments){
            for(const recomment of recomments){
                if(recomment.parentCommentId.toString() === comment._id.toString()){
                    comment.recomment.push(recomment);
                }
            }
        }

        songs.forEach((song) => {
            const { likeCount, unlikeCount, like, unlike } = song
            song.score = likeCount / (likeCount + unlikeCount)
            song.postUser = song.postUserId[0]
            like.concat(unlike).forEach((person) => {
                if(!evaluateCount.includes(person.toString())) {
                    evaluateCount.push(person.toString())
                }
            })
        })

        songs.sort(function(a, b)  {
            if (a.score > b.score) return -1;
            if (a.score < b.score) return 1;
            return 0;
        });

        const resultSongs = songs.slice(0, 6).map((song) => {
            delete song.likeCount
            delete song.unlikeCount
            delete song.score
            delete song.postUserId
            return song
        })

        const playlist = {
            title: relayPlaylist.title, 
            createdTime: relayPlaylist.createdTime,
            image: relayPlaylist.image,
            representSong: relayPlaylist.representSong,
            postUserId: relayPlaylist.postUserId,
            evaluateCount: evaluateCount.length,
            _id: relayPlaylist._id,
            likes: relayPlaylist.likes, 
            youtubeUrl: relayPlaylist.youtubeUrl,
            hashtags: relayPlaylist.hashtags,
            comments: relayPlaylist.comments
        }        

        const result = {
            playlist: playlist,
            songs: resultSongs
        }
        res.status(200).send([result, comments])
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
        res.status(204).send();
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
            playlistId: 1,
            song: 1,
            like: 1,
            unlike: 1,
    
        }).populate('postUserId', {
            name: 1, profileImage: 1
        })
        const result = songs.map((item) => {
            const { like, unlike, _id, song, postUserId, playlistId} = item
            if(!like.includes(req.user._id) && !unlike.includes(req.user._id)) {
                return {
                    _id: _id,
                    song: song,
                    postUserId: postUserId,
                    playlistId

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

// 릴레이 플리 좋아요
const likeRelayPlaylist = async (req, res) => {
    try {
        const relayId = req.params.id
        const relayPlaylist = await RelayPlaylist.findOne({
            _id: relayId
        }, {
            likes: 1
        })
        if(relayPlaylist.likes.includes(req.user._id)) {
            res.status(400).send()
        } else {
            await RelayPlaylist.findOneAndUpdate({
                _id: relayId
            }, {
                $push: {
                    likes: req.user._id
                }
            })
            res.status(204).send()
        }
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 릴레이 플리 좋아요 취소
const unLikeRelayPlaylist = async (req, res) => {
    try {
        const relayId = req.params.id
        const relayPlaylist = await RelayPlaylist.findOne({
            _id: relayId
        }, {
            likes: 1
        })
        if (relayPlaylist.likes.includes(req.user._id)) {
            await RelayPlaylist.findOneAndUpdate({ 
                _id: relayId
            }, {
                $pull: {
                    likes: req.user._id
                }
            })
            res.status(204).send()
        } else {
            res.status(400).send()
        }
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 댓글 달기
const addComment = async (req, res) => {
    try {
        const { text } = req.body
        const relayId = req.params.id
        const newComment = await new Comment({ 
            relayId: relayId, 
            postUserId: req.user._id, 
            text, 
            time: new Date() 
        }).save();
        const [relay, comments, recomments] = await Promise.all([
            RelayPlaylist.findOneAndUpdate({
                _id: relayId
            }, {
                $push: { comments: newComment._id }
            }, {
                new: true,
                projection: {
                    comments: 1
                }
            }),
            Comment.find({
                relayId: relayId
            }, {
                text: 1, time: 1, likes: 1, recomment: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
            Recomment.find({
                relayId: relayId
            }, {
                parentCommentId: 1, text: 1, time: 1, likes: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
        ])
        for(let comment of comments){
            for(const recomment of recomments){
                if(recomment.parentCommentId.toString() === comment._id.toString()){
                    comment.recomment.push(recomment);
                }
            }
        }
        res.status(201).send([relay.comments, comments])
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 댓글 지우기
const deleteComment = async (req, res) => {
    try {
        const commentId = req.params.commentId
        const relayId = req.params.id
        await Promise.all([
            Comment.deleteMany({
                _id: commentId
            }),
            Recomment.deleteMany({
                parentCommentId: commentId
            })
        ])
        const [relay, comments, recomments] = await Promise.all([
            RelayPlaylist.findOneAndUpdate({
                _id: relayId
            }, {
                $pull: { comments: commentId }
            }, {
                new: true,
                projection: {
                    comments: 1
                }
            }),
            Comment.find({
                relayId: relayId
            }, {
                text: 1, time: 1, likes: 1, recomment: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
            Recomment.find({
                relayId: relayId
            }, {
                parentCommentId: 1, text: 1, time: 1, likes: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
        ])
        for(let comment of comments){
            for(const recomment of recomments){
                if(recomment.parentCommentId.toString() === comment._id.toString()){
                    comment.recomment.push(recomment);
                }
            }
        }
        res.status(200).send([relay.comments, comments])
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 대댓글 달기
const addRecomment = async (req, res) => {
    try {
        const { text } = req.body;
        const relayId = req.params.id
        const commentId = req.params.commentId
        const newComment = await new Recomment({ 
            relayId: relayId, 
            parentCommentId: commentId,
            postUserId: req.user._id, 
            text, 
            time: new Date()
        }).save();
        const [relay, parentcomment, comments, recomments] = await Promise.all([
            RelayPlaylist.findOneAndUpdate({
                _id: relayId
            }, {
                $push: { comments: newComment._id }
            }, {
                new: true,
                projection: {
                    comments: 1
                }
            }),
            Comment.findOne({
                _id: commentId
            }, {
                _id: 1
            }).populate('relayId', {
                title: 1
            }).populate('postUserId', {
                _id: 1, noticetoken: 1
            }),
            Comment.find({
                relayId: relayId
            }, {
                text: 1, time: 1, likes: 1, recomment: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
            Recomment.find({
                relayId: relayId
            }, {
                parentCommentId: 1, text: 1, time: 1, likes: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
        ])    
        for(let comment of comments){
            for(const recomment of recomments){
                if(recomment.parentCommentId.toString() === comment._id.toString()){
                    comment.recomment.push(recomment);
                }
            }
        }
        res.status(201).send([relay.comments, comments]);
        const targetuser = parentcomment.postUserId
        if(targetuser._id.toString() != req.user._id.toString()){
            try {
                await new Notice({ 
                    noticinguser: req.user._id,  
                    noticieduser: targetuser._id, 
                    noticetype: 'rrecom', 
                    time: new Date(), 
                    relay: relayId, 
                    relaycomment: commentId, 
                    relayrecomment: newComment._id 
                }).save();
            } catch (err) {
                return res.status(422).send(err.message);
            }
        }
        if(targetuser.noticetoken !== null && targetuser._id.toString() !== req.user._id.toString()){
            const message = {
                notification : {
                    title: parentcomment.relayId.title,
                    body : req.user.name+'님이 ' + text + ' 대댓글을 달았습니다.',
                },
                token : targetuser.noticetoken
            };
            try {
                await admin.messaging().send(message).then((response)=> {}).catch((error)=>{console.log(error);});
            } catch (err) {
                return res.status(422).send(err.message);
            }
        }
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 대댓글 삭제
const deleteRecomment = async (req, res) => {
    try {
        const commentId = req.params.commentId
        const relayId = req.params.id;
        const comment = await Recomment.findOneAndDelete({
            _id: commentId
        });
        const [relay, comments, recomments] = await Promise.all([
            RelayPlaylist.findOneAndUpdate({
                _id: relayId
            }, {
                $pull: { comments: commentId }
            }, {
                new: true,
                projection: {
                    comments: 1
                }
            }),
            Comment.find({
                relayId: relayId
            }, {
                text: 1, time: 1, likes: 1, recomment: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
            Recomment.find({
                relayId: relayId
            }, {
                parentCommentId: 1, text: 1, time: 1, likes: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
            Notice.deleteMany({
                $and: [{ 
                    relay: comment.playlistId 
                }, { 
                    relaycomment: mongoose.Types.ObjectId(comment.parentCommentId) 
                }, { 
                    relayrecomment: comment._id 
                }]
            })
        ])
        for(let comment of comments){
            for(const recomment of recomments){
                if(recomment.parentCommentId.toString() === comment._id.toString()){
                    comment.recomment.push(recomment);
                }
            }
        }
        res.status(200).send([relay.comments, comments]);
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 댓글 좋아요
const likeComment = async (req, res) => {
    try {
        const time = new Date();
        const relayId = req.params.relayId
        const commentId = req.params.id
        const like = await Comment.findOneAndUpdate({
            _id: commentId
        }, {
            $push: { likes : req.user._id }
        }, {
            new: true
        }).populate('postUserId', {
            noticetoken: 1
        });
        const [comments, recomments] = await Promise.all([
            Comment.find({
                relayId: relayId
            }, {
                text: 1, time: 1, likes: 1, recomment: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1, 
            }),
            Recomment.find({
                relayId: relayId
            }, {
                parentCommentId: 1, text: 1, time: 1, likes: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
        ])
        for(let comment of comments){
            for(const recomment of recomments){
                if(recomment.parentCommentId.toString() === comment._id.toString()){
                    comment.recomment.push(recomment);
                }
            }
        }
        res.status(200).send(comments);
        const targetuser = like.postUserId
        if(targetuser._id.toString() !== req.user._id.toString()){
            try {
                await new Notice({ 
                    noticinguser: req.user._id, 
                    noticieduser: targetuser._id, 
                    noticetype:'rcomlike', 
                    time, 
                    relay: relayId, 
                    relaycomment: commentId 
                }).save();
            } catch (err) {
                return res.status(422).send(err.message);
            }
        }
        if(targetuser.noticetoken !== null && targetuser._id.toString() !== req.user._id.toString()){
            const message = {
                notification: {
                    body: req.user.name + '님이 ' + like.text + ' 댓글을 좋아합니다.',
                },
                token: targetuser.noticetoken
            };
            try {
                await admin.messaging().send(message).then((response)=> {}).catch((error)=>{console.log(error);});
            } catch (err) {
                return res.status(422).send(err.message);
            }
        }
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 댓글 좋아요 취소
const unLikeComment = async (req, res) => {
    try {
        const relayId = req.params.relayId
        const commentId = req.params.id
        const like = await Comment.findOneAndUpdate({
            _id: commentId
        }, {
            $pull: { likes: req.user._id }
        }, {
            new: true
        });
        const [comments, recomments] = await Promise.all([
            Comment.find({
                relayId: relayId
            }, {
                text: 1, time: 1, likes: 1, recomment: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1, 
            }),
            Recomment.find({
                relayId: relayId
            }, {
                parentCommentId: 1, text: 1, time: 1, likes: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
            Notice.findOneAndDelete({
                $and: [{ 
                    relay: relayId 
                }, { 
                    relaycomment: commentId
                }, { 
                    noticinguser: req.user._id 
                }, { 
                    noticetype: 'rcomlike' 
                }, { 
                    noticieduser: like.postUserId 
                }]
            }) 
        ])
        for(let comment of comments){
            for(const recomment of recomments){
                if(recomment.parentCommentId.toString() === comment._id.toString()){
                    comment.recomment.push(recomment);
                }
            }
        }
        res.status(200).send(comments);
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 대댓글 좋아요
const likeRecomment = async (req, res) => {
    try {
        const time = new Date()
        const relayId = req.params.relayId
        const commentId = req.params.id
        const like = await Recomment.findOneAndUpdate({
            _id: commentId
        }, {
            $push: { likes: req.user._id }
        }, {
            new: true
        }).populate('postUserId', {
            noticetoken: 1
        });
        const [comments, recomments] = await Promise.all([
            Comment.find({
                relayId: relayId
            }, {
                text: 1, time: 1, likes: 1, recomment: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1, 
            }),
            Recomment.find({
                relayId: relayId
            }, {
                parentCommentId: 1, text: 1, time: 1, likes: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
        ])
        for(let comment of comments){
            for(const recomment of recomments){
                if(recomment.parentCommentId.toString() === comment._id.toString()){
                    comment.recomment.push(recomment);
                }
            }
        }
        res.status(200).send(comments);
        const targetuser = like.postUserId
        if(targetuser._id.toString() !== req.user._id.toString()){
            try {
                await new Notice({ 
                    noticinguser: req.user._id, 
                    noticieduser: targetuser._id, 
                    noticetype: 'rrecomlike', 
                    time, 
                    relay: like.playlistId, 
                    relayrecomment: commentId
                }).save();
            } catch (err) {
                return res.status(422).send(err.message);
            }
        }
        if(targetuser.noticetoken !== null && targetuser._id.toString() !== req.user._id.toString()){
            const message = {
                notification: {
                    body: req.user.name + '님이 ' + like.text + ' 대댓글을 좋아합니다.',
                },
                token: targetuser.noticetoken
            };
            try {
                await admin.messaging().send(message).then((response)=> {}).catch((error)=>{console.log(error);});
            } catch (err) {
                return res.status(422).send(err.message);
            }
        }
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 대댓글 좋아요 취소
const unLikeRecomment = async (req, res) => {
    try {
        const relayId = req.params.relayId
        const commentId = req.params.id
        const like = await Recomment.findOneAndUpdate({
            _id: commentId
        }, {
            $pull: { likes:req.user._id }
        } , {
            new: true
        });
        const [comments, recomments] = await Promise.all([
            Comment.find({
                relayId: relayId
            }, {
                text: 1, time: 1, likes: 1, recomment: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1, 
            }),
            Recomment.find({
                relayId: relayId
            }, {
                parentCommentId: 1, text: 1, time: 1, likes: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
            Notice.findOneAndDelete({
                $and: [{ 
                    relay: like.relayId 
                }, { 
                    relayrecomment: commentId 
                }, {
                    noticinguser: req.user._id 
                }, { 
                    noticetype: 'precomlike' 
                }, { 
                    noticieduser: like.postUserId 
                }]
            }) 
        ])
        for(let comment of comments){
            for(const recomment of recomments){
                if(recomment.parentCommentId.toString() === comment._id.toString()){
                    comment.recomment.push(recomment);
                }
            }
        }
        res.status(200).send(comments);
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
    likeRelayPlaylist,
    unLikeRelayPlaylist,
    addComment,
    deleteComment,
    addRecomment,
    deleteRecomment,
    likeComment,
    unLikeComment,
    likeRecomment,
    unLikeRecomment
}