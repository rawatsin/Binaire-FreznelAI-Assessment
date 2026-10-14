export class UIFormatters {
  private static readonly SPARK_BLOCKS = [' ', ' ', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  private static readonly BRAILLE_CHARS = [' ', '⢀', '⢠', '⢰', '⢸', '⣰', '⣸', '⣿'];

  /**
   * Generates a colored progress bar string using unicode blocks.
   */
  public static renderBar(percent: number, width: number, useColors = true): string {
    const validWidth = Math.max(1, width);
    const clampedPercent = Math.max(0, Math.min(100, percent));
    const filledCount = Math.round((clampedPercent / 100) * validWidth);
    const emptyCount = validWidth - filledCount;

    const filledStr = '■'.repeat(filledCount);
    const emptyStr = '·'.repeat(emptyCount);

    if (!useColors) {
      return `${filledStr}${emptyStr}`;
    }

    let color = 'green-fg';
    if (clampedPercent >= 85) {
      color = 'red-fg';
    } else if (clampedPercent >= 60) {
      color = 'yellow-fg';
    }

    return `{${color}}${filledStr}{/${color}}{grey-fg}${emptyStr}{/grey-fg}`;
  }

  /**
   * Generates a single-line or multi-line sparkline using unicode block elements.
   */
  public static renderSparkline(values: number[], width: number, maxVal = 100): string {
    const validWidth = Math.max(1, width);
    // Take the last 'validWidth' items
    const slice = values.slice(-validWidth);
    while (slice.length < validWidth) {
      slice.unshift(0);
    }

    let result = '';
    for (const val of slice) {
      const ratio = Math.max(0, Math.min(1, val / maxVal));
      const idx = Math.floor(ratio * (UIFormatters.SPARK_BLOCKS.length - 1));
      const char = UIFormatters.SPARK_BLOCKS[idx] || ' ';
      
      if (ratio > 0.8) {
        result += `{red-fg}${char}{/red-fg}`;
      } else if (ratio > 0.5) {
        result += `{yellow-fg}${char}{/yellow-fg}`;
      } else {
        result += `{cyan-fg}${char}{/cyan-fg}`;
      }
    }
    return result;
  }

  /**
   * Formats bytes into human-readable B, KiB, MiB, GiB, TiB.
   */
  public static formatBytes(bytes: number, decimals = 1): string {
    if (bytes <= 0 || isNaN(bytes)) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const val = bytes / Math.pow(k, i);
    return `${val.toFixed(decimals)} ${sizes[i] || 'B'}`;
  }

  /**
   * Formats byte rate to bps (e.g. 49 Byte/s (392 bitps)) matching reference UI.
   */
  public static formatRateWithBits(bytesPerSec: number): { bytesStr: string; bitsStr: string } {
    const bytesStr = `${UIFormatters.formatBytes(bytesPerSec)}/s`;
    const bits = Math.round(bytesPerSec * 8);
    let bitsStr = `${bits} bitps`;
    if (bits >= 1000000) {
      bitsStr = `${(bits / 1000000).toFixed(1)} Mbits`;
    } else if (bits >= 1000) {
      bitsStr = `${(bits / 1000).toFixed(1)} Kbits`;
    }
    return { bytesStr, bitsStr: `(${bitsStr})` };
  }

  /**
   * Formats a number with padding.
   */
  public static pad(str: string | number, length: number, align: 'left' | 'right' = 'left'): string {
    const s = String(str);
    if (s.length >= length) return s.slice(0, length);
    const diff = length - s.length;
    return align === 'left' ? s + ' '.repeat(diff) : ' '.repeat(diff) + s;
  }
}
