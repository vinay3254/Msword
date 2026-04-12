import api from './axios';
import axios from 'axios';

export const generateShareLink = (docId, permission) =>
  api.post(`/share/${docId}`, { permission });

export const revokeShareLink = (docId) =>
  api.delete(`/share/${docId}`);

// Public endpoint — no auth header needed
export const getSharedDoc = (token) =>
  axios.get(`/api/share/doc/${token}`);

export const addCollaborator = (docId, email, permission) =>
  api.post(`/share/${docId}/collaborators`, { email, permission });

export const removeCollaborator = (docId, userId) =>
  api.delete(`/share/${docId}/collaborators/${userId}`);
