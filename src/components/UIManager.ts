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

    this.setupGlobalKeybindings();
    this.setupResizeHandler();
  }

  public getScreen(): blessed.Widgets.Screen {
    return this.screen;
  }

  private setupGlobalKeybindings(): void {
    this.screen.key(['q', 'C-c'], () => {
      this.destroy();
      process.exit(0);
    });
  }

  private setupResizeHandler(): void {
    this.screen.on('resize', () => {
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
