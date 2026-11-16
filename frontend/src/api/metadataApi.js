import api from './axios';

export const metadataApi = {
  getFields: async () => {
    const response = await api.get('/api/metadata/fields');
    return response.data;
  },

  createField: async (fieldData) => {
    const response = await api.post('/api/metadata/fields', fieldData);
    return response.data;
  },
};

export default metadataApi;
