const mongoose = require('mongoose');
const Daily = mongoose.model('Daily');
const Comment = mongoose.model('DailyComment');
const User = mongoose.model('User');
const Notice = mongoose.model('Notice');
const Hashtag = mongoose.model('Hashtag');
const Feed = mongoose.model('Feed');
const Curation = mongoose.model('CurationPost');
const admin = require('firebase-admin');

// time fields string -> Date 변경
const changeTime = async (req, res) => {
    try {
        const daily = await Daily.find()
        const comment = await Comment.find()
        daily.map(async (item) => {
            const { _id: id, time } = item
            await Daily.findOneAndUpdate({
                _id: id
            }, {
                $set: {
                    time: new Date(time)
                }
            })
        })
        comment.map(async (item) => {
            const { _id: id, time } = item
            await Comment.findOneAndUpdate({
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

// 큐레이션 데일리로
const curationToDaily = async (req, res) => {
    try {
        const curation = await Curation.find();
        Object.values(curation).forEach(async (item) => {
            const { postUserId, time, textcontent, likes, object, isSong } = item
            if(isSong) {
                const daily = await new Daily({
                    postUserId: postUserId,
                    textcontent: textcontent,
                    time: new Date(time),
                    song: object,
                    likes: likes,
                }).save();
                Object.values(likes).forEach(async (user) => {
                    await new Notice({
                        noticinguser: user, 
                        noticieduser: postUserId, 
                        noticetype: 'dlike', 
                        time: new Date(time), 
                        daily: daily._id 
                    }).save();
                })
            }
        })
        res.send(curation);
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

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
        }).save();
        Feed.create({
            daily: daily._id,
            time,
            type: 'daily',
            postUserId: req.user._id
        })
        res.status(200).send(daily._id);
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
        const dailyId = req.params.id;
        const daily = await Daily.findOneAndUpdate({
            _id: dailyId
        }, {
            $set: { image: imgArr }
        });
        res.status(200).send(daily);
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 데일리 수정하기
const editDaily = async (req, res) => {
    const { textcontent, song, hashtag, DailyId } = req.body;
    const time = new Date()
    try {
        const daily = await Daily.findOne({
            _id: DailyId
        }, {
            hashtag: 1
        });
        const prevHashtag = daily.hashtag;
        prevHashtag.map(async (hashtag) => {
            await Hashtag.findOneAndUpdate({
                hashtag: hashtag 
            }, {
                $pull: { dailyId: DailyId }
            }, {
                new: true
            })
        })
        hashtag.forEach(async (text) => {
            const hashtagr = await Hashtag.findOne({
                hashtag: text
            })
            if(hashtagr == null){
                await new Hashtag({
                    hashtag: text, 
                    dailyId: DailyId, 
                    time
                }).save();
            } else {
                await Hashtag.findOneAndUpdate({
                    hashtag: text 
                }, {
                    $set: { time }, 
                    $push: { dailyId : DailyId }
                });   
            }
        })
        await Daily.findOneAndUpdate({
            _id: DailyId
        }, {
            $set: { 
                textcontent, song: song, hashtag
            }
        })
        res.status(200).send(daily)
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
            })
        ]);
        const hashtag = daily.hashtag
        hashtag.map(async (hashtag) => {
            await Hashtag.findOneAndUpdate({
                hashtag: hashtag
            }, {
                $pull: { dailyId: dailyId }
            }, {
                new: true
            })
        })
        res.status(200).send(daily) ;
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 데일리 선택해서 이동했을 때, 데일리 정보, 댓글 정보 가져오기
const getSelectedDaily = async (req, res) => {
    try {
        const postUserId = req.params.postUserId
        const dailyId = req.params.id
        let daily , comments;
        if(postUserId === req.user._id){
            [daily, comments] = await Promise.all([
                Daily.findOne({ 
                    _id: dailyId 
                }, {
                    textcontent: 1, song: 1, hashtag: 1, likes: 1, views: 1, image: 1, isWeekly: 1
                }).populate('postUserId', {
                    name: 1, profileImage: 1
                }), 
                Comment.find({
                    $and: [{
                        dailyId: dailyId
                    }, {
                        parentcommentId: ""
                    }]
                }, {
                    parentcommentId: 1, text: 1, time: 1, likes: 1, recomments: 1
                }).populate('postUserId', {
                    name: 1, profileImage: 1
                })])
        } else {
            [daily, comments] = await Promise.all([ 
                Daily.findOneAndUpdate({
                    _id: dailyId 
                }, {
                    $inc :{ views:1 }
                }, { 
                    new: true,
                    projection: {
                        textcontent: 1, song: 1, hashtag: 1, likes: 1, views: 1, image: 1, isWeekly: 1
                    }
                }).populate('postUserId', {
                    name: 1, profileImage: 1
                }), 
                Comment.find({
                    $and : [{
                        dailyId: dailyId
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
        res.status(200).send([daily , comments]); 
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
        let [daily, comments] =  await Promise.all([
            Daily.findOneAndUpdate({
                _id: dailyId 
            }, {
                $push: { comments: newComment._id }
            }, {
                new: true,
                projection: {
                    textcontent: 1
                }
            }).populate('postUserId', {
                name: 1, profileImage: 1, noticetoken: 1
            }), 
            Comment.find({ 
                $and: [{
                    dailyId: dailyId
                }, {
                    parentcommentId: ""
                }]
            }, {
                parentcommentId: 1, text: 1, time: 1, likes: 1, recomments: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            })
        ]);
        res.status(200).send(comments);
        const targetuser = daily.postUserId;
        if(targetuser._id.toString() !== req.user._id.toString()){
            try {
                await new Notice({ 
                    noticinguser: req.user._id, 
                    noticieduser: targetuser._id, 
                    noticetype: 'dcom', 
                    time, 
                    daily: dailyId, 
                    dailycomment: newComment._id 
                }).save();
            } catch (err) {
                return res.status(422).send(err.message);
            }
        }
        if(targetuser.noticetoken !== null && targetuser._id.toString() !== req.user._id.toString()){
            const message = {
                notification : {
                    title: daily.textcontent,
                    body: req.user.name + '님이 ' + text + ' 댓글을 달았습니다.',
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
        const commentId = req.params.commentId;
        const dailyId = req.params.id;
        await Comment.deleteMany({
            $or: [{
                _id: commentId
            }, {
                parentcommentId: commentId
            }]
        });
        let [comments] = await Promise.all([
            Comment.find({
                $and: [{
                    dailyId: dailyId
                }, {
                    parentcommentId: ""
                }]
            }, {
                parentcommentId: 1, text: 1, time: 1, likes: 1, recomments: 1
            }).populate('postUserId', {
                name: 1, profileImage: 1
            }),
            Daily.findOneAndUpdate({
                _id: dailyId
            }, {
                $pull: { comments: commentId }
            }, {
                new: true 
            }), 
            Notice.deleteMany({
                $and: [{ 
                    daily: dailyId 
                }, { 
                    dailycomment: commentId 
                }]
            }),
            
        ])
        res.status(200).send(comments);
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 대댓글 작성
const addreComment = async (req, res) => {
    try {
        const { text } = req.body;
        const time = new Date()
        const dailyId = req.params.id
        const commentId = req.params.commentId
        const comment = await new Comment({ 
            dailyId: dailyId,
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
            }).populate('dailyId', {
                textcontent: 1
            }).populate('postUserId', {
                noticetoken: 1
            }),
            Comment.find({
                parentcommentId: commentId
            }, {
                text: 1, time: 1, likes: 1
            }).populate('postUserId', {
                name: 1, profileImage:1
            })
        ])
        res.status(200).send(recomments);
        const targetuser = parentcomment.postUserId
        if(targetuser.toString() !== req.user._id.toString()){
            try {
                await new Notice({ 
                    noticinguser: req.user._id,  
                    noticieduser: targetuser._id, 
                    noticetype: 'drecom', 
                    time, 
                    daily: dailyId, 
                    dailycomment: commentId, 
                    dailyrecomment: comment._id 
                }).save();
            } catch (err) {
                return res.status(422).send(err.message);
            }
        }
        if(targetuser.noticetoken !== null && targetuser._id.toString() != req.user._id.toString()){
            var message = {
                notification : {
                    title: parentcomment.dailyId.textcontent,
                    body: req.user.name + '님이 ' + text + ' 대댓글을 달았습니다.',
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

// 대댓글 가져오기
const getRecomment = async (req, res) => {
    try {
        const commentId = req.params.commentId
        const comments = await Comment.find({
            parentcommentId: commentId
        }, {
            text: 1, time: 1, likes: 1
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
        const commentId = req.params.commentId
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
                text: 1, time: 1, likes: 1
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
        res.status(200).send(comments);
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 데일리 좋아요
const likeDaily = async (req, res) => {
    try{
        const time = new Date()
        const dailyId = req.params.id
        const daily = await Daily.findOne({
            _id: dailyId
        }, {
            textcontent: 1, song: 1, hashtag: 1, likes: 1, views: 1, image: 1, isWeekly: 1
        }).populate('postUserId', {
            name: 1, profileImage: 1 
        });

        if(daily.likes.includes(req.user._id)) {
            res.status(200).send(daily)
        } else {
            const likesDaily = await Daily.findOneAndUpdate({
                _id: dailyId
            }, {
                $push: { likes: req.user._id }
            }, {
                new: true,
                projection: {
                    textcontent: 1, song: 1, hashtag: 1, likes: 1, views: 1, image: 1, isWeekly: 1
                }
            }).populate('postUserId', {
                name: 1, profileImage: 1, noticetoken: 1
            })
            res.status(200).send(likesDaily)
            const targetuser = likesDaily.postUserId
            if(targetuser._id.toString() !== req.user._id.toString()){
                try {
                    await new Notice({ 
                        noticinguser: req.user._id, 
                        noticieduser: targetuser._id, 
                        noticetype: 'dlike', 
                        time, 
                        daily: likesDaily._id 
                    }).save();
                } catch (err) {
                    return res.status(422).send(err.message);
                }
            }
            if(targetuser.noticetoken !== null && targetuser._id.toString() !== req.user._id.toString()){
                const message = {
                    notification: {
                        body: req.user.name + ' 님이 ' + likesDaily.textcontent + ' 데일리를 좋아합니다.',
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
                    textcontent: 1, song: 1, hashtag: 1, likes: 1, views: 1, image: 1, isWeekly: 1
                }
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
        const time = new Date();
        const dailyId = req.params.dailyId
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
            $and : [{
                dailyId: dailyId
            }, { 
                parentcommentId: ""
            }]
        }, {
            parentcommentId: 1, text: 1, time: 1, likes: 1, recomments: 1
        }).populate('postUserId', {
            name: 1, profileImage: 1
        });        
        res.status(200).send(comments);
        const targetuser = like.postUserId
        if(targetuser.toString() !== req.user._id.toString()){
            try {
                await new Notice({ 
                    noticinguser: req.user._id, 
                    noticieduser: targetuser._id, 
                    noticetype: 'dcomlike', 
                    time, 
                    daily: dailyId, 
                    dailycomment: commentId 
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
        const [comments] = await Promise.all([
            Comment.find({
                $and: [{
                    dailyId: dailyId
                }, {
                    parentcommentId: ""
                }]
            }, {
                parentcommentId: 1, text: 1, time: 1, likes: 1, recomments: 1
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
                    noticieduser:like.postUserId 
                }]
            }) 
        ])
        res.status(200).send(comments);
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

// 대댓글 좋아요
const likeRecomment = async (req, res) => {
    try{
        const time = new Date();
        const parentId = req.params.commentId
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
            text: 1, time: 1, likes: 1
        }).populate('postUserId', {
            name: 1, profileImage: 1
        });
        res.status(200).send(comments);
        const targetuser = like.postUserId
        if(targetuser._id.toString() != req.user._id.toString()){
            try {
                await new Notice({ 
                    noticinguser: req.user._id, 
                    noticieduser: targetuser._id, 
                    noticetype: 'drecomlike', 
                    time, 
                    daily:like.dailyId, 
                    dailycomment: parentId, 
                    dailyrecomment: commentId 
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
    }catch(err){
        return res.status(422).send(err.message);
    }
}

// 대댓글 좋아요 취소
const unLikeRecomment = async (req, res) => {
    try{
        const parentId = req.params.commentId
        const commentId = req.params.id
        const like = await Comment.findOneAndUpdate({
            _id: commentId
        }, {
            $pull: { likes:req.user._id } 
        }, {
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
                    daily: like.dailyId 
                }, { 
                    dailycomment: parentId 
                }, { 
                    dailyrecomment: commentId 
                }, { 
                    noticinguser: req.user._id 
                }, { 
                    noticetype: 'drecomlike' 
                }, { 
                    noticieduser: like.postUserId 
                }]
            }) 
        ])
        res.status(200).send(comments);
    }catch(err){
        return res.status(422).send(err.message);
    }
}

module.exports = {
    changeTime,
    curationToDaily,
    addDaily,
    editDaily,
    deleteDaily,
    uploadImage,
    getSelectedDaily,
    addComment,
    deleteComment,
    addreComment,
    getRecomment,
    deleteRecomment,
    likeDaily,
    unLikeDaily,
    likeComment,
    unLikeComment,
    likeRecomment,
    unLikeRecomment
}