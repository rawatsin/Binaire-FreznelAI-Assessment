import blessed from 'neo-blessed';
import { BasePanel, PanelBounds } from './BasePanel';
import { SystemSnapshotModel } from '../models/SystemSnapshotModel';
import { UIFormatters } from '../utils/formatters';

export class MemoryPanel extends BasePanel {
  private contentBox: blessed.Widgets.BoxElement;

  constructor(screen: blessed.Widgets.Screen, bounds: PanelBounds) {
    super(screen, bounds, '{bold}{magenta-fg}mem{/magenta-fg}{/bold}');

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
    const mem = snapshot.memory;
    const totalStr = UIFormatters.formatBytes(mem.totalBytes);
    const usedStr = UIFormatters.formatBytes(mem.usedBytes);
    const availStr = UIFormatters.formatBytes(mem.availableBytes);
    const cacheStr = UIFormatters.formatBytes(mem.cachedBytes);
    const commtStr = UIFormatters.formatBytes(mem.committedBytes);

    const usedPercent = Math.round((mem.usedBytes / Math.max(1, mem.totalBytes)) * 100);
    const barWidth = 14;
    const memBar = UIFormatters.renderBar(usedPercent, barWidth);

    const gpuSharedTotal = mem.gpuSharedUsedBytes ? UIFormatters.formatBytes(mem.totalBytes / 2) : 'N/A';
    const gpuSharedUsed = mem.gpuSharedUsedBytes ? UIFormatters.formatBytes(mem.gpuSharedUsedBytes) : 'N/A';

    const lines = [
      `{bold}Total:{/bold}      ${UIFormatters.pad(totalStr, 9)}  ${memBar} {bold}${usedPercent}%{/bold}`,
      `{bold}Used{/bold}        ${UIFormatters.pad(usedStr, 9)}`,
      `{bold}Avail{/bold}       ${UIFormatters.pad(availStr, 9)}`,
      `{bold}Cache{/bold}       ${UIFormatters.pad(cacheStr, 9)}`,
      `{bold}Commt{/bold}       ${UIFormatters.pad(commtStr, 9)}`,
      '',
      `{bold}GPU Shared:{/bold} ${UIFormatters.pad(gpuSharedTotal, 9)}`,
      `{bold}Used{/bold}        ${UIFormatters.pad(gpuSharedUsed, 9)}`,
    ];

    this.contentBox.setContent(lines.join('\n'));
  }
}
