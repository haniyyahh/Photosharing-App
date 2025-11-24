import { create } from "zustand";

const useZustandStore = create((set) => ({
  //  UI/selection state
  advancedFeaturesEnabled: false,
  selectedUserId: null,   // id of the user currently selected in the UI
  selectedPhotoId: null,  // id of the photo currently selected (for comments/view)
  isAddPhotoModalOpen: false,

  currentUser: null,

  // setters/actions
  setAdvancedFeaturesEnabled: (value) => set({ advancedFeaturesEnabled: !!value }),
  toggleAdvancedFeaturesEnabled: () => set((s) => ({ advancedFeaturesEnabled: !s.advancedFeaturesEnabled })),

  setSelectedUserId: (userId) => set({ selectedUserId: userId ?? null }),
  clearSelectedUserId: () => set({ selectedUserId: null }),

  setSelectedPhotoId: (photoId) => set({ selectedPhotoId: photoId ?? null }),
  clearSelectedPhotoId: () => set({ selectedPhotoId: null }),

  openAddPhotoModal: () => set({ isAddPhotoModalOpen: true }),
  closeAddPhotoModal: () => set({ isAddPhotoModalOpen: false }),

  // session actions
  setCurrentUser: (userObj) => set({ currentUser: userObj ?? null }),
  clearCurrentUser: () => set({ currentUser: null }),

  showUpload: false,
  setShowUpload: (val) => set({ showUpload: val }),

  // convenience reset (for tests/logout)
  resetStore: () => set({
      advancedFeaturesEnabled: false,
      selectedUserId: null,
      selectedPhotoId: null,
      isAddPhotoModalOpen: false,
      currentUser: null,
    }),
}));

export default useZustandStore;