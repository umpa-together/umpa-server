
const commentConverter = (comments, recomments) => {
    for(let comment of comments){
        for(const recomment of recomments){
            if(recomment.parentCommentId.toString() === comment._id.toString()){
                comment.recomment.push(recomment);
            }
        }
    }
}

module.exports = commentConverter