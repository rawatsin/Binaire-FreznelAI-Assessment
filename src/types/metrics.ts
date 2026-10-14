export interface CpuCoreLoad {
  coreId: number;
  load: number;
  temp?: number;
}

export interface CpuMetrics {
  manufacturer: string;
  brand: string;
  speedGhz: number;
  cores: number;
  currentLoad: number;
  coresLoad: CpuCoreLoad[];
  loadAvg: [number, number, number];
  uptimeSeconds: number;
}

export interface MemoryMetrics {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  availableBytes: number;
  cachedBytes: number;
  committedBytes: number;
  gpuSharedUsedBytes?: number;
}

export interface DiskMetrics {
  mount: string;
  fsType: string;
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  usedPercent: number;
  readBytesPerSec: number;
  writeBytesPerSec: number;
}

export interface NetworkMetrics {
  interfaceName: string;
  ipAddress: string;
  rxBytesPerSec: number;
  txBytesPerSec: number;
  totalRxBytes: number;
  totalTxBytes: number;
}

export interface BatteryMetrics {
  hasBattery: boolean;
  percent: number;
  isCharging: boolean;
}

export interface GpuMetrics {
  model: string;
  usagePercent: number;
  memoryUsedMb?: number;
  memoryTotalMb?: number;
}

export interface ProcessItem {
  pid: number;
  name: string;
  command: string;
  cpuPercent: number;
  memoryBytes: number;
  memoryPercent: number;
  user: string;
  threads: number;
  priority: number;
}

export interface SystemSnapshot {
  timestamp: number;
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  disks: DiskMetrics[];
  network: NetworkMetrics;
  battery: BatteryMetrics;
  gpu?: GpuMetrics;
  processes: ProcessItem[];
}
