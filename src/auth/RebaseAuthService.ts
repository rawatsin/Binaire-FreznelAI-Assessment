import { IAuthService, UserSession } from './IAuthService';

/**
 * Rebase Authentication Service implementation.
 * Scaffolded as a placeholder until the specific Rebase API credentials and endpoints are verified.
 */
export class RebaseAuthService implements IAuthService {
  private currentUser: UserSession | null = null;

  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  public getCurrentUser(): UserSession | null {
    return this.currentUser;
  }

  public async signUp(email: string, _password: string): Promise<UserSession> {
    // Scaffolded for Rebase API verification in subsequent step
    this.currentUser = {
      userId: `rebase_user_${Date.now()}`,
      email,
      token: `rebase_token_${Math.random().toString(36).substring(2)}`,
    };
    return this.currentUser;
  }

  public async signIn(email: string, _password: string): Promise<UserSession> {
    this.currentUser = {
      userId: `rebase_user_${Date.now()}`,
      email,
      token: `rebase_token_${Math.random().toString(36).substring(2)}`,
    };
    return this.currentUser;
  }

  public async signOut(): Promise<void> {
    this.currentUser = null;
  }
}
