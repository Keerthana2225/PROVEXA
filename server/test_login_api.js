const axios = require('axios');

async function testLogin() {
    try {
        const response = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@provexa.com',
            password: 'admin123'
        });
        console.log('Login successful:', response.data);
        console.log('Cookies:', response.headers['set-cookie']);
    } catch (error) {
        if (error.response) {
            console.log('Login failed:', error.response.status, error.response.data);
        } else {
            console.log('Error:', error.message);
        }
    }
}

testLogin();
