import api from './axios';

export const getVersions   = (docId)              => api.get(`/versions/${docId}`);
export const getVersion    = (docId, versionId)   => api.get(`/versions/${docId}/${versionId}`);
export const createVersion = (docId, label = '')  => api.post(`/versions/${docId}`, { label });
export const restoreVersion = (docId, versionId)  => api.post(`/versions/${docId}/${versionId}/restore`);
export const deleteVersion  = (docId, versionId)  => api.delete(`/versions/${docId}/${versionId}`);
