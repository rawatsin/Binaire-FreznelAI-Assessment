import blessed from 'neo-blessed';
import { BasePanel, PanelBounds } from './BasePanel';
import { SystemSnapshotModel } from '../models/SystemSnapshotModel';
import { UIFormatters } from '../utils/formatters';

export class DiskPanel extends BasePanel {
  private contentBox: blessed.Widgets.BoxElement;

  constructor(screen: blessed.Widgets.Screen, bounds: PanelBounds) {
    super(screen, bounds, '{bold}{blue-fg}disks{/blue-fg}{/bold}');

    this.contentBox = blessed.box({
      parent: this.container,
      top: 0,
      left: 0,
      width: '100%-2',
      height: '100%-2',
      tags: true,
    });
  }

  public update(snapshot: SystemSnapshotModel): void {
    const disks = snapshot.disks;
    if (disks.length === 0) {
      this.contentBox.setContent('{grey-fg}No mounted disks detected{/grey-fg}');
      return;
    }

    const lines: string[] = [];
    const barWidth = 10;

    // Show up to 2 primary disks
    for (const disk of disks.slice(0, 2)) {
      const totalStr = UIFormatters.formatBytes(disk.totalBytes);
      const freeStr = UIFormatters.formatBytes(disk.freeBytes);
      const usedStr = UIFormatters.formatBytes(disk.usedBytes);
      const freePercent = 100 - disk.usedPercent;

      const rwRate = disk.readBytesPerSec + disk.writeBytesPerSec;
      const ioStr = rwRate > 0 ? `▼▲ ${UIFormatters.formatBytes(rwRate)}/s` : '▼▲ 0 B/s';

      const bar = UIFormatters.renderBar(disk.usedPercent, barWidth);

      lines.push(
        `{bold}${disk.mount}{/bold}  {grey-fg}${ioStr}{/grey-fg}  {bold}${totalStr}{/bold}  ${bar}`,
        `Free: ${UIFormatters.pad(freePercent + '%', 4)}  ${freeStr}`,
        `Used: ${UIFormatters.pad(disk.usedPercent + '%', 4)}  ${usedStr}`,
        ''
      );
    }

    this.contentBox.setContent(lines.join('\n'));
  }
}
