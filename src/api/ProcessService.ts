import { exec } from 'child_process';
import os from 'os';
import si from 'systeminformation';
import { ProcessItem } from '../types/metrics';

export type SortField = 'cpu' | 'mem' | 'pid' | 'name' | 'user';

export class ProcessService {
  private filterQuery = '';
  private sortField: SortField = 'cpu';
  private sortAsc = false;

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

  public setSorting(field: SortField, ascending?: boolean): void {
    this.sortField = field;
    if (ascending !== undefined) {
      this.sortAsc = ascending;
    } else {
      this.sortAsc = !this.sortAsc;
    }
  }

  public getSortConfig(): { field: SortField; ascending: boolean } {
    return { field: this.sortField, ascending: this.sortAsc };
  }

  public async terminateProcess(pid: number): Promise<{ success: boolean; message: string }> {
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
