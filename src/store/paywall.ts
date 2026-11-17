import { create } from 'zustand';

export type PaywallFeature = 'scanner' | 'treatment';

type PaywallCallbacks = {
  onUnlock?: () => void;
  onDismiss?: () => void;
};

type PaywallState = {
  isPro: boolean;
  isVisible: boolean;
  feature: PaywallFeature;
  onUnlock?: () => void;
  onDismiss?: () => void;
  openPaywall: (feature: PaywallFeature, callbacks?: PaywallCallbacks) => void;
  dismissPaywall: () => void;
  activatePro: () => void;
};

export const usePaywall = create<PaywallState>((set, get) => ({
  isPro: false,
  isVisible: false,
  feature: 'scanner',
  openPaywall: (feature, callbacks) => {
    if (get().isPro) {
      callbacks?.onUnlock?.();
      return;
    }

    set({
      isVisible: true,
      feature,
      onUnlock: callbacks?.onUnlock,
      onDismiss: callbacks?.onDismiss,
    });
  },
  dismissPaywall: () => {
    const onDismiss = get().onDismiss;
    set({ isVisible: false, onUnlock: undefined, onDismiss: undefined });
    onDismiss?.();
  },
  activatePro: () => {
    const onUnlock = get().onUnlock;
    set({ isPro: true, isVisible: false, onUnlock: undefined, onDismiss: undefined });
    onUnlock?.();
  },
}));
