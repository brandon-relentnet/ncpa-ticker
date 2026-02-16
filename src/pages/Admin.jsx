import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import Breadcrumb from "../components/Breadcrumb";
import { fetchAppConfig, saveAppConfig } from "../utils/configService";
import {
  ArrowLeft,
  Shield,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  RotateCcw,
  Save,
  Loader2,
  Info,
  Database,
  RefreshCw,
  Code2,
  Clock,
  Server,
} from "lucide-react";

const FIELD_DEFS = [
  {
    key: "ncpaApiKey",
    label: "NCPA API Key",
    placeholder: "e.g. CGdX1XsVxshMqZ4e06lV",
    type: "password",
    help: "Authentication key for the NCPA tournament API. Required for loading match data.",
  },
  {
    key: "ncpaApiBase",
    label: "API Base URL",
    placeholder: "https://tournaments.ncpaofficial.com",
    type: "url",
    help: "Base URL for the NCPA REST API. The app appends /api/get-games and /api/get-match.",
  },
  {
    key: "ncpaSocketUrl",
    label: "Socket URL",
    placeholder: "https://tournaments.ncpaofficial.com",
    type: "url",
    help: "Base URL for Socket.IO live game updates.",
  },
  {
    key: "defaultMatchId",
    label: "Default Match ID",
    placeholder: "e.g. 5092",
    type: "text",
    help: "Match ID used as the default when creating a new ticker.",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

const INFO_ITEMS = [
  {
    icon: <Database size={14} />,
    text: "Configuration is stored server-side and loaded when the app starts.",
  },
  {
    icon: <RefreshCw size={14} />,
    text: (
      <>
        Already-open tabs need a{" "}
        <strong style={{ color: "var(--text-secondary)" }}>page refresh</strong> to
        pick up changes.
      </>
    ),
  },
  {
    icon: <Code2 size={14} />,
    text: (
      <>
        Build-time environment variables (
        <code className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>VITE_*</code>
        ) are used as fallbacks when the server config is empty.
      </>
    ),
  },
];

export default function AdminPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState({
    ncpaApiKey: "",
    ncpaApiBase: "",
    ncpaSocketUrl: "",
    defaultMatchId: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  const loadConfig = useCallback(async () => {
    try {
      setError(null);
      const config = await fetchAppConfig();
      setValues({
        ncpaApiKey: config.ncpaApiKey ?? "",
        ncpaApiBase: config.ncpaApiBase ?? "",
        ncpaSocketUrl: config.ncpaSocketUrl ?? "",
        defaultMatchId: config.defaultMatchId ?? "",
      });
      if (config.updatedAt) setLastSaved(config.updatedAt);
    } catch (err) {
      console.warn("Failed to load app config", err);
      setError("Failed to load configuration. Is the sync server running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleChange = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSuccess(null);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await saveAppConfig(values);
      setSuccess("Configuration saved successfully.");
      if (result.updatedAt) setLastSaved(result.updatedAt);
    } catch (err) {
      console.warn("Failed to save config", err);
      setError(err.message || "Failed to save configuration.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    loadConfig();
    setSuccess(null);
  };

  if (loading) {
    return (
      <div className="page-shell flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3 text-lg" style={{ color: "var(--text-muted)" }}>
          <Loader2 size={22} className="animate-spin" />
          Loading configuration...
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumb current="Admin" />

        {/* Header */}
        <motion.div
          className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          {...fadeUp}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div>
            <h1 className="flex items-center gap-2.5 section-heading text-3xl">
              <Shield size={24} style={{ color: "var(--accent)" }} />
              Admin Configuration
            </h1>
            <p className="mt-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
              Global settings for the NCPA ticker application.
              {lastSaved && (
                <span className="ml-2 inline-flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                  <Clock size={12} />
                  Last saved: {new Date(lastSaved).toLocaleString()}
                </span>
              )}
            </p>
          </div>
          <motion.button
            type="button"
            onClick={() => navigate("/")}
            className="btn-ghost"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <ArrowLeft size={16} />
            Dashboard
          </motion.button>
        </motion.div>

        {/* Alerts */}
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
          </motion.div>
        )}
        {success && (
          <motion.div
            className="mb-6 flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
            style={{
              background: "var(--accent-muted)",
              border: "1px solid rgba(0, 229, 160, 0.3)",
              color: "var(--accent)",
            }}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <CheckCircle2 size={16} className="shrink-0" />
            {success}
            <span className="ml-1 opacity-60">
              Open tabs need a page refresh to pick up changes.
            </span>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-6">
          <motion.div
            className="surface-card p-6"
            style={{ boxShadow: "0 4px 24px rgba(0, 0, 0, 0.3)" }}
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              <Server size={18} style={{ color: "var(--accent)" }} />
              NCPA Tournament API
            </h2>
            <div className="space-y-5">
              {FIELD_DEFS.map((field, i) => (
                <motion.div
                  key={field.key}
                  {...fadeUp}
                  transition={{ duration: 0.4, delay: 0.15 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                >
                  <label
                    htmlFor={`admin-${field.key}`}
                    className="mb-1.5 block text-sm font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {field.label}
                  </label>
                  <div className="relative">
                    <input
                      id={`admin-${field.key}`}
                      type={
                        field.type === "password"
                          ? showApiKey
                            ? "text"
                            : "password"
                          : field.type || "text"
                      }
                      value={values[field.key]}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      autoComplete="off"
                      spellCheck={false}
                      className="input-field w-full"
                    />
                    {field.type === "password" && (
                      <button
                        type="button"
                        onClick={() => setShowApiKey((prev) => !prev)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 transition-colors"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                        title={showApiKey ? "Hide API key" : "Show API key"}
                      >
                        {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    )}
                  </div>
                  {field.help && (
                    <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                      {field.help}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div
            className="flex items-center justify-end gap-3"
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="btn-ghost"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <RotateCcw size={14} />
              Reset
            </motion.button>
            <motion.button
              type="submit"
              disabled={saving}
              className="btn-primary"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {saving ? "Saving..." : "Save Configuration"}
            </motion.button>
          </motion.div>
        </form>

        {/* Info box */}
        <motion.div
          className="surface-card mt-8 p-5 text-sm"
          style={{ color: "var(--text-secondary)" }}
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <h3 className="mb-3 flex items-center gap-2 font-semibold" style={{ color: "var(--text-primary)" }}>
            <Info size={16} style={{ color: "var(--accent)" }} />
            How it works
          </h3>
          <ul className="space-y-2" style={{ color: "var(--text-muted)" }}>
            {INFO_ITEMS.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0" style={{ color: "var(--text-secondary)" }}>
                  {item.icon}
                </span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
