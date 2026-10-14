export interface UserSession {
  userId: string;
  email: string;
  token?: string;
}

export interface IAuthService {
  isAuthenticated(): boolean;
  getCurrentUser(): UserSession | null;
  signUp(email: string, password: string): Promise<UserSession>;
  signIn(email: string, password: string): Promise<UserSession>;
  signOut(): Promise<void>;
}
