const BACKEND_BASE_URL = 'https://complaints-registration-platform-full-52n8.onrender.com';
const API_BASE_URL = `${BACKEND_BASE_URL}/api`;

// State management
let state = {
    user: null, // { name, email, role }
    currentView: 'login',
    tempRegistration: {
        email: '',
        name: ''
    },
    currentComplaint: {
        text: '',
        aiQuestion: '',
        aiAnswer: ''
    }
};

// UI Elements
const viewContainer = document.getElementById('view-container');
const mainNav = document.getElementById('main-nav');
const logoutBtn = document.getElementById('logout-btn');
const toastContainer = document.getElementById('toast-container');

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    await checkSession();
});

async function checkSession() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        if (response.ok) {
            const userData = await response.json();
            state.user = userData;
            showAuthenticatedView();
        } else {
            navigateTo('login');
        }
    } catch (error) {
        console.error('Session check failed:', error);
        navigateTo('login');
    }
}

function navigateTo(view) {
    state.currentView = view;
    renderView();
}

function renderView() {
    viewContainer.innerHTML = '';
    const templateId = `${state.currentView}-template`;
    const template = document.getElementById(templateId);

    if (!template) {
        console.error(`Template ${templateId} not found`);
        return;
    }

    const clone = template.content.cloneNode(true);
    viewContainer.appendChild(clone);

    // Bind events for the current view
    bindViewEvents(state.currentView);
}

function showAuthenticatedView() {
    mainNav.classList.remove('hidden');
    if (state.user.role === 'admin') {
        navigateTo('admin-dashboard');
    } else {
        navigateTo('user-dashboard');
    }
}

function bindViewEvents(view) {
    if (view === 'login') {
        const form = document.getElementById('login-form');
        form.onsubmit = handleLogin;
        document.getElementById('go-to-register').onclick = (e) => {
            e.preventDefault();
            navigateTo('register');
        };
    } else if (view === 'register') {
        const form = document.getElementById('register-form');
        form.onsubmit = handleSendOTP;
        document.getElementById('go-to-login').onclick = (e) => {
            e.preventDefault();
            navigateTo('login');
        };
    } else if (view === 'otp') {
        const form = document.getElementById('otp-form');
        form.onsubmit = handleVerifyOTP;
    } else if (view === 'password') {
        const form = document.getElementById('password-form');
        form.onsubmit = handleSetPassword;
    } else if (view === 'user-dashboard') {
        document.getElementById('new-complaint-btn').onclick = () => navigateTo('submit-complaint');
        loadMyComplaints();
    } else if (view === 'submit-complaint') {
        document.getElementById('back-to-dash').onclick = () => navigateTo('user-dashboard');
        document.getElementById('get-ai-question-btn').onclick = handleGetAIQuestion;
        document.getElementById('final-submit-btn').onclick = handleSubmitComplaint;
    } else if (view === 'admin-dashboard') {
        loadAllComplaints();
    }
}

// --- Event Handlers ---

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            credentials: 'include'
        });

        const data = await response.json();
        if (response.ok) {
            state.user = data;
            showToast('Login successful', 'success');
            showAuthenticatedView();
        } else {
            showToast(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        showToast('Server error during login', 'error');
    }
}

async function handleSendOTP(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    state.tempRegistration = { name, email };

    try {
        const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email }),
            credentials: 'include'
        });

        if (response.ok) {
            showToast('OTP sent to your email', 'success');
            navigateTo('otp');
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to send OTP', 'error');
        }
    } catch (error) {
        showToast('Server error', 'error');
    }
}

async function handleVerifyOTP(e) {
    e.preventDefault();
    const otp = document.getElementById('otp-code').value;
    state.tempRegistration.otp = otp;

    // In this flow, we just proceed to password setup locally, 
    // and send OTP during the final registration call as per BACKEND.md requirements
    // Wait, BACKEND.md says: POST /api/auth/register accepts email, otp, password.
    // So we just store OTP for now.
    navigateTo('password');
}

