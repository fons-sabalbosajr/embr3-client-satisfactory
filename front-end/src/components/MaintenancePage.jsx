// Shown to everyone except Developer accounts while maintenance mode is on
// (Developer Settings → Maintenance). The server refuses their requests at
// the same time, so this page is the explanation, not the lock.
import { ErrorState } from "./StatusUI/StatusUI";
import { appUrl } from "../utils/basePath";
import { refreshMaintenance, formatEndsAt } from "../utils/maintenance";
import { clearAllStorage } from "../utils/encryptedStorage";

export default function MaintenancePage({ maintenance = {}, signedIn = false }) {
  const back = formatEndsAt(maintenance.endsAt);
  const message = [
    maintenance.message || "EMBR3 OCSM is being updated and is temporarily unavailable.",
    back ? `We expect to be back by ${back}.` : "Please check again in a little while.",
  ].join(" ");

  const signOut = () => {
    clearAllStorage();
    window.location.replace(appUrl("/admin"));
  };

  return (
    <ErrorState
      variant="maintenance"
      fullPage
      title="Under maintenance"
      message={message}
      onRetry={async () => {
        const state = await refreshMaintenance();
        if (!state.enabled) window.location.reload();
      }}
      retryLabel="Check again"
      extra={
        signedIn ? (
          <button type="button" className="sui-btn sui-btn-ghost" onClick={signOut}>
            Sign out
          </button>
        ) : (
          <a className="sui-btn sui-btn-ghost" href={appUrl("/admin")}>
            Developer sign-in
          </a>
        )
      }
    />
  );
}
