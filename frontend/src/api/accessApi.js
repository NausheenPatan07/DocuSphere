import api from './axios';

export const accessApi = {
  requestAccess: async (documentId, reason) => {
    const response = await api.post('/api/access/request', {
      document_id: documentId,
      reason,
    });
    return response.data;
  },

  getMyRequests: async () => {
    const response = await api.get('/api/access/my-requests');
    return response;
  },

  getInbox: async () => {
    const response = await api.get('/api/access/inbox');
    return response;
  },

  decideRequest: async (requestId, decision) => {
    const response = await api.post('/api/access/approve', {
      request_id: requestId,
      decision,
    });
    return response.data;
  },
};

export default accessApi;
