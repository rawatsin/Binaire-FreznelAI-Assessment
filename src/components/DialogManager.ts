import blessed from 'neo-blessed';
import { ProcessItem } from '../types/metrics';
import { UIFormatters } from '../utils/formatters';

export class DialogManager {
  private screen: blessed.Widgets.Screen;
  private activeModal: blessed.Widgets.BoxElement | null = null;
  private inputBuffer = '';

  constructor(screen: blessed.Widgets.Screen) {
    this.screen = screen;
  }

  public isOpen(): boolean {
    return this.activeModal !== null;
  }

  public close(): void {
    if (this.activeModal) {
      this.activeModal.destroy();
      this.activeModal = null;
      this.screen.render();
    }
  }

  public showFilterDialog(currentFilter: string, onCommit: (filter: string) => void): void {
    this.close();
    this.inputBuffer = currentFilter;

    const modal = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 50,
      height: 7,
      tags: true,
      border: {
        type: 'line',
      },
      style: {
        border: {
          fg: 'yellow',
        },
      },
      label: ' {bold}{yellow-fg}Filter Processes{/yellow-fg}{/bold} ',
    });

    const updateContent = (): void => {
      modal.setContent(
        `\n Type filter query:\n {bold}${this.inputBuffer}{/bold}█\n\n {grey-fg}[Enter] Apply   [Esc] Cancel / Clear{/grey-fg}`
      );
      this.screen.render();
    };

    updateContent();

    const keyListener = (ch: string, key: blessed.Widgets.Events.IKeyEventArg): void => {
      if (key.name === 'return' || key.name === 'enter') {
        this.screen.removeListener('keypress', keyListener);
        this.close();
        onCommit(this.inputBuffer);
      } else if (key.name === 'escape') {
        this.screen.removeListener('keypress', keyListener);
        this.close();
        onCommit('');
      } else if (key.name === 'backspace') {
        this.inputBuffer = this.inputBuffer.slice(0, -1);
        updateContent();
      } else if (ch && ch.length === 1 && !key.ctrl && !key.meta) {
        this.inputBuffer += ch;
        updateContent();
      }
    };

    this.screen.on('keypress', keyListener);
    this.activeModal = modal;
    this.screen.render();
  }

  public showConfirmTerminate(
    proc: ProcessItem,
    onConfirm: () => void,
    onCancel?: () => void
  ): void {
    this.close();

    const modal = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 56,
      height: 9,
      tags: true,
      border: {
        type: 'line',
      },
      style: {
        border: {
          fg: 'red',
        },
      },
      label: ' {bold}{red-fg}Terminate Process{/red-fg}{/bold} ',
    });

    modal.setContent(
      `\n{center}Are you sure you want to terminate this process?\n\n` +
      `{bold}${proc.name}{/bold} (PID: {cyan-fg}${proc.pid}{/cyan-fg})\n\n` +
      `{bold}[y / Enter]{/bold} Confirm   {bold}[n / Esc]{/bold} Cancel{/center}`
    );

    const keyListener = (ch: string, key: blessed.Widgets.Events.IKeyEventArg): void => {
      if (key.name === 'return' || key.name === 'enter' || ch === 'y' || ch === 'Y') {
        this.screen.removeListener('keypress', keyListener);
        this.close();
        onConfirm();
      } else if (key.name === 'escape' || ch === 'n' || ch === 'N') {
        this.screen.removeListener('keypress', keyListener);
        this.close();
        if (onCancel) onCancel();
      }
    };

    this.screen.on('keypress', keyListener);
    this.activeModal = modal;
    this.screen.render();
  }

  public showAlert(title: string, message: string, isError = false): void {
    this.close();

    const modal = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 56,
      height: 9,
      tags: true,
      border: {
        type: 'line',
      },
      style: {
        border: {
          fg: isError ? 'red' : 'green',
        },
      },
      label: ` {bold}${isError ? '{red-fg}' : '{green-fg}'}${title}{/bold} `,
    });

    modal.setContent(`\n{center}${message}\n\n{grey-fg}[Press Enter or Esc to dismiss]{/grey-fg}{/center}`);

    const keyListener = (ch: string, key: blessed.Widgets.Events.IKeyEventArg): void => {
      if (key.name === 'return' || key.name === 'enter' || key.name === 'escape') {
        this.screen.removeListener('keypress', keyListener);
        this.close();
      }
    };

    this.screen.on('keypress', keyListener);
    this.activeModal = modal;
    this.screen.render();
  }

  public showProcessDetails(proc: ProcessItem): void {
    this.close();

    const modal = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 60,
      height: 14,
      tags: true,
      border: {
        type: 'line',
      },
      style: {
        border: {
          fg: 'cyan',
        },
      },
      label: ` {bold}{cyan-fg}Process Details: ${proc.name} (PID: ${proc.pid}){/cyan-fg}{/bold} `,
    });

    const lines = [
      `{bold}PID:{/bold}         ${proc.pid}`,
      `{bold}Name:{/bold}        ${proc.name}`,
      `{bold}User:{/bold}        ${proc.user || 'SYSTEM'}`,
      `{bold}Threads:{/bold}     ${proc.threads || 1}`,
      `{bold}CPU Usage:{/bold}   ${proc.cpuPercent.toFixed(1)}%`,
      `{bold}Memory:{/bold}      ${UIFormatters.formatBytes(proc.memoryBytes)} (${proc.memoryPercent.toFixed(1)}%)`,
      `{bold}Priority:{/bold}    ${proc.priority}`,
      `{bold}Command:{/bold}     ${proc.command.slice(0, 42)}`,
      '',
      '{center}{grey-fg}[Press Enter or Esc to close]{/grey-fg}{/center}',
    ];

    modal.setContent(lines.join('\n'));

    const keyListener = (ch: string, key: blessed.Widgets.Events.IKeyEventArg): void => {
      if (key.name === 'return' || key.name === 'enter' || key.name === 'escape') {
        this.screen.removeListener('keypress', keyListener);
        this.close();
      }
    };

    this.screen.on('keypress', keyListener);
    this.activeModal = modal;
    this.screen.render();
  }
}
