const mongoose = require('mongoose');
const Playlist = mongoose.model('Playlist');
const Daily = mongoose.model('Daily')
const User = mongoose.model('User')
const Comment = mongoose.model('PlaylistComment');
const Recomment = mongoose.model('PlaylistRecomment');
const Notice = mongoose.model('Notice');
const Hashtag = mongoose.model('Hashtag');
const Feed = mongoose.model('Feed');
const AddedPlaylist = mongoose.model('AddedPlaylist');
const commentConverter = require('../middlewares/comment');
const pushNotification = require('../middlewares/notification');
const addNotice = require('../middlewares/notice');

// time fields string -> Date 변경
const changeTime = async (req, res) => {
    try {
        await Comment.updateMany({
        }, {
            $unset: {
                recomments: 1,
                parentcommentId: 1,
                postUser: 1,
            },
        })
        await Playlist.updateMany({
        }, {
            $unset: {
                nominate: 1,
                isWeekly: 1,
                postUser: 1
            },
            $set: {
                youtubeUrl: ""
            }
        })
        await Daily.updateMany({

        }, {
            $unset: {
                isWeekly: 1,
                nominate: 1
            }
        })
        await User.updateMany({

        }, {
            $unset: {
                informationagree: 1,
                nominate: 1,
            }, 
            $set: {
                realName: '',
                introduction: ''
            }
        })
       /*
    const playlists = await Playlist.find()
    const comments = await Comment.find()
    const hashtags = await Hashtag.find()
    playlists.map(async (item) => {
        const { _id: id, time } = item
        await Playlist.findOneAndUpdate({
            _id: id
        }, {
            $set: {
                time: new Date(time)
            }
        })
    })
    comments.map(async (item) => {
        const { _id: id, time } = item
        await Comment.findOneAndUpdate({
            _id: id
        },  {
            $set: {
                time: new Date(time)
            }
        })
    })
    hashtags.map(async (item) => {
        const { _id: id, time } = item  
        await Hashtag.findOneAndUpdate({
            _id: id
        }, {
            $set: {
                time: new Date(time)
            }
        })
    })
    */
    res.status(204).send();
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// likes files string -> ObjectId
const changeLikes = async (req, res) => {
    try {
        const playlists = await Playlist.find()
        const comments = await Comment.find()
        playlists.map(async (item) => {
            const { _id: id, likes } = item
            await Playlist.findOneAndUpdate({
                _id: id
            }, {
                $set: {
                    likes: likes
                }
            })
        })
        comments.map(async (item) => {
            const { _id: id, likes } = item
            await Comment.findOneAndUpdate({
                _id: id
            },  {
                $set: {
                    likes: likes
                }
            })
        })
        res.status(204).send();
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// comment, recomment 데이터 정제하기
const commentData = async (req, res) => {
    try {
        const recomments = await Comment.find({
            parentcommentId: { 
                $ne: ""
            }
        }, {
            playlistId: 1, postUserId: 1, text: 1, time: 1, likes: 1, parentcommentId: 1
        })
        recomments.forEach(async (recomment) => {
            const { playlistId, _id: id, postUserId, text, time, likes, parentcommentId } = recomment
            const newRecomment = await new Recomment({
                playlistId: playlistId,
                parentCommentId: parentcommentId,
                postUserId: postUserId,
                text: text,
                time: time,
                likes: likes
            }).save()
            await Playlist.findOneAndUpdate({
                _id: playlistId
            }, {
                $push: { comments: newRecomment._id }
            })
        })
        await Comment.deleteMany({
            parentcommentId: { 
                $ne: ""
            }
        })
        res.status(200).send(recomments)
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 플리 만들기
const addPlaylist = async (req, res) => {
    try {
        const { title, content, songs, hashtag } = req.body;
        const time = new Date()
        const playlist = await new Playlist({ 
            postUserId: req.user._id, 
            title, 
            content,
            time, 
            songs, 
            hashtag,
            textcontent: content
        }).save();
        Feed.create({
            playlist: playlist._id,
            time,
            type: 'playlist',
            postUserId: req.user._id
        })
        res.status(201).send([playlist, []]);  
        hashtag.forEach(async(text) => {
            try{
                const hashtagr = await Hashtag.findOne({
                    hashtag: text
                });
                if (hashtagr == null) {
                    await new Hashtag({
                        hashtag: text, 
                        playlistId: playlist._id, 
                        time
                    }).save()
                }else{
                    await Hashtag.findOneAndUpdate({
                        hashtag: text
                    }, {
                        $set: { time }, 
                        $push : { playlistId : playlist._id } 
                    });
                }
           }catch (err){
                return res.status(422).send(err.message);
           }
        });
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 플리 이미지 업로드
const uploadImage = async (req, res) => {
    try {
        const img = req.files['img'][0].location;
        const { playlistId } = req.body;
        const playlist = await Playlist.findOneAndUpdate({
            _id: playlistId
        }, {
            $set: {
                image: img
            },
        },  {
            new: true
        })
        res.status(201).send([playlist, []]);
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 플리 수정하기
const editPlaylist = async (req, res) => {
    try {
        const { title, content, songs, hashtag, playlistId } = req.body;
        const time = new Date()
        const playlist = await Playlist.findOne({
            _id: playlistId
        }, {
            hashtag: 1
        });
        playlist.hashtag.forEach(async (hashtag) => {
            await Hashtag.findOneAndUpdate({
                hashtag: hashtag
            }, {
                $pull: { playlistId: playlistId }
            }, {
                new: true
            })
        })
        hashtag.forEach(async (newHashtag) => {
            const hashtagr = await Hashtag.findOne({
                hashtag: newHashtag
            })
            if (hashtagr == null) {
                await new Hashtag({
                    hashtag: newHashtag, 
                    playlistId: playlistId, 
                    time
                }).save()
            } else {
                await Hashtag.findOneAndUpdate({
                    hashtag: newHashtag
                }, {
                    $set: { time }, 
                    $push: { playlistId : playlistId } 
                });   
            }
        })
        const updatePlaylist = await Playlist.findOneAndUpdate({
            _id: playlistId
        }, {
            $set: {
                title, songs, hashtag, textcontent: content
            }
        }, {
            new: true,
            projection: {
                title: 1, textcontent: 1, time: 1, songs: 1, comments: 1, hashtag: 1, likes: 1, views: 1, image: 1, youtubeUrl: 1
            },
        }).populate('postUserId', {
            name: 1, profileImage: 1
        })
        res.status(200).send(updatePlaylist)
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 플리 삭제하기
const deletePlaylist = async (req, res) => {
    try {
        const playlistId = req.params.id
        const [playlist] = await Promise.all([
            Playlist.findOneAndDelete({
                _id : playlistId
            }), 
            Comment.deleteMany({
                playlistId : playlistId
            }), 
            Notice.deleteMany({
                playlist: playlistId
            }),
            Feed.deleteOne({ 
                playlist: playlistId
            }),
            Recomment.deleteMany({
                playlistId: playlistId
            }),
            AddedPlaylist.deleteMany({
                playlistId: playlistId
            })
        ]);
        playlist.hashtag.forEach(async (hashtag) => {
            await Hashtag.findOneAndUpdate({
                hashtag: hashtag
            }, {
                $pull: { playlistId: playlistId }
            }, {
                new: true
            })
        })
        res.status(204).send();
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 플리 선택해서 이동했을 때, 플리 정보, 댓글 정보 가져오기
const getSelectedPlaylist = async (req, res) => {
    try {
        const nowTime = new Date();
        const postUserId = req.params.postUserId
        const playlistId = req.params.id
        let playlist, comments, recomments;
        if(postUserId.toString() === req.user._id.toString()){
            playlist = await Playlist.findOneAndUpdate({
                _id: playlistId 
            }, {
                $set: { accessedTime: nowTime }
            }, {
                new: true,
                projection: {
                    title: 1, textcontent: 1, time: 1, songs: 1, comments: 1, hashtag: 1, likes: 1, views: 1, image: 1, youtubeUrl: 1
                },
            }).populate('postUserId', {
                name: 1, profileImage: 1
            })
        } else {
            playlist = await Playlist.findOneAndUpdate({
                _id: playlistId
            }, {
                $inc: { views:1 },  
                $set: { accessedTime :nowTime }
            }, { 
                new: true,
                projection: {
                    title: 1, textcontent: 1, time: 1, songs: 1, comments: 1, hashtag: 1, likes: 1, views: 1, image: 1, youtubeUrl: 1
                }, 
            }).populate('postUserId', {
                name: 1, profileImage: 1
            })
        }
        [comments, recomments] = await Promise.all([
            Comment.find({
                playlistId: playlistId
            }, {
                text: 1, time: 1, likes: 1, recomment: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
            Recomment.find({
                playlistId: playlistId
            }, {
                parentCommentId: 1, text: 1, time: 1, likes: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
        ])
        commentConverter(comments, recomments);
        res.status(200).send([playlist, comments]);  
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 댓글 작성
const addComment = async (req, res) => {
    try {
        const { text } = req.body;
        const time = new Date()
        const playlistId = req.params.id
        const newComment = await new Comment({ 
            playlistId: playlistId, 
            postUserId: req.user._id, 
            text, 
            time 
        }).save();
        const [playlist, comments, recomments]=  await Promise.all([
            Playlist.findOneAndUpdate({
                _id: playlistId
            }, {
                $push: { comments: newComment._id }
            }, {
                new: true,
                projection: {
                    title: 1, textcontent: 1, time: 1, songs: 1, comments: 1, hashtag: 1, likes: 1, views: 1, image: 1, youtubeUrl: 1
                },
            }).populate('postUserId', {
                name: 1, profileImage: 1, noticetoken: 1
            }),
            Comment.find({
                playlistId: playlistId
            }, {
                text: 1, time: 1, likes: 1, recomment: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
            Recomment.find({
                playlistId: playlistId
            }, {
                parentCommentId: 1, text: 1, time: 1, likes: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
        ]);
        commentConverter(comments, recomments);
        res.status(201).send([playlist, comments]);
        const targetuser = playlist.postUserId;
        addNotice({
            noticinguser: req.user._id,
            noticeduser: targetuser._id,
            noticetype: 'pcom',
            playlist: playlistId,
            playlistcomment: newComment._id
        })
        pushNotification(targetuser, req.user._id, `${req.user.name}님이 회원님의 플레이리스트에 댓글을 달았습니다`)
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 댓글 삭제
const deleteComment = async (req, res) => {
    try {
        const commentId = req.params.commentId;
        const playlistId = req.params.id;
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
        const [comments, recomments, playlist] = await Promise.all([
            Comment.find({
                playlistId: playlistId
            }, {
                text: 1, time: 1, likes: 1, recomment: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1, 
            }),
            Recomment.find({
                playlistId: playlistId
            }, {
                parentCommentId: 1, text: 1, time: 1, likes: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
            Playlist.findOneAndUpdate({
                _id: playlistId
            }, {
                $pullAll: { comments: [commentId].concat(targetRecomment.map((recomment) => recomment._id)) }
            }, {
                new: true,
                projection: {
                    title: 1, textcontent: 1, time: 1, songs: 1, comments: 1, hashtag: 1, likes: 1, views: 1, image: 1, youtubeUrl: 1
                },
            }).populate('postUserId', {
                name: 1, profileImage: 1, 
            }),
            Notice.deleteMany({
                $and: [{ 
                    playlist: playlistId 
                }, { 
                    playlistcomment: commentId 
                }]
            })
        ])
        commentConverter(comments, recomments);
        res.status(200).send([playlist, comments]);
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 대댓글 작성
const addRecomment = async (req, res) => {
    try {
        const { text } = req.body;
        const time = new Date()
        const playlistId = req.params.id
        const commentId = req.params.commentId
        const newComment = await new Recomment({ 
            playlistId: playlistId, 
            parentCommentId: commentId,
            postUserId: req.user._id, 
            text, 
            time
        }).save();
        const [comments, parentcomment, recomments, playlist] = await Promise.all([
            Comment.find({
                playlistId: playlistId
            }, {
                text: 1, time: 1, likes: 1, recomment: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
            Comment.findOne({
                _id: commentId
            }, {
                _id: 1
            }).populate('playlistId', {
                title: 1
            }).populate('postUserId', {
                _id: 1, noticetoken: 1
            }),
            Recomment.find({
                playlistId: playlistId
            }, {
                parentCommentId: 1, text: 1, time: 1, likes: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
            Playlist.findOneAndUpdate({
                _id: playlistId
            }, {
                $push: { comments: newComment._id }
            }, {
                new: true,
                projection: {
                    title: 1, textcontent: 1, time: 1, songs: 1, comments: 1, hashtag: 1, likes: 1, views: 1, image: 1, youtubeUrl: 1
                },
            }).populate('postUserId', {
                name: 1, profileImage: 1, 
            }),
        ])
        commentConverter(comments, recomments);
        res.status(201).send([playlist, comments]);
        const targetuser = parentcomment.postUserId
        addNotice({
            noticinguser: req.user._id,
            noticeduser: targetuser._id,
            noticetype: 'precom',
            playlist: playlistId,
            playlistcomment: commentId,
            playlistrecomment: newComment._id
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
        const playlistId = req.params.id;
        const comment = await Recomment.findOneAndDelete({
            _id: commentId
        });
        const [comments, recomments, playlist] = await Promise.all([
            Comment.find({
                playlistId: playlistId
            }, {
                text: 1, time: 1, likes: 1, recomment: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1, 
            }),
            Recomment.find({
                playlistId: playlistId
            }, {
                parentCommentId: 1, text: 1, time: 1, likes: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
            Playlist.findOneAndUpdate({
                _id: playlistId
            }, {
                $pull: { comments: commentId }
            }, {
                new: true,
                projection: {
                    title: 1, textcontent: 1, time: 1, songs: 1, comments: 1, hashtag: 1, likes: 1, views: 1, image: 1, youtubeUrl: 1
                },
            }).populate('postUserId', {
                name: 1, profileImage: 1, 
            }),
            Notice.deleteMany({
                $and: [{ 
                    playlist: comment.playlistId 
                }, { 
                    playlistcomment: mongoose.Types.ObjectId(comment.parentCommentId) 
                }, { 
                    playlistrecomment: comment._id 
                }]
            })
        ])
        commentConverter(comments, recomments);
        res.status(200).send([playlist, comments]);
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 플리 좋아요
const likesPlaylist = async (req, res) => {
    try {
        const playlistId = req.params.id
        const playlist = await Playlist.findOne({
            _id: playlistId
        }, {
            title: 1, textcontent: 1, time: 1, songs: 1, comments: 1, hashtag: 1, likes: 1, views: 1, image: 1, youtubeUrl: 1
        }).populate('postUserId', {
            name: 1, profileImage: 1
        })

        if(playlist.likes.includes(req.user._id)) {
            res.status(200).send(playlist)
        } else {
            const likesPlaylist = await Playlist.findOneAndUpdate({
                _id: playlistId
            }, {
                $addToSet: { likes : req.user._id }
            }, {
                new: true,
                projection: {
                    title: 1, textcontent: 1, time: 1, songs: 1, comments: 1, hashtag: 1, likes: 1, views: 1, image: 1, youtubeUrl: 1
                }
            }).populate('postUserId', {
                name: 1, profileImage: 1, noticetoken: 1
            })
            res.status(200).send(likesPlaylist);
            const targetuser = likesPlaylist.postUserId;
            addNotice({
                noticinguser: req.user._id,
                noticeduser: targetuser._id,
                noticetype: 'plike',
                playlist: likesPlaylist._id
            })
            pushNotification(targetuser, req.user._id, `${req.user.name}님이 회원님의 플레이리스트를 좋아합니다`)
        }   
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 플리 좋아요 취소
const unlikesPlaylist = async (req, res) => {
    try {
        const playlistId = req.params.id
        const [playlist] = await Promise.all([
            Playlist.findOneAndUpdate({
                _id: playlistId
            }, {
                $pull: { likes: req.user._id }
            }, {
                new :true,
                projection: {
                    title: 1, textcontent: 1, time: 1, songs: 1, comments: 1, hashtag: 1, likes: 1, views: 1, image: 1, youtubeUrl: 1
                }
            }).populate('postUserId', {
                name: 1, profileImage: 1, noticetoken: 1
            }),
            Notice.findOneAndDelete({
                $and: [{ 
                    playlist: playlistId
                }, { 
                    noticetype:'plike' 
                }, { 
                    noticinguser:req.user._id 
                }]
            }) 
        ])
        res.status(200).send(playlist);
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 댓글 좋아요
const likescomment = async (req, res) => {
    try {
        const playlistId = req.params.playlistId
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
                playlistId: playlistId
            }, {
                text: 1, time: 1, likes: 1, recomment: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1, 
            }),
            Recomment.find({
                playlistId: playlistId
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
            noticetype: 'pcomlike',
            playlist: playlistId,
            playlistcomment: commentId
        })
        pushNotification(targetuser, req.user._id, `${req.user.name}님이 회원님의 댓글을 좋아합니다`)
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 댓글 좋아요 취소
const unlikescomment = async (req, res) => {
    try {
        const playlistId = req.params.playlistId
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
                playlistId: playlistId
            }, {
                text: 1, time: 1, likes: 1, recomment: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1, 
            }),
            Recomment.find({
                playlistId: playlistId
            }, {
                parentCommentId: 1, text: 1, time: 1, likes: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
            Notice.findOneAndDelete({
                $and: [{ 
                    playlist: playlistId 
                }, { 
                    playlistcomment: commentId
                }, { 
                    noticinguser: req.user._id 
                }, { 
                    noticetype: 'pcomlike' 
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
const likesrecomment = async (req, res) => {
    try{
        const playlistId = req.params.playlistId
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
                playlistId: playlistId
            }, {
                text: 1, time: 1, likes: 1, recomment: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1, 
            }),
            Recomment.find({
                playlistId: playlistId
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
            noticetype: 'precomlike',
            playlist: like.playlistId,
            playlistrecomment: commentId
        })
        pushNotification(targetuser, req.user._id, `${req.user.name}님이 회원님의 댓글을 좋아합니다`)
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 대댓글 좋아요 취소
const unlikesrecomment = async (req, res) => {
    try{
        const playlistId = req.params.playlistId
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
                playlistId: playlistId
            }, {
                text: 1, time: 1, likes: 1, recomment: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1, 
            }),
            Recomment.find({
                playlistId: playlistId
            }, {
                parentCommentId: 1, text: 1, time: 1, likes: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
            Notice.findOneAndDelete({
                $and: [{ 
                    playlist: like.playlistId 
                }, { 
                    playlistrecomment: commentId 
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
    changeTime,
    changeLikes,
    commentData,
    addPlaylist,
    editPlaylist,
    deletePlaylist,
    uploadImage,
    getSelectedPlaylist,
    addComment,
    deleteComment,
    addRecomment,
    deleteRecomment,
    likesPlaylist,
    unlikesPlaylist,
    likescomment,
    unlikescomment,
    likesrecomment,
    unlikesrecomment,
}