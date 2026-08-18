/**
 * 多孩子档案切换浮层（P1-2）
 * 切换 / 新增 / 重命名 / 换头像 / 换主题色 / 删除，全部走 useProfilesStore。
 * 主 Store 的 progress 由 store 内部在切换时同步，UI 无需关心。
 */
import { useState } from 'react';
import { sfxTap } from '@/lib/sfx';
import { useTranslation } from '@/i18n/useTranslation';
import {
  useProfilesStore,
  useProfileList,
  useActiveProfileMeta,
  PROFILE_AVATARS,
  PROFILE_COLORS,
  AGE_RANGES,
  type AgeRangeKey,
  colorHex,
  colorSoft,
} from '@/store/useProfilesStore';

type Mode = 'list' | 'add' | 'edit';

export function ProfileSwitcher({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const list = useProfileList();
  const active = useActiveProfileMeta();
  const switchProfile = useProfilesStore((s) => s.switchProfile);
  const addProfile = useProfilesStore((s) => s.addProfile);
  const renameProfile = useProfilesStore((s) => s.renameProfile);
  const updateProfileAppearance = useProfilesStore((s) => s.updateProfileAppearance);
  const removeProfile = useProfilesStore((s) => s.removeProfile);

  const [mode, setMode] = useState<Mode>('list');
  const [editingId, setEditingId] = useState<string>('');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(PROFILE_AVATARS[0] ?? '👦');
  const [color, setColor] = useState(PROFILE_COLORS[0]?.key ?? 'pink');
  const [ageRange, setAgeRangeLocal] = useState<AgeRangeKey>('7-8');
  const [confirmId, setConfirmId] = useState('');

  if (!open) return null;

  const resetForm = () => {
    setName('');
    setAvatar(PROFILE_AVATARS[0] ?? '👦');
    setColor(PROFILE_COLORS[0]?.key ?? 'pink');
    setAgeRangeLocal('7-8');
    setEditingId('');
    setConfirmId('');
  };

  const enterAdd = () => {
    sfxTap();
    resetForm();
    setMode('add');
  };

  const enterEdit = (id: string) => {
    sfxTap();
    const m = useProfilesStore.getState().meta[id];
    if (!m) return;
    setName(m.name);
    setAvatar(m.avatar);
    setColor(m.color);
    setAgeRangeLocal(m.ageRange);
    setEditingId(id);
    setMode('edit');
  };

  const doCreate = () => {
    sfxTap();
    const id = addProfile(name, avatar, color, ageRange);
    switchProfile(id);
    setMode('list');
    resetForm();
    onClose();
  };

  const doSave = () => {
    sfxTap();
    if (editingId) {
      renameProfile(editingId, name);
      updateProfileAppearance(editingId, { avatar, color, ageRange });
    }
    setMode('list');
    resetForm();
  };

  const doSwitch = (id: string) => {
    sfxTap();
    switchProfile(id);
    onClose();
  };

  const doDelete = (id: string) => {
    sfxTap();
    removeProfile(id);
    setConfirmId('');
  };

  return (
    <div
      className="fixed inset-0 z-40"
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        role="dialog"
        aria-label={t('profile.title')}
        onClick={(e) => e.stopPropagation()}
        className="absolute right-3 top-[60px] w-[300px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-3xl border-2 border-white/80 bg-white/95 p-3 shadow-2xl backdrop-blur-xl"
      >
        {/* 头部 */}
        <div className="mb-2 flex items-center justify-between px-1">
          {mode === 'list' ? (
            <h3 className="text-base font-extrabold text-rainbow">{t('profile.title')}</h3>
          ) : (
            <button
              type="button"
              onClick={() => { sfxTap(); setMode('list'); resetForm(); }}
              className="flex items-center gap-1 rounded-full px-2 py-1 text-sm font-bold text-candy-purple/70 active:translate-y-[1px]"
            >
              <span>←</span>
              <span>{t('common.back')}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => { sfxTap(); onClose(); }}
            aria-label={t('common.close')}
            className="rounded-full px-2 py-1 text-lg font-bold text-gray-400 active:translate-y-[1px]"
          >
            ✕
          </button>
        </div>

        {mode === 'list' && (
          <div className="flex flex-col gap-2">
            {list.map((m) => {
              const isActive = m.id === active?.id;
              const confirming = confirmId === m.id;
              return (
                <div key={m.id}>
                  <div
                    className="flex items-center gap-3 rounded-2xl border-2 p-2 transition"
                    style={{
                      borderColor: isActive ? colorHex(m.color) : 'rgba(0,0,0,0.06)',
                      background: isActive ? colorSoft(m.color) : '#fff',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => doSwitch(m.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      aria-label={t('profile.switch') + ' ' + m.name}
                    >
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl"
                        style={{ background: colorSoft(m.color), border: `2px solid ${colorHex(m.color)}` }}
                      >
                        {m.avatar}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-extrabold text-gray-800">{m.name}</span>
                        <span className="text-xs font-bold text-gray-400">
                          {(() => {
                            const a = AGE_RANGES.find((x) => x.key === m.ageRange);
                            return `${a ? a.emoji + ' ' + a.label : ''}${isActive ? '  ✓ ' + t('profile.current') : ''}`;
                          })()}
                        </span>
                      </span>
                    </button>
                    {!confirming ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => enterEdit(m.id)}
                          aria-label={t('common.edit')}
                          className="rounded-full px-2 py-1 text-base active:translate-y-[1px]"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => { sfxTap(); setConfirmId(m.id); }}
                          aria-label={t('common.delete')}
                          className="rounded-full px-2 py-1 text-base active:translate-y-[1px]"
                        >
                          🗑️
                        </button>
                      </div>
                    ) : (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => doDelete(m.id)}
                          className="rounded-full bg-red-500 px-2 py-1 text-xs font-bold text-white active:translate-y-[1px]"
                        >
                          {t('common.delete')}
                        </button>
                        <button
                          type="button"
                          onClick={() => { sfxTap(); setConfirmId(''); }}
                          className="rounded-full bg-gray-100 px-2 py-1 text-xs font-bold text-gray-500 active:translate-y-[1px]"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    )}
                  </div>
                  {confirming && (
                    <p className="mt-1 px-2 text-xs font-medium text-red-500">
                      {t('profile.confirmDelete', { name: m.name })}
                    </p>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              onClick={enterAdd}
              className="mt-1 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-candy-purple/40 bg-candy-purple-soft/40 py-2.5 text-sm font-extrabold text-candy-purple active:translate-y-[1px]"
            >
              <span className="text-lg">➕</span>
              <span>{t('profile.addChild')}</span>
            </button>
          </div>
        )}

        {(mode === 'add' || mode === 'edit') && (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="px-1 text-xs font-bold text-gray-500">{t('profile.childName')}</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('profile.namePlaceholder')}
                maxLength={12}
                className="rounded-2xl border-2 border-candy-purple/30 bg-white px-3 py-2 text-sm font-bold text-gray-800 outline-none focus:border-candy-purple"
              />
            </label>

            <div className="flex flex-col gap-1">
              <span className="px-1 text-xs font-bold text-gray-500">{t('profile.avatar')}</span>
              <div className="grid grid-cols-6 gap-1.5">
                {PROFILE_AVATARS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => { sfxTap(); setAvatar(a); }}
                    aria-label={a}
                    className="flex h-9 items-center justify-center rounded-xl border-2 text-xl transition active:translate-y-[1px]"
                    style={{
                      borderColor: avatar === a ? colorHex(color) : 'rgba(0,0,0,0.08)',
                      background: avatar === a ? colorSoft(color) : '#fff',
                    }}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="px-1 text-xs font-bold text-gray-500">{t('profile.color')}</span>
              <div className="flex flex-wrap gap-2">
                {PROFILE_COLORS.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => { sfxTap(); setColor(c.key); }}
                    aria-label={c.key}
                    className="h-8 w-8 rounded-full border-2 transition active:translate-y-[1px]"
                    style={{
                      background: c.hex,
                      borderColor: color === c.key ? '#333' : 'transparent',
                      boxShadow: color === c.key ? `0 0 0 3px ${c.soft}` : 'none',
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="px-1 text-xs font-bold text-gray-500">{t('profile.age')}</span>
              <div className="grid grid-cols-5 gap-1.5">
                {AGE_RANGES.map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => { sfxTap(); setAgeRangeLocal(a.key); }}
                    aria-label={a.label}
                    className="flex flex-col items-center gap-0.5 rounded-xl border-2 py-1.5 transition active:translate-y-[1px]"
                    style={{
                      borderColor: ageRange === a.key ? colorHex(color) : 'rgba(0,0,0,0.08)',
                      background: ageRange === a.key ? colorSoft(color) : '#fff',
                    }}
                  >
                    <span className="text-lg leading-none">{a.emoji}</span>
                    <span className="text-[10px] font-extrabold text-gray-600">{a.short}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={mode === 'add' ? doCreate : doSave}
              className="mt-1 rounded-2xl bg-candy-purple py-2.5 text-sm font-extrabold text-white shadow-candy-sm active:translate-y-[1px]"
            >
              {mode === 'add' ? `✨ ${t('profile.create')}` : `💾 ${t('common.save')}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
