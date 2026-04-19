import api from '../config/api';

const forumService = {
  listPosts: async (q = '') => {
    const params = q.trim() ? { q: q.trim() } : {};
    const response = await api.get('/forum/posts', { params });
    return response.data;
  },

  getPost: async (postId) => {
    const response = await api.get(`/forum/posts/${postId}`);
    return response.data;
  },

  createPost: async ({ title, content }) => {
    const response = await api.post('/forum/posts', { title, content });
    return response.data;
  },

  updatePost: async (postId, { title, content }) => {
    const response = await api.put(`/forum/posts/${postId}`, { title, content });
    return response.data;
  },

  deletePost: async (postId) => {
    const response = await api.delete(`/forum/posts/${postId}`);
    return response.data;
  },

  createComment: async (postId, { content, parentCommentId }) => {
    const body = { content };
    if (parentCommentId) body.parentCommentId = parentCommentId;
    const response = await api.post(`/forum/posts/${postId}/comments`, body);
    return response.data;
  },

  deleteComment: async (commentId) => {
    const response = await api.delete(`/forum/comments/${commentId}`);
    return response.data;
  },
};

export default forumService;
