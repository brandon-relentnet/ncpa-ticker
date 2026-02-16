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
import {
  Settings,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  Plus,
  Loader2,
  Pencil,
  BarChart3,
  AlertCircle,
  RotateCcw,
  Clock,
} from "lucide-react";

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
        <div className="flex items-center gap-3 text-lg" style={{ color: "var(--text-muted)" }}>
          <Loader2 size={22} className="animate-spin" />
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
              <Settings size={16} />
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
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Plus size={18} />
              )}
              {creating ? "Creating..." : "New Ticker"}
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Error */}
        {error && (
          <motion.div
            className="mb-6 flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
            style={{
              background: "var(--danger-muted)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#fca5a5",
            }}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertCircle size={16} className="shrink-0" />
            {error}
            <button
              type="button"
              onClick={fetchTickers}
              className="ml-2 flex items-center gap-1 font-medium underline transition-colors hover:text-white"
            >
              <RotateCcw size={14} />
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
              <BarChart3 size={40} style={{ color: "var(--text-muted)" }} />
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
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Plus size={18} />
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
                          <Pencil size={12} className="shrink-0 opacity-0 transition-opacity group-hover/name:opacity-100" style={{ color: "var(--text-muted)" }} />
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
                          <Pencil size={10} className="shrink-0 opacity-0 transition-opacity group-hover/slug:opacity-100" style={{ color: "var(--text-muted)" }} />
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
                          <span className="flex items-center gap-1" title={new Date(ticker.updated_at).toLocaleString()}>
                            <Clock size={11} />
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
                          icon: <Settings size={14} />,
                        },
                        {
                          label: "Ticker",
                          onClick: () => handleOpenTicker(ticker.id),
                          icon: <ExternalLink size={14} />,
                        },
                        {
                          label: copiedId === ticker.id ? "Copied" : "Copy URL",
                          onClick: () => handleCopyUrl(ticker.id),
                          icon:
                            copiedId === ticker.id ? (
                              <Check size={14} style={{ color: "var(--accent)" }} />
                            ) : (
                              <Copy size={14} />
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
                        {isDeleting ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
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
