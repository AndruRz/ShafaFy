const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const forumController = require('../controllers/forumController');

router.use(protect);

router.get('/posts', forumController.listPosts);
router.get('/posts/:id', forumController.getPost);
router.post('/posts', forumController.createPost);
router.put('/posts/:id', forumController.updatePost);
router.delete('/posts/:id', forumController.deletePost);

router.post('/posts/:postId/comments', forumController.createComment);
router.delete('/comments/:id', forumController.deleteComment);

module.exports = router;
