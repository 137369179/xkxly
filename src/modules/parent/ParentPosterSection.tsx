import { useState } from "react";
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/react/shallow";
import { useTranslation } from "@/i18n/useTranslation";
import type { Progress } from "@/types";
import { generateAchievementPoster } from "@/lib/posterGenerator";
import { Panel } from "@/components/ui/Card";
import { CandyButton } from "@/components/ui/Button";

export function ParentPosterSection() {
  const { t: translate } = useTranslation();
  const progress = useStore(
    useShallow(
      (s) =>
        ({
          streak: s.progress.streak,
          stars: s.progress.stars,
          badges: s.progress.badges,
          poemsRead: s.progress.poemsRead,
        }) as Progress,
    ),
  );
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);

  const handleGeneratePoster = async () => {
    setIsGeneratingPoster(true);
    try {
      const url = await generateAchievementPoster({
        progress,
        childName: translate("parent.childName") || "宝贝",
        aiRemark: "本周学习专注度极高，古诗与数学表现突出，继续加油哦！",
      });
      setPosterUrl(url);
    } catch (e) {
      if (import.meta.env.DEV) console.error("Poster gen error:", e);
    } finally {
      setIsGeneratingPoster(false);
    }
  };

  const handleShareOrDownload = async () => {
    if (!posterUrl) return;
    try {
      if (navigator.share && navigator.canShare) {
        const blob = await (await fetch(posterUrl)).blob();
        const file = new File([blob], "baby-learning-poster.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: "宝贝成长榜 · 学习乐园",
            text: "看看宝贝本周的精彩学习成就！",
            files: [file],
          });
          return;
        }
      }
    } catch {
      /* fallback to normal download */
    }

    const a = document.createElement("a");
    a.href = posterUrl;
    a.download = "baby-learning-poster.png";
    a.click();
  };

  return (
    <>
      {/* 海报生成入口 */}
      <Panel className="bg-gradient-to-r from-candy-purple-soft via-candy-blue-soft to-candy-green-soft">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-ink flex items-center gap-2">
              🏆 {translate("parent.posterTitle") || "生成周成长荣誉海报"}
            </h3>
            <p className="text-xs font-bold text-ink-soft mt-1">
              {translate("parent.posterDesc") || "自动汇总本周打卡、星星与徽章，一键生成精美成长喜报"}
            </p>
          </div>
          <CandyButton
            tone="purple"
            size="md"
            onClick={handleGeneratePoster}
            disabled={isGeneratingPoster}
          >
            {isGeneratingPoster ? (translate("parent.posterGenerating") || "正在生成海报...") : (translate("parent.posterGenerate") || "✨ 生成成长卡")}
          </CandyButton>
        </div>
      </Panel>

      {/* 海报预览模态框 */}
      {posterUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-[90vh] flex-col items-center overflow-hidden rounded-3xl bg-white p-4 shadow-2xl">
            <h3 className="mb-2 text-xl font-extrabold text-ink">{translate("parent.posterCardTitle") || "宝贝周成长荣誉喜报"}</h3>
            <div className="max-h-[70vh] overflow-y-auto rounded-2xl border-2 border-candy-purple/30">
              <img src={posterUrl} alt="成长喜报海报" loading="lazy" decoding="async" className="h-auto w-[320px] rounded-xl sm:w-[420px]" />
            </div>
            <div className="mt-4 flex w-full gap-3">
              <CandyButton
                tone="purple"
                fullWidth
                onClick={handleShareOrDownload}
              >
                📥 保存 / 分享海报
              </CandyButton>
              <button
                onClick={() => setPosterUrl(null)}
                className="rounded-2xl bg-cream-dark px-5 py-2.5 font-bold text-ink-soft hover:bg-candy-yellow"
              >
                {translate("common.close") || "关闭"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
