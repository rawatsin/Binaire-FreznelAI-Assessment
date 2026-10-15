import fs from 'fs';
import path from 'path';

export interface AppConfig {
  firebaseApiKey?: string;
  firebaseAuthDomain?: string;
  firebaseProjectId?: string;
}

export class ConfigManager {
  private static instance?: ConfigManager;
  private config: AppConfig;

  private constructor() {
    this.loadEnvFile();
    this.config = {
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
    };
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public getConfig(): AppConfig {
    return this.config;
  }

  private loadEnvFile(): void {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx !== -1) {
              const key = trimmed.slice(0, eqIdx).trim();
              const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
              if (!process.env[key]) {
                process.env[key] = val;
              }
            }
          }
        }
      } catch {
        // Ignore read errors
      }
    }
  }
}
