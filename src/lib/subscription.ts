/* eslint-disable @typescript-eslint/no-explicit-any, no-console */

import { AdminConfig } from './admin.types';
import { decodeSubscription } from './base58';
import { getConfig } from './config';
import { getStorage } from './db';

// 订阅拉取的最小间隔（1 小时），避免 cron 频繁触发时重复请求
const MIN_CHECK_INTERVAL_MS = 60 * 60 * 1000;

export interface SubscriptionSource {
  key: string;
  name: string;
  api: string;
  detail?: string;
}

export interface FetchResult {
  success: boolean;
  message: string;
  sources?: SubscriptionSource[];
  configContent?: string;
  skipped?: boolean;
}

/** 从订阅 URL 拉取 Base58 编码的 JSON 配置并解析出视频源 */
export async function fetchSubscription(url: string): Promise<{
  sources: SubscriptionSource[];
  configContent: string;
  cacheTime?: number;
  customCategories?: any[];
}> {
  if (!url) {
    throw new Error('订阅 URL 为空');
  }

  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    },
  });
  if (!response.ok) {
    throw new Error(`请求失败: ${response.status} ${response.statusText}`);
  }

  const raw = (await response.text()).trim();
  const configContent = await decodeSubscription(raw);
  const parsed = JSON.parse(configContent);

  // 兼容常见订阅结构：api_site 字典 或 直接 source 数组
  let entries: [string, any][] = [];
  if (parsed.api_site && typeof parsed.api_site === 'object') {
    entries = Object.entries(parsed.api_site);
  } else if (Array.isArray(parsed.sources)) {
    entries = parsed.sources.map((s: any) => [s.key || s.name, s]);
  } else if (Array.isArray(parsed.SourceConfig)) {
    entries = parsed.SourceConfig.map((s: any) => [s.key || s.name, s]);
  }

  const sources: SubscriptionSource[] = entries
    .map(([mapKey, site]) => ({
      key: String(site?.key || mapKey),
      name: String(site?.name || mapKey),
      api: String(site?.api || ''),
      detail: site?.detail ? String(site.detail) : undefined,
    }))
    .filter((s) => s.key && s.api);

  if (sources.length === 0) {
    throw new Error('订阅内容中未找到有效的视频源（需包含 api_site 字段）');
  }

  return {
    sources,
    configContent,
    cacheTime: parsed.cache_time,
    customCategories: parsed.custom_category,
  };
}

/** 将订阅拉取到的源合并进管理员配置并持久化 */
export async function applySubscriptionSources(
  sources: SubscriptionSource[]
): Promise<void> {
  const storage = getStorage();
  if (!storage || typeof (storage as any).setAdminConfig !== 'function') {
    throw new Error('当前存储不支持保存配置');
  }

  const config = await getConfig();
  const sourceMap = new Map(
    (config.SourceConfig || []).map((s) => [s.key, { ...s }])
  );

  const subscribedKeys = new Set(sources.map((s) => s.key));
  for (const source of sources) {
    const existing = sourceMap.get(source.key);
    sourceMap.set(source.key, {
      key: source.key,
      name: source.name,
      api: source.api,
      detail: source.detail,
      // 订阅来源标记为 config，与手动添加的 custom 源区分
      from: existing?.from === 'custom' ? 'custom' : 'config',
      disabled: existing?.disabled ?? false,
    });
  }

  // 只更新本次订阅覆盖的源，保留其它自定义源
  void subscribedKeys;
  config.SourceConfig = Array.from(sourceMap.values());
  await (storage as any).setAdminConfig(config);
}

/** 更新订阅状态（URL / 自动更新 / 最后检查时间 / 配置原文） */
export async function updateSubscriptionMeta(meta: {
  URL?: string;
  AutoUpdate?: boolean;
  LastCheck?: string;
  ConfigFile?: string;
}): Promise<void> {
  const storage = getStorage();
  if (!storage || typeof (storage as any).setAdminConfig !== 'function') {
    throw new Error('当前存储不支持保存配置');
  }
  const config = await getConfig();
  config.ConfigSubscribtion = {
    URL: meta.URL ?? config.ConfigSubscribtion?.URL ?? '',
    AutoUpdate:
      meta.AutoUpdate ?? config.ConfigSubscribtion?.AutoUpdate ?? false,
    LastCheck: meta.LastCheck ?? config.ConfigSubscribtion?.LastCheck ?? '',
  };
  if (meta.ConfigFile !== undefined) {
    config.ConfigFile = meta.ConfigFile;
  }
  await (storage as any).setAdminConfig(config);
}

/** 供 cron 调用：按配置的订阅地址自动拉取并应用 */
export async function autoUpdateSubscription(): Promise<FetchResult> {
  const config = await getConfig();
  const sub = config.ConfigSubscribtion;
  if (!sub?.AutoUpdate || !sub.URL) {
    return { success: true, message: '自动更新未启用', skipped: true };
  }

  // 达到最小间隔才真正拉取
  if (sub.LastCheck) {
    const elapsed = Date.now() - new Date(sub.LastCheck).getTime();
    if (Number.isFinite(elapsed) && elapsed < MIN_CHECK_INTERVAL_MS) {
      return { success: true, message: '未到自动更新时间', skipped: true };
    }
  }

  try {
    const { sources, configContent } = await fetchSubscription(sub.URL);
    await applySubscriptionSources(sources);
    await updateSubscriptionMeta({
      LastCheck: new Date().toISOString(),
      ConfigFile: configContent,
    });
    return {
      success: true,
      message: `自动更新成功，共 ${sources.length} 个视频源`,
      sources,
    };
  } catch (error) {
    console.error('自动更新订阅失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '自动更新失败',
    };
  }
}
