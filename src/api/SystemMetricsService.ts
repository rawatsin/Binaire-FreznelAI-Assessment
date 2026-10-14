import os from 'os';
import si from 'systeminformation';
import {
  CpuMetrics,
  MemoryMetrics,
  DiskMetrics,
  NetworkMetrics,
  BatteryMetrics,
  GpuMetrics,
  SystemSnapshot,
} from '../types/metrics';
import { SystemSnapshotModel } from '../models/SystemSnapshotModel';
import { ProcessService } from './ProcessService';

export class SystemMetricsService {
  private lastNetworkStats?: { rx_bytes: number; tx_bytes: number; timestamp: number };
  private lastDiskIoStats?: { rIO: number; wIO: number; timestamp: number };
  private cachedCpuInfo?: { manufacturer: string; brand: string; speedGhz: number; cores: number };
  private processService: ProcessService;

  // Moving average for Windows load average simulation
  private simulatedLoadAvg: [number, number, number] = [0, 0, 0];

  constructor(processService?: ProcessService) {
    this.processService = processService || new ProcessService();
  }

  public async collectSnapshot(): Promise<SystemSnapshotModel> {
    const [cpuMetrics, memoryMetrics, diskMetrics, networkMetrics, batteryMetrics, gpuMetrics, processes] =
      await Promise.all([
        this.getCpuMetrics(),
        this.getMemoryMetrics(),
        this.getDiskMetrics(),
        this.getNetworkMetrics(),
        this.getBatteryMetrics(),
        this.getGpuMetrics(),
        this.processService.getProcesses(),
      ]);

    const snapshot: SystemSnapshot = {
      timestamp: Date.now(),
      cpu: cpuMetrics,
      memory: memoryMetrics,
      disks: diskMetrics,
      network: networkMetrics,
      battery: batteryMetrics,
      gpu: gpuMetrics,
      processes,
    };

    return new SystemSnapshotModel(snapshot);
  }

  public async getCpuMetrics(): Promise<CpuMetrics> {
    if (!this.cachedCpuInfo) {
      const cpu = await si.cpu();
      this.cachedCpuInfo = {
        manufacturer: cpu.manufacturer || 'CPU',
        brand: cpu.brand || os.cpus()[0]?.model || 'Generic Processor',
        speedGhz: cpu.speed || 0,
        cores: cpu.cores || os.cpus().length || 1,
      };
    }

    const [currentLoad, cpuTemp] = await Promise.all([
      si.currentLoad(),
      si.cpuTemperature().catch(() => ({ main: 0, cores: [] })),
    ]);

    const coresLoad = currentLoad.cpus.map((core, idx) => ({
      coreId: idx,
      load: Math.round(core.load),
      temp: cpuTemp.cores && cpuTemp.cores[idx] ? Math.round(cpuTemp.cores[idx]) : cpuTemp.main ? Math.round(cpuTemp.main) : undefined,
    }));

    // Calculate or retrieve load average
    let loadAvg = os.loadavg() as [number, number, number];
    if (loadAvg[0] === 0 && loadAvg[1] === 0 && loadAvg[2] === 0) {
      // Simulate exponential moving average for Windows
      const currentLoadNormalized = (currentLoad.currentLoad / 100) * this.cachedCpuInfo.cores;
      this.simulatedLoadAvg = [
        Number((this.simulatedLoadAvg[0] * 0.95 + currentLoadNormalized * 0.05).toFixed(2)),
        Number((this.simulatedLoadAvg[1] * 0.98 + currentLoadNormalized * 0.02).toFixed(2)),
        Number((this.simulatedLoadAvg[2] * 0.99 + currentLoadNormalized * 0.01).toFixed(2)),
      ];
      loadAvg = this.simulatedLoadAvg;
    }

    return {
      manufacturer: this.cachedCpuInfo.manufacturer,
      brand: this.cachedCpuInfo.brand,
      speedGhz: this.cachedCpuInfo.speedGhz,
      cores: this.cachedCpuInfo.cores,
      currentLoad: Math.round(currentLoad.currentLoad),
      coresLoad,
      loadAvg,
      uptimeSeconds: os.uptime(),
    };
  }

