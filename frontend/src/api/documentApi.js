import api from './axios';

export const documentApi = {
  getDocuments: async (params = {}) => {
    const response = await api.get('/api/documents/', { params });
    return response.data;
  },

  uploadDocument: async (formData, onUploadProgress) => {
    const response = await api.post('/api/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
    return response.data;
  },

  downloadDocument: async (docId) => {
    const response = await api.get(`/api/documents/${docId}/download`, {
      responseType: 'blob',
    });
    return response;
  },
};

export default documentApi;
