import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb";
import { fetchAppConfig, saveAppConfig } from "../utils/configService";

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

  const breadcrumbItems = [
    { label: "Dashboard", to: "/" },
    { label: "Admin" },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="text-lg text-slate-400">Loading configuration...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Breadcrumb items={breadcrumbItems} />
        </div>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Admin Configuration
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Global settings for the NCPA ticker application.
              {lastSaved && (
                <span className="ml-2 text-slate-500">
                  Last saved: {new Date(lastSaved).toLocaleString()}
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
            Dashboard
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {success}
            <span className="ml-2 text-emerald-500/60">
              Open tabs need a page refresh to pick up changes.
            </span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
            <h2 className="mb-5 text-lg font-semibold text-slate-200">
              NCPA Tournament API
            </h2>
            <div className="space-y-5">
              {FIELD_DEFS.map((field) => (
                <div key={field.key}>
                  <label
                    htmlFor={`admin-${field.key}`}
                    className="mb-1.5 block text-sm font-medium text-slate-300"
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
                      className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    {field.type === "password" && (
                      <button
                        type="button"
                        onClick={() => setShowApiKey((prev) => !prev)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition-colors hover:text-slate-200"
                        title={showApiKey ? "Hide API key" : "Show API key"}
                      >
                        {showApiKey ? (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                            <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.092 1.092a4 4 0 0 0-5.558-5.558Z" clipRule="evenodd" />
                            <path d="M10.748 13.93l2.523 2.523a9.987 9.987 0 0 1-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 0 1 0-1.186A10.007 10.007 0 0 1 4.09 5.12l2.109 2.109a4 4 0 0 0 4.55 4.55 2.5 2.5 0 0 1-.002 2.15Z" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                            <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                            <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                  {field.help && (
                    <p className="mt-1 text-xs text-slate-500">{field.help}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white disabled:opacity-50"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-60"
            >
              {saving && (
                <svg className="size-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {saving ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        </form>

        {/* Info box */}
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/40 p-5 text-sm text-slate-400">
          <h3 className="mb-2 font-medium text-slate-300">How it works</h3>
          <ul className="list-inside list-disc space-y-1">
            <li>
              Configuration is stored server-side and loaded when the app starts.
            </li>
            <li>
              Already-open tabs need a <strong className="text-slate-300">page refresh</strong> to
              pick up changes.
            </li>
            <li>
              Build-time environment variables (<code className="text-slate-300">VITE_*</code>) are
              used as fallbacks when the server config is empty.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
