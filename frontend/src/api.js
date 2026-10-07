import axios from 'axios';
import { auth, logout } from './stores/auth';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  if (auth.token) config.headers.Authorization = `Bearer ${auth.token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && auth.token) logout();
    const message = err.response?.data?.error
      || (err.response ? `Erreur ${err.response.status}` : 'Réseau indisponible.');
    return Promise.reject(new Error(message));
  },
);

export default api;
