import { create } from "zustand";

const useZustandStore = create((set, get) => ({
  // --- UI / selection state ---
  advancedFeaturesEnabled: false,
  selectedUserId: null,   // id of the user currently selected in the UI
  selectedPhotoId: null,  // id of the photo currently selected (for comments/view)
  // optional: local-only UI flag for showing modals
  isAddPhotoModalOpen: false,

  // --- session / auth (will be used by Problem 3) ---
  // This can hold the logged in user object (or null if not logged in).
  // For Problem 2 it's fine to default to null.
  currentUser: null,

  // --- setters / actions ---
  setAdvancedFeaturesEnabled: (value) => set({ advancedFeaturesEnabled: !!value }),
  toggleAdvancedFeaturesEnabled: () => set((s) => ({ advancedFeaturesEnabled: !s.advancedFeaturesEnabled })),

  setSelectedUserId: (userId) => set({ selectedUserId: userId ?? null }),
  clearSelectedUserId: () => set({ selectedUserId: null }),

  setSelectedPhotoId: (photoId) => set({ selectedPhotoId: photoId ?? null }),
  clearSelectedPhotoId: () => set({ selectedPhotoId: null }),

  openAddPhotoModal: () => set({ isAddPhotoModalOpen: true }),
  closeAddPhotoModal: () => set({ isAddPhotoModalOpen: false }),

  // session actions (Problem 3 will call these when logging in/out)
  setCurrentUser: (userObj) => set({ currentUser: userObj ?? null }),
  clearCurrentUser: () => set({ currentUser: null }),

  showUpload: false,
  setShowUpload: (val) => set({ showUpload: val }),

  // convenience reset (useful for tests / logout)
  resetStore: () =>
    set({
      advancedFeaturesEnabled: false,
      selectedUserId: null,
      selectedPhotoId: null,
      isAddPhotoModalOpen: false,
      currentUser: null,
    }),
}));

export default useZustandStore;