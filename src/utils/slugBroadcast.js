/**
 * Cross-tab notification for slug (custom URL) changes.
 *
 * When a user renames a ticker's slug on the dashboard, any open
 * Settings / Ticker tabs with the old sync ID need to update their
 * URL and internal state to the new slug.
 *
 * Uses BroadcastChannel where available, with a no-op fallback for
 * older browsers.
 */

const CHANNEL_NAME = "ncpa-ticker-slug";

let channel = null;
try {
  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch {
  // BroadcastChannel not supported — cross-tab slug updates won't work
}

/**
 * Notify other tabs that a slug changed.
 * @param {{ oldId: string, newId: string }} payload
 */
export const broadcastSlugChange = ({ oldId, newId }) => {
  try {
    channel?.postMessage({ type: "slug-change", oldId, newId });
  } catch {
    // Ignore — tab may have been closed
  }
};

/**
 * Listen for slug change events from other tabs.
 * @param {(payload: { oldId: string, newId: string }) => void} callback
 * @returns {() => void} Unsubscribe function
 */
export const onSlugChange = (callback) => {
  if (!channel) return () => {};

  const handler = (event) => {
    const data = event.data;
    if (data?.type === "slug-change" && data.oldId && data.newId) {
      callback({ oldId: data.oldId, newId: data.newId });
    }
  };

  channel.addEventListener("message", handler);
  return () => channel.removeEventListener("message", handler);
};
