import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ByteCapture } from "../src/capture.js";

describe("ByteCapture", () => {
  it("returns empty capture when nothing is appended", () => {
    const cap = new ByteCapture(1024);
    const json = cap.toJSON();
    assert.equal(json.text, "");
    assert.equal(json.bytes, 0);
    assert.equal(json.truncated, false);
  });

  it("stores exact bytes when within limit", () => {
    const cap = new ByteCapture(100);
    cap.append("hello world"); // 11 bytes
    const json = cap.toJSON();
    assert.equal(json.text, "hello world");
    assert.equal(json.bytes, 11);
    assert.equal(json.truncated, false);
  });

  it("truncates to maxBytes on overflow and discards further data", () => {
    const cap = new ByteCapture(5);

    cap.append("abcde"); // 5 bytes – fills exactly
    let json = cap.toJSON();
    assert.equal(json.text, "abcde");
    assert.equal(json.bytes, 5);
    assert.equal(json.truncated, false); // not truncated yet – fills exactly

    // Now append more – should be discarded because wasTruncated is set
    cap.append("extra data that goes nowhere");
    json = cap.toJSON();
    assert.equal(json.text, "abcde");
    assert.equal(json.bytes, 5);
    assert.equal(json.truncated, true);
  });

  it("partial-append truncates mid-chunk correctly", () => {
    const cap = new ByteCapture(5);

    cap.append("hello"); // 5 bytes – fills exactly
    cap.append("world"); // exceeds – sets truncation and discards

    const json = cap.toJSON();
    assert.equal(json.text, "hello");
    assert.equal(json.bytes, 5);
    assert.equal(json.truncated, true);
  });

  it("handles multiple small appends up to boundary then stops", () => {
    const cap = new ByteCapture(10);

    cap.append("one"); // 3 bytes -> 3
    cap.append("two"); // 3 bytes -> 6
    // Remaining: 4 bytes. "three" = 5 bytes. Store first 4 bytes -> "thre"
    cap.append("three");

    const json = cap.toJSON();
    assert.equal(json.text, "onetwothre"); // "one" + "two" + "thre"
    assert.equal(json.bytes, 10);
    assert.equal(json.truncated, true);
  });

  it("handles Buffer input correctly with byte accounting", () => {
    const cap = new ByteCapture(7);
    cap.append(Buffer.from("ab")); // 2 bytes
    cap.append(Buffer.from("cdefgh")); // 6 bytes -> fits 5 into 5 remaining
    cap.append(Buffer.from("ijkl")); // all discarded (wasTruncated now true)

    const json = cap.toJSON();
    assert.equal(json.text, "abcdefg"); // "ab" + "cdefg"
    assert.equal(json.bytes, 7);
    assert.equal(json.truncated, true);
  });

  it("resets truncation flag per-instance; appending past limit sets wasTruncated once", () => {
    const cap = new ByteCapture(3);

    cap.append("a"); // 1 byte
    let j = cap.toJSON();
    assert.equal(j.truncated, false);

    cap.append("bcd"); // 3 bytes, fills to 4 which exceeds. Store 2 more -> "abc"
    j = cap.toJSON();
    assert.equal(j.text, "abc");
    assert.equal(j.bytes, 3);
    assert.equal(j.truncated, true);

    cap.append("x"); // still at 3 already, discarded
    j = cap.toJSON();
    assert.equal(j.text, "abc");
    assert.equal(j.truncated, true);
  });

  it("truncates at UTF-8 character boundaries on multi-byte chars", () => {
    // "é" is 2 bytes in UTF-8 (0xC3 0xA9). If we truncate after 1 byte of "é",
    // completeUtf8Prefix drops the incomplete lead byte.
    const cap = new ByteCapture(4);

    // "abc" = 3 bytes, "é" = 2 bytes -> total would be 5, but limit is 4
    // So we get "ab" + first 1 byte of "é" -> then completeUtf8Prefix strips
    // the incomplete lead byte -> result is "abc" (not "ab")
    cap.append("abcé");
    const json = cap.toJSON();

    assert.equal(json.bytes, 3);
    assert.equal(json.text, "abc"); // incomplete UTF-8 lead byte dropped
    assert.equal(json.truncated, true);
  });

  it("preserves complete UTF-8 sequences when they fit within limit", () => {
    const cap = new ByteCapture(5);

    // "café" -> "caf" (3 bytes) + "é" (2 bytes) = 5 bytes exactly
    cap.append("café");
    const json = cap.toJSON();

    assert.equal(json.text, "café");
    assert.equal(json.bytes, 5);
    assert.equal(json.truncated, false);
  });
});
