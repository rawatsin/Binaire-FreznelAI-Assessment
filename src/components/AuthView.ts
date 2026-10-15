import blessed from 'neo-blessed';
import { IAuthService, UserSession } from '../auth/IAuthService';

export type AuthMode = 'signin' | 'signup';

export class AuthView {
  private screen: blessed.Widgets.Screen;
  private authService: IAuthService;
  private onAuthenticated: (session: UserSession) => void;

  private container: blessed.Widgets.BoxElement;
  private mode: AuthMode = 'signin';
  private focusedField: 'mode' | 'email' | 'password' | 'submit' = 'email';

  private emailInput = '';
  private passwordInput = '';
  private statusMessage = '';
  private statusType: 'idle' | 'loading' | 'error' | 'success' = 'idle';

  private keyListener?: (ch: string, key: blessed.Widgets.Events.IKeyEventArg) => void;

  constructor(
    screen: blessed.Widgets.Screen,
    authService: IAuthService,
    onAuthenticated: (session: UserSession) => void
  ) {
    this.screen = screen;
    this.authService = authService;
    this.onAuthenticated = onAuthenticated;

    this.container = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 66,
      height: 20,
      tags: true,
      border: {
        type: 'line',
      },
      style: {
        border: {
          fg: 'cyan',
        },
      },
      label: ' {bold}{yellow-fg}Firebase Authentication{/yellow-fg}{/bold} ',
    });

    this.setupKeyboard();
    this.renderView();
  }

  public show(): void {
    this.container.show();
    this.renderView();
  }

  public hide(): void {
    this.container.hide();
  }

  public destroy(): void {
    if (this.keyListener) {
      this.screen.removeListener('keypress', this.keyListener);
      this.keyListener = undefined;
    }
    this.container.destroy();
  }

  private setupKeyboard(): void {
    this.keyListener = async (ch: string, key: blessed.Widgets.Events.IKeyEventArg) => {
      if (!this.container.visible || this.statusType === 'loading') {
        return;
      }

      const keyName = key.name;

      // Global exit from auth screen
      if (key.ctrl && keyName === 'c') {
        this.screen.destroy();
        process.exit(0);
      }

      // Tab or Arrow navigation between inputs
      if (keyName === 'tab' || keyName === 'down') {
        this.cycleFocus(key.shift ? -1 : 1);
        this.renderView();
        return;
      }
      if (keyName === 'up') {
        this.cycleFocus(-1);
        this.renderView();
        return;
      }

      // Toggle Mode when on mode selector or via Left/Right
      if (this.focusedField === 'mode' || keyName === 'left' || keyName === 'right') {
        if (keyName === 'left' || keyName === 'right' || keyName === 'space' || keyName === 'enter') {
          this.mode = this.mode === 'signin' ? 'signup' : 'signin';
          this.statusMessage = '';
          this.statusType = 'idle';
          this.renderView();
          return;
        }
      }

      // Enter submits from any field
      if (keyName === 'enter' || keyName === 'return') {
        await this.handleSubmit();
        return;
      }

      // Backspace handling
      if (keyName === 'backspace') {
        if (this.focusedField === 'email') {
          this.emailInput = this.emailInput.slice(0, -1);
        } else if (this.focusedField === 'password') {
          this.passwordInput = this.passwordInput.slice(0, -1);
        }
        this.statusMessage = '';
        this.renderView();
        return;
      }

      // Text entry for email and password
      if (ch && ch.length === 1 && !key.ctrl && !key.meta) {
        if (this.focusedField === 'email') {
          this.emailInput += ch;
          this.statusMessage = '';
          this.renderView();
        } else if (this.focusedField === 'password') {
          this.passwordInput += ch;
          this.statusMessage = '';
          this.renderView();
        }
      }
    };

    this.screen.on('keypress', this.keyListener);
  }

  private cycleFocus(direction: number): void {
    const fields: Array<'mode' | 'email' | 'password' | 'submit'> = ['mode', 'email', 'password', 'submit'];
    const idx = fields.indexOf(this.focusedField);
    const nextIdx = (idx + direction + fields.length) % fields.length;
    this.focusedField = fields[nextIdx] || 'email';
  }

  private async handleSubmit(): Promise<void> {
    this.statusType = 'loading';
    this.statusMessage = 'Contacting authentication server...';
    this.renderView();

    try {
      let session: UserSession;
      if (this.mode === 'signup') {
        session = await this.authService.signUp(this.emailInput, this.passwordInput);
      } else {
        session = await this.authService.signIn(this.emailInput, this.passwordInput);
      }

      this.statusType = 'success';
      this.statusMessage = `Welcome ${session.email}! Access granted.`;
      this.renderView();

      setTimeout(() => {
        this.destroy();
        this.onAuthenticated(session);
      }, 800);
    } catch (err: unknown) {
      this.statusType = 'error';
      this.statusMessage = err instanceof Error ? err.message : String(err);
      this.renderView();
    }
  }

  private renderView(): void {
    const title = '{center}{bold}{cyan-fg}Binaire FreznelAI System Monitor{/cyan-fg}{/bold}\n{grey-fg}Terminal Task & Sensor Viewer Gate{/grey-fg}{/center}';

    const isMode = this.focusedField === 'mode';
    const isEmail = this.focusedField === 'email';
    const isPass = this.focusedField === 'password';
    const isSubmit = this.focusedField === 'submit';

    // Mode tabs
    const signInLabel = this.mode === 'signin' ? '{inverse} Sign In {/inverse}' : '  Sign In  ';
    const signUpLabel = this.mode === 'signup' ? '{inverse} Sign Up {/inverse}' : '  Sign Up  ';
    const modeLine = `{center}${isMode ? '{yellow-fg}►{/yellow-fg} ' : '  '}${signInLabel}   ${signUpLabel}${isMode ? ' {yellow-fg}◄{/yellow-fg}' : '  '}{/center}`;

    // Email row
    const emailCursor = isEmail ? '█' : '';
    const emailDisplay = this.emailInput || '{grey-fg}name@example.com{/grey-fg}';
    const emailBorder = isEmail ? 'cyan-fg' : 'grey-fg';
    const emailLine = ` Email Address:\n {${emailBorder}}[ ${emailDisplay}${emailCursor} ]{/${emailBorder}}`;

    // Password row
    const passCursor = isPass ? '█' : '';
    const maskedPass = '*'.repeat(this.passwordInput.length) || '{grey-fg}Enter password (min 6 chars){/grey-fg}';
    const passBorder = isPass ? 'cyan-fg' : 'grey-fg';
    const passLine = ` Password:\n {${passBorder}}[ ${maskedPass}${passCursor} ]{/${passBorder}}`;

    // Submit button
    const submitText = this.mode === 'signup' ? 'CREATE ACCOUNT' : 'LOG IN';
    const submitBtn = isSubmit
      ? `{center}{inverse} ►  ${submitText}  ◄ {/inverse}{/center}`
      : `{center}{bold}[   ${submitText}   ]{/bold}{/center}`;

    // Status / Feedback message
    let statusLine = '';
    if (this.statusType === 'loading') {
      statusLine = `{yellow-fg}⏳ ${this.statusMessage}{/yellow-fg}`;
    } else if (this.statusType === 'error') {
      statusLine = `{red-fg}✖ ${this.statusMessage}{/red-fg}`;
    } else if (this.statusType === 'success') {
      statusLine = `{green-fg}✔ ${this.statusMessage}{/green-fg}`;
    }

    const instructions = '{center}{grey-fg}[Tab/Arrows] Navigate  [Enter] Submit  [Ctrl+C] Exit{/grey-fg}{/center}';

    const content = [
      title,
      '',
      modeLine,
      '',
      emailLine,
      passLine,
      '',
      submitBtn,
      '',
      `{center}${statusLine}{/center}`,
      instructions,
    ].join('\n');

    this.container.setContent(content);
    this.screen.render();
  }
}
