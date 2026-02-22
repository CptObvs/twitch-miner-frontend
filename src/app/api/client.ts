import createClient, { type Middleware } from 'openapi-fetch';
import type { paths } from './schema';
import { API_BASE_URL } from './config';

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const token = localStorage.getItem('token');
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }
    return request;
  },
  async onResponse({ response }) {
    if (response.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return response;
  },
};

const baseUrl = API_BASE_URL;

const api = createClient<paths>({ baseUrl });
api.use(authMiddleware);

export { api };
