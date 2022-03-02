const mongoose = require('mongoose');
const RelayPlaylist = mongoose.model('RelayPlaylist');
const RelaySong = mongoose.model('RelaySong');
const Comment = mongoose.model('RelayComment')
const Recomment = mongoose.model('RelayRecomment')
const Notice = mongoose.model('Notice');
const commentConverter = require('../middlewares/comment');
const pushNotification = require('../middlewares/notification');
const addNotice = require('../middlewares/notice');

// 주제곡을 통한 플레이리스트 업로드
const postRelayPlaylist = async (req, res) => {
    try {
        const { lists } = req.body
        for (const item of lists) {
            const { title, template, opacityTop, opacityBottom, opacityNumber, hashtags } = item
            await new RelayPlaylist({
                title,
                template,
                opacityTop,
                opacityBottom,
                opacityNumber,
                createdTime: new Date(),
                hashtags
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
            const { createdTime, _id: relayId } = item
            const postTime = new Date(createdTime);
            const betweenTime = Math.floor((nowTime.getTime() - postTime.getTime()) / 1000 / 60 / 60 / 24);
            if (betweenTime >= 4) {
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
                let participateCount = 0
                songs.forEach((song) => {
                    const { likeCount, unlikeCount } = song
                    participateCount += (likeCount + unlikeCount)
                    song.score = likeCount / (likeCount + unlikeCount)
                })
                participateCount = Math.floor(participateCount / songs.length)
                const targetSongs = songs.filter((song) => {
                    const { likeCount, unlikeCount } = song
                    if (likeCount + unlikeCount >= participateCount) {
                        return song
                    }
                })
                targetSongs.sort(function(a, b)  {
                    if (a.score > b.score) return -1;
                    if (a.score < b.score) return 1;
                    return 0;
                });
                for (const song of targetSongs.slice(0, 8)) {
                    const { _id: id, postUserId } = song
                    await Promise.all([
                        RelaySong.findOneAndUpdate({ 
                            _id: id
                        }, {
                            $set: {
                                approved: true
                            }
                        }), 
                        new Notice({
                            noticeduser: postUserId[0]._id,
                            noticetype: 'relay',
                            time: nowTime,
                            relay: relayId,
                            relaysong: id
                        }).save()
                    ])
                    pushNotification(postUserId[0], '', '회원님의 추천곡이 릴레이플리에 선정되었습니다!')
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
        const beforeDay =  new Date(
            nowTime.getFullYear(),
            nowTime.getMonth(),
            nowTime.getDate() - 4,
            nowTime.getHours(),
            nowTime.getMinutes(),
            nowTime.getSeconds(),
            nowTime.getMilliseconds(),
        )
        const relayPlaylists = await RelayPlaylist.find({
            $and: [
                {
                    createdTime: {
                        $gte: new Date(beforeDay)
                    }
                }, 
                {
                    createdTime: {
                        $lte: new Date(nowTime)
                    }
                }
            ]
        }).sort({ createdTime: -1 })
        let result = []
        for(const playlist of relayPlaylists) {
            const { createdTime, _id, title, isBackground, representSong, image, 
                postUserId, evaluateUserId, opacityTop, opacityBottom, opacityNumber, template, youtubeUrl } = playlist
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
                const { like, unlike, _id, song, postUserId, playlistId } = el
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
            swipeSongs.sort(() => Math.random() - 0.5)
            const relayPlaylist = {
                title, 
                isBackground,
                representSong,
                image,
                evaluateUserId,
                postUserId,
                createdTime,
                opacityTop,
                opacityBottom,
                opacityNumber,
                template,
                youtubeUrl,
                _id,
                relaySong: swipeSongs,
             }        
            result.push(relayPlaylist);
        }
        res.status(200).send(result);
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 완성된 리스트 가저오기
const getRelayLists = async (req, res) => {
    try {
        const relayPlaylists = await RelayPlaylist.find({
            createdTime: {
                $lte: new Date()
            }
        }, {
            title: 1, postUserId: 1, evaluateUserId: 1, image: 1, createdTime: 1, hashtags: 1,
        }).sort({ 'createdTime': -1 }).limit(20)
        res.status(200).send(relayPlaylists)
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 다음 완성된 리스트 목록 가져오기
const getNextRelayLists = async (req, res) => {
    try {
        const relayPlaylists = await RelayPlaylist.find({
            createdTime: {
                $lte: new Date()
            }
        }, {
            title: 1, postUserId: 1, evaluateUserId: 1, image: 1, createdTime: 1, hashtags: 1,
        }).sort({ 'createdTime': -1 }).skip(20 * req.params.page).limit(20)
        res.status(200).send(relayPlaylists)
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 선택한 릴레이 정보 가져오기
const getSelectedRelay = async (req, res) => {
    try {
        const relayPlaylistId = req.params.id;
        const [relayPlaylist, songs, comments, recomments] = await Promise.all([
            RelayPlaylist.findOne({
                _id: relayPlaylistId
            }, {
                postUserId: 1, evaluateUserId: 1, title: 1, createdTime: 1, image: 1, representSong: 1, likes: 1, youtubeUrl: 1, hashtags: 1, comments: 1
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

        commentConverter(comments, recomments);
        let participateCount = 0
        songs.forEach((song) => {
            const { likeCount, unlikeCount } = song
            participateCount += (likeCount + unlikeCount)
            song.score = likeCount / (likeCount + unlikeCount)
            song.postUser = song.postUserId[0]
        })
        participateCount = Math.floor(participateCount / songs.length)
        const myChallenge = songs.find((song) =>
            song.postUser._id.toString() === req.user._id.toString() 
        )
        const targetSongs = songs.filter((song) => {
            const { likeCount, unlikeCount } = song
            if (likeCount + unlikeCount >= participateCount) {
                return song
            }
        })
        
        targetSongs.sort(function(a, b)  {
            if (a.score > b.score) return -1;
            if (a.score < b.score) return 1;
            return 0;
        });

        const rankingSong = ( myChallenge === undefined ||  
            targetSongs.slice(0, 8).find((song) => song.postUser._id.toString() === req.user._id.toString())
        ) ? targetSongs.slice(0, 8) : targetSongs.slice(0, 8).concat(myChallenge)

        const resultSongs = rankingSong.map((song) => {
            delete song.likeCount
            delete song.unlikeCount
            delete song.score
            delete song.postUserId
            return song
        })

        const result = {
            playlist: relayPlaylist,
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
        await Promise.all([
            new RelaySong({
                postUserId: req.user._id,
                playlistId,
                song,
                time: new Date
            }).save(),
            RelayPlaylist.findOneAndUpdate({
                _id: playlistId
            }, {
                $addToSet: { postUserId: req.user._id }
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
        const result = songs.filter((item) => {
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
        result.sort(() => Math.random() - 0.5)
        res.status(200).send(result)
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
            $addToSet: { like: req.user._id }
        }, {
            new: true
        }).populate('postUserId', {
            noticetoken: 1, _id: 1
        })
        const relayPlaylist = await RelayPlaylist.findOneAndUpdate({
            _id: relaySong.playlistId
        }, {
            $addToSet: {
                evaluateUserId: req.user._id
            }
        }, {
            title: 1
        })
        const targetuser = relaySong.postUserId
        res.status(200).send(relaySong);
        pushNotification(targetuser, req.user._id, `${req.user.name}님이 회원님의 릴레이 곡을 추천했습니다`, relayPlaylist.title.join(' '))
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
            $addToSet: { unlike: req.user._id }
        }, {
            new: true
        })
        await RelayPlaylist.findOneAndUpdate({
            _id: relaySong.playlistId
        }, {
            $addToSet: {
                evaluateUserId: req.user._id
            }
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
                $addToSet: {
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
        commentConverter(comments, recomments);
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
        const targetRecomment = await Recomment.find({
            parentCommentId: commentId
        }, {
            _id: 1
        })
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
                $pullAll: { comments: [commentId].concat(targetRecomment.map((recomment) => recomment._id))}
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
        commentConverter(comments, recomments);
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
        commentConverter(comments, recomments);
        res.status(201).send([relay.comments, comments]);
        const targetuser = parentcomment.postUserId
        addNotice({
            noticinguser: req.user._id,
            noticeduser: targetuser._id,
            noticetype: 'rrecom',
            relay: relayId,
            relaycomment: commentId,
            relayrecomment: newComment._id
        })
        pushNotification(targetuser, req.user._id, `${req.user.name}님이 댓글을 달았습니다`)
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
        commentConverter(comments, recomments);
        res.status(200).send([relay.comments, comments]);
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 댓글 좋아요
const likeComment = async (req, res) => {
    try {
        const relayId = req.params.relayId
        const commentId = req.params.id
        const like = await Comment.findOneAndUpdate({
            _id: commentId
        }, {
            $addToSet: { likes : req.user._id }
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
        commentConverter(comments, recomments);
        res.status(200).send(comments);
        const targetuser = like.postUserId
        addNotice({
            noticinguser: req.user._id,
            noticeduser: targetuser._id,
            noticetype: 'rcomlike',
            relay: relayId,
            relaycomment: commentId
        })
        pushNotification(targetuser, req.user._id, `${req.user.name}님이 회원님의 댓글을 좋아합니다`)
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
                    noticeduser: like.postUserId 
                }]
            }) 
        ])
        commentConverter(comments, recomments);
        res.status(200).send(comments);
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 대댓글 좋아요
const likeRecomment = async (req, res) => {
    try {
        const relayId = req.params.relayId
        const commentId = req.params.id
        const like = await Recomment.findOneAndUpdate({
            _id: commentId
        }, {
            $addToSet: { likes: req.user._id }
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
        commentConverter(comments, recomments);
        res.status(200).send(comments);
        const targetuser = like.postUserId
        addNotice({
            noticinguser: req.user._id,
            noticeduser: targetuser._id,
            noticetype: 'rrecomlike',
            relay: like.relayId,
            relayrecomment: commentId
        })
        pushNotification(targetuser, req.user._id, `${req.user.name}님이 회원님의 댓글을 좋아합니다`)
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
                    noticeduser: like.postUserId 
                }]
            }) 
        ])
        commentConverter(comments, recomments);
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
    getNextRelayLists,
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