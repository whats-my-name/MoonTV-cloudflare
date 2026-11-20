/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import {
  applySubscriptionSources,
  fetchSubscription,
  updateSubscriptionMeta,
} from '@/lib/subscription';

// 仅站长可拉取
function isOwner(request: NextRequest): boolean {
  const authInfo = getAuthInfoFromCookie(request);
  return !!authInfo?.username && authInfo.username === process.env.USERNAME;
}

export async function POST(request: NextRequest) {
  if (!isOwner(request)) {
    return NextResponse.json(
      { error: '权限不足，只有站长可以拉取配置订阅' },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as { url?: string };
    const url = (body.url || '').trim();
    if (!url) {
      return NextResponse.json({ error: '缺少订阅 URL' }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ error: '订阅 URL 格式错误' }, { status: 400 });
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json(
        { error: '订阅 URL 仅支持 http/https' },
        { status: 400 }
      );
    }

    // 拉取并解析 Base58 订阅内容
    const { sources, configContent } = await fetchSubscription(url);

    // 应用到视频源配置并更新订阅状态
    await applySubscriptionSources(sources);
    await updateSubscriptionMeta({
      URL: url,
      LastCheck: new Date().toISOString(),
      ConfigFile: configContent,
    });

    return NextResponse.json({
      success: true,
      message: `拉取成功，已更新 ${sources.length} 个视频源`,
      sources,
    });
  } catch (error) {
    console.error('拉取配置订阅失败:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '拉取配置失败',
      },
      { status: 500 }
    );
  }
}
