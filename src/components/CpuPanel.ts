import blessed from 'neo-blessed';
import { BasePanel, PanelBounds } from './BasePanel';
import { SystemSnapshotModel } from '../models/SystemSnapshotModel';
import { UIFormatters } from '../utils/formatters';

export class CpuPanel extends BasePanel {
  private cpuHistory: number[] = [];
  private graphBox: blessed.Widgets.BoxElement;
  private statsBox: blessed.Widgets.BoxElement;

  constructor(screen: blessed.Widgets.Screen, bounds: PanelBounds) {
    super(screen, bounds, '{bold}{cyan-fg}cpu{/cyan-fg}{/bold}  {grey-fg}menu{/grey-fg}  {grey-fg}preset *{/grey-fg}');

    this.graphBox = blessed.box({
      parent: this.container,
      top: 0,
      left: 0,
      width: '58%',
      height: '100%-2',
      tags: true,
    });

    this.statsBox = blessed.box({
      parent: this.container,
      top: 0,
      right: 0,
      width: '40%',
      height: '100%-2',
      tags: true,
    });
  }

  public update(snapshot: SystemSnapshotModel): void {
    const { cpu, battery, gpu } = snapshot;

    // Record history for sparkline
    this.cpuHistory.push(cpu.currentLoad);
    if (this.cpuHistory.length > 120) {
      this.cpuHistory.shift();
    }

    // Top status line with clock, battery, update rate, frequency, CPU name
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const batStr = battery.hasBattery ? `BAT ${battery.percent}%` : 'AC PWR';
    const freqStr = cpu.speedGhz > 0 ? `${cpu.speedGhz.toFixed(1)} GHz` : '';
    const brandShort = cpu.brand.replace(/\(R\)|™|\(TM\)/gi, '').trim().slice(0, 18);

    // Update panel label
    this.container.setLabel(
      ` {bold}{cyan-fg}cpu{/cyan-fg}{/bold}  {grey-fg}menu preset *{/grey-fg}        {bold}${timeStr}{/bold}        {yellow-fg}${batStr}{/yellow-fg}  1500ms  {cyan-fg}${freqStr}{/cyan-fg}  ${brandShort} `
    );

    // Left Section: Graph & Uptime
    const graphWidth = Math.max(10, Math.floor((this.container.width as number) * 0.55) - 4);
    const sparkline = UIFormatters.renderSparkline(this.cpuHistory, graphWidth, 100);
    const uptimeStr = snapshot.getFormattedUptime();

    const graphLines = [
      `{bold}{cyan-fg}cpu ▲ gpu{/cyan-fg}{/bold}`,
      '',
      sparkline,
      sparkline,
      '',
      `{grey-fg}up ${uptimeStr}{/grey-fg}`,
    ];
    this.graphBox.setContent(graphLines.join('\n'));

    // Right Section: Core loads & temperatures, Load AVG, GPU
    const barWidth = 10;
    const cpuBar = UIFormatters.renderBar(cpu.currentLoad, barWidth);
    const overallCpuLine = `{bold}CPU{/bold}  ${cpuBar} {bold}${UIFormatters.pad(cpu.currentLoad + '%', 4, 'right')}{/bold}`;

    // Display cores (show first 4 or 8 depending on height)
    const availableRows = Math.max(3, (this.container.height as number) - 6);
    const coresToShow = cpu.coresLoad.slice(0, Math.min(cpu.coresLoad.length, availableRows));

    const coreLines = coresToShow.map((c) => {
      const coreBar = UIFormatters.renderBar(c.load, barWidth);
      const tempStr = c.temp !== undefined ? `${c.temp}°C` : '{grey-fg}N/A{/grey-fg}';
      return `C${c.coreId}   ${coreBar} ${UIFormatters.pad(c.load + '%', 4, 'right')}  ${tempStr}`;
    });

    const loadAvgStr = cpu.loadAvg.map((l) => l.toFixed(2)).join(' ');
    const loadLine = `{bold}Load AVG:{/bold}  ${loadAvgStr}`;

    const gpuUsage = gpu ? gpu.usagePercent : 0;
    const gpuBar = UIFormatters.renderBar(gpuUsage, barWidth);
    const gpuName = gpu ? gpu.model.slice(0, 18) : 'Integrated GPU';
    const gpuLine = `{bold}GPU{/bold}  ${gpuBar} {bold}${gpuUsage}%{/bold}\n{grey-fg}${gpuName}{/grey-fg}`;

    const statsContent = [
      overallCpuLine,
      ...coreLines,
      loadLine,
      gpuLine,
    ].join('\n');

    this.statsBox.setContent(statsContent);
  }
}
