// Catches render errors so one broken page shows a friendly panel instead of a
// blank screen. A failed lazy-chunk load (the app was redeployed while the tab
// was open) is told apart and offers a reload.
//
//   <ErrorBoundary resetKey={location.pathname} homeHref="…">…</ErrorBoundary>
//
// `resetKey` clears the error when it changes, so navigating to another page
// recovers without a reload.

import { Component } from "react";
import { ErrorState } from "./StatusUI";

const isChunkError = (err) =>
  /Failed to fetch dynamically imported module|Loading chunk [\w-]+ failed|Importing a module script failed|error loading dynamically imported module/i.test(
    String(err?.message || "")
  );

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Page error:", error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const chunk = isChunkError(error);
    return (
      <ErrorState
        variant={chunk ? "update" : "crash"}
        message={
          chunk
            ? "The system was updated while this page was open. Reload to get the latest version."
            : undefined
        }
        onRetry={chunk ? () => window.location.reload() : () => this.setState({ error: null })}
        retryLabel={chunk ? "Reload page" : "Try again"}
        homeHref={this.props.homeHref}
        fullPage={!!this.props.fullPage}
        extra={
          !chunk ? (
            <button type="button" className="sui-btn sui-btn-ghost" onClick={() => window.location.reload()}>
              Reload page
            </button>
          ) : null
        }
      />
    );
  }
}
