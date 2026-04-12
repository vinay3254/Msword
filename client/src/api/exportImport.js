import api from './axios';

export const exportDocx = async (docId, title = 'document') => {
  const res = await api.get(`/export/${docId}/docx`, { responseType: 'blob' });
  const url  = URL.createObjectURL(res.data);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${title.replace(/[^\w\s-]/g, '').trim() || 'document'}.docx`;
  a.click();
  URL.revokeObjectURL(url);
};

export const importDocx = (docId, file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post(`/export/${docId}/import-docx`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const exportPdf = async (docId, title = 'document') => {
  const res = await api.get(`/export/${docId}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^\w\s-]/g, '').trim() || 'document'}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};
