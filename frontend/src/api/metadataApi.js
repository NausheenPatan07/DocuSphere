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

  updateField: async (fieldId, fieldData) => {
    const response = await api.put(`/api/metadata/fields/${fieldId}`, fieldData);
    return response.data;
  },

  deactivateField: async (fieldId) => {
    const response = await api.delete(`/api/metadata/fields/${fieldId}`);
    return response.data;
  },
};

export default metadataApi;
