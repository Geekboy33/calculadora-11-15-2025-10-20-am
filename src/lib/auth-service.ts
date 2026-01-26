// ═══════════════════════════════════════════════════════════════════════════════
// AUTH SERVICE - Authentication Service for Treasury Minting Platform
// ═══════════════════════════════════════════════════════════════════════════════

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
  name: string;
  createdAt: string;
  lastLogin?: string;
}

export interface Session {
  user: User;
  token: string;
  expiresAt: string;
}

export interface LoginAttempt {
  username: string;
  timestamp: string;
  success: boolean;
  ip?: string;
}

interface LoginResult {
  success: boolean;
  session?: Session;
  error?: string;
}

const STORAGE_KEY_USERS = 'lemx_users';
const STORAGE_KEY_SESSION = 'lemx_session';
const STORAGE_KEY_LOGIN_ATTEMPTS = 'lemx_login_attempts';

// Default users for the platform
const DEFAULT_USERS: User[] = [
  {
    id: 'admin-001',
    username: 'admin',
    email: 'admin@treasuryminting.com',
    role: 'admin',
    name: 'Administrator',
    createdAt: new Date().toISOString()
  },
  {
    id: 'operator-001',
    username: 'operator',
    email: 'operator@treasuryminting.com',
    role: 'operator',
    name: 'Treasury Operator',
    createdAt: new Date().toISOString()
  }
];

// Default passwords (in production, these would be hashed)
const DEFAULT_PASSWORDS: Record<string, string> = {
  'admin': 'admin123',
  'operator': 'operator123'
};

class AuthService {
  private users: User[] = [];
  private session: Session | null = null;
  private loginAttempts: LoginAttempt[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      // Load users
      const storedUsers = localStorage.getItem(STORAGE_KEY_USERS);
      if (storedUsers) {
        this.users = JSON.parse(storedUsers);
      } else {
        this.users = [...DEFAULT_USERS];
        this.saveUsers();
      }

      // Load session
      const storedSession = localStorage.getItem(STORAGE_KEY_SESSION);
      if (storedSession) {
        const session = JSON.parse(storedSession) as Session;
        // Check if session is still valid
        if (new Date(session.expiresAt) > new Date()) {
          this.session = session;
        } else {
          localStorage.removeItem(STORAGE_KEY_SESSION);
        }
      }

      // Load login attempts
      const storedAttempts = localStorage.getItem(STORAGE_KEY_LOGIN_ATTEMPTS);
      if (storedAttempts) {
        this.loginAttempts = JSON.parse(storedAttempts);
      }
    } catch (error) {
      console.error('[AuthService] Error loading from storage:', error);
      this.users = [...DEFAULT_USERS];
    }
  }

  private saveUsers(): void {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(this.users));
  }

  private saveSession(): void {
    if (this.session) {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(this.session));
    } else {
      localStorage.removeItem(STORAGE_KEY_SESSION);
    }
  }

  private saveLoginAttempts(): void {
    // Keep only last 100 attempts
    this.loginAttempts = this.loginAttempts.slice(-100);
    localStorage.setItem(STORAGE_KEY_LOGIN_ATTEMPTS, JSON.stringify(this.loginAttempts));
  }

  private generateToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  login(username: string, password: string): LoginResult {
    const attempt: LoginAttempt = {
      username,
      timestamp: new Date().toISOString(),
      success: false
    };

    // Find user
    const user = this.users.find(u => u.username === username);
    
    // Check password
    const validPassword = DEFAULT_PASSWORDS[username] === password;

    if (!user || !validPassword) {
      this.loginAttempts.push(attempt);
      this.saveLoginAttempts();
      return { success: false, error: 'Invalid username or password' };
    }

    // Create session
    const session: Session = {
      user: { ...user, lastLogin: new Date().toISOString() },
      token: this.generateToken(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };

    this.session = session;
    this.saveSession();

    // Update user's last login
    const userIndex = this.users.findIndex(u => u.id === user.id);
    if (userIndex >= 0) {
      this.users[userIndex].lastLogin = session.user.lastLogin;
      this.saveUsers();
    }

    attempt.success = true;
    this.loginAttempts.push(attempt);
    this.saveLoginAttempts();

    return { success: true, session };
  }

  logout(): void {
    this.session = null;
    this.saveSession();
  }

  getCurrentSession(): Session | null {
    if (this.session && new Date(this.session.expiresAt) > new Date()) {
      return this.session;
    }
    this.session = null;
    this.saveSession();
    return null;
  }

  isAuthenticated(): boolean {
    return this.getCurrentSession() !== null;
  }

  getCurrentUser(): User | null {
    const session = this.getCurrentSession();
    return session?.user || null;
  }

  getUsers(): User[] {
    return [...this.users];
  }

  getLoginAttempts(): LoginAttempt[] {
    return [...this.loginAttempts];
  }

  addUser(user: Omit<User, 'id' | 'createdAt'>, password: string): User {
    const newUser: User = {
      ...user,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    this.users.push(newUser);
    DEFAULT_PASSWORDS[newUser.username] = password;
    this.saveUsers();

    return newUser;
  }

  updateUser(userId: string, updates: Partial<User>): User | null {
    const index = this.users.findIndex(u => u.id === userId);
    if (index < 0) return null;

    this.users[index] = { ...this.users[index], ...updates };
    this.saveUsers();

    return this.users[index];
  }

  deleteUser(userId: string): boolean {
    const index = this.users.findIndex(u => u.id === userId);
    if (index < 0) return false;

    const user = this.users[index];
    delete DEFAULT_PASSWORDS[user.username];
    this.users.splice(index, 1);
    this.saveUsers();

    return true;
  }
}

// Export singleton instance
export const authService = new AuthService();

export default authService;
