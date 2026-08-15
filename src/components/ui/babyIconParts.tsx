import React from 'react';

/**
 * 宝贝学习乐园 · 儿童风格共享零件（Single Source of Truth）
 *
 * Face / Glint 是全站图标（主系统 BabyModuleIcons + 宠物 PetIcons + 勋章 PetMedalIcons）
 * 共用的"拟人化"与"玩具光泽"零件。集中在此，避免三套文件各写一份导致视觉漂移。
 */

/** 玩具光泽：主体左上角一小块椭圆，模拟气球/塑料反光 */
export const Glint: React.FC<{ cx?: number; cy?: number; rx?: number; ry?: number; rot?: number; op?: number }> = ({
  cx = 23, cy = 25, rx = 7, ry = 4, rot = -28, op = 0.4,
}) => (
  <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#FFFFFF" opacity={op} transform={`rotate(${rot} ${cx} ${cy})`} />
);

/** 儿童笑脸：支持多种表情（happy/wink/sleepy/shy/surprised），让吉祥物各有个性。
 *  cheekTone 控制腮红配色：主系统用 'white'（白），宠物图标用 'pink'（粉 #FF9CB8）。 */
export const Face: React.FC<{
  cx?: number; cy?: number; gap?: number; dot?: number;
  smile?: boolean; cheek?: boolean; mood?: 'happy' | 'wink' | 'sleepy' | 'shy' | 'surprised';
  cheekTone?: 'white' | 'pink';
}> = ({
  cx = 32, cy = 33, gap = 6, dot = 3, smile = true, cheek = true, mood = 'happy', cheekTone = 'white',
}) => {
  const renderEyes = () => {
    switch (mood) {
      case 'wink':
        return (
          <>
            <path d={`M${cx - gap - 3} ${cy} Q${cx - gap} ${cy + 3} ${cx - gap + 3} ${cy}`} stroke="#FFFFFF" strokeWidth={2.2} fill="none" strokeLinecap="round" />
            <circle cx={cx + gap} cy={cy} r={dot} fill="#FFFFFF" />
          </>
        );
      case 'sleepy':
        return (
          <>
            <path d={`M${cx - gap - 3} ${cy - 1} Q${cx - gap} ${cy + 3} ${cx - gap + 3} ${cy - 1}`} stroke="#FFFFFF" strokeWidth={2.2} fill="none" strokeLinecap="round" />
            <path d={`M${cx + gap - 3} ${cy - 1} Q${cx + gap} ${cy + 3} ${cx + gap + 3} ${cy - 1}`} stroke="#FFFFFF" strokeWidth={2.2} fill="none" strokeLinecap="round" />
          </>
        );
      case 'surprised':
        return (
          <>
            <circle cx={cx - gap} cy={cy} r={dot + 1} fill="#FFFFFF" />
            <circle cx={cx + gap} cy={cy} r={dot + 1} fill="#FFFFFF" />
          </>
        );
      default:
        return (
          <>
            <circle cx={cx - gap} cy={cy} r={dot} fill="#FFFFFF" />
            <circle cx={cx + gap} cy={cy} r={dot} fill="#FFFFFF" />
          </>
        );
    }
  };
  const renderMouth = () => {
    if (!smile) return null;
    switch (mood) {
      case 'sleepy':
        return <path d={`M${cx - 4} ${cy + 6} Q${cx} ${cy + 9} ${cx + 4} ${cy + 6}`} stroke="#FFFFFF" strokeWidth={2} fill="none" strokeLinecap="round" />;
      case 'shy':
        return <path d={`M${cx - 3} ${cy + 7} Q${cx} ${cy + 9} ${cx + 3} ${cy + 7}`} stroke="#FFFFFF" strokeWidth={2.2} fill="none" strokeLinecap="round" />;
      case 'surprised':
        return <circle cx={cx} cy={cy + 8} r={2.5} fill="none" stroke="#FFFFFF" strokeWidth={2} />;
      default:
        return <path d={`M${cx - gap} ${cy + 5} Q${cx} ${cy + 10} ${cx + gap} ${cy + 5}`} stroke="#FFFFFF" strokeWidth={2.4} fill="none" strokeLinecap="round" />;
    }
  };
  const renderBlush = () => {
    if (!cheek) return null;
    if (mood === 'shy') {
      return (
        <>
          <circle cx={cx - gap - 6} cy={cy + 4} r={3.2} fill="#FF9CB8" opacity={0.7} />
          <circle cx={cx + gap + 6} cy={cy + 4} r={3.2} fill="#FF9CB8" opacity={0.7} />
        </>
      );
    }
    if (cheekTone === 'pink') {
      return (
        <>
          <circle cx={cx - gap - 5} cy={cy + 4} r={2.3} fill="#FF9CB8" opacity={0.7} />
          <circle cx={cx + gap + 5} cy={cy + 4} r={2.3} fill="#FF9CB8" opacity={0.7} />
        </>
      );
    }
    return (
      <>
        <circle cx={cx - gap - 5} cy={cy + 4} r={2.3} fill="#FFFFFF" opacity={0.5} />
        <circle cx={cx + gap + 5} cy={cy + 4} r={2.3} fill="#FFFFFF" opacity={0.5} />
      </>
    );
  };
  const renderZzz = () =>
    mood === 'sleepy' ? (
      <path d={`M${cx + gap + 4} ${cy - 6} h3 l-3 4 h3`} stroke="#FFFFFF" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    ) : null;
  return (
    <>
      {renderEyes()}
      {renderMouth()}
      {renderBlush()}
      {renderZzz()}
    </>
  );
};
