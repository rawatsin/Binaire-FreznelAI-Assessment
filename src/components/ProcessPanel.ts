import blessed from 'neo-blessed';
import { BasePanel, PanelBounds } from './BasePanel';
import { SystemSnapshotModel } from '../models/SystemSnapshotModel';
import { UIFormatters } from '../utils/formatters';
import { ProcessItem } from '../types/metrics';
import { SortField } from '../api/ProcessService';

export class ProcessPanel extends BasePanel {
  private headerBox: blessed.Widgets.BoxElement;
  private tableBox: blessed.Widgets.BoxElement;
  private footerBox: blessed.Widgets.BoxElement;

  private processes: ProcessItem[] = [];
  private selectedIndex = 0;
  private scrollOffset = 0;
  private selectedPid?: number;

  private currentSortField: SortField = 'cpu';
  private currentSortAsc = false;
  private currentFilterQuery = '';

  constructor(screen: blessed.Widgets.Screen, bounds: PanelBounds) {
    super(
      screen,
      bounds,
      '{bold}{cyan-fg}proc{/cyan-fg}{/bold} {grey-fg}filter:{/grey-fg} {inverse}per-core{/inverse} {grey-fg}reverse tree services cpu lazy{/grey-fg}'
    );

    this.headerBox = blessed.box({
      parent: this.container,
      top: 0,
      left: 0,
      width: '100%-2',
      height: 1,
      tags: true,
      style: {
        bold: true,
        fg: 'cyan',
      },
    });

    this.tableBox = blessed.box({
      parent: this.container,
      top: 1,
      left: 0,
      width: '100%-2',
      height: '100%-4',
      tags: true,
    });

    this.footerBox = blessed.box({
      parent: this.container,
      bottom: 0,
      left: 0,
      width: '100%-2',
      height: 1,
      tags: true,
      style: {
        fg: 'grey',
      },
    });
  }

  public setSortAndFilter(field: SortField, ascending: boolean, filter: string): void {
    this.currentSortField = field;
    this.currentSortAsc = ascending;
    this.currentFilterQuery = filter;
  }

  public getSelectedProcess(): ProcessItem | undefined {
    if (this.processes.length === 0) return undefined;
    return this.processes[this.selectedIndex];
  }

  public navigate(direction: 'up' | 'down'): void {
    if (this.processes.length === 0) return;

    if (direction === 'up') {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
    } else {
      this.selectedIndex = Math.min(this.processes.length - 1, this.selectedIndex + 1);
    }

    this.selectedPid = this.processes[this.selectedIndex]?.pid;
    this.adjustWindow();
    this.renderCurrentList();
  }

  public pageUp(): void {
    if (this.processes.length === 0) return;
    const pageSize = this.getAvailableRows();
    this.selectedIndex = Math.max(0, this.selectedIndex - pageSize);
    this.selectedPid = this.processes[this.selectedIndex]?.pid;
    this.adjustWindow();
    this.renderCurrentList();
  }

  public pageDown(): void {
    if (this.processes.length === 0) return;
    const pageSize = this.getAvailableRows();
    this.selectedIndex = Math.min(this.processes.length - 1, this.selectedIndex + pageSize);
    this.selectedPid = this.processes[this.selectedIndex]?.pid;
    this.adjustWindow();
    this.renderCurrentList();
  }

  public home(): void {
    if (this.processes.length === 0) return;
    this.selectedIndex = 0;
    this.selectedPid = this.processes[0]?.pid;
    this.adjustWindow();
    this.renderCurrentList();
  }

  public end(): void {
    if (this.processes.length === 0) return;
    this.selectedIndex = this.processes.length - 1;
    this.selectedPid = this.processes[this.selectedIndex]?.pid;
    this.adjustWindow();
    this.renderCurrentList();
  }

  private getAvailableRows(): number {
    return Math.max(5, ((this.container.height as number) || 20) - 4);
  }

