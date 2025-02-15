class App {
  constructor() {
    this.apiBaseUrl = '';
    this.currentSession = null;
    this.initialize();
    this.setupEventListeners();
  }

  async initialize() {
    try {
      const response = await fetch('/config');
      const config = await response.json();
      this.apiBaseUrl = config.apiBaseUrl;

      // Check for existing session on page load
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      this.updateAuthUI(session);

      // Listen for auth state changes
      supabaseClient.auth.onAuthStateChange((_, session) => {
        this.updateAuthUI(session);
      });
    } catch (error) {
      console.error('Failed to initialize:', error);
      this.showAuthError('Failed to initialize application. Please try again later.');
    }
  }

  setupEventListeners() {
    document.getElementById('loginBtn')?.addEventListener('click', () => this.login());
    document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());
    document.getElementById('healthBtn')?.addEventListener('click', () => this.checkHealth());
    document.getElementById('fetchDataBtn')?.addEventListener('click', () => this.fetchData());
    document.getElementById('testAuthBtn')?.addEventListener('click', () => this.testAuth());
  }

  updateAuthUI(session) {
    const loginStatus = document.getElementById('loginStatus');
    const logoutBtn = document.getElementById('logoutBtn');

    if (!loginStatus || !logoutBtn) return;

    if (session) {
      loginStatus.textContent = `Logged in as: ${session.user.email}`;
      loginStatus.className = 'logged-in';
      logoutBtn.disabled = false;
      this.currentSession = session;
    } else {
      loginStatus.textContent = 'Not logged in';
      loginStatus.className = 'logged-out';
      logoutBtn.disabled = true;
      this.currentSession = null;
    }
  }

  showAuthError(message) {
    const authResponse = document.getElementById('authResponse');
    if (!authResponse) return;

    authResponse.textContent = `Error: ${message}`;
    authResponse.className = 'response error';
  }

  showApiResponse(data, isError = false) {
    const apiResponse = document.getElementById('apiResponse');
    if (!apiResponse) return;

    apiResponse.textContent = JSON.stringify(data, null, 2);
    apiResponse.className = isError ? 'response error' : 'response success';
  }

  async login() {
    const email = document.getElementById('email')?.value;
    const password = document.getElementById('password')?.value;

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const authResponse = document.getElementById('authResponse');
      if (authResponse) {
        authResponse.textContent = 'Login successful!';
        authResponse.className = 'response success';
      }
      this.updateAuthUI(data.session);
    } catch (error) {
      this.showAuthError(error.message);
    }
  }

  async logout() {
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;

      const authResponse = document.getElementById('authResponse');
      if (authResponse) {
        authResponse.textContent = 'Logged out successfully';
        authResponse.className = 'response success';
      }
      this.updateAuthUI(null);
    } catch (error) {
      this.showAuthError(error.message);
    }
  }

  async checkHealth() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/health`);
      const data = await response.json();
      this.showApiResponse(data);
    } catch (error) {
      this.showApiResponse({ error: error.message }, true);
    }
  }

  async fetchData() {
    try {
      const headers = this.currentSession
        ? { Authorization: `Bearer ${this.currentSession.access_token}` }
        : {};

      const response = await fetch(`${this.apiBaseUrl}/data`, { headers });
      const data = await response.json();
      this.showApiResponse(data, !response.ok);
    } catch (error) {
      this.showApiResponse({ error: error.message }, true);
    }
  }

  async testAuth() {
    try {
      const headers = this.currentSession
        ? { Authorization: `Bearer ${this.currentSession.access_token}` }
        : {};

      const response = await fetch(`${this.apiBaseUrl}/test-auth`, { headers });
      const data = await response.json();
      this.showApiResponse(data, !response.ok);
    } catch (error) {
      this.showApiResponse({ error: error.message }, true);
    }
  }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
