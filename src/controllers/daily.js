const mongoose = require('mongoose');
const Daily = mongoose.model('Daily');
const Comment = mongoose.model('DailyComment');
const Notice = mongoose.model('Notice');
const Hashtag = mongoose.model('Hashtag');
const Feed = mongoose.model('Feed');
const Recomment = mongoose.model('DailyRecomment');
const commentConverter = require('../utils/comment');
const pushNotification = require('../utils/notification');
const addNotice = require('../utils/notice');

// 데일리 만들기
const addDaily = async (req, res) => {
    try {
        const { textcontent, song, hashtag } = req.body;
        const time = new Date()
        const daily = await new Daily({ 
            postUserId: req.user._id, 
            textcontent, 
            time, 
            song,
            hashtag 
        }).save()
        await daily.populate('postUserId', {
            name: 1, profileImage: 1
        }).execPopulate();
        Feed.create({
            daily: daily._id,
            time,
            type: 'daily',
            postUserId: req.user._id
        })
        res.status(201).send([daily, []]);
        hashtag.forEach(async(text) => {
            try {
                const hashtagr = await Hashtag.findOne({
                    hashtag: text
                });
                if (hashtagr == null) {
                    await new Hashtag({
                        hashtag: text, 
                        dailyId: daily._id, 
                        time
                    }).save();
                } else {
                    await Hashtag.findOneAndUpdate({
                        hashtag: text
                    }, {
                        $set: { time }, 
                        $push: { dailyId : daily._id } 
                    });
               }
            } catch (err) {
                return res.status(422).send(err.message);
            }
        });
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 이미지 업로드
const uploadImage = async (req, res) => {
    try {
        const img = req.files['img'];
        let imgArr = [];
        if(img !== undefined)    img.forEach((item) => imgArr.push(item.location))
        const { dailyId } = req.body;
        const daily = await Daily.findOneAndUpdate({
            _id: dailyId
        }, {
            $set: { image: imgArr }
        }, {
            new: true
        }).populate('postUserId', {
            name: 1, profileImage: 1
        });
        res.status(200).send([daily,[]]);
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 데일리 수정하기
const editDaily = async (req, res) => {
    const { textcontent, song, hashtag, dailyId } = req.body;
    const time = new Date()
    try {
        const daily = await Daily.findOne({
            _id: dailyId
        }, {
            hashtag: 1
        });
        daily.hashtag.forEach(async (hashtag) => {
            await Hashtag.findOneAndUpdate({
                hashtag: hashtag 
            }, {
                $pull: { dailyId: dailyId }
            }, {
                new: true
            })
        })
        hashtag.forEach(async (newHashtag) => {
            const hashtagr = await Hashtag.findOne({
                hashtag: newHashtag
            })
            if(hashtagr == null){
                await new Hashtag({
                    hashtag: newHashtag, 
                    dailyId: dailyId, 
                    time
                }).save();
            } else {
                await Hashtag.findOneAndUpdate({
                    hashtag: newHashtag 
                }, {
                    $set: { time }, 
                    $push: { dailyId : dailyId }
                });   
            }
        })
        const updateDaily = await Daily.findOneAndUpdate({
            _id: dailyId
        }, {
            $set: { 
                textcontent, song: song, hashtag
            }
        }, {
            new: true,
            projection: {
                textcontent: 1, song: 1, hashtag: 1, likes: 1, views: 1, image: 1, time: 1, comments: 1
            }
        }).populate('postUserId', {
            name: 1, profileImage: 1
        })
        res.status(200).send(updateDaily)
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 데일리 삭제하기
const deleteDaily = async (req, res) => {
    try {
        const dailyId = req.params.id
        const [daily] = await Promise.all([
            Daily.findOneAndDelete({
                _id : dailyId
            }), 
            Comment.deleteMany({
                dailyid : dailyId
            }), 
            Notice.deleteMany({
                daily: dailyId
            }),
            Feed.deleteOne({ 
                daily: dailyId 
            }),
            Recomment.deleteMany({
                dailyId: dailyId
            })
        ]);
        daily.hashtag.forEach(async (hashtag) => {
            await Hashtag.findOneAndUpdate({
                hashtag: hashtag
            }, {
                $pull: { dailyId: dailyId }
            }, {
                new: true
            })
        })
        res.status(204).send();
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 데일리 선택해서 이동했을 때, 데일리 정보, 댓글 정보 가져오기
const getSelectedDaily = async (req, res) => {
    try {
        const postUserId = req.params.postUserId
        const dailyId = req.params.id
        let daily, comments, recomments;
        if(postUserId === req.user._id){
            daily = await Daily.findOneAndUpdate({ 
                _id: dailyId 
            }, {
                $set: { accessedTime: new Date() }
            }, {
                textcontent: 1, song: 1, hashtag: 1, likes: 1, views: 1, image: 1, time: 1, comments: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            })
        } else {
            daily= await Daily.findOneAndUpdate({
                _id: dailyId 
            }, {
                $inc :{ views:1 },
                $set: { accessedTime: new Date() }
            }, { 
                new: true,
                projection: {
                    textcontent: 1, song: 1, hashtag: 1, likes: 1, views: 1, image: 1, time: 1, comments: 1
                }
            }).populate('postUserId', {
                name: 1, profileImage: 1
            })
        }
        [comments, recomments] = await Promise.all([
            Comment.find({
                dailyId: dailyId
            }, {
                text: 1, time: 1, likes: 1, recomment: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
            Recomment.find({
                dailyId: dailyId
            }, {
                parentCommentId: 1, text: 1, time: 1, likes: 1 
            }).populate('postUserId', {
                name: 1, profileImage: 1
            })
        ])
        commentConverter(comments, recomments);
        res.status(200).send([daily, comments]); 
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 댓글 작성
const addComment = async (req, res) => {
    try {
        const { text } = req.body;
        const time = new Date()
        const dailyId = req.params.id
        const newComment = await new Comment({ 
            dailyId: dailyId, 
            postUserId: req.user._id, 
            text, 
            time 
        }).save();
        let [daily, comments, recomments] =  await Promise.all([
            Daily.findOneAndUpdate({
                _id: dailyId 
            }, {
                $push: { comments: newComment._id }
            }, {
                new: true,
                projection: {
                    textcontent: 1, song: 1, hashtag: 1, likes: 1, views: 1, image: 1, time: 1, comments: 1
                }
            }).populate('postUserId', {
                name: 1, profileImage: 1, noticetoken: 1
            }), 
            Comment.find({ 
                dailyId: dailyId
            }, {
                text: 1, time: 1, likes: 1, recomment: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
            Recomment.find({
                dailyId: dailyId
            }, {
                parentCommentId: 1, text: 1, time: 1, likes: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            })
        ]);
        commentConverter(comments, recomments);
        res.status(201).send([daily, comments]);
        const targetuser = daily.postUserId;
        addNotice({
            noticinguser: req.user._id,
            noticeduser: targetuser._id,
            noticetype: 'dcom',
            daily: dailyId,
            dailycomment: newComment._id
        })
        pushNotification(targetuser, req.user._id, `${req.user.name}님이 회원님의 데일리에 댓글을 달았습니다`)
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 댓글 삭제
const deleteComment = async (req, res) => {
    try {
        const commentId = req.params.commentId;
        const dailyId = req.params.id;
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
        let [comments, recomments, daily] = await Promise.all([
            Comment.find({
                dailyId: dailyId
            }, {
                text: 1, time: 1, likes: 1, recomment: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
            Recomment.find({
                dailyId: dailyId
            }, {
                parentCommentId: 1, text: 1, time: 1, likes: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
            Daily.findOneAndUpdate({
                _id: dailyId
            }, {
                $pullAll: { comments: [commentId].concat(targetRecomment.map((recomment) => recomment._id)) }
            }, {
                new: true,
                projection: {
                    textcontent: 1, song: 1, hashtag: 1, likes: 1, views: 1, image: 1, time: 1, comments: 1
                }
            }).populate('postUserId', {
                name: 1, profileImage: 1, noticetoken: 1
            }), 
            Notice.deleteMany({
                $and: [{ 
                    daily: dailyId 
                }, { 
                    dailycomment: commentId 
                }]
            }),
        ])
        commentConverter(comments, recomments);
        res.status(200).send([daily, comments]);
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 대댓글 작성
const addRecomment = async (req, res) => {
    try {
        const { text } = req.body;
        const time = new Date()
        const dailyId = req.params.id
        const commentId = req.params.commentId
        const comment = await new Recomment({ 
            dailyId: dailyId,
            parentCommentId: commentId, 
            postUserId: req.user._id, 
            text, 
            time 
        }).save();
        const [comments, parentcomment, recomments, daily] = await Promise.all([
            Comment.find({
                dailyId: dailyId
            }, {
                text: 1, time: 1, likes: 1, recomment: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
            Comment.findOne({
                _id: commentId
            }, {
                _id: 1
            }).populate('dailyId', {
                textcontent: 1
            }).populate('postUserId', {
                _id: 1, noticetoken: 1
            }),
            Recomment.find({
                dailyId: dailyId
            }, {
                parentCommentId: 1, text: 1, time: 1, likes: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
            Daily.findOneAndUpdate({
                _id: dailyId
            }, {
                $push: { comments: comment._id }
            }, { 
                new: true,
                projection: {
                    textcontent: 1, song: 1, hashtag: 1, likes: 1, views: 1, image: 1, time: 1, comments: 1
                }
            }).populate('postUserId', {
                name: 1, profileImage: 1, noticetoken: 1
            })
        ])
        commentConverter(comments, recomments);
        res.status(201).send([daily, comments]);
        const targetuser = parentcomment.postUserId
        addNotice({
            noticinguser: req.user._id,
            noticeduser: targetuser._id,
            noticetype: 'drecom',
            daily: dailyId,
            dailycomment: commentId,
            dailyrecomment: comment._id
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
        const dailyId = req.params.id
        const comment = await Recomment.findOneAndDelete({
            _id: commentId
        });
        const [comments, recomments, daily] = await Promise.all([
            Comment.find({
                dailyId: dailyId
            }, {
                text: 1, time: 1, likes: 1, recomment: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1, 
            }),
            Recomment.find({
                dailyId: dailyId
            }, {
                parentCommentId: 1, text: 1, time: 1, likes: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
            Daily.findOneAndUpdate({
                _id: dailyId
            }, {
                $pull: { comments: commentId }
            }, {
                new: true,
                projection: {
                    textcontent: 1, song: 1, hashtag: 1, likes: 1, views: 1, image: 1, time: 1, comments: 1
                }
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
            Notice.deleteMany({
                $and: [{ 
                    daily: comment.dailyId 
                }, { 
                    dailycomment: mongoose.Types.ObjectId(comment.parentcommentId) 
                }, { 
                    dailyrecomment: comment._id 
                }]
            })
        ])
        commentConverter(comments, recomments);
        res.status(200).send([daily, comments]);
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 데일리 좋아요
const likeDaily = async (req, res) => {
    try{
        const dailyId = req.params.id
        const daily = await Daily.findOne({
            _id: dailyId
        }, {
            textcontent: 1, song: 1, hashtag: 1, likes: 1, views: 1, image: 1, time: 1,
        }).populate('postUserId', {
            name: 1, profileImage: 1 
        });

        if(daily.likes.includes(req.user._id)) {
            res.status(200).send(daily)
        } else {
            const likesDaily = await Daily.findOneAndUpdate({
                _id: dailyId
            }, {
                $addToSet: { likes: req.user._id }
            }, {
                new: true,
                projection: {
                    textcontent: 1, song: 1, hashtag: 1, likes: 1, views: 1, image: 1, time: 1, comments: 1
                }
            }).populate('postUserId', {
                name: 1, profileImage: 1, noticetoken: 1
            })
            res.status(200).send(likesDaily)
            const targetuser = likesDaily.postUserId
            addNotice({
                noticinguser: req.user._id,
                noticeduser: targetuser._id,
                noticetype: 'dlike',
                daily: likesDaily._id
            })
            pushNotification(targetuser, req.user._id, `${req.user.name}님이 회원님의 데일리를 좋아합니다`)
        }
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 데일리 좋아요 취소
const unLikeDaily = async (req, res) => {
    try{
        const dailyId = req.params.id
        const [daily] = await Promise.all([
            Daily.findOneAndUpdate({
                _id: dailyId
            }, {
                $pull: { likes:req.user._id }
            }, {
                new: true, 
                projection: {
                    textcontent: 1, song: 1, hashtag: 1, likes: 1, views: 1, image: 1, time: 1, comments: 1
                }
            }).populate('postUserId', {
                name: 1, profileImage: 1, noticetoken: 1
            }),
            Notice.findOneAndDelete({
                $and: [{ 
                    daily: dailyId
                }, { 
                    noticetype: 'dlike' 
                }, { 
                    noticinguser: req.user._id 
                }]
            })
        ])
        res.status(200).send(daily);
    }catch(err){
        return res.status(422).send(err.message);
    }
}

// 댓글 좋아요
const likeComment = async (req, res) => {
    try{
        const dailyId = req.params.dailyId
        const commentId = req.params.id
        const like = await Comment.findOneAndUpdate({
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
                dailyId: dailyId
            }, {
                text: 1, time: 1, likes: 1, recomment: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
            Recomment.find({
                dailyId: dailyId
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
            noticetype: 'dcomlike',
            daily: dailyId,
            dailycomment: commentId
        })
        pushNotification(targetuser, req.user._id, `${req.user.name}님이 회원님의 댓글을 좋아합니다`)
    }catch(err){
        return res.status(422).send(err.message);
    }
}

// 댓글 좋아요 취소
const unLikeComment = async (req, res) => {
    try{
        const dailyId = req.params.dailyId
        const commentId = req.params.id
        const like = await Comment.findOneAndUpdate({
            _id: commentId
        }, {
            $pull: { likes: req.user._id }
        } , {
            new: true
        });
        const [comments, recomments] = await Promise.all([
            Comment.find({
                dailyId: dailyId
            }, {
                text: 1, time: 1, likes: 1, recomment: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
            Recomment.find({
                dailyId: dailyId
            }, {
                parentCommentId: 1, text: 1, time: 1, likes: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
            Notice.findOneAndDelete({
                $and: [{ 
                    daily: dailyId 
                }, { 
                    dailycomment: commentId 
                }, { 
                    noticinguser: req.user._id 
                }, { 
                    noticetype: 'dcomlike'
                }, { 
                    noticeduser:like.postUserId 
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
    try{
        const dailyId = req.params.dailyId
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
                dailyId: dailyId
            }, {
                text: 1, time: 1, likes: 1, recomment: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1, 
            }),
            Recomment.find({
                dailyId: dailyId
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
            noticetype: 'drecomlike',
            daily: like.dailyId,
            dailyrecomment: commentId
        })
        pushNotification(targetuser, req.user._id, `${req.user.name}님이 회원님의 댓글을 좋아합니다`)
    }catch(err){
        return res.status(422).send(err.message);
    }
}

// 대댓글 좋아요 취소
const unLikeRecomment = async (req, res) => {
    try{
        const dailyId = req.params.dailyId
        const commentId = req.params.id
        const like = await Recomment.findOneAndUpdate({
            _id: commentId
        }, {
            $pull: { likes:req.user._id } 
        }, {
            new: true
        });
        const [comments, recomments] = await Promise.all([ 
            Comment.find({
                dailyId: dailyId
            }, {
                text: 1, time: 1, likes: 1, recomment: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }), 
            Recomment.find({
                dailyId: dailyId
            }, {
                parentCommentId: 1, text: 1, time: 1, likes: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
            Notice.findOneAndDelete({
                $and: [{ 
                    daily: like.dailyId 
                }, { 
                    dailyrecomment: commentId 
                }, { 
                    noticinguser: req.user._id 
                }, { 
                    noticetype: 'drecomlike' 
                }, { 
                    noticeduser: like.postUserId 
                }]
            }) 
        ])
        commentConverter(comments, recomments);
        res.status(200).send(comments);
    }catch(err){
        return res.status(422).send(err.message);
    }
}

module.exports = {
    addDaily,
    editDaily,
    deleteDaily,
    uploadImage,
    getSelectedDaily,
    addComment,
    deleteComment,
    addRecomment,
    deleteRecomment,
    likeDaily,
    unLikeDaily,
    likeComment,
    unLikeComment,
    likeRecomment,
    unLikeRecomment
}