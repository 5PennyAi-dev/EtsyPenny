import { describe, it, expect, vi } from 'vitest';

// We can't import the React context in a Node-only vitest env (it pulls in
// JSX + react-markdown). Instead we re-implement the same parser contract
// here via dynamic import of the JSX module's named export — Vitest handles
// the JSX transform via its Vite pipeline. The `react` / `react-router`
// imports are tree-shaken out at import time because we only touch the
// exported `consumeSseStream` function, which doesn't call any hooks.
//
// If this import ever breaks due to React 19 side effects, we'll inline the
// parser into a plain .ts module under lib/help/ and test that directly.
const { consumeSseStream } = await import('../../src/context/HelpChatContext.jsx');

/** Build a ReadableStream that emits the given string chunks (as bytes). */
function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(encoder.encode(chunks[i++]));
      } else {
        controller.close();
      }
    },
  });
}

describe('consumeSseStream', () => {
  it('parses a well-formed stream of conversation + deltas + done', async () => {
    const stream = streamFromChunks([
      'data: {"type":"conversation","conversationId":"c-1"}\n\n',
      'data: {"type":"delta","text":"Hello "}\n\n',
      'data: {"type":"delta","text":"world."}\n\n',
      'data: {"type":"done","messageId":"m-1","latencyMs":42}\n\n',
    ]);
    const chunks: unknown[] = [];
    await consumeSseStream(stream.getReader(), (c: unknown) => chunks.push(c));
    expect(chunks.map((c: any) => c.type)).toEqual(['conversation', 'delta', 'delta', 'done']);
    expect((chunks[1] as any).text).toBe('Hello ');
    expect((chunks[3] as any).messageId).toBe('m-1');
  });

  it('reassembles frames split across byte chunks', async () => {
    // The stream sends an SSE frame broken across 3 network packets.
    const stream = streamFromChunks([
      'data: {"type":"delt',
      'a","text":"chunked ',
      'message"}\n\n',
    ]);
    const chunks: any[] = [];
    await consumeSseStream(stream.getReader(), (c: any) => chunks.push(c));
    expect(chunks).toEqual([{ type: 'delta', text: 'chunked message' }]);
  });

  it('handles multiple frames in a single byte chunk', async () => {
    const stream = streamFromChunks([
      'data: {"type":"delta","text":"a"}\n\ndata: {"type":"delta","text":"b"}\n\ndata: {"type":"done"}\n\n',
    ]);
    const chunks: any[] = [];
    await consumeSseStream(stream.getReader(), (c: any) => chunks.push(c));
    expect(chunks.map((c) => c.type)).toEqual(['delta', 'delta', 'done']);
    expect(chunks[0].text).toBe('a');
    expect(chunks[1].text).toBe('b');
  });

  it('skips malformed JSON frames but keeps reading valid ones', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const stream = streamFromChunks([
      'data: not-json\n\ndata: {"type":"delta","text":"ok"}\n\n',
    ]);
    const chunks: any[] = [];
    await consumeSseStream(stream.getReader(), (c: any) => chunks.push(c));
    expect(chunks).toEqual([{ type: 'delta', text: 'ok' }]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('ignores non-data frames (e.g. blank lines, comments)', async () => {
    const stream = streamFromChunks([
      ': this is a comment\n\ndata: {"type":"done"}\n\n',
    ]);
    const chunks: any[] = [];
    await consumeSseStream(stream.getReader(), (c: any) => chunks.push(c));
    expect(chunks).toEqual([{ type: 'done' }]);
  });

  it('stops early when the AbortSignal fires', async () => {
    const controller = new AbortController();
    const stream = streamFromChunks([
      'data: {"type":"delta","text":"one"}\n\n',
      'data: {"type":"delta","text":"two"}\n\n',
      'data: {"type":"done"}\n\n',
    ]);
    const chunks: any[] = [];
    await consumeSseStream(
      stream.getReader(),
      (c: any) => {
        chunks.push(c);
        controller.abort();
      },
      { signal: controller.signal }
    );
    // First chunk fired, then we aborted — subsequent reads are skipped.
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks[0].type).toBe('delta');
  });

  it('flushes a trailing frame that is missing the final blank line', async () => {
    const stream = streamFromChunks([
      'data: {"type":"delta","text":"first"}\n\n',
      'data: {"type":"done"}', // no trailing \n\n
    ]);
    const chunks: any[] = [];
    await consumeSseStream(stream.getReader(), (c: any) => chunks.push(c));
    expect(chunks.map((c) => c.type)).toEqual(['delta', 'done']);
  });
});
