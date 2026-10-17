import { create } from 'zustand'
interface FocusState {
  active: boolean
  countdown: number | null
  enter: () => void
  prepare: (seconds?: number) => void
  tick: () => void
  leave: () => void
}
/** Focus occupies the application's content pane; it never changes OS window state. */
export const useFocusStore = create<FocusState>()((set) => ({
  active: false,
  countdown: null,
  enter: () => set({ active: true, countdown: null }),
  prepare: (seconds = 3) =>
    set(seconds === 0 ? { active: true, countdown: null } : { active: false, countdown: seconds }),
  tick: () =>
    set((state) =>
      state.countdown === null
        ? {}
        : state.countdown <= 1
          ? { active: true, countdown: null }
          : { countdown: state.countdown - 1 },
    ),
  leave: () => set({ active: false, countdown: null }),
}))
