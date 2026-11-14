import { create } from 'zustand';
import { LicenseStatus, SetupStatus } from '../../shared/types';

// App-level gate state: licence status (evaluated locally in the main process) and
// first-run setup status. `loading` stays true until both are known.
interface GateState {
  license: LicenseStatus | null;
  setup: SetupStatus | null;
  loading: boolean;
  load: () => Promise<void>;
  setLicense: (s: LicenseStatus) => void;
  setSetup: (s: SetupStatus) => void;
  subscribe: () => () => void;
}

export const useGateStore = create<GateState>((set) => ({
  license: null,
  setup: null,
  loading: true,

  load: async () => {
    try {
      const [lic, setup] = await Promise.all([window.api.license.getStatus(), window.api.setup.getStatus()]);
      set({
        license: lic.ok ? lic.data : { state: 'unactivated' },
        setup: setup.ok ? setup.data : { setupCompleted: false, hasExistingData: false },
        loading: false,
      });
    } catch {
      set({ license: { state: 'unactivated' }, setup: { setupCompleted: false, hasExistingData: false }, loading: false });
    }
  },
  setLicense: (license) => set({ license }),
  setSetup: (setup) => set({ setup }),
  subscribe: () => window.api.license.onChanged((license) => set({ license })),
}));
