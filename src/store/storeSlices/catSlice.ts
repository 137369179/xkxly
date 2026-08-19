import { applyProgress as _applyProgress } from '../storeHelpers';
import { type SliceCreator } from '../storeShared';
import type { StoreState } from '../useStore';

export const createCatSlice: SliceCreator<
  Pick<
    StoreState,
    | 'addFish'
    | 'feedCatStats'
    | 'cleanCatStats'
    | 'tickCatStats'
    | 'buyOutfit'
    | 'equipOutfit'
    | 'petCat'
    | 'bathCat'
    | 'dispatchCatQuest'
    | 'claimCatQuest'
    | 'evolveCat'
  >
> = (set) => ({
  addFish: (count) =>
    set((s) => ({
      progress: { ...s.progress, fishCount: (s.progress.fishCount ?? 0) + count },
    })),

  feedCatStats: (amount, cost) => {
    let ok = false;
    set((s) => {
      const curFish = s.progress.fishCount ?? 0;
      if (curFish >= cost) {
        ok = true;
        const nextFullness = Math.min(100, (s.progress.catFullness ?? 80) + amount);
        // Feeding also slightly increases affection
        const nextAffection = Math.min(100, (s.progress.catAffection ?? 20) + Math.floor(amount / 2));
        return {
          progress: {
            ...s.progress,
            fishCount: curFish - cost,
            catFullness: nextFullness,
            catAffection: nextAffection,
          },
        };
      }
      return s;
    });
    return ok;
  },

  cleanCatStats: (amount) => {
    set((s) => {
      const nextClean = Math.min(100, (s.progress.catCleanliness ?? 80) + amount);
      return {
        progress: { ...s.progress, catCleanliness: nextClean },
      };
    });
  },

  tickCatStats: () => {
    set((s) => {
      const now = Date.now();
      const lastUpdate = s.progress.lastCatUpdate ?? now;
      const diffHours = (now - lastUpdate) / (1000 * 60 * 60);

      if (diffHours < 1) return s; // Not enough time passed

      // Decay 2 points per hour
      const decay = Math.floor(diffHours * 2);

      const newFullness = Math.max(0, (s.progress.catFullness ?? 80) - decay);
      const newCleanliness = Math.max(0, (s.progress.catCleanliness ?? 80) - decay);

      return {
        progress: {
          ...s.progress,
          catFullness: newFullness,
          catCleanliness: newCleanliness,
          lastCatUpdate: now,
        },
      };
    });
  },

  buyOutfit: (outfitId, cost) => {
    let ok = false;
    set((s) => {
      const curFish = s.progress.fishCount ?? 0;
      const unlocked = s.progress.unlockedOutfits ?? [];
      if (curFish >= cost && !unlocked.includes(outfitId)) {
        ok = true;
        return {
          progress: {
            ...s.progress,
            fishCount: curFish - cost,
            unlockedOutfits: [...unlocked, outfitId],
          },
        };
      }
      return s;
    });
    return ok;
  },

  equipOutfit: (type, outfitId) => {
    set((s) => {
      const equipped = s.progress.equippedOutfits ?? {};
      // If equipping the same outfit, unequip it
      if (equipped[type] === outfitId) {
        const nextEquipped = { ...equipped };
        delete nextEquipped[type];
        return { progress: { ...s.progress, equippedOutfits: nextEquipped } };
      }
      return {
        progress: {
          ...s.progress,
          equippedOutfits: { ...equipped, [type]: outfitId },
        },
      };
    });
  },

  petCat: () => {
    set((s) => {
      const nextAffection = Math.min(100, (s.progress.catAffection ?? 20) + 2);
      return {
        progress: { ...s.progress, catAffection: nextAffection },
      };
    });
  },

  bathCat: () => {
    set((s) => {
      const nextClean = Math.min(100, (s.progress.catCleanliness ?? 80) + 20);
      return {
        progress: { ...s.progress, catCleanliness: nextClean },
      };
    });
  },

  dispatchCatQuest: (id, name, durationSec, reward) => {
    set((s) => {
      const quests = s.progress.catQuests ?? [];
      const newQ = { id, name, endAt: Date.now() + durationSec * 1000, reward };
      return { progress: { ...s.progress, catQuests: [...quests.filter((q) => q.id !== id), newQ] } };
    });
  },

  claimCatQuest: (id) => {
    set((s) => {
      const quests = s.progress.catQuests ?? [];
      const target = quests.find((q) => q.id === id);
      if (!target || Date.now() < target.endAt) return s;
      const nextFish = (s.progress.fishCount ?? 0) + target.reward;
      const nextAffection = Math.min(100, (s.progress.catAffection ?? 20) + 10);
      return {
        progress: {
          ...s.progress,
          fishCount: nextFish,
          catAffection: nextAffection,
          catQuests: quests.filter((q) => q.id !== id),
        },
      };
    });
  },

  evolveCat: () => {
    let ok = false;
    set((s) => {
      const curLv = s.progress.catLevel ?? 1;
      const curAff = s.progress.catAffection ?? 20;
      const stars = s.progress.stars ?? 0;

      let canEvolve = false;
      if (curLv === 1 && stars >= 50 && curAff >= 50) canEvolve = true;
      if (curLv === 2 && stars >= 200 && curAff >= 80) canEvolve = true;
      if (curLv === 3 && stars >= 500 && curAff >= 100) canEvolve = true;

      if (canEvolve) {
        ok = true;
        return {
          progress: {
            ...s.progress,
            catLevel: curLv + 1,
            // Affection resets a bit, or just keep it? Let's just consume a bit of it for evolution
            catAffection: Math.max(20, curAff - 30),
          },
        };
      }
      return s;
    });
    return ok;
  },
});
