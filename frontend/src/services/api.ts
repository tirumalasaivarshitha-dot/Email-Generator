import axios from 'axios';
import { SchedulePayload } from '../types';

const API_BASE_URL = 'http://localhost:5000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});

export const authApi = {
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout')
};

export const emailApi = {
  getScheduled: () => api.get('/api/emails/scheduled'),
  getSent: () => api.get('/api/emails/sent'),
  search: (query: string, status?: string) =>
    api.get('/api/emails/search', { params: { q: query, status } }),
  schedule: (formData: FormData) =>
    api.post('/api/emails/schedule', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  parseFile: (file: File) => {
    const data = new FormData();
    data.append('file', file);
    return api.post('/api/emails/parse-file', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

export const senderApi = {
  getSenders: () => api.get('/api/senders'),
  createSender: (senderData: { name: string; email: string; isDefault?: boolean }) =>
    api.post('/api/senders', senderData)
};

export const slackApi = {
  disconnect: () => api.delete('/api/slack/disconnect')
};
