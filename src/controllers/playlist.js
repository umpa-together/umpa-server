const mongoose = require('mongoose');
const Playlist = mongoose.model('Playlist');
const Comment = mongoose.model('PlaylistComment');
const User = mongoose.model('User');
const Notice = mongoose.model('Notice');
const Hashtag = mongoose.model('Hashtag');
const Feed = mongoose.model('Feed');
//const UserSong = mongoose.model('PlaylistUserSong');
const admin = require('firebase-admin');

// time fields string -> Date 변경
const changeTime = async (req, res) => {
    try {
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
            hashtag 
        }).save();
        Feed.create({
            playlist: playlist._id,
            time,
            type: 'playlist',
            postUserId: req.user._id
        })
        res.status(200).send(playlist._id);
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
        await Playlist.findOneAndUpdate({
            _id: playlistId
        }, {
            $set: {
                image: img
            }
        });
        res.status(200).send();
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 플리 수정하기
const editPlaylist = async (req, res) => {
    try {
        const { title, songs, hashtag, playlistId } = req.body;
        const time = new Date()
        const playlist = await Playlist.findOne({
            _id: playlistId
        }, {
            hashtag: 1
        });
        const prevHashtag = playlist.hashtag;
        prevHashtag.map(async (hashtag) => {
            await Hashtag.findOneAndUpdate({
                hashtag: hashtag
            }, {
                $pull: { playlistId: playlistId }
            }, {
                new: true
            })
        })
        hashtag.forEach(async (text) => {
            const hashtagr = await Hashtag.findOne({
                hashtag: text
            })
            if (hashtagr == null) {
                await new Hashtag({
                    hashtag: text, 
                    playlistId: playlistId, 
                    time
                }).save()
            } else {
                await Hashtag.findOneAndUpdate({
                    hashtag: text
                }, {
                    $set: { time }, 
                    $push: { playlistId : playlistId } 
                });   
            }
        })
        await Playlist.findOneAndUpdate({
            _id: playlistId
        }, {
            $set: {
                title, songs, hashtag
            }
        })
        res.status(200).send()
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
                playlistid : playlistId
            }), 
            Notice.deleteMany({
                playlist: playlistId
            }),
            Feed.deleteOne({ 
                playlist: playlistId
            })
        ]);
        const hashtag = playlist.hashtag
        hashtag.map(async (hashtag) => {
            await Hashtag.findOneAndUpdate({
                hashtag: hashtag
            }, {
                $pull: { playlistId: playlistId }
            }, {
                new: true
            })
        })
        res.status(200).send();
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
        let playlist, comments;
        if(postUserId === req.user._id){
            [playlist , comments] = await Promise.all([
                Playlist.findOneAndUpdate({
                    _id: playlistId 
                }, {
                    $set: { accessedTime: nowTime }
                }, {
                    new: true,
                    projection: {
                        title: 1, songs: 1, hashtag: 1, likes: 1, views: 1, image: 1, isWeekly: 1
                    },
                }).populate('postUserId', {
                    name: 1, profileImage: 1
                }), 
                Comment.find({
                    $and: [{
                        playlistId: playlistId
                    }, {
                        parentcommentId: ""
                    }]
                }, {
                    parentcommentId: 1, text: 1, time: 1, likes: 1, recomments: 1
                }).populate('postUserId', {
                    name: 1, profileImage: 1
                })
            ])
        } else {
            [playlist , comments] = await Promise.all([ 
                Playlist.findOneAndUpdate({
                    _id: playlistId
                }, {
                    $inc: { views:1 },  
                    $set: { accessedTime :nowTime }
                }, { 
                    new: true,
                    projection: {
                        title: 1, songs: 1, hashtag: 1, likes: 1, views: 1, image: 1, isWeekly: 1
                    }, 
                }).populate('postUserId', {
                    name: 1, profileImage: 1
                }), 
                Comment.find({
                    $and : [{
                        playlistId: playlistId
                    }, {
                        parentcommentId: ""
                    }]
                }, {
                    parentcommentId: 1, text: 1, time: 1, likes: 1, recomments: 1
                }).populate('postUserId', {
                    name: 1, profileImage: 1
                })
            ])
        }
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
        let [playlist, comments]=  await Promise.all([
            Playlist.findOneAndUpdate({
                _id: playlistId
            }, {
                $push: { comments: newComment._id }
            }, {
                new: true,
                projection: {
                    title: 1, songs: 1, hashtag: 1, likes: 1, views: 1, image: 1, isWeekly: 1
                },
            }).populate('postUserId', {
                name: 1, profileImage: 1, noticetoken: 1
            }), 
            Comment.find({
                $and : [{
                    playlistId: playlistId
                },{
                    parentcommentId: ""
                }]
            }, {
                parentcommentId: 1, text: 1, time: 1, likes: 1, recomments: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            })
        ]);
        res.status(200).send([playlist, comments]);
        const targetuser = playlist.postUserId;
        if(targetuser._id.toString() !== req.user._id.toString()){
            try {
                await new Notice({ 
                    noticinguser: req.user._id, 
                    noticieduser: targetuser._id, 
                    noticetype: 'pcom', 
                    time, 
                    playlist: playlistId, 
                    playlistcomment: newComment._id 
                }).save();
            } catch (err) {
                return res.status(422).send(err.message);
            }
        }
        if(targetuser.noticetoken !== null && targetuser._id.toString() !== req.user._id.toString()){
            const message = {
                notification : {
                    title: playlist.title,
                    body : req.user.name+'님이 ' + text + ' 댓글을 달았습니다.',
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

// 댓글 삭제
const deleteComment = async (req, res) => {
    try {
        const commentId = req.params.commentid;
        const playlistId = req.params.id;
        await Comment.deleteMany({
            $or: [{
                _id: commentId
            }, {
                parentcommentId: commentId
            } ]
        });
        let [playlist,comments] = await Promise.all([
            Playlist.findOneAndUpdate({
                _id: playlistId
            }, {
                $pull: { comments: commentId }
            }, {
                new: true,
                projection: {
                    title: 1, songs: 1, hashtag: 1, likes: 1, views: 1, image: 1, isWeekly: 1
                },
            }).populate('postUserId', {
                name: 1, profileImage: 1, 
            }), 
            Comment.find({
                $and: [{
                    playlistId: playlistId
                }, {
                    parentcommentId: ""
                }]
            }, {
                parentcommentId: 1, text: 1, time: 1, likes: 1, recomments: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1, 
            }),
            Notice.deleteMany({
                $and: [{ 
                    playlist: playlistId 
                }, { 
                    playlistcomment: commentId }
                ]
            }),
        ])
        res.status(200).send([playlist, comments]);
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 대댓글 작성
const addreComment = async (req, res) => {
    try {
        const { text } = req.body;
        const time = new Date()
        const playlistId = req.params.id
        const commentId = req.params.commentid
        const comment = await new Comment({ 
            playlistId: playlistId, 
            parentcommentId: commentId,
            postUserId: req.user._id, 
            text, 
            time
        }).save();
        const [parentcomment, recomments] = await Promise.all([
            Comment.findOneAndUpdate({
                _id: commentId
            }, {
                $push: { recomments: comment._id }
            }).populate('playlistId', {
                title: 1
            }).populate('postUserId', {
                noticetoken: 1
            }),
            Comment.find({
                parentcommentId: commentId
            }, {
                text: 1, time: 1, likes: 1,
            }).populate('postUserId', {
                name: 1, profileImage: 1
            })
        ])
        res.status(200).send(recomments);
        const targetuser = parentcomment.postUserId
        if(targetuser._id.toString() != req.user._id.toString()){
            try {
                await new Notice({ 
                    noticinguser: req.user._id,  
                    noticieduser: targetuser._id, 
                    noticetype: 'precom', 
                    time, 
                    playlist: playlistId, 
                    playlistcomment: commentId, 
                    playlistrecomment: comment._id 
                }).save();
            } catch (err) {
                return res.status(422).send(err.message);
            }
        }
        if(targetuser.noticetoken !== null && targetuser._id.toString() !== req.user._id.toString()){
            const message = {
                notification : {
                    title: parentcomment.playlistId.title,
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

// 대댓글 가져오기
const getRecomment = async (req, res) => {
    try {
        const commentId = req.params.commentid
        const comments = await Comment.find({
            parentcommentId: commentId
        }, {
            text: 1, time: 1, likes: 1,
        }).populate('postUserId', {
            name: 1, profileImage: 1
        });
        res.status(200).send(comments);
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 대댓글 삭제
const deleteRecomment = async (req, res) => {
    try {
        const commentId = req.params.commentid
        const comment = await Comment.findOneAndDelete({
            _id: commentId
        });
        await Comment.findOneAndUpdate({
            _id: comment.parentcommentId
        }, {
            $pull: { recomments: commentId }
        })
        const [comments] = await Promise.all([
            Comment.find({
                parentcommentId: comment.parentcommentId
            }, {
                text: 1, time: 1, likes: 1,
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }), 
            Notice.deleteMany({
                $and: [{ 
                    playlist: comment.playlistId 
                }, { 
                    playlistcomment: mongoose.Types.ObjectId(comment.parentcommentId) 
                }, { 
                    playlistrecomment: comment._id }
                ]
            })
        ])
        res.status(200).send(comments);
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 플리 좋아요
const likesPlaylist = async (req, res) => {
    try {
        const time = new Date()
        const playlistId = req.params.id
        const playlist = await Playlist.findOne({
            _id: playlistId
        }, {
            title: 1, songs: 1, hashtag: 1, likes: 1, views: 1, image: 1, isWeekly: 1
        }).populate('postUserId', {
            name: 1, profileImage: 1
        })

        if(playlist.likes.includes(req.user._id)) {
            res.status(200).send(playlist)
        } else {
            const likesPlaylist = await Playlist.findOneAndUpdate({
                _id: playlistId
            }, {
                $push: { likes : req.user._id }
            }, {
                new: true,
                projection: {
                    title: 1, songs: 1, hashtag: 1, likes: 1, views: 1, image: 1, isWeekly: 1
                }
            }).populate('postUserId', {
                name: 1, profileImage: 1, noticetoken: 1
            })
            res.status(200).send(likesPlaylist);
            const targetuser = likesPlaylist.postUserId;
            if(targetuser._id.toString() !== req.user._id.toString()){
                try {
                    await new Notice({ 
                        noticinguser: req.user._id, 
                        noticieduser: targetuser._id, 
                        noticetype: 'plike', 
                        time, 
                        playlist: likesPlaylist._id 
                    }).save();
                } catch (err) {
                    return res.status(422).send(err.message);
                }
            }
            if(targetuser.noticetoken !== null && targetuser._id.toString() !== req.user._id.toString()){
                const message = {
                    notification : {
                        body: req.user.name + ' 님이 ' + likesPlaylist.title + ' 플레이리스트를 좋아합니다.',
                    },
                    token: targetuser.noticetoken,
                };
                try {
                    await admin.messaging().send(message).then((response)=> {}).catch((error)=>{console.log(error);});
                } catch (err) {
                    return res.status(422).send(err.message);
                }
            }
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
                    title: 1, songs: 1, hashtag: 1, likes: 1, views: 1, image: 1, isWeekly: 1
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
        const time = new Date();
        const playlistId = req.params.playlistid
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
        const comments = await Comment.find({
            $and: [{
                playlistId: playlistId
            }, {
                parentcommentId: ""
            }]
        }, {
            parentcommentId: 1, text: 1, time: 1, likes: 1, recomments: 1
        }).populate('postUserId', {
            name: 1, profileImage: 1
        })
        res.status(200).send(comments);
        const targetuser = like.postUserId
        if(targetuser._id.toString() !== req.user._id.toString()){
            try {
                await new Notice({ 
                    noticinguser: req.user._id, 
                    noticieduser: targetuser._id, 
                    noticetype:'pcomlike', 
                    time, 
                    playlist: playlistId, 
                    playlistcomment: commentId 
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
const unlikescomment = async (req, res) => {
    try {
        const playlistId = req.params.playlistid
        const commentId = req.params.id
        const like = await Comment.findOneAndUpdate({
            _id: commentId
        }, {
            $pull: { likes: req.user._id }
        }, {
            new: true
        });
        const [comments] = await Promise.all([
            Comment.find({
                $and: [{
                    playlistId: playlistId
                }, {
                    parentcommentId:""
                }]
            }, {
                parentcommentId: 1, text: 1, time: 1, likes: 1, recomments: 1
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
                    noticieduser: like.postUserId 
                }]
            }) 
        ])
        res.status(200).send(comments);
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 대댓글 좋아요
const likesrecomment = async (req, res) => {
    try{
        const time = new Date()
        const parentId = req.params.commentid
        const commentId = req.params.id
        const like = await Comment.findOneAndUpdate({
            _id: commentId
        }, {
            $push: { likes: req.user._id }
        }, {
            new: true
        }).populate('postUserId', {
            noticetoken: 1
        });
        const comments = await Comment.find({
            parentcommentId: parentId
        }, {
            text: 1, time: 1, likes: 1,
        }).populate('postUserId', {
            name: 1, profileImage: 1
        })
        res.status(200).send(comments);
        const targetuser = like.postUserId
        if(targetuser._id.toString() !== req.user._id.toString()){
            try {
                await new Notice({ 
                    noticinguser: req.user._id, 
                    noticieduser: targetuser._id, 
                    noticetype: 'precomlike', 
                    time, 
                    playlist: like.playlistId, 
                    playlistcomment: parentId, 
                    playlistrecomment: commentId
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
const unlikesrecomment = async (req, res) => {
    try{
        const parentId = req.params.commentid
        const commentId = req.params.id
        const like = await Comment.findOneAndUpdate({
            _id: commentId
        }, {
            $pull: { likes:req.user._id }
        } , {
            new: true
        });
        const [comments] = await Promise.all([
            Comment.find({
                parentcommentId: parentId
            }, {
                text: 1, time: 1, likes: 1,
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
            Notice.findOneAndDelete({
                $and: [{ 
                    playlist: like.playlistId 
                }, { 
                    playlistcomment: parentId 
                }, { 
                    playlistrecomment: commentId 
                }, {
                    noticinguser: req.user._id 
                }, { 
                    noticetype: 'precomlike' 
                }, { 
                    noticieduser: like.postUserId 
                }]
            }) 
        ])
        res.status(200).send(comments);
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

/*
const createUserSong = async (req, res) => {
    var newDate = new Date()
    var time = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
    const { song } = req.body;
    try {
        const userSong = new UserSong({
            playlistId: req.params.playlistId,
            postUserId: req.user._id,
            song: song,
            time,
        });
        await userSong.save()
        const playlist = await Playlist.findOneAndUpdate({ 
            _id: req.params.playlistId 
        }, {
            $push: { 
                userSongs: userSong._id
            }
        }, {
            new: true
        })
        try {
            const notice = new Notice({
                noticinguser: req.user._id, 
                noticieduser: playlist.postUserId, 
                noticetype:'pusersong', 
                time, 
                playlist: req.params.playlistId 
            });
            await notice.save();
        } catch (err) {
            return res.status(422).send(err.message);
        }
        
        if(playlist.postUserId._id.toString() != req.user._id.toString()){
            try {
                const notice  = new Notice({
                    noticinguser: req.user._id, 
                    noticieduser: playlist.postUserId, 
                    noticetype:'pusersong', 
                    time, 
                    playlist: req.params.playlistId,
                    playlistusersong: userSong._id
                });
                await notice.save();
            } catch (err) {
                return res.status(422).send(err.message);
            }
        }
        const targetuser = await User.findOne({
            _id: playlist.postUserId
        });
        if( targetuser.noticetoken != null  && targetuser._id.toString() != req.user._id.toString()){
            var message = {
                notification : {
                    body : req.user.name+'님이 ' + userSong.song.attributes.artistName + '-' + userSong.song.attributes.name + ' 을 추천했습니다.',
                },
                token : targetuser.noticetoken
            };
            try {
                await admin.messaging().send(message).then((response)=> {}).catch((error)=>{console.log(error);});
            } catch (err) {
                return res.status(422).send(err.message);
            }
        }
        res.send(playlist)
    } catch(err) {
        return res.status(422).send(err.message);
    }
}

const deleteUserSong = async (req, res) => {
    try{
        await UserSong.findOneAndDelete({
            _id: req.params.userSongId
        })
        const playlist = await Playlist.findOneAndUpdate({ 
            _id: req.params.playlistId
        }, {
            $pull: { userSongs: mongoose.Types.ObjectId(req.params.userSongId) }
        }, {
            new: true
        })
        await Notice.findOneAndDelete({
            $and: [{
                playlist: req.params.playlistId
            }, {
                noticinguser: req.user._id
            }, {
                noticieduser: playlist.postUserId
            }, {
                noticetype: 'pusersong'
            }, {
                playlistusersong: req.params.userSongId
            }]
        })
        res.send(playlist);
    }catch(err){
        return res.status(422).send(err.message);
    }
}
*/

module.exports = {
    changeTime,
    changeLikes,
    addPlaylist,
    editPlaylist,
    deletePlaylist,
    uploadImage,
    getSelectedPlaylist,
    addComment,
    deleteComment,
    addreComment,
    getRecomment,
    deleteRecomment,
    likesPlaylist,
    unlikesPlaylist,
    likescomment,
    unlikescomment,
    likesrecomment,
    unlikesrecomment,
    //createUserSong,
    //deleteUserSong
}