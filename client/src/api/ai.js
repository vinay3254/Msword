import api from './axios';

export const aiAutocomplete = (text) => api.post('/ai/autocomplete', { text }).then(r => r.data.result);
export const aiRewrite = (text, tone) => api.post('/ai/rewrite', { text, tone }).then(r => r.data.result);
export const aiSummarize = (text) => api.post('/ai/summarize', { text }).then(r => r.data.result);
export const aiExpand = (text) => api.post('/ai/expand', { text }).then(r => r.data.result);
export const aiFixGrammar = (text) => api.post('/ai/fix-grammar', { text }).then(r => r.data.result);
export const aiTranslate = (text, language) => api.post('/ai/translate', { text, language }).then(r => r.data.result);
export const aiGenerate = (prompt, type) => api.post('/ai/generate', { prompt, type }).then(r => r.data.result);
export const aiChat = (question, documentContent, history) => api.post('/ai/chat', { question, documentContent, history }).then(r => r.data.result);
export const aiProofread = (text) => api.post('/ai/proofread', { text }).then(r => r.data.suggestions);
export const aiReadability = (text) => api.post('/ai/readability', { text }).then(r => r.data);