async function handleSetPassword(e) {
    e.preventDefault();
    const password = document.getElementById('new-password').value;
    const confirm = document.getElementById('confirm-password').value;

    if (password !== confirm) {
        return showToast('Passwords do not match', 'error');
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: state.tempRegistration.email,
                otp: state.tempRegistration.otp,
                password: password
            }),
            credentials: 'include'
        });

        if (response.ok) {
            showToast('Registration successful! Please login.', 'success');
            navigateTo('login');
        } else {
            const data = await response.json();
            showToast(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        showToast('Server error during registration', 'error');
    }
}

async function handleGetAIQuestion() {
    const text = document.getElementById('complaint-text').value;
    if (!text) return showToast('Please describe the issue first', 'error');

    state.currentComplaint.text = text;

    try {
        const response = await fetch(`${API_BASE_URL}/ai/question`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ complaint_text: text }),
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            state.currentComplaint.aiQuestion = data.question;

            document.getElementById('step-1').classList.add('hidden');
            document.getElementById('step-2').classList.remove('hidden');
            document.getElementById('display-ai-question').innerText = data.question;
        } else {
            showToast('AI service unavailable', 'error');
        }
    } catch (error) {
        showToast('Failed to connect to AI service', 'error');
    }
}

async function handleSubmitComplaint() {
    const answer = document.getElementById('ai-answer').value;
    if (!answer) return showToast('Please answer the AI question', 'error');

    try {
        const response = await fetch(`${API_BASE_URL}/complaints`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                complaint_text: state.currentComplaint.text,
                ai_question: state.currentComplaint.aiQuestion,
                ai_answer: answer
            }),
            credentials: 'include'
        });

        if (response.ok) {
            showToast('Complaint submitted successfully', 'success');
            navigateTo('user-dashboard');
        } else {
            showToast('Failed to submit complaint', 'error');
        }
    } catch (error) {
        showToast('Server error', 'error');
    }
}

async function loadMyComplaints() {
    try {
        const response = await fetch(`${API_BASE_URL}/complaints/my`, {
            credentials: 'include'
        });
        if (response.ok) {
            const complaints = await response.json();
            renderComplaints(complaints, 'complaints-list');
        }
    } catch (error) {
        showToast('Failed to load complaints', 'error');
    }
}

async function loadAllComplaints() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/complaints`, {
            credentials: 'include'
        });
        if (response.ok) {
            const complaints = await response.json();
            renderComplaints(complaints, 'admin-complaints-list', true);
        }
    } catch (error) {
        showToast('Failed to load all complaints', 'error');
    }
}

function renderComplaints(complaints, containerId, isAdmin = false) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (complaints.length === 0) {
        container.innerHTML = '<p class="subtitle">No complaints found.</p>';
        return;
    }

    container.innerHTML = complaints.map(c => `
        <div class="complaint-card">
            ${isAdmin ? `
                <div class="card-section">
                    <span class="card-label">Submitted By</span>
                    <p class="card-content"><strong>${c.userName}</strong> (${c.userEmail})</p>
                </div>
            ` : ''}
            <div class="card-section">
                <span class="card-label">Complaint</span>
                <p class="card-content">${c.complaint_text}</p>
            </div>
            <div class="card-section">
                <span class="card-label">AI Clarification</span>
                <p class="card-content ai-q">${c.ai_question || 'N/A'}</p>
            </div>
            <div class="card-section">
                <span class="card-label">Your Response</span>
                <p class="card-content user-a">${c.user_answer || 'N/A'}</p>
            </div>
            <span class="date-stamp">${new Date(c.created_at).toLocaleDateString()}</span>
        </div>
    `).join('');
}

logoutBtn.onclick = async () => {
    try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        state.user = null;
        mainNav.classList.add('hidden');
        navigateTo('login');
        showToast('Logged out', 'success');
    } catch (error) {
        showToast('Logout failed', 'error');
    }
};

// Utilities
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
