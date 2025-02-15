import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import './styles/main.css';

interface Config {
  apiBaseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

interface ApiResponse {
  status?: string;
  error?: string;
  timestamp?: string;
  data?: unknown;
  [key: string]: unknown;
}

class App {
  private supabaseClient: SupabaseClient | null = null;
  private apiBaseUrl = '';
  private currentSession: Session | null = null;

  async initialize(): Promise<void> {
    try {
      // Initialize theme
      this.initializeTheme();

      const config = await this.fetchConfig();

      if (!config.supabaseUrl || !config.supabaseAnonKey) {
        throw new Error('Missing Supabase configuration');
      }

      this.apiBaseUrl = config.apiBaseUrl;
      this.supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey);

      const {
        data: { session },
      } = await this.supabaseClient.auth.getSession();

      // Set up auth state change listener
      this.supabaseClient.auth.onAuthStateChange((_, session) => {
        this.updateAuthUI(session);
        this.handlePageNavigation(session);
      });

      // Initial auth state setup
      this.updateAuthUI(session);
      this.handlePageNavigation(session);

      await this.setupEventListeners();
    } catch (error) {
      if (error instanceof Error) {
        this.showToast(error.message, 'error');
      } else {
        this.showToast('An unknown error occurred', 'error');
      }
    }
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Add icon based on type
    const icon = document.createElement('span');
    icon.className = 'toast-icon';
    if (type === 'success') {
      icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 12.75L11.25 15L15 9.75M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    } else {
      icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 9V12.75M12 15H12.008M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    }

    const text = document.createElement('span');
    text.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(text);
    container.appendChild(toast);

    // Trigger reflow
    toast.offsetHeight;

    // Show toast
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Remove toast after delay
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        container.removeChild(toast);
      }, 300);
    }, 3000);
  }

  private initializeTheme(): void {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
      });
    }
  }

  private handlePageNavigation(session: Session | null): void {
    const loginPage = document.getElementById('loginPage');
    const apiTestPage = document.getElementById('apiTestPage');

    if (!loginPage || !apiTestPage) return;

    if (session) {
      loginPage.classList.add('hidden');
      apiTestPage.classList.remove('hidden');
    } else {
      loginPage.classList.remove('hidden');
      apiTestPage.classList.add('hidden');
    }
  }

  private async fetchConfig(): Promise<Config> {
    const response = await fetch('/config');
    if (!response.ok) {
      throw new Error('Failed to fetch configuration');
    }
    return response.json();
  }

  private async setupEventListeners(): Promise<void> {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const healthBtn = document.getElementById('healthBtn');
    const fetchDataBtn = document.getElementById('fetchDataBtn');
    const testAuthBtn = document.getElementById('testAuthBtn');

    if (!loginBtn || !logoutBtn || !healthBtn || !fetchDataBtn || !testAuthBtn) {
      throw new Error('Required UI elements not found');
    }

    loginBtn.addEventListener('click', () => this.login());
    logoutBtn.addEventListener('click', () => this.logout());
    healthBtn.addEventListener('click', () => this.checkHealth());
    fetchDataBtn.addEventListener('click', () => this.fetchData());
    testAuthBtn.addEventListener('click', () => this.testAuth());
  }

  private getInitials(email: string): string {
    return email
      .split('@')[0]
      .split(/[._-]/)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  private updateAuthUI(session: Session | null): void {
    const userEmail = document.getElementById('userEmail');
    const profileIcon = document.getElementById('profileIcon');
    const logoutBtn = document.getElementById('logoutBtn') as HTMLButtonElement | null;
    const userProfile = document.querySelector('.user-profile');

    if (!userEmail || !profileIcon || !logoutBtn || !userProfile) return;

    if (session && session.user.email) {
      userEmail.textContent = session.user.email;
      profileIcon.textContent = this.getInitials(session.user.email);
      logoutBtn.disabled = false;
      userProfile.classList.remove('logged-out');
      this.currentSession = session;
    } else {
      userEmail.textContent = '';
      profileIcon.textContent = '';
      logoutBtn.disabled = true;
      userProfile.classList.add('logged-out');
      this.currentSession = null;
    }
  }

  private async login(): Promise<void> {
    if (!this.supabaseClient) {
      this.showToast('Supabase client not initialized', 'error');
      return;
    }

    const email = (document.getElementById('email') as HTMLInputElement)?.value;
    const password = (document.getElementById('password') as HTMLInputElement)?.value;

    try {
      const { error } = await this.supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      this.showToast('Login successful!', 'success');
    } catch (error: any) {
      this.showToast(error.message, 'error');
    }
  }

  private async logout(): Promise<void> {
    if (!this.supabaseClient) {
      this.showToast('Supabase client not initialized', 'error');
      return;
    }

    try {
      const { error } = await this.supabaseClient.auth.signOut();
      if (error) throw error;
      this.showToast('Logged out successfully', 'success');
    } catch (error: any) {
      this.showToast(error.message, 'error');
    }
  }

  private async checkHealth(): Promise<void> {
    try {
      const response = await fetch('/health');
      const data = await response.json();
      this.showApiResponse(data);
      this.showToast('Health check completed', 'success');
    } catch (error: any) {
      this.showApiResponse({ error: error.message }, true);
      this.showToast('Health check failed', 'error');
    }
  }

  private showApiResponse(data: ApiResponse, isError = false): void {
    const apiResponse = document.getElementById('apiResponse');
    if (!apiResponse) return;

    apiResponse.textContent = JSON.stringify(data, null, 2);
    apiResponse.className = isError ? 'response error' : 'response success';
  }

  private async fetchData(): Promise<void> {
    try {
      const headers: HeadersInit = this.currentSession
        ? { Authorization: `Bearer ${this.currentSession.access_token}` }
        : {};

      const response = await fetch('/data', { headers });
      const data = await response.json();
      this.showApiResponse(data, !response.ok);

      if (response.ok) {
        this.showToast('Data fetched successfully', 'success');
      } else {
        this.showToast('Failed to fetch data', 'error');
      }
    } catch (error: any) {
      this.showApiResponse({ error: error.message }, true);
      this.showToast(error.message, 'error');
    }
  }

  private async testAuth(): Promise<void> {
    try {
      const headers: HeadersInit = this.currentSession
        ? { Authorization: `Bearer ${this.currentSession.access_token}` }
        : {};

      const response = await fetch('/test-auth', { headers });
      const data = await response.json();
      this.showApiResponse(data, !response.ok);

      if (response.ok) {
        this.showToast('Authentication test successful', 'success');
      } else {
        this.showToast('Authentication test failed', 'error');
      }
    } catch (error: any) {
      this.showApiResponse({ error: error.message }, true);
      this.showToast(error.message, 'error');
    }
  }
}

// Create and expose the app instance
declare global {
  interface Window {
    app: App;
  }
}

// Initialize when the DOM is loaded
window.addEventListener('DOMContentLoaded', async () => {
  const app = new App();
  window.app = app;
  await app.initialize();
});
