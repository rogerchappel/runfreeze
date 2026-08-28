import { Buffer } from "node:buffer";
import type { StreamCapture } from "./types.js";

function completeUtf8Prefix(buffer: Buffer): Buffer {
  let leadIndex = buffer.length - 1;
  while (leadIndex >= 0 && (buffer[leadIndex]! & 0xc0) === 0x80) leadIndex -= 1;
  if (leadIndex < 0) return buffer.subarray(0, 0);

  const lead = buffer[leadIndex]!;
  const expectedBytes =
    (lead & 0x80) === 0 ? 1 :
    (lead & 0xe0) === 0xc0 ? 2 :
    (lead & 0xf0) === 0xe0 ? 3 :
    (lead & 0xf8) === 0xf0 ? 4 : 1;
  return buffer.length - leadIndex < expectedBytes ? buffer.subarray(0, leadIndex) : buffer;
}

export class ByteCapture {
  private chunks: Buffer[] = [];
  private usedBytes = 0;
  private wasTruncated = false;

  constructor(private readonly maxBytes: number) {}

  append(chunk: Buffer | string): void {
    if (this.wasTruncated || this.usedBytes >= this.maxBytes) {
      this.wasTruncated = true;
      return;
    }
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    const remaining = this.maxBytes - this.usedBytes;
    if (buffer.byteLength > remaining) {
      const bounded = Buffer.concat([...this.chunks, buffer.subarray(0, remaining)]);
      const complete = completeUtf8Prefix(bounded);
      this.chunks = [complete];
      this.usedBytes = complete.byteLength;
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
