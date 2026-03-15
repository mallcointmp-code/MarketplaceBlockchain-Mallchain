const API_URL = 'http://localhost:5000/api';
const USER_EMAIL = `test_${Date.now()}@example.com`;
const USER_PASS = 'password123';

async function runTest() {
    try {
        console.log('--- 1. Registering User ---');
        let token = null;

        // Helper for fetch
        const post = async (url, body, headers = {}) => {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...headers },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            return { ok: res.ok, status: res.status, data };
        };

        const get = async (url, headers = {}) => {
            const res = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', ...headers }
            });
            const data = await res.json();
            return { ok: res.ok, status: res.status, data };
        };

        // Register
        const regRes = await post(`${API_URL}/auth/signup`, {
            name: 'Test User',
            email: USER_EMAIL,
            password: USER_PASS,
            phone: `+2547${Math.floor(Math.random() * 100000000)}`,
            username: `user${Date.now()}`,
            referralCode: `REF${Date.now()}`,
            role: 'buyer'
        });

        if (regRes.ok) {
            console.log('✅ Registered:', regRes.data.success || 'OK');
            token = regRes.data.token;
        } else {
            console.log('⚠️ Register result:', regRes.status, regRes.data);
            console.log('Skipping register (might exist), trying login...');
        }

        if (!token) {
            console.log('--- 2. Logging In ---');
            const loginRes = await post(`${API_URL}/auth/login`, {
                email: USER_EMAIL,
                password: USER_PASS
            });
            if (!loginRes.ok) throw new Error('Login failed: ' + JSON.stringify(loginRes.data));
            console.log('✅ Logged In');
            token = loginRes.data.token;
        }

        if (!token) throw new Error('Failed to get token');

        const authHeaders = { Authorization: `Bearer ${token}` };

        console.log('--- 3. Checking Wallet ---');
        const walletRes = await get(`${API_URL}/wallet`, authHeaders);
        if (!walletRes.ok) throw new Error(`Wallet fetch failed: ${walletRes.status} ${JSON.stringify(walletRes.data)}`);
        console.log('✅ Wallet Balance:', walletRes.data);

        console.log('--- 4. Checking Tasks ---');
        const tasksRes = await get(`${API_URL}/tasks`, authHeaders);
        if (!tasksRes.ok) throw new Error('Tasks fetch failed');
        console.log('✅ Tasks Available:', Array.isArray(tasksRes.data) ? tasksRes.data.length : 'Yes');

        console.log('--- 5. Completing Task 1 ---');
        const completeRes = await post(`${API_URL}/tasks/complete/t1`, {}, authHeaders);
        if (!completeRes.ok) throw new Error('Task completion failed: ' + JSON.stringify(completeRes.data));

        console.log('✅ Task Completed:', completeRes.data.message);
        console.log('✅ New Points Balance:', completeRes.data.newBalance);

        console.log('--- TEST SUCCESSFUL ---');
    } catch (err) {
        console.error('❌ TEST FAILED:', err.message);
        process.exit(1);
    }
}

runTest();
