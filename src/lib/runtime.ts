/* eslint-disable @typescript-eslint/no-explicit-any */

// cf-D1 构建时的默认站点配置。
// 播放源等数据由管理员在后台写入 D1 的 admin_config 表，无需在此内置资源站。
const runtimeConfig = {
  cache_time: 7200,
  api_site: {},
  custom_category: [],
};

export default runtimeConfig;
