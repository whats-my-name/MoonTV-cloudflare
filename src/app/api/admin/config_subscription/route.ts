/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { updateSubscriptionMeta } from '@/lib/subscription';

// 仅站长可操作
function isOwner(request: NextRequest): boolean {
  const authInfo = getAuthInfoFromCookie(request);
  return !!authInfo?.username && authInfo.username === process.env.USERNAME;
}

export async function GET(request: NextRequest) {
  if (!isOwner(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const config = await getConfig();
    return NextResponse.json({
      ConfigSubscribtion: config.ConfigSubscribtion || {
        URL: '',
        AutoUpdate: false,
        LastCheck: '',
      },
    });
  } catch (error) {
    console.error('获取订阅配置失败:', error);
    return NextResponse.json({ error: '获取订阅配置失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isOwner(request)) {
    return NextResponse.json(
      { error: '权限不足，只有站长可以修改订阅配置' },
      { status: 401 }
    );
  }
  try {
    const body = (await request.json()) as {
      URL?: string;
      AutoUpdate?: boolean;
    };
    if (typeof body.URL !== 'string' || typeof body.AutoUpdate !== 'boolean') {
      return NextResponse.json({ error: '参数格式错误' }, { status: 400 });
    }

    // 校验 URL 协议，防止访问非 http(s) 资源
    const url = body.URL.trim();
    if (url) {
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        return NextResponse.json({ error: '订阅 URL 格式错误' }, { status: 400 });
      }
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return NextResponse.json({ error: '订阅 URL 仅支持 http/https' }, { status: 400 });
      }
    }

    await updateSubscriptionMeta({ URL: url, AutoUpdate: body.AutoUpdate });
    return NextResponse.json({ success: true, message: '订阅配置已保存' });
  } catch (error) {
    console.error('保存订阅配置失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '保存订阅配置失败' },
      { status: 500 }
    );
  }
}
