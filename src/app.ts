import blessed from 'neo-blessed';
import { SystemMetricsService } from './api/SystemMetricsService';
import { ProcessService } from './api/ProcessService';
import { RebaseAuthService } from './auth/RebaseAuthService';
import { IAuthService } from './auth/IAuthService';
import { UIManager } from './components/UIManager';
import { SystemSnapshotModel } from './models/SystemSnapshotModel';

export class App {
  private metricsService: SystemMetricsService;
  private processService: ProcessService;
  private authService: IAuthService;
  private uiManager?: UIManager;

  constructor() {
    this.processService = new ProcessService();
    this.metricsService = new SystemMetricsService(this.processService);
    this.authService = new RebaseAuthService();
  }

  public getMetricsService(): SystemMetricsService {
    return this.metricsService;
  }

  public getProcessService(): ProcessService {
    return this.processService;
  }

  public getAuthService(): IAuthService {
    return this.authService;
  }

  public async runSetupCheck(): Promise<boolean> {
    try {
      const snapshot = await this.metricsService.collectSnapshot();
      return (
        snapshot.cpu.cores > 0 &&
        snapshot.memory.totalBytes > 0 &&
        Array.isArray(snapshot.processes)
      );
    } catch {
      return false;
    }
  }

  public async start(): Promise<void> {
    this.uiManager = new UIManager('Binaire FreznelAI - System Tasks & Sensors Viewer');
    const screen = this.uiManager.getScreen();

    // Create a setup / verification box
    const setupBox = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: '80%',
      height: '60%',
      content: '{bold}{cyan-fg}Initializing System Metrics & Environment Check...{/cyan-fg}{/bold}',
      tags: true,
      border: {
        type: 'line',
      },
      style: {
        border: {
          fg: 'cyan',
        },
      },
    });

    this.uiManager.render();

    try {
      const snapshot = await this.metricsService.collectSnapshot();

      const infoLines = [
        '{bold}{green-fg}✔ Step 1 Project Setup & Environment Verification Successful{/green-fg}{/bold}\n',
        `{bold}Architecture:{/bold} Object-Oriented (Decoupled Metrics, Process, Auth, and UI)`,
        `{bold}Terminal UI:{/bold} neo-blessed (Keyboard navigation & resize enabled)`,
        `{bold}Authentication Module:{/bold} RebaseAuthService (Staged for Rebase API verification)`,
        `{bold}OS Platform:{/bold} ${process.platform} (${process.arch})`,
        '',
        '{bold}{yellow-fg}Initial Hardware Snapshot:{/yellow-fg}{/bold}',
        `  • CPU: ${snapshot.cpu.brand} (${snapshot.cpu.cores} Cores @ ${snapshot.cpu.speedGhz} GHz)`,
        `  • Memory: ${SystemSnapshotModel.formatBytes(snapshot.memory.usedBytes)} used / ${SystemSnapshotModel.formatBytes(snapshot.memory.totalBytes)} total`,
        `  • Active Disks: ${snapshot.disks.length} mounted partition(s)`,
        `  • Network Interface: ${snapshot.network.interfaceName} (${snapshot.network.ipAddress})`,
        `  • Active Processes Detected: ${snapshot.processes.length}`,
        '',
        '{inverse} Press "q" or "Ctrl+C" to exit this setup check screen {/inverse}',
      ];

      setupBox.setContent(infoLines.join('\n'));
      this.uiManager.render();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setupBox.setContent(`{red-fg}{bold}Error during setup check:{/bold} ${errMsg}{/red-fg}`);
      this.uiManager.render();
    }
  }
}
