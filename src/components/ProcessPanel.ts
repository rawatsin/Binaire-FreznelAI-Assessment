import blessed from 'neo-blessed';
import { BasePanel, PanelBounds } from './BasePanel';
import { SystemSnapshotModel } from '../models/SystemSnapshotModel';
import { UIFormatters } from '../utils/formatters';

export class ProcessPanel extends BasePanel {
  private headerBox: blessed.Widgets.BoxElement;
  private tableBox: blessed.Widgets.BoxElement;
  private footerBox: blessed.Widgets.BoxElement;

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
      scrollable: true,
      alwaysScroll: true,
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

  public update(snapshot: SystemSnapshotModel): void {
    const totalWidth = (this.container.width as number) || 80;
    const availableRows = Math.max(5, ((this.container.height as number) || 20) - 4);

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

    const processes = snapshot.processes.slice(0, availableRows);
    const rows = processes.map((proc, index) => {
      const pidStr = UIFormatters.pad(proc.pid, pidWidth);
      const nameStr = UIFormatters.pad(proc.name, progWidth);
      const cmdStr = UIFormatters.pad(proc.command, cmdWidth);
      const thrStr = UIFormatters.pad(proc.threads || 1, thrWidth);
      const userStr = UIFormatters.pad(proc.user || 'SYSTEM', userWidth);
      const memStr = UIFormatters.pad(UIFormatters.formatBytes(proc.memoryBytes, 0).replace(' ', ''), memWidth, 'right');
      const cpuStr = UIFormatters.pad(proc.cpuPercent.toFixed(1), cpuWidth, 'right');

      const isFirst = index === 0;
      const rowText = `${pidStr} ${nameStr} ${cmdStr} ${thrStr} ${userStr} ${memStr} ${cpuStr}`;

      if (isFirst) {
        return `{inverse}${rowText}{/inverse}`;
      }
      return rowText;
    });

    this.tableBox.setContent(rows.join('\n'));

    // Footer
    const totalCount = snapshot.processes.length;
    const shownCount = processes.length;
    this.footerBox.setContent(
      ` {inverse}select{/inverse}  {grey-fg}auto{/grey-fg}  {red-fg}terminate{/red-fg}                     {bold}${shownCount}/${totalCount}{/bold}`
    );
  }
}
