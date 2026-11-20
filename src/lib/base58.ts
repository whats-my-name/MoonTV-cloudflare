// 纯 TypeScript Base58 解码（Bitcoin 字母表），无外部依赖，兼容 Cloudflare Workers
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE = 58n;

export function base58Decode(input: string): Uint8Array {
  const value = input.trim();
  if (!value) return new Uint8Array();

  let num = 0n;
  for (const char of value) {
    const index = ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`无效的 Base58 字符: ${char}`);
    }
    num = num * BASE + BigInt(index);
  }

  let leadingZeros = 0;
  for (const char of value) {
    if (char === '1') leadingZeros++;
    else break;
  }

  if (num === 0n) {
    return new Uint8Array(leadingZeros);
  }

  let hex = num.toString(16);
  if (hex.length % 2) hex = `0${hex}`;
  const decoded: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    decoded.push(parseInt(hex.slice(i, i + 2), 16));
  }

  const result = new Uint8Array(leadingZeros + decoded.length);
  result.fill(0, 0, leadingZeros);
  result.set(decoded, leadingZeros);
  return result;
}

function looksLikeJson(text: string): boolean {
  const t = text.trimStart();
  return t.startsWith('{') || t.startsWith('[');
}

/**
 * 将 Base58 订阅内容解码为 JSON 文本。
 * 兼容三种订阅格式：
 *  1) Base58(JSON)           —— 官方格式
 *  2) Base58(Brotli(JSON))   —— 部分订阅站为缩短长度先压缩
 *  3) Base58(Gzip/Deflate(JSON))
 */
export async function decodeSubscription(input: string): Promise<string> {
  const bytes = base58Decode(input);
  if (bytes.length === 0) throw new Error('订阅内容为空');

  const decoder = new TextDecoder();

  // 1) 纯文本
  const plain = decoder.decode(bytes);
  if (looksLikeJson(plain)) return plain;

  // 2) 压缩内容：借助 node:zlib（Workers 已启用 nodejs_compat）
  let zlib: typeof import('node:zlib');
  try {
    zlib = await import('node:zlib');
  } catch {
    throw new Error('订阅内容既不是 JSON 文本，当前环境也不支持解压');
  }

  const buffer = Buffer.from(bytes);
  const attempts: [string, () => Buffer][] = [
    ['brotli', () => zlib.brotliDecompressSync(buffer)],
    ['gzip', () => zlib.gunzipSync(buffer)],
    ['deflate', () => zlib.inflateSync(buffer)],
  ];

  for (const [name, decompress] of attempts) {
    try {
      const out = decompress();
      const text = out.toString('utf8');
      if (looksLikeJson(text)) return text;
    } catch {
      // 尝试下一种压缩格式
    }
  }

  throw new Error(
    '订阅内容解码失败：既不是 JSON 文本，brotli/gzip/deflate 解压也未得到有效 JSON'
  );
}
