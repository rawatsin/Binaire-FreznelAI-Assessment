import blessed from 'neo-blessed';
import { SystemMetricsService } from '../api/SystemMetricsService';
import { CpuPanel } from './CpuPanel';
import { MemoryPanel } from './MemoryPanel';
import { DiskPanel } from './DiskPanel';
import { NetworkPanel } from './NetworkPanel';
import { ProcessPanel } from './ProcessPanel';

export class DashboardView {
  private screen: blessed.Widgets.Screen;
  private metricsService: SystemMetricsService;
  private cpuPanel!: CpuPanel;
  private memoryPanel!: MemoryPanel;
  private diskPanel!: DiskPanel;
  private networkPanel!: NetworkPanel;
  private processPanel!: ProcessPanel;
  private warningBox!: blessed.Widgets.BoxElement;

  private refreshTimer?: NodeJS.Timeout;
  private isUpdating = false;
  private isDestroyed = false;

  private static readonly MIN_COLS = 80;
  private static readonly MIN_ROWS = 24;
  private static readonly REFRESH_INTERVAL_MS = 1500;

  constructor(screen: blessed.Widgets.Screen, metricsService: SystemMetricsService) {
    this.screen = screen;
    this.metricsService = metricsService;

    this.setupPanels();
    this.setupResizeListener();
  }

  private setupPanels(): void {
    // Top CPU panel (32% height, 100% width)
    this.cpuPanel = new CpuPanel(this.screen, {
      top: 0,
      left: 0,
      width: '100%',
      height: '32%',
    });

    // Left Column: Mem (38% of remaining), Disks (26%), Net (36%)
    this.memoryPanel = new MemoryPanel(this.screen, {
      top: '32%',
      left: 0,
      width: '42%',
      height: '26%',
    });

    this.diskPanel = new DiskPanel(this.screen, {
      top: '58%',
      left: 0,
      width: '42%',
      height: '18%',
    });

    this.networkPanel = new NetworkPanel(this.screen, {
      top: '76%',
      left: 0,
      width: '42%',
      height: '24%',
    });

    // Right Column: Process Manager (68% height, 58% width)
    this.processPanel = new ProcessPanel(this.screen, {
      top: '32%',
      left: '42%',
      width: '58%',
      height: '68%',
    });

    // Warning box for small terminal viewports
    this.warningBox = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 50,
      height: 8,
      tags: true,
      border: {
        type: 'line',
      },
      style: {
        border: {
          fg: 'red',
        },
      },
      hidden: true,
    });
  }

  private setupResizeListener(): void {
    this.screen.on('resize', () => {
      this.checkTerminalSize();
      this.screen.render();
    });
  }

  private checkTerminalSize(): boolean {
    const cols = (this.screen.width as number) > 1 ? (this.screen.width as number) : (process.stdout.columns || 120);
    const rows = (this.screen.height as number) > 1 ? (this.screen.height as number) : (process.stdout.rows || 34);

    const tooSmall = cols < DashboardView.MIN_COLS || rows < DashboardView.MIN_ROWS;

    if (tooSmall) {
      this.cpuPanel.getContainer().hide();
      this.memoryPanel.getContainer().hide();
      this.diskPanel.getContainer().hide();
      this.networkPanel.getContainer().hide();
      this.processPanel.getContainer().hide();

      this.warningBox.setContent(
        `{center}{bold}{red-fg}TERMINAL SIZE TOO SMALL{/red-fg}{/bold}\n\n` +
        `Current: {yellow-fg}${cols}x${rows}{/yellow-fg}\n` +
        `Required: {green-fg}at least ${DashboardView.MIN_COLS}x${DashboardView.MIN_ROWS}{/green-fg}\n\n` +
        `Please enlarge your terminal window.{/center}`
      );
      this.warningBox.show();
      return false;
    } else {
      this.warningBox.hide();
      this.cpuPanel.getContainer().show();
      this.memoryPanel.getContainer().show();
      this.diskPanel.getContainer().show();
      this.networkPanel.getContainer().show();
      this.processPanel.getContainer().show();
      return true;
    }
  }

  public async start(): Promise<void> {
    this.checkTerminalSize();
    await this.updateMetrics();

    this.refreshTimer = setInterval(async () => {
      if (!this.isDestroyed) {
        await this.updateMetrics();
      }
    }, DashboardView.REFRESH_INTERVAL_MS);
  }

  private async updateMetrics(): Promise<void> {
    if (this.isUpdating || this.isDestroyed) return;
    this.isUpdating = true;

    try {
      const snapshot = await this.metricsService.collectSnapshot();

      if (!this.warningBox.visible) {
        this.cpuPanel.update(snapshot);
        this.memoryPanel.update(snapshot);
        this.diskPanel.update(snapshot);
        this.networkPanel.update(snapshot);
        this.processPanel.update(snapshot);
        this.screen.render();
      }
    } catch {
      // Graceful error recovery during poll
    } finally {
      this.isUpdating = false;
    }
  }

  public stop(): void {
    this.isDestroyed = true;
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }
}
