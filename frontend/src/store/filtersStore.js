import { create } from "zustand";

export const useFiltersStore = create((set) => ({
  search: "",

  filters: {
    theme: null,
    type: null,
    period: null,
    conflict: null,
    region: null,
    country: null,
    guest: null,
  },

  setSearch: (value) => set({ search: value }),

  setFilter: (key, value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value,
      },
    })),

  removeFilter: (key) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: null,
      },
    })),

  clearFilters: () =>
    set({
      filters: {
        theme: null,
        type: null,
        period: null,
        conflict: null,
        region: null,
        country: null,
        guest: null,
      },
    }),
}));