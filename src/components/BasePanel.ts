import blessed from 'neo-blessed';
import { SystemSnapshotModel } from '../models/SystemSnapshotModel';

export interface PanelBounds {
  top: number | string;
  left: number | string;
  width: number | string;
  height: number | string;
}

export abstract class BasePanel {
  protected container: blessed.Widgets.BoxElement;
  protected screen: blessed.Widgets.Screen;
  protected focused = false;

  constructor(screen: blessed.Widgets.Screen, bounds: PanelBounds, title: string) {
    this.screen = screen;
    this.container = blessed.box({
      parent: screen,
      top: bounds.top,
      left: bounds.left,
      width: bounds.width,
      height: bounds.height,
      tags: true,
      border: {
        type: 'line',
      },
      style: {
        border: {
          fg: '#1e3d59',
        },
      },
      label: ` ${title} `,
    });
  }

  public getContainer(): blessed.Widgets.BoxElement {
    return this.container;
  }

  public setBounds(bounds: PanelBounds): void {
    this.container.top = bounds.top;
    this.container.left = bounds.left;
    this.container.width = bounds.width;
    this.container.height = bounds.height;
  }

  public setBorderColor(color: string): void {
    if (this.container.style.border) {
      this.container.style.border.fg = color;
    }
  }

  public setFocused(isFocused: boolean): void {
    this.focused = isFocused;
    this.setBorderColor(isFocused ? 'cyan' : '#1e3d59');
  }

  public isFocused(): boolean {
    return this.focused;
  }

  public abstract update(snapshot: SystemSnapshotModel): void;

  public destroy(): void {
    this.container.destroy();
  }
}
