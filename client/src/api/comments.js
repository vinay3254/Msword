import api from './axios';

export const getComments    = (docId)                         => api.get(`/comments/${docId}`);
export const addComment     = (docId, anchorId, text)         => api.post(`/comments/${docId}`, { anchorId, text });
export const updateComment  = (docId, commentId, patch)       => api.patch(`/comments/${docId}/${commentId}`, patch);
export const deleteComment  = (docId, commentId)              => api.delete(`/comments/${docId}/${commentId}`);
export const addReply       = (commentId, text)               => api.post(`/comments/${commentId}/reply`, { text });
