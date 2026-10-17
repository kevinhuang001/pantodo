import { create } from 'zustand'
import { setFullscreen } from '@/platform'

interface FocusState {
  active: boolean
  fullscreenError: boolean
  enter: () => void
  leave: () => void
}

export const useFocusStore = create<FocusState>()((set) => ({
  active: false,
  fullscreenError: false,
  enter() {
    set({ active: true, fullscreenError: false })
    // Called directly from the user's click so browser fullscreen has user activation.
    void setFullscreen(true).catch(() => set({ fullscreenError: true }))
  },
  leave() {
    set({ active: false, fullscreenError: false })
    void setFullscreen(false).catch(() => undefined)
  },
}))
