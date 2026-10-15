import { SystemMetricsService } from './api/SystemMetricsService';
import { ProcessService } from './api/ProcessService';
import { RebaseAuthService } from './auth/RebaseAuthService';
import { IAuthService } from './auth/IAuthService';
import { UIManager } from './components/UIManager';
import { DashboardView } from './components/DashboardView';

export class App {
  private metricsService: SystemMetricsService;
  private processService: ProcessService;
  private authService: IAuthService;
  private uiManager?: UIManager;
  private dashboardView?: DashboardView;

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

    this.dashboardView = new DashboardView(screen, this.metricsService, this.processService);
    this.uiManager.setExitPredicate(() => !this.dashboardView?.getDialogManager().isOpen());

    await this.dashboardView.start();

    // Hook cleanup to exit
    screen.on('destroy', () => {
      this.dashboardView?.stop();
    });
  }
}
