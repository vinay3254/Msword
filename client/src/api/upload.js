import api from './axios';

export const uploadImage = (file) => {
  const fd = new FormData();
  fd.append('image', file);
  return api.post('/upload/image', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
