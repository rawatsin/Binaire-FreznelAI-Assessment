import blessed from 'neo-blessed';

export class UIManager {
  private screen: blessed.Widgets.Screen;
  private isDestroyed = false;

  constructor(title = 'Binaire FreznelAI - System Tasks & Sensors Viewer') {
    this.screen = blessed.screen({
      smartCSR: true,
      title,
      fullUnicode: true,
      autoPadding: true,
      warnings: false,
    });

    this.ensureTerminalDimensions();
    this.setupGlobalKeybindings();
    this.setupResizeHandler();
  }

  public getScreen(): blessed.Widgets.Screen {
    return this.screen;
  }

  private ensureTerminalDimensions(): void {
    if (Number(this.screen.width) <= 1 || Number(this.screen.height) <= 1) {
      const cols = process.stdout.columns && process.stdout.columns > 20 ? process.stdout.columns : 120;
      const rows = process.stdout.rows && process.stdout.rows > 10 ? process.stdout.rows : 34;
      this.screen.program.cols = cols;
      this.screen.program.rows = rows;
    }
  }

  private setupGlobalKeybindings(): void {
    this.screen.key(['q', 'C-c'], () => {
      this.destroy();
      process.exit(0);
    });
  }

  private setupResizeHandler(): void {
    this.screen.on('resize', () => {
      if (process.stdout.columns && process.stdout.rows) {
        this.screen.program.cols = process.stdout.columns;
        this.screen.program.rows = process.stdout.rows;
      }
      this.render();
    });
  }

  public render(): void {
    if (!this.isDestroyed) {
      this.screen.render();
    }
  }

  public destroy(): void {
    if (!this.isDestroyed) {
      this.isDestroyed = true;
      this.screen.destroy();
    }
  }
}
