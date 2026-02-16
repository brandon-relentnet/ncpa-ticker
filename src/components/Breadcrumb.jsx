import { Link } from "react-router-dom";

export default function Breadcrumb({ current }) {
  return (
    <nav className="mb-6 flex items-center gap-2 text-sm text-slate-400">
      <Link
        to="/"
        className="transition-colors hover:text-slate-200"
      >
        Dashboard
      </Link>
      <span className="text-slate-600">/</span>
      <span className="text-slate-200">{current}</span>
    </nav>
  );
}
