import { IAuthService, UserSession } from './IAuthService';
import { ConfigManager } from '../utils/config';

interface FirebaseAuthResponse {
  idToken?: string;
  email?: string;
  refreshToken?: string;
  expiresIn?: string;
  localId?: string;
  registered?: boolean;
  error?: {
    code: number;
    message: string;
    errors?: Array<{ message: string; domain: string; reason: string }>;
  };
}

export class FirebaseAuthService implements IAuthService {
  private currentUser: UserSession | null = null;
  private apiKey?: string;
  private authBaseUrl = 'https://identitytoolkit.googleapis.com/v1/accounts';

  constructor(apiKey?: string, customBaseUrl?: string) {
    const config = ConfigManager.getInstance().getConfig();
    this.apiKey = apiKey || config.firebaseApiKey;
    if (customBaseUrl) {
      this.authBaseUrl = customBaseUrl;
    }
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  public getCurrentUser(): UserSession | null {
    return this.currentUser;
  }

  public validateInput(email: string, password: string): void {
    if (!email || !email.trim()) {
      throw new Error('Email address is required.');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password) {
      throw new Error('Password is required.');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }
  }

  private checkApiKey(): void {
    if (!this.apiKey || this.apiKey.includes('your_') || this.apiKey.trim() === '') {
      throw new Error(
        'Firebase API Key is not configured. Please set a valid FIREBASE_API_KEY in your .env file.'
      );
    }
  }

  public async signUp(email: string, password: string): Promise<UserSession> {
    this.validateInput(email, password);
    this.checkApiKey();

    const endpoint = `${this.authBaseUrl}:signUp?key=${encodeURIComponent(this.apiKey!)}`;
    return this.executeAuthRequest(endpoint, email.trim(), password);
  }

  public async signIn(email: string, password: string): Promise<UserSession> {
    this.validateInput(email, password);
    this.checkApiKey();

    const endpoint = `${this.authBaseUrl}:signInWithPassword?key=${encodeURIComponent(this.apiKey!)}`;
    return this.executeAuthRequest(endpoint, email.trim(), password);
  }

  public async signOut(): Promise<void> {
    this.currentUser = null;
  }

  private async executeAuthRequest(endpoint: string, email: string, password: string): Promise<UserSession> {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as FirebaseAuthResponse;

      if (!response.ok || data.error) {
        const rawMessage = data.error?.message || `Firebase request failed with status ${response.status}`;
        throw new Error(this.formatFirebaseError(rawMessage));
      }

      this.currentUser = {
        userId: data.localId || `firebase_${Date.now()}`,
        email: data.email || email,
        token: data.idToken,
      };

      return this.currentUser;
    } catch (err: unknown) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Unexpected network or server error during Firebase authentication.');
    }
  }

  private formatFirebaseError(rawMessage: string): string {
    if (rawMessage.includes('EMAIL_EXISTS')) {
      return 'An account already exists with this email address.';
    }
    if (rawMessage.includes('OPERATION_NOT_ALLOWED')) {
      return 'Email/Password sign-in is disabled in Firebase Console.';
    }
    if (rawMessage.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) {
      return 'Too many failed login attempts. Please try again later.';
    }
    if (rawMessage.includes('EMAIL_NOT_FOUND')) {
      return 'No account found with this email address.';
    }
    if (rawMessage.includes('INVALID_PASSWORD') || rawMessage.includes('INVALID_LOGIN_CREDENTIALS')) {
      return 'Invalid email or password.';
    }
    if (rawMessage.includes('USER_DISABLED')) {
      return 'This user account has been disabled.';
    }
    if (rawMessage.includes('WEAK_PASSWORD')) {
      return 'Password is too weak. Please use at least 6 characters.';
    }
    return rawMessage.replace(/_/g, ' ');
  }
}
