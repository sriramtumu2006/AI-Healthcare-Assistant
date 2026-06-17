const API_BASE_URL = 'http://localhost:8000';

export const api = {
    getToken: () => localStorage.getItem('access_token'),
    setToken: (token) => localStorage.setItem('access_token', token),
    removeToken: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_role');
    },
    logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_role');
    },
    isAuthenticated: () => !!localStorage.getItem('access_token'),

    request: async (endpoint, options = {}) => {
        const token = api.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...options.headers
        };

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
            
            if (response.status === 401) {
                // Token expired or invalid
                api.removeToken();
                window.location.href = '/';
                throw new Error('Session expired');
            }

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || 'API Request Failed');
            }
            
            return data;
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    },

    get: (endpoint, options = {}) => api.request(endpoint, { ...options, method: 'GET' }),
    
    post: (endpoint, body, options = {}) => {
        return api.request(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(body)
        });
    },

    delete: (endpoint, options = {}) => api.request(endpoint, { ...options, method: 'DELETE' })
};

export default api;
