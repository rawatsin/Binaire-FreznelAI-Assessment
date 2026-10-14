import blessed from 'neo-blessed';
import { SystemMetricsService } from '../api/SystemMetricsService';
import { ProcessService } from '../api/ProcessService';
import { CpuPanel } from './CpuPanel';
import { MemoryPanel } from './MemoryPanel';
import { DiskPanel } from './DiskPanel';
import { NetworkPanel } from './NetworkPanel';
import { ProcessPanel } from './ProcessPanel';
import { BasePanel } from './BasePanel';
import { DialogManager } from './DialogManager';

export class DashboardView {
  private screen: blessed.Widgets.Screen;
  private metricsService: SystemMetricsService;
  private processService: ProcessService;
  private dialogManager: DialogManager;

  private cpuPanel!: CpuPanel;
  private memoryPanel!: MemoryPanel;
  private diskPanel!: DiskPanel;
  private networkPanel!: NetworkPanel;
  private processPanel!: ProcessPanel;
  private warningBox!: blessed.Widgets.BoxElement;

  private panels: BasePanel[] = [];
  private focusedPanelIndex = 4; // Start focused on ProcessPanel

  private refreshTimer?: NodeJS.Timeout;
  private isUpdating = false;
  private isDestroyed = false;

  private static readonly MIN_COLS = 80;
  private static readonly MIN_ROWS = 24;
  private static readonly REFRESH_INTERVAL_MS = 1500;

  constructor(
    screen: blessed.Widgets.Screen,
    metricsService: SystemMetricsService,
    processService: ProcessService
  ) {
    this.screen = screen;
    this.metricsService = metricsService;
    this.processService = processService;
    this.dialogManager = new DialogManager(screen);

    this.setupPanels();
    this.setupResizeListener();
    this.setupKeyboardNavigation();
  }

  public getDialogManager(): DialogManager {
    return this.dialogManager;
  }

  private setupPanels(): void {
    // Top CPU panel (32% height, 100% width)
    this.cpuPanel = new CpuPanel(this.screen, {
      top: 0,
      left: 0,
      width: '100%',
      height: '32%',
    });

    // Left Column: Mem (26%), Disks (18%), Net (24%)
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

    this.panels = [
      this.cpuPanel,
      this.memoryPanel,
      this.diskPanel,
      this.networkPanel,
      this.processPanel,
    ];

    // Set initial focus
    this.updatePanelFocus();

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

  private updatePanelFocus(): void {
    this.panels.forEach((p, idx) => {
      p.setFocused(idx === this.focusedPanelIndex);
    });
  }

  private switchFocus(direction: 'next' | 'prev'): void {
    if (direction === 'next') {
      this.focusedPanelIndex = (this.focusedPanelIndex + 1) % this.panels.length;
    } else {
      this.focusedPanelIndex =
        (this.focusedPanelIndex - 1 + this.panels.length) % this.panels.length;
    }
    this.updatePanelFocus();
    this.screen.render();
  }

  private setupKeyboardNavigation(): void {
    this.screen.on('keypress', async (ch, key) => {
      if (this.dialogManager.isOpen()) {
        return; // Modal is handling keys
      }

      const keyName = key.name;

      // Tab navigation across panels
      if (keyName === 'tab') {
        if (key.shift) {
          this.switchFocus('prev');
        } else {
          this.switchFocus('next');
        }
        return;
      }

      // Process list navigation (Up / Down / j / k / PgUp / PgDn / Home / End)
      if (keyName === 'up' || keyName === 'k') {
        this.processPanel.navigate('up');
        this.screen.render();
        return;
      }
      if (keyName === 'down' || keyName === 'j') {
        this.processPanel.navigate('down');
        this.screen.render();
        return;
      }
      if (keyName === 'pageup') {
        this.processPanel.pageUp();
        this.screen.render();
        return;
      }
      if (keyName === 'pagedown') {
        this.processPanel.pageDown();
        this.screen.render();
        return;
      }
      if (keyName === 'home') {
        this.processPanel.home();
        this.screen.render();
        return;
      }
      if (keyName === 'end') {
        this.processPanel.end();
        this.screen.render();
        return;
      }

      // Cycle sorting with 's'
      if (ch === 's' || ch === 'S') {
        this.processService.cycleSortField();
        this.syncSortAndFilter();
        await this.updateMetrics();
        return;
      }

      // Reverse sorting with 'r'
      if (ch === 'r' || ch === 'R') {
        this.processService.toggleSortDirection();
        this.syncSortAndFilter();
        await this.updateMetrics();
        return;
      }

      // Open process filter with '/'
      if (ch === '/') {
        this.dialogManager.showFilterDialog(
          this.processService.getFilterQuery(),
          async (newFilter) => {
            this.processService.setFilter(newFilter);
            this.syncSortAndFilter();
            await this.updateMetrics();
          }
        );
        return;
      }

      // Clear search filter with 'Escape'
      if (keyName === 'escape') {
        if (this.processService.getFilterQuery()) {
          this.processService.setFilter('');
          this.syncSortAndFilter();
          await this.updateMetrics();
        }
        return;
      }

      // Inspect selected process with 'Enter'
      if (keyName === 'enter' || keyName === 'return') {
        const proc = this.processPanel.getSelectedProcess();
        if (proc) {
          this.dialogManager.showProcessDetails(proc);
        }
        return;
      }

      // Request process termination with 't'
      if (ch === 't' || ch === 'T') {
        const proc = this.processPanel.getSelectedProcess();
        if (!proc) return;

        if (this.processService.isCriticalProcess(proc.pid, proc.name)) {
          this.dialogManager.showAlert(
            'Action Refused',
            `Cannot terminate critical system process or current application:\n\n{bold}${proc.name}{/bold} (PID: {cyan-fg}${proc.pid}{/cyan-fg})`,
            true
          );
          return;
        }

        this.dialogManager.showConfirmTerminate(proc, async () => {
          const result = await this.processService.terminateProcess(proc.pid, proc.name);
          this.dialogManager.showAlert(
            result.success ? 'Success' : 'Error',
            result.success
              ? `Terminated process {bold}${proc.name}{/bold} (PID: ${proc.pid})`
              : `Termination failed: ${result.message}`,
            !result.success
          );
          await this.updateMetrics();
        });
        return;
      }
    });
  }

  private syncSortAndFilter(): void {
    const { field, ascending } = this.processService.getSortConfig();
    const filter = this.processService.getFilterQuery();
    this.processPanel.setSortAndFilter(field, ascending, filter);
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
    this.syncSortAndFilter();
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
