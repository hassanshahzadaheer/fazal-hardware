import { Link } from 'react-router-dom';
import { Banner } from '../../components/ui';
import { useGateStore } from '../../stores/licenseStore';
import { LicenseRestrictionReason } from '../../../shared/types';

export const RESTRICTION_TEXT: Record<LicenseRestrictionReason, string> = {
  suspended: 'This licence has been suspended. Contact your vendor.',
  revoked: 'This licence is no longer valid. Contact your vendor.',
  expired: 'This licence has expired. Contact your vendor to renew.',
  grace_expired: 'This computer has been offline too long to confirm the licence. Connect to the internet and press “Check now”.',
  clock_tampered: "This computer's date/time looks wrong. Fix the clock, connect to the internet and press “Check now”.",
  invalid: 'The saved licence could not be verified. Connect to the internet and press “Check now”, or re-enter the activation key.',
};

// Shown on every screen while the licence is restricted, or when an offline
// computer is close to the end of its grace period.
export default function LicenseBanner() {
  const license = useGateStore((s) => s.license);
  if (!license) return null;

  if (license.state === 'restricted') {
    return (
      <Banner
        tone="danger"
        title="Read-only mode — your data is safe"
        action={<Link to="/settings" state={{ tab: 'license' }} className="text-accent font-medium hover:underline">Open Licence settings (re-check, back up, export)</Link>}
      >
        {RESTRICTION_TEXT[license.reason]} You can still view records and back up or export all your data. Nothing has been deleted.
      </Banner>
    );
  }

  if (license.state === 'active') {
    const msLeft = Date.parse(license.graceEndsAt) - Date.now();
    const daysLeft = Math.max(0, Math.ceil(msLeft / 86_400_000));
    if (license.recheckDue && daysLeft <= 2) {
      return (
        <Banner tone="warning" title="Licence check needed">
          This computer has not been able to confirm its licence recently. Connect to the internet within {daysLeft}{' '}
          day{daysLeft === 1 ? '' : 's'} to avoid read-only mode.
        </Banner>
      );
    }
  }
  return null;
}
