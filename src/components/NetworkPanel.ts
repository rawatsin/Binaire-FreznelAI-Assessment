import blessed from 'neo-blessed';
import { BasePanel, PanelBounds } from './BasePanel';
import { SystemSnapshotModel } from '../models/SystemSnapshotModel';
import { UIFormatters } from '../utils/formatters';

export class NetworkPanel extends BasePanel {
  private rxHistory: number[] = [];
  private contentBox: blessed.Widgets.BoxElement;

  constructor(screen: blessed.Widgets.Screen, bounds: PanelBounds) {
    super(screen, bounds, '{bold}{blue-fg}net{/blue-fg}{/bold}');

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
    const net = snapshot.network;

    // Track throughput for sparkline
    this.rxHistory.push(net.rxBytesPerSec + net.txBytesPerSec);
    if (this.rxHistory.length > 50) {
      this.rxHistory.shift();
    }

    const maxRx = Math.max(1024, ...this.rxHistory);
    const graphWidth = Math.max(10, Math.floor((this.container.width as number) * 0.45));
    const sparkline = UIFormatters.renderSparkline(this.rxHistory, graphWidth, maxRx);

    // Rates and totals
    const rxFormatted = UIFormatters.formatRateWithBits(net.rxBytesPerSec);
    const txFormatted = UIFormatters.formatRateWithBits(net.txBytesPerSec);
    const totalRxStr = UIFormatters.formatBytes(net.totalRxBytes);
    const totalTxStr = UIFormatters.formatBytes(net.totalTxBytes);

    this.container.setLabel(
      ` {bold}{blue-fg}net{/blue-fg}{/bold} {bold}${net.ipAddress}{/bold}   {grey-fg}sync auto zero b{/grey-fg} {green-fg}${net.interfaceName}{/green-fg} `
    );

    const lines = [
      `{cyan-fg}${sparkline}{/cyan-fg}`,
      '',
      `{green-fg}▼{/green-fg} ${UIFormatters.pad(rxFormatted.bytesStr, 12)} {grey-fg}${rxFormatted.bitsStr}{/grey-fg}`,
      `{green-fg}▼ Total:{/green-fg}    ${totalRxStr}`,
      '',
      `{yellow-fg}▲{/yellow-fg} ${UIFormatters.pad(txFormatted.bytesStr, 12)} {grey-fg}${txFormatted.bitsStr}{/grey-fg}`,
      `{yellow-fg}▲ Total:{/yellow-fg}    ${totalTxStr}`,
    ];

    this.contentBox.setContent(lines.join('\n'));
  }
}