  public async getMemoryMetrics(): Promise<MemoryMetrics> {
    const mem = await si.mem();
    return {
      totalBytes: mem.total,
      usedBytes: mem.active || mem.used,
      freeBytes: mem.free,
      availableBytes: mem.available,
      cachedBytes: mem.buffcache || 0,
      committedBytes: mem.swaptotal ? mem.swapused : mem.used,
    };
  }

  public async getDiskMetrics(): Promise<DiskMetrics[]> {
    const [fsSizes, disksIO] = await Promise.all([
      si.fsSize().catch(() => []),
      si.disksIO().catch(() => null),
    ]);

    const now = Date.now();
    let rSec = 0;
    let wSec = 0;

    if (disksIO && this.lastDiskIoStats) {
      const dt = (now - this.lastDiskIoStats.timestamp) / 1000;
      if (dt > 0) {
        rSec = Math.max(0, (disksIO.rIO - this.lastDiskIoStats.rIO) / dt);
        wSec = Math.max(0, (disksIO.wIO - this.lastDiskIoStats.wIO) / dt);
      }
    }

    if (disksIO) {
      this.lastDiskIoStats = { rIO: disksIO.rIO, wIO: disksIO.wIO, timestamp: now };
    }

    return fsSizes.map((fs) => ({
      mount: fs.mount || fs.fs,
      fsType: fs.type,
      totalBytes: fs.size,
      usedBytes: fs.used,
      freeBytes: fs.available,
      usedPercent: Math.round(fs.use),
      readBytesPerSec: Math.round(rSec),
      writeBytesPerSec: Math.round(wSec),
    }));
  }

  public async getNetworkMetrics(): Promise<NetworkMetrics> {
    const [defaultInterfaceName, netStats] = await Promise.all([
      si.networkInterfaceDefault().catch(() => 'WIFI'),
      si.networkStats().catch(() => []),
    ]);

    const currentStats = netStats.find((s) => s.iface === defaultInterfaceName) || netStats[0];
    const now = Date.now();
    let rxRate = 0;
    let txRate = 0;

    if (currentStats) {
      if (this.lastNetworkStats) {
        const dt = (now - this.lastNetworkStats.timestamp) / 1000;
        if (dt > 0) {
          rxRate = Math.max(0, (currentStats.rx_bytes - this.lastNetworkStats.rx_bytes) / dt);
          txRate = Math.max(0, (currentStats.tx_bytes - this.lastNetworkStats.tx_bytes) / dt);
        }
      }
      this.lastNetworkStats = {
        rx_bytes: currentStats.rx_bytes,
        tx_bytes: currentStats.tx_bytes,
        timestamp: now,
      };
    }

    const interfaces = await si.networkInterfaces().catch(() => []);
    const matchingInterface = Array.isArray(interfaces)
      ? interfaces.find((i) => i.iface === (currentStats?.iface || defaultInterfaceName))
      : undefined;

    return {
      interfaceName: currentStats?.iface || defaultInterfaceName || 'eth0',
      ipAddress: matchingInterface?.ip4 || '127.0.0.1',
      rxBytesPerSec: Math.round(rxRate),
      txBytesPerSec: Math.round(txRate),
      totalRxBytes: currentStats?.rx_bytes || 0,
      totalTxBytes: currentStats?.tx_bytes || 0,
    };
  }

  public async getBatteryMetrics(): Promise<BatteryMetrics> {
    try {
      const battery = await si.battery();
      return {
        hasBattery: battery.hasBattery,
        percent: battery.percent || 100,
        isCharging: battery.isCharging,
      };
    } catch {
      return { hasBattery: false, percent: 100, isCharging: false };
    }
  }

  public async getGpuMetrics(): Promise<GpuMetrics | undefined> {
    try {
      const graphics = await si.graphics();
      if (graphics.controllers && graphics.controllers.length > 0) {
        const primaryGpu = graphics.controllers[0];
        return {
          model: primaryGpu.model || 'Integrated Graphics',
          usagePercent: primaryGpu.utilizationGpu || 0,
          memoryUsedMb: primaryGpu.memoryUsed,
          memoryTotalMb: primaryGpu.memoryTotal,
        };
      }
    } catch {
      // Ignore GPU query failures
    }
    return undefined;
  }
}
