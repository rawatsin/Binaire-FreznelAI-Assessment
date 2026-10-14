import { SystemSnapshot, CpuMetrics, MemoryMetrics, DiskMetrics, NetworkMetrics, BatteryMetrics, GpuMetrics, ProcessItem } from '../types/metrics';

export class SystemSnapshotModel {
  public readonly timestamp: number;
  public readonly cpu: CpuMetrics;
  public readonly memory: MemoryMetrics;
  public readonly disks: DiskMetrics[];
  public readonly network: NetworkMetrics;
  public readonly battery: BatteryMetrics;
  public readonly gpu?: GpuMetrics;
  public readonly processes: ProcessItem[];

  constructor(snapshot: SystemSnapshot) {
    this.timestamp = snapshot.timestamp;
    this.cpu = snapshot.cpu;
    this.memory = snapshot.memory;
    this.disks = snapshot.disks;
    this.network = snapshot.network;
    this.battery = snapshot.battery;
    this.gpu = snapshot.gpu;
    this.processes = snapshot.processes;
  }

  public getFormattedUptime(): string {
    const totalSecs = Math.floor(this.cpu.uptimeSeconds);
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  public static formatBytes(bytes: number, decimals = 1): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    const i = Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(k));
    const val = bytes / Math.pow(k, i);
    return `${val.toFixed(decimals)} ${sizes[i] || 'B'}`;
  }

  public static formatRate(bytesPerSec: number): string {
    return `${SystemSnapshotModel.formatBytes(bytesPerSec)}/s`;
  }
}
