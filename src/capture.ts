import { Buffer } from "node:buffer";
import type { StreamCapture } from "./types.js";

export class ByteCapture {
  private chunks: Buffer[] = [];
  private usedBytes = 0;
  private wasTruncated = false;

  constructor(private readonly maxBytes: number) {}

  append(chunk: Buffer | string): void {
    if (this.usedBytes >= this.maxBytes) {
      this.wasTruncated = true;
      return;
    }
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    const remaining = this.maxBytes - this.usedBytes;
    if (buffer.byteLength > remaining) {
      this.chunks.push(buffer.subarray(0, remaining));
      this.usedBytes += remaining;
      this.wasTruncated = true;
      return;
    }
    this.chunks.push(buffer);
    this.usedBytes += buffer.byteLength;
  }

  toJSON(): StreamCapture {
    return {
      text: Buffer.concat(this.chunks).toString("utf8"),
      bytes: this.usedBytes,
      truncated: this.wasTruncated,
    };
  }
}
