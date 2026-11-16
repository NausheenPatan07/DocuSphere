import api from './axios';

export const searchApi = {
  // Keyword exact search (GET /api/search?q=...)
  searchKeyword: async (query, params = {}) => {
    const response = await api.get('/api/search', {
      params: { q: query, ...params },
    });
    return response.data;
  },

  // Semantic AI vector search (GET /api/search/semantic?q=...)
  searchSemantic: async (query, params = {}) => {
    const response = await api.get('/api/search/semantic', {
      params: { q: query, ...params },
    });
    return response.data;
  },

  // Hybrid keyword + semantic search (GET /api/search/hybrid?q=...)
  searchHybrid: async (query, params = {}) => {
    const response = await api.get('/api/search/hybrid', {
      params: { q: query, ...params },
    });
    return response.data;
  },

  // Unified search dispatcher by mode
  search: async (query, mode = 'keyword', params = {}) => {
    if (mode === 'semantic') {
      return searchApi.searchSemantic(query, params);
    }
    if (mode === 'hybrid') {
      return searchApi.searchHybrid(query, params);
    }
    return searchApi.searchKeyword(query, params);
  },
};

export default searchApi;
