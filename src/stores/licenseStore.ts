import { create } from 'zustand';
import { LicenseStatus } from '../../shared/types';

interface LicenseState {
  status: LicenseStatus | null;
  loading: boolean;
  checkLicense: () => Promise<void>;
  importLicense: () => Promise<void>;
}

export const useLicenseStore = create<LicenseState>((set) => ({
  status: null,
  loading: true,

  checkLicense: async () => {
    try {
      const res = await window.api.license.getStatus();
      set({ status: res.ok ? res.data : { state: 'invalid' }, loading: false });
    } catch {
      set({ status: { state: 'invalid' }, loading: false });
    }
  },

  importLicense: async () => {
    try {
      const res = await window.api.license.import();
      if (res.ok) set({ status: res.data });
    } catch {
      // Swallowed — status is left as-is and the user can retry the import.
    }
  },
}));
