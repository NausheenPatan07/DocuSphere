import api from './axios';

export const divisionsApi = {
  getDivisions: async () => {
    // Note: Flask route is defined as / on /api/divisions blueprint
    const response = await api.get('/api/divisions/');
    return response.data;
  },
};

export default divisionsApi;
