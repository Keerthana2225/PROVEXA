import axios from 'axios';

const api = axios.create({
    // Use relative /api when on localhost (goes through Vite proxy, no CORS)
    // Use absolute URL with hostname when accessed from a network device (tablet, etc.)
    baseURL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? '/api'
        : `http://${window.location.hostname}:5000/api`,
    withCredentials: true // send cookies
});


// Add interceptor to handle 401s globally (redirect to login)
let isUnauthorizedDispatched = false;
api.interceptors.response.use(
    (response) => {
        isUnauthorizedDispatched = false;
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            if (!isUnauthorizedDispatched && !window.location.pathname.includes('/login')) {
                isUnauthorizedDispatched = true;
                window.dispatchEvent(new CustomEvent('unauthorized'));
                // Reset after a short delay to allow subsequent legitimate unauths
                setTimeout(() => { isUnauthorizedDispatched = false; }, 3000);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
