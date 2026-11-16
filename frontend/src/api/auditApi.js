import api from './axios';

export const auditApi = {
  /**
   * Fetch paginated audit logs from the backend.
   * @param {Object} params - Query parameters { page, limit, action }
   * @returns {Promise<Object>} API response with status, logs, and pagination
   */
  getAuditLogs: async (params = {}) => {
    const cleanParams = {};
    if (params.page) cleanParams.page = params.page;
    if (params.limit) cleanParams.limit = params.limit;
    if (params.action && params.action !== 'all') cleanParams.action = params.action;

    const response = await api.get('/api/admin/audit-logs', {
      params: cleanParams,
    });
    return response.data;
  },
};

export default auditApi;
