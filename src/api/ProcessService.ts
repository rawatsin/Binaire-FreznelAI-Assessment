import { exec } from 'child_process';
import os from 'os';
import si from 'systeminformation';
import { ProcessItem } from '../types/metrics';

export type SortField = 'cpu' | 'mem' | 'pid' | 'name' | 'user';

export class ProcessService {
  private filterQuery = '';
  private sortField: SortField = 'cpu';
  private sortAsc = false;

  private static readonly CRITICAL_PIDS = new Set<number>([0, 4]);
  private static readonly CRITICAL_NAMES = new Set<string>([
    'system',
    'system idle process',
    'smss.exe',
    'csrss.exe',
    'wininit.exe',
    'services.exe',
    'lsass.exe',
    'lsaiso.exe',
    'fontdrvhost.exe',
    'winlogon.exe',
    'svchost.exe',
    'init',
    'systemd',
    'kthreadd',
  ]);

  public async getProcesses(): Promise<ProcessItem[]> {
    const rawProcesses = await si.processes();
    let list: ProcessItem[] = rawProcesses.list.map((proc) => ({
      pid: proc.pid,
      name: proc.name,
      command: proc.command || proc.name,
      cpuPercent: Number(proc.cpu.toFixed(1)),
      memoryBytes: (proc.memRss || 0) * 1024,
      memoryPercent: Number(proc.mem.toFixed(1)),
      user: proc.user || 'SYSTEM',
      threads: 1,
      priority: proc.priority || 0,
    }));

    if (this.filterQuery) {
      const q = this.filterQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.command.toLowerCase().includes(q) ||
          p.user.toLowerCase().includes(q) ||
          String(p.pid).includes(q)
      );
    }

    list.sort((a, b) => {
      let comparison = 0;
      switch (this.sortField) {
        case 'cpu':
          comparison = a.cpuPercent - b.cpuPercent;
          break;
        case 'mem':
          comparison = a.memoryBytes - b.memoryBytes;
          break;
        case 'pid':
          comparison = a.pid - b.pid;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'user':
          comparison = a.user.localeCompare(b.user);
          break;
      }
      return this.sortAsc ? comparison : -comparison;
    });

    return list;
  }

  public setFilter(query: string): void {
    this.filterQuery = query.trim();
  }

  public getFilterQuery(): string {
    return this.filterQuery;
  }

  public setSorting(field: SortField, ascending?: boolean): void {
    this.sortField = field;
    if (ascending !== undefined) {
      this.sortAsc = ascending;
    } else {
      this.sortAsc = !this.sortAsc;
    }
  }

  public cycleSortField(): SortField {
    const fields: SortField[] = ['cpu', 'mem', 'pid', 'name', 'user'];
    const currentIndex = fields.indexOf(this.sortField);
    const nextIndex = (currentIndex + 1) % fields.length;
    this.sortField = fields[nextIndex] || 'cpu';
    return this.sortField;
  }

  public toggleSortDirection(): boolean {
    this.sortAsc = !this.sortAsc;
    return this.sortAsc;
  }

  public getSortConfig(): { field: SortField; ascending: boolean } {
    return { field: this.sortField, ascending: this.sortAsc };
  }

  public isCriticalProcess(pid: number, name?: string): boolean {
    if (pid === process.pid) return true;
    if (ProcessService.CRITICAL_PIDS.has(pid)) return true;
    if (name && ProcessService.CRITICAL_NAMES.has(name.toLowerCase())) return true;
    return false;
  }

  public async terminateProcess(pid: number, name?: string): Promise<{ success: boolean; message: string }> {
    if (this.isCriticalProcess(pid, name)) {
      return {
        success: false,
        message: `Refused: PID ${pid} (${name || 'unknown'}) is a critical system process or current app.`,
      };
    }

    return new Promise((resolve) => {
      const isWindows = os.platform() === 'win32';
      const command = isWindows ? `taskkill /PID ${pid} /F` : `kill -9 ${pid}`;

      exec(command, (err, stdout, stderr) => {
        if (err) {
          resolve({
            success: false,
            message: stderr.trim() || err.message,
          });
        } else {
          resolve({
            success: true,
            message: stdout.trim() || `Process ${pid} terminated`,
          });
        }
      });
    });
  }
}
