import { api } from './client.js';

// both return a Blob, which Controls passes to download()
export const exportTxt = content =>
  api.post('/api/export/txt', { content }, { responseType: 'blob' }).then(r => r.data);

export const exportPng = dataUrl =>
  api.post('/api/export/png', { data_url: dataUrl }, { responseType: 'blob' }).then(r => r.data);
