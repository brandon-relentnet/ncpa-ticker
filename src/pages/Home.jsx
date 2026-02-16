import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import Scoreboard from "../components/Scoreboard";
import { generateSyncId, isValidSlug, SYNC_QUERY_PARAM } from "../utils/syncCodec";
import {
  changeSlug,
  deleteTicker,
  listTickers,
  pushSyncState,
  renameTicker,
} from "../utils/syncService";
import { broadcastSlugChange } from "../utils/slugBroadcast";
import {
  DEFAULT_PRIMARY,
  DEFAULT_SECONDARY,
  DEFAULT_SCORE_BACKGROUND,
  DEFAULT_BADGE_BACKGROUND,
} from "../utils/colors";

const relativeTime = (dateString) => {
  if (!dateString) return "";
  const now = Date.now();
  const then = typeof dateString === "string" ? Date.parse(dateString) : dateString;
  if (!Number.isFinite(then)) return "";
  const diffSeconds = Math.round((now - then) / 1000);
  if (diffSeconds < 5) return "just now";
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
};

const suggestName = (payload) => {
  if (!payload || typeof payload !== "object") return "";
  const matchInfo = payload.matchInfo;
  if (!matchInfo) return "";
  const games = Array.isArray(matchInfo.games) ? matchInfo.games : [];
  const game = games[0];
  if (!game) return matchInfo.tournament_name || "";
  const parts = [game.t1_name, game.t2_name].filter(Boolean);
  if (parts.length === 2) return `${parts[0]} vs ${parts[1]}`;
  if (parts.length === 1) return parts[0];
  return matchInfo.tournament_name || "";
};

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

const buildTickerUrl = (syncId) => {
  const path = `/ticker?${SYNC_QUERY_PARAM}=${encodeURIComponent(syncId)}`;
  if (typeof window === "undefined") return path;
  try {
    return new URL(path, window.location.origin).toString();
  } catch {
    return path;
  }
};

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1];