  private adjustWindow(): void {
    const availableRows = this.getAvailableRows();

    if (this.selectedIndex < this.scrollOffset) {
      this.scrollOffset = this.selectedIndex;
    } else if (this.selectedIndex >= this.scrollOffset + availableRows) {
      this.scrollOffset = this.selectedIndex - availableRows + 1;
    }

    this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, Math.max(0, this.processes.length - availableRows)));
  }

  public update(snapshot: SystemSnapshotModel): void {
    this.processes = snapshot.processes;

    // Preserve previously selected process by PID if still present
    if (this.selectedPid !== undefined) {
      const idx = this.processes.findIndex((p) => p.pid === this.selectedPid);
      if (idx !== -1) {
        this.selectedIndex = idx;
      } else {
        this.selectedIndex = Math.min(this.selectedIndex, Math.max(0, this.processes.length - 1));
        this.selectedPid = this.processes[this.selectedIndex]?.pid;
      }
    } else if (this.processes.length > 0) {
      this.selectedIndex = Math.min(this.selectedIndex, this.processes.length - 1);
      this.selectedPid = this.processes[this.selectedIndex]?.pid;
    }

    this.adjustWindow();
    this.renderCurrentList();
  }

  private renderCurrentList(): void {
    const totalWidth = (this.container.width as number) || 80;
    const availableRows = this.getAvailableRows();

    // Update panel title with current sort & filter
    const sortArrow = this.currentSortAsc ? '▲' : '▼';
    const sortTag = `{inverse}${this.currentSortField.toUpperCase()} ${sortArrow}{/inverse}`;
    const filterTag = this.currentFilterQuery
      ? `{yellow-fg}filter: "${this.currentFilterQuery}"{/yellow-fg}`
      : '{grey-fg}filter: [press /]{/grey-fg}';

    this.container.setLabel(
      ` {bold}{cyan-fg}proc{/cyan-fg}{/bold} ${filterTag} ${sortTag} {grey-fg}reverse(r) sort(s) kill(t){/grey-fg} `
    );

    // Columns: Pid (6), Program (12), Command (flex), Threads (8), User (10), MemB (8), Cpu% (6)
    const pidWidth = 6;
    const progWidth = 12;
    const thrWidth = 8;
    const userWidth = 10;
    const memWidth = 8;
    const cpuWidth = 6;
    const fixedCols = pidWidth + progWidth + thrWidth + userWidth + memWidth + cpuWidth + 6;
    const cmdWidth = Math.max(10, totalWidth - fixedCols);

    const header = `${UIFormatters.pad('Pid:', pidWidth)} ${UIFormatters.pad('Program:', progWidth)} ${UIFormatters.pad('Command:', cmdWidth)} ${UIFormatters.pad('Threads:', thrWidth)} ${UIFormatters.pad('User:', userWidth)} ${UIFormatters.pad('MemB', memWidth, 'right')} ${UIFormatters.pad('Cpu%', cpuWidth, 'right')}`;
    this.headerBox.setContent(header);

    if (this.processes.length === 0) {
      this.tableBox.setContent('{yellow-fg}No matching processes found.{/yellow-fg}');
      this.footerBox.setContent(' {inverse}select{/inverse}  {grey-fg}0/0{/grey-fg}');
      return;
    }

    const visibleProcesses = this.processes.slice(this.scrollOffset, this.scrollOffset + availableRows);

    const rows = visibleProcesses.map((proc, offset) => {
      const actualIndex = this.scrollOffset + offset;
      const isSelected = actualIndex === this.selectedIndex;

      const pidStr = UIFormatters.pad(proc.pid, pidWidth);
      const nameStr = UIFormatters.pad(proc.name, progWidth);
      const cmdStr = UIFormatters.pad(proc.command, cmdWidth);
      const thrStr = UIFormatters.pad(proc.threads || 1, thrWidth);
      const userStr = UIFormatters.pad(proc.user || 'SYSTEM', userWidth);
      const memStr = UIFormatters.pad(UIFormatters.formatBytes(proc.memoryBytes, 0).replace(' ', ''), memWidth, 'right');
      const cpuStr = UIFormatters.pad(proc.cpuPercent.toFixed(1), cpuWidth, 'right');

      const rowText = `${pidStr} ${nameStr} ${cmdStr} ${thrStr} ${userStr} ${memStr} ${cpuStr}`;

      if (isSelected) {
        return `{cyan-bg}{black-fg}{bold}${rowText}{/bold}{/black-fg}{/cyan-bg}`;
      }
      return rowText;
    });

    this.tableBox.setContent(rows.join('\n'));

    // Footer with cursor index e.g. "8/306"
    const totalCount = this.processes.length;
    const posStr = `${this.selectedIndex + 1}/${totalCount}`;
    this.footerBox.setContent(
      ` {inverse}select (Enter){/inverse}  {yellow-fg}filter (/){/yellow-fg}  {red-fg}terminate (t){/red-fg}                     {bold}${posStr}{/bold}`
    );
  }
}
