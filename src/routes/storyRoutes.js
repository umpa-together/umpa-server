const express = require('express');
const router = express.Router();

const {
    storyData,
    postStory,
    deleteStory,
    getMyStory,
    getOtherStoryWithAll,
    getOtherStoryWithFollowing,
    readStory,
    getStoryCalendar,
    likeStory,
    unlikeStory,
} = require('../controllers/story')

router.post('/data', storyData);
router.post('/', postStory);
router.delete('/:storyId', deleteStory);
router.get('/', getMyStory);
router.get('/other', getOtherStoryWithAll);
router.get('/following', getOtherStoryWithFollowing)
router.put('/:storyId', readStory)
router.get('/calendar/:userId', getStoryCalendar);
router.put('/like/:id', likeStory);
router.put('/unlike/:id', unlikeStory);

module.exports = router;