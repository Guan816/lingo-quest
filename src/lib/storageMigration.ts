/**
 * 本地存储迁移：把旧品牌名（lingoquest）的存档搬到新 key（maneji）。
 *
 * 背景：项目从 LingoQuest 更名为「漫记」，本地持久化的 key 一并更新。
 * 但直接改 key 会让老用户的闯关进度、成就、四级错题本、登录态全部清零，
 * 所以在应用启动前做一次搬运：旧 key 有数据、新 key 没有时才搬。
 *
 * 搬运后旧 key 会保留（不删除），万一新逻辑有问题还能手动回滚。
 */

/** 旧 key → 新 key */
const KEY_MAP: Record<string, string> = {
  'lingoquest.profile.v1': 'maneji.profile.v1',
  'lingoquest.settings.v1': 'maneji.settings.v1',
  'lingoquest.cet4.v1': 'maneji.cet4.v1',
  'lingoquest-auth': 'maneji-auth',
};

export function migrateLegacyStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  for (const [oldKey, newKey] of Object.entries(KEY_MAP)) {
    try {
      const legacy = localStorage.getItem(oldKey);
      if (!legacy) continue; // 旧存档不存在，无需搬运
      if (localStorage.getItem(newKey)) continue; // 新存档已有数据，不覆盖

      localStorage.setItem(newKey, legacy);
      // eslint-disable-next-line no-console
      console.info(`[storage] 已迁移存档：${oldKey} → ${newKey}`);
    } catch {
      // 隐私模式或配额不足时忽略，不影响应用运行
    }
  }
}
