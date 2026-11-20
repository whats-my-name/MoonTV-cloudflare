export interface AdminConfig {
  // 配置订阅（注意字段名沿用官方拼写 Subscribtion）
  ConfigSubscribtion?: {
    URL: string;
    AutoUpdate: boolean;
    LastCheck: string;
  };
  // 最近一次成功拉取并应用的订阅配置原文（JSON 字符串）
  ConfigFile?: string;
  SiteConfig: {
    SiteName: string;
    Announcement: string;
    SearchDownstreamMaxPage: number;
    SiteInterfaceCacheTime: number;
    ImageProxy: string;
    DoubanProxy: string;
    DisableYellowFilter: boolean;
  };
  UserConfig: {
    AllowRegister: boolean;
    Users: {
      username: string;
      role: 'user' | 'admin' | 'owner';
      banned?: boolean;
    }[];
  };
  SourceConfig: {
    key: string;
    name: string;
    api: string;
    detail?: string;
    from: 'config' | 'custom';
    disabled?: boolean;
  }[];
  CustomCategories: {
    name?: string;
    type: 'movie' | 'tv';
    query: string;
    from: 'config' | 'custom';
    disabled?: boolean;
  }[];
}

export interface AdminConfigResult {
  Role: 'owner' | 'admin';
  Config: AdminConfig;
}