export default function HomePage() {
  const navigate = useNavigate();
  const [tickers, setTickers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [editingSlugId, setEditingSlugId] = useState(null);
  const [slugValue, setSlugValue] = useState("");
  const [slugError, setSlugError] = useState(null);
  const [slugSaving, setSlugSaving] = useState(false);
  const editInputRef = useRef(null);
  const slugInputRef = useRef(null);

  const fetchTickers = useCallback(async () => {
    try {
      setError(null);
      const result = await listTickers();
      setTickers(Array.isArray(result) ? result : []);
    } catch (err) {
      console.warn("Failed to load tickers", err);
      setError("Failed to load tickers. Is the sync server running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickers();
  }, [fetchTickers]);

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    const id = generateSyncId();
    try {
      await pushSyncState({ syncId: id, payload: {} });
      navigate(`/settings?${SYNC_QUERY_PARAM}=${encodeURIComponent(id)}`);
    } catch (err) {
      console.warn("Failed to create ticker", err);
      setCreating(false);
    }
  };

  const handleOpenSettings = (syncId) => {
    navigate(`/settings?${SYNC_QUERY_PARAM}=${encodeURIComponent(syncId)}`);
  };

  const handleOpenTicker = (syncId) => {
    window.open(
      `/ticker?${SYNC_QUERY_PARAM}=${encodeURIComponent(syncId)}`,
      "_blank"
    );
  };

  const handleCopyUrl = async (syncId) => {
    const url = buildTickerUrl(syncId);
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopiedId(syncId);
      setTimeout(() => setCopiedId((prev) => (prev === syncId ? null : prev)), 2000);
    }
  };

  const handleDelete = async (syncId) => {
    setDeletingId(syncId);
    try {
      await deleteTicker(syncId);
      setTickers((prev) => prev.filter((t) => t.id !== syncId));
    } catch (err) {
      console.warn("Failed to delete ticker", err);
    } finally {
      setDeletingId(null);
    }
  };

  const startEditing = (ticker) => {
    const current = ticker.name || suggestName(ticker.payload) || ticker.id.slice(0, 8);
    setEditingId(ticker.id);
    setEditValue(current);
    setTimeout(() => editInputRef.current?.select(), 0);
  };

  const commitRename = async (syncId) => {
    const trimmed = editValue.trim();
    setEditingId(null);
    if (!trimmed) return;
    try {
      await renameTicker(syncId, trimmed);
      setTickers((prev) =>
        prev.map((t) => (t.id === syncId ? { ...t, name: trimmed } : t))
      );
    } catch (err) {
      console.warn("Failed to rename ticker", err);
    }
  };

  const handleEditKeyDown = (event, syncId) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitRename(syncId);
    } else if (event.key === "Escape") {
      setEditingId(null);
    }
  };

  /* ── Slug editing ──────────────────────────────────────────────────────── */
  const startEditingSlug = (ticker) => {
    setEditingSlugId(ticker.id);
    setSlugValue(ticker.id);
    setSlugError(null);
    setTimeout(() => slugInputRef.current?.select(), 0);
  };

  const cancelSlugEdit = () => {
    setEditingSlugId(null);
    setSlugError(null);
  };

  const commitSlugChange = async (currentId) => {
    const trimmed = slugValue.trim().toLowerCase();
    setSlugError(null);

    if (trimmed === currentId) {
      setEditingSlugId(null);
      return;
    }

    if (!isValidSlug(trimmed)) {
      setSlugError("3-64 chars, lowercase letters, numbers & hyphens only");
      return;
    }

    setSlugSaving(true);
    try {
      const result = await changeSlug(currentId, trimmed);
      const newId = result.id;
      setTickers((prev) =>
        prev.map((t) => (t.id === currentId ? { ...t, id: newId } : t))
      );
      setEditingSlugId(null);
      broadcastSlugChange({ oldId: currentId, newId });
      deleteTicker(currentId).catch(() => {});
      setTimeout(() => deleteTicker(currentId).catch(() => {}), 2000);
    } catch (err) {
      if (err.status === 409) {
        setSlugError("This slug is already taken");
      } else if (err.status === 400) {
        setSlugError(err.message);
      } else {
        setSlugError("Failed to update slug");
        console.warn("Slug change failed", err);
      }
    } finally {
      setSlugSaving(false);
    }
  };

  const handleSlugKeyDown = (event, currentId) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitSlugChange(currentId);
    } else if (event.key === "Escape") {
      cancelSlugEdit();
    }
  };

  if (loading) {
    return (
      <div className="page-shell flex min-h-screen items-center justify-center">
        <div className="text-lg" style={{ color: "var(--text-muted)" }}>
          Loading tickers...
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
        >
          <div className="flex items-center gap-4">
            <img
              src="/NCPA-Logo.jpg"
              alt="NCPA"
              className="size-11 rounded-lg object-cover shadow-lg"
              style={{ border: "1px solid var(--border-default)" }}
            />
            <div>
              <h1 className="section-heading text-3xl">
                Ticker Dashboard
              </h1>
              <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
                Manage your pickleball match tickers
              </p>
            </div>
          </div>
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: EASE_OUT_EXPO }}
          >
            <motion.button
              type="button"
              onClick={() => navigate("/admin")}
              className="btn-ghost"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                <path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.993 6.993 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
              </svg>
              Admin
            </motion.button>
            <motion.button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="btn-primary"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {creating ? (
                <svg className="size-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                  <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                </svg>
              )}
              {creating ? "Creating..." : "New Ticker"}
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Error */}
        {error && (
          <motion.div
            className="mb-6 rounded-lg px-4 py-3 text-sm"
            style={{
              background: "var(--danger-muted)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#fca5a5",
            }}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
            <button
              type="button"
              onClick={fetchTickers}
              className="ml-3 font-medium underline transition-colors hover:text-white"
            >
              Retry
            </button>
          </motion.div>
        )}

        {/* Empty state */}
        {!error && tickers.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
            className="flex flex-col items-center justify-center rounded-2xl px-6 py-20 text-center"
            style={{
              background: "var(--bg-surface)",
              border: "1px dashed var(--border-default)",
            }}
          >
            <div
              className="mb-4 rounded-full p-4"
              style={{ background: "var(--bg-elevated)" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-10" style={{ color: "var(--text-muted)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
              </svg>
            </div>
            <h2 className="section-heading mb-2 text-xl">No tickers yet</h2>
            <p className="mb-6 max-w-sm text-sm" style={{ color: "var(--text-muted)" }}>
              Create your first ticker to start broadcasting a live pickleball scoreboard.
            </p>
            <motion.button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="btn-primary px-6 py-3"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {creating ? (
                <svg className="size-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                  <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                </svg>
              )}
              {creating ? "Creating..." : "Create Your First Ticker"}
            </motion.button>
          </motion.div>
        )}

        {/* Ticker cards grid */}
        {tickers.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {tickers.map((ticker, i) => {
                const payload = ticker.payload ?? {};
                const displayName =
                  ticker.name || suggestName(payload) || `Ticker ${ticker.id.slice(0, 8)}`;
                const matchInfo = payload.matchInfo ?? null;
                const games = matchInfo?.games ?? [];
                const game = games[matchInfo?.activeGameIndex ?? 0] ?? games[0];
                const isDeleting = deletingId === ticker.id;

                return (
                  <motion.div
                    key={ticker.id}
                    layout
                    initial={{ opacity: 0, y: 20, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4, delay: i * 0.06, ease: EASE_OUT_EXPO }}
                    className="group surface-card relative flex flex-col overflow-hidden"
                    style={{
                      transition: "border-color 0.2s, box-shadow 0.3s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-strong)";
                      e.currentTarget.style.boxShadow = "0 0 30px rgba(0, 229, 160, 0.06)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-subtle)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {/* Mini Scoreboard preview */}
                    <div
                      className="relative overflow-hidden px-3 pt-3 pb-2"
                      style={{
                        background: "var(--bg-base)",
                        borderBottom: "1px solid var(--border-subtle)",
                      }}
                    >
                      <div
                        className="pointer-events-none origin-top-left"
                        style={{ transform: "scale(0.48)", height: 100, width: "208%" }}
                      >
                        <Scoreboard
                          matchInfo={matchInfo}
                          primaryColor={payload.primaryColor ?? DEFAULT_PRIMARY}
                          secondaryColor={payload.secondaryColor ?? DEFAULT_SECONDARY}
                          scoreBackground={payload.scoreBackground ?? DEFAULT_SCORE_BACKGROUND}
                          badgeBackground={payload.badgeBackground ?? DEFAULT_BADGE_BACKGROUND}
                          showBorder={payload.showBorder ?? false}
                          manualTextColor={
                            payload.manualTextColorEnabled
                              ? payload.manualTextColor ?? null
                              : null
                          }
                          useFullAssociationName={payload.useFullAssociationName ?? false}
                          logoImage={payload.logoImage ?? null}
                          logoTransparentBackground={payload.logoTransparentBackground ?? false}
                          logoTextHidden={payload.logoTextHidden ?? false}
                          logoPosition={payload.logoPosition}
                          logoScale={payload.logoScale}
                          teamLogoScale={payload.teamLogoScale}
                          tickerOverrides={payload.tickerOverrides}
                        />
                      </div>
                    </div>

                    {/* Card body */}
                    <div className="flex flex-1 flex-col gap-2 px-4 py-3">
                      {/* Editable name */}
                      {editingId === ticker.id ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => commitRename(ticker.id)}
                          onKeyDown={(e) => handleEditKeyDown(e, ticker.id)}
                          className="input-field px-2 py-1 text-sm font-semibold"
                          autoFocus
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditing(ticker)}
                          className="group/name flex items-center gap-1.5 text-left"
                          title="Click to rename"
                        >
                          <span className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                            {displayName}
                          </span>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover/name:opacity-100" style={{ color: "var(--text-muted)" }}>
                            <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L3.305 10.22a1 1 0 0 0-.26.44l-.873 3.128a.75.75 0 0 0 .926.926l3.128-.873a1 1 0 0 0 .44-.26l7.708-7.708a1.75 1.75 0 0 0 0-2.475l-.886-.886Z" />
                          </svg>
                        </button>
                      )}

                      {/* Editable slug / custom URL */}
                      {editingSlugId === ticker.id ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="shrink-0 text-[11px]" style={{ color: "var(--text-muted)" }}>URL:</span>
                            <input
                              ref={slugInputRef}
                              type="text"
                              value={slugValue}
                              onChange={(e) => {
                                setSlugValue(e.target.value);
                                setSlugError(null);
                              }}
                              onBlur={() => {
                                if (!slugSaving) commitSlugChange(ticker.id);
                              }}
                              onKeyDown={(e) => handleSlugKeyDown(e, ticker.id)}
                              disabled={slugSaving}
                              className="input-field min-w-0 flex-1 px-1.5 py-0.5 font-mono text-[11px] disabled:opacity-50"
                              style={
                                slugError
                                  ? { borderColor: "var(--danger)", boxShadow: "0 0 0 3px var(--danger-muted)" }
                                  : {}
                              }
                              autoFocus
                            />
                          </div>
                          {slugError && (
                            <p className="text-[10px] leading-tight" style={{ color: "#fca5a5" }}>{slugError}</p>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditingSlug(ticker)}
                          className="group/slug flex items-center gap-1.5 text-left"
                          title="Click to customize URL slug"
                        >
                          <span className="shrink-0 text-[11px]" style={{ color: "var(--text-muted)" }}>URL:</span>
                          <span className="truncate font-mono text-[11px]" style={{ color: "var(--text-secondary)" }}>
                            {ticker.id}
                          </span>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3 shrink-0 opacity-0 transition-opacity group-hover/slug:opacity-100" style={{ color: "var(--text-muted)" }}>
                            <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L3.305 10.22a1 1 0 0 0-.26.44l-.873 3.128a.75.75 0 0 0 .926.926l3.128-.873a1 1 0 0 0 .44-.26l7.708-7.708a1.75 1.75 0 0 0 0-2.475l-.886-.886Z" />
                          </svg>
                        </button>
                      )}

                      {/* Match details */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                        {game?.t1_name && game?.t2_name && (
                          <span className="truncate">
                            {game.t1_name} vs {game.t2_name}
                          </span>
                        )}
                        {game && (
                          <span className="font-mono tabular-nums">
                            {game.t1_score ?? 0} - {game.t2_score ?? 0}
                          </span>
                        )}
                      </div>

                      {/* Timestamps */}
                      <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
                        {ticker.updated_at && (
                          <span title={new Date(ticker.updated_at).toLocaleString()}>
                            Updated {relativeTime(ticker.updated_at)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div
                      className="flex"
                      style={{ borderTop: "1px solid var(--border-subtle)" }}
                    >
                      {[
                        {
                          label: "Settings",
                          onClick: () => handleOpenSettings(ticker.id),
                          icon: (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5">
                              <path fillRule="evenodd" d="M6.455 1.45A.5.5 0 0 1 6.952 1h2.096a.5.5 0 0 1 .497.45l.186 1.858a4.996 4.996 0 0 1 1.466.848l1.703-.769a.5.5 0 0 1 .639.206l1.048 1.814a.5.5 0 0 1-.142.656l-1.517 1.09a5.026 5.026 0 0 1 0 1.694l1.517 1.09a.5.5 0 0 1 .142.656l-1.048 1.814a.5.5 0 0 1-.639.206l-1.703-.769c-.433.36-.928.649-1.466.848l-.186 1.858a.5.5 0 0 1-.497.45H6.952a.5.5 0 0 1-.497-.45l-.186-1.858a4.993 4.993 0 0 1-1.466-.848l-1.703.769a.5.5 0 0 1-.639-.206L1.413 10.7a.5.5 0 0 1 .142-.656l1.517-1.09a5.026 5.026 0 0 1 0-1.694l-1.517-1.09a.5.5 0 0 1-.142-.656l1.048-1.814a.5.5 0 0 1 .639-.206l1.703.769c.433-.36.928-.649 1.466-.848l.186-1.858ZM8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" clipRule="evenodd" />
                            </svg>
                          ),
                        },
                        {
                          label: "Ticker",
                          onClick: () => handleOpenTicker(ticker.id),
                          icon: (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5">
                              <path d="M6.22 8.72a.75.75 0 0 0 1.06 1.06l5.22-5.22v1.69a.75.75 0 0 0 1.5 0v-3.5a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0 0 1.5h1.69L6.22 8.72Z" />
                              <path d="M3.5 6.75c0-.69.56-1.25 1.25-1.25H7A.75.75 0 0 0 7 4H4.75A2.75 2.75 0 0 0 2 6.75v4.5A2.75 2.75 0 0 0 4.75 14h4.5A2.75 2.75 0 0 0 12 11.25V9a.75.75 0 0 0-1.5 0v2.25c0 .69-.56 1.25-1.25 1.25h-4.5c-.69 0-1.25-.56-1.25-1.25v-4.5Z" />
                            </svg>
                          ),
                        },
                        {
                          label: copiedId === ticker.id ? "Copied" : "Copy URL",
                          onClick: () => handleCopyUrl(ticker.id),
                          icon:
                            copiedId === ticker.id ? (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5" style={{ color: "var(--accent)" }}>
                                <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5">
                                <path d="M5.5 3.5A1.5 1.5 0 0 1 7 2h2.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 1 .439 1.061V9.5A1.5 1.5 0 0 1 12 11V8.621a3 3 0 0 0-.879-2.121L9 4.379A3 3 0 0 0 6.879 3.5H5.5Z" />
                                <path d="M4 5a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 4 14h5a1.5 1.5 0 0 0 1.5-1.5V8.621a1.5 1.5 0 0 0-.44-1.06L7.94 5.439A1.5 1.5 0 0 0 6.878 5H4Z" />
                              </svg>
                            ),
                          accent: copiedId === ticker.id,
                        },
                      ].map((action, actionIdx) => (
                        <button
                          key={action.label}
                          type="button"
                          onClick={action.onClick}
                          className="flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-medium transition-colors"
                          style={{
                            color: action.accent ? "var(--accent)" : "var(--text-secondary)",
                            borderLeft: actionIdx > 0 ? "1px solid var(--border-subtle)" : "none",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "var(--bg-elevated)";
                            if (!action.accent) e.currentTarget.style.color = "var(--text-primary)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            if (!action.accent) e.currentTarget.style.color = "var(--text-secondary)";
                          }}
                          title={action.label}
                        >
                          {action.icon}
                          {action.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleDelete(ticker.id)}
                        disabled={isDeleting}
                        className="flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-medium transition-colors disabled:opacity-50"
                        style={{
                          color: "var(--danger)",
                          borderLeft: "1px solid var(--border-subtle)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "var(--danger-muted)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                        title="Delete ticker"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5">
                          <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.712Z" clipRule="evenodd" />
                        </svg>
                        {isDeleting ? "..." : "Delete"}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
