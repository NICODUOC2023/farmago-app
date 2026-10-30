import { create } from 'zustand';

type State = {
  pendingQuery: string | null;
  setPendingQuery: (q: string | null) => void;
  consume: () => string | null;
};

export const useSearchQuery = create<State>((set, get) => ({
  pendingQuery: null,
  setPendingQuery: (q) => set({ pendingQuery: q }),
  consume: () => {
    const q = get().pendingQuery;
    set({ pendingQuery: null });
    return q;
  },
}));
