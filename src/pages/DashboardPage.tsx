import { useEffect, useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ApiError,
  api,
  type Candidate,
  type CodeRow,
  type ResultRow,
  type VoteLogRow,
} from "../lib/api";
import { Card } from "../components/Card";
import { ConfirmDialog } from "../components/ConfirmDialog";

type DashboardPageProps = {
  navigate: (path: string) => void;
};

type ToastState = {
  message: string;
  type: "error" | "success";
};

export function DashboardPage({ navigate }: DashboardPageProps) {
  const codesPerPage = 10;
  const logsPerPage = 10;
  const [password, setPassword] = useState(
    () => localStorage.getItem("admin_password") ?? "",
  );
  const [draftPassword, setDraftPassword] = useState("");
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [logs, setLogs] = useState<VoteLogRow[]>([]);
  const [newCandidateName, setNewCandidateName] = useState("");
  const [newCandidateDescription, setNewCandidateDescription] = useState("");
  const [generateCount, setGenerateCount] = useState(10);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(
    null,
  );
  const [isDeletingCandidate, setIsDeletingCandidate] = useState(false);
  const [codePage, setCodePage] = useState(1);
  const [logPage, setLogPage] = useState(1);
  const [copiedCode, setCopiedCode] = useState("");

  const isLoggedIn = Boolean(password);

  function formatVoteDate(value: string) {
    const date = new Date(value);

    const datePart = new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    }).format(date);

    const timePart = [
      String(date.getHours()).padStart(2, "0"),
      String(date.getMinutes()).padStart(2, "0"),
      String(date.getSeconds()).padStart(2, "0"),
    ].join(":");

    return `${datePart}, ${timePart}`;
  }

  function clearSession(showToast?: string) {
    localStorage.removeItem("admin_password");
    setPassword("");
    setDraftPassword("");
    setCodes([]);
    setCandidates([]);
    setResults([]);
    setLogs([]);
    setGeneratedCodes([]);
    if (showToast) {
      setToast({
        message: showToast,
        type: "error",
      });
    }
  }

  async function loadDashboard(currentPassword = password) {
    if (!currentPassword) return;

    setError("");

    try {
      const [codesRes, candidatesRes, resultsRes, logsRes] = await Promise.all([
        api.admin.getCodes(currentPassword),
        api.admin.getCandidates(currentPassword),
        api.admin.getResults(currentPassword),
        api.admin.getVoteLogs(currentPassword),
      ]);

      setCodes(codesRes.codes);
      setCandidates(candidatesRes.candidates);
      setResults(resultsRes.results);
      setLogs(logsRes.logs);
      setCodePage(1);
      setLogPage(1);
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession(err.message);
        return false;
      }

      setError(err instanceof Error ? err.message : "Gagal memuat dashboard");
      return false;
    }
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    const success = await loadDashboard(draftPassword);

    if (!success) return;

    localStorage.setItem("admin_password", draftPassword);
    setPassword(draftPassword);
    setDraftPassword("");
  }

  function handleLogout() {
    clearSession();
  }

  async function handleGenerateCodes() {
    setError("");

    try {
      const response = await api.admin.generateCodes(password, generateCount);
      setGeneratedCodes(response.codes);
      await loadDashboard();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession(err.message);
        return;
      }

      setError(err instanceof Error ? err.message : "Gagal generate code");
    }
  }

  async function handleCreateCandidate(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    try {
      const response = await api.admin.createCandidate(password, {
        name: newCandidateName,
        description: newCandidateDescription,
      });
      setCandidates((current) => [...current, response.candidate]);
      setResults((current) => [
        ...current,
        {
          candidate_id: response.candidate.id,
          candidate_name: response.candidate.name,
          votes: 0,
        },
      ]);
      setNewCandidateName("");
      setNewCandidateDescription("");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession(err.message);
        return;
      }

      setError(err instanceof Error ? err.message : "Gagal menambah kandidat");
    }
  }

  async function handleDeleteCandidate() {
    if (!candidateToDelete) return;
    setIsDeletingCandidate(true);
    try {
      await api.admin.deleteCandidate(password, candidateToDelete.id);
      setCandidates((current) =>
        current.filter((candidate) => candidate.id !== candidateToDelete.id),
      );
      setResults((current) =>
        current.filter(
          (result) => result.candidate_id !== candidateToDelete.id,
        ),
      );
      setCandidateToDelete(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession(err.message);
        return;
      }

      setError(err instanceof Error ? err.message : "Gagal menghapus kandidat");
    } finally {
      setIsDeletingCandidate(false);
    }
  }

  async function copyText(value: string) {
    if (window.isSecureContext && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";

    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    const successful = document.execCommand("copy");
    document.body.removeChild(textarea);

    if (!successful) {
      throw new Error("Copy command failed");
    }
  }

  async function handleCopyCode(code: string) {
    try {
      await copyText(code);
      setCopiedCode(code);
      setToast({
        message: `Code ${code} berhasil disalin`,
        type: "success",
      });
    } catch {
      setToast({
        message: "Gagal menyalin code",
        type: "error",
      });
    }
  }

  const summary = useMemo(() => {
    const totalVotes = results.reduce((sum, item) => sum + item.votes, 0);
    const usedCodes = codes.filter((item) => item.status === "used").length;
    const unusedCodes = codes.filter((item) => item.status === "unused").length;

    return {
      totalVotes,
      totalCodes: codes.length,
      usedCodes,
      unusedCodes,
    };
  }, [codes, results]);

  const totalCodePages = Math.max(1, Math.ceil(codes.length / codesPerPage));
  const totalLogPages = Math.max(1, Math.ceil(logs.length / logsPerPage));
  const paginatedCodes = useMemo(() => {
    const startIndex = (codePage - 1) * codesPerPage;
    return codes.slice(startIndex, startIndex + codesPerPage);
  }, [codePage, codes]);
  const paginatedLogs = useMemo(() => {
    const startIndex = (logPage - 1) * logsPerPage;
    return logs.slice(startIndex, startIndex + logsPerPage);
  }, [logPage, logs]);

  useEffect(() => {
    setCodePage((current) => Math.min(current, totalCodePages));
  }, [totalCodePages]);

  useEffect(() => {
    setLogPage((current) => Math.min(current, totalLogPages));
  }, [totalLogPages]);

  useEffect(() => {
    document.title = "Dashboard | E-Vote";
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password]);

  useEffect(() => {
    if (!toast?.message) return;

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    if (!copiedCode) return;

    const timeoutId = window.setTimeout(() => {
      setCopiedCode("");
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [copiedCode]);

  if (!isLoggedIn) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
        {toast && (
          <div
            className={`fixed right-4 top-4 z-50 max-w-sm rounded-2xl px-4 py-3 text-sm font-medium shadow-lg ${
              toast.type === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {toast.message}
          </div>
        )}
        <Card className="w-full">
          <div className="mb-6 flex justify-end">
            <button
              type="button"
              onClick={() => navigate("/vote")}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
            >
              Ke Halaman Voting
            </button>
          </div>
          <h1 className="text-2xl font-bold text-slate-950">Admin Login</h1>
          <p className="mt-2 text-sm text-slate-600">
            Masukkan password admin untuk membuka dashboard.
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <input
              type="password"
              value={draftPassword}
              onChange={(event) => setDraftPassword(event.target.value)}
              placeholder="Admin password"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-950"
            />
            <button className="w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white">
              Login
            </button>
          </form>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 max-w-sm rounded-2xl px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {toast.message}
        </div>
      )}
      <ConfirmDialog
        open={Boolean(candidateToDelete)}
        title="Hapus kandidat?"
        description={
          candidateToDelete
            ? `Kandidat "${candidateToDelete.name}" akan dihapus dari daftar. Tindakan ini tidak bisa dibatalkan.`
            : ""
        }
        confirmLabel="Hapus"
        isBusy={isDeletingCandidate}
        onCancel={() => setCandidateToDelete(null)}
        onConfirm={handleDeleteCandidate}
      />
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
            E-Vote
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Dashboard Admin
          </h1>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleLogout}
            className="rounded-xl bg-slate-950 px-4 py-2 font-medium text-white"
          >
            Logout
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-500">Total Vote</p>
          <p className="mt-2 text-3xl font-bold">{summary.totalVotes}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Total Code</p>
          <p className="mt-2 text-3xl font-bold">{summary.totalCodes}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Code Terpakai</p>
          <p className="mt-2 text-3xl font-bold">{summary.usedCodes}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Code Belum Terpakai</p>
          <p className="mt-2 text-3xl font-bold">{summary.unusedCodes}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-bold">Grafik Hasil Vote</h2>
            <div className="mt-6 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={results}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="candidate_name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="votes" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 ">
            <Card>
              <h2 className="text-xl font-bold">Log Pemilihan</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="border-b text-slate-500">
                      <th className="py-3">Waktu</th>
                      <th>Code</th>
                      <th>Pilihan</th>
                      <th>Custom</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLogs.map((log) => (
                      <tr key={log.id} className="border-b last:border-0">
                        <td className="py-3">{formatVoteDate(log.voted_at)}</td>
                        <td>{log.code}</td>
                        <td>{log.candidate_name}</td>
                        <td>{log.custom_name || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-slate-500">
                  Menampilkan {paginatedLogs.length} dari {logs.length} data
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setLogPage((current) => Math.max(1, current - 1))
                    }
                    disabled={logPage === 1}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Sebelumnya
                  </button>
                  <div className="flex items-center gap-2">
                    {Array.from(
                      { length: totalLogPages },
                      (_, index) => index + 1,
                    ).map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setLogPage(page)}
                        className={`h-10 min-w-10 rounded-xl px-3 text-sm font-semibold transition ${
                          page === logPage
                            ? "bg-slate-950 text-white"
                            : "border border-slate-300 text-slate-700"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setLogPage((current) =>
                        Math.min(totalLogPages, current + 1),
                      )
                    }
                    disabled={logPage === totalLogPages}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-xl font-bold">List Unique Code</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead>
                    <tr className="border-b text-slate-500">
                      <th className="py-3">Code</th>
                      <th>Status</th>
                      <th className="text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCodes.map((codeRow) => (
                      <tr key={codeRow.code} className="border-b last:border-0">
                        <td className="py-3 font-mono font-semibold tracking-[0.18em] text-slate-950">
                          {codeRow.code}
                        </td>
                        <td>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              codeRow.status === "used"
                                ? "bg-slate-200 text-slate-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {codeRow.status === "used"
                              ? "Terpakai"
                              : "Tersedia"}
                          </span>
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            onClick={() => handleCopyCode(codeRow.code)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
                          >
                            {copiedCode === codeRow.code ? (
                              <Check size={16} />
                            ) : (
                              <Copy size={16} />
                            )}
                            {copiedCode === codeRow.code ? "Copied" : "Copy"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-slate-500">
                  Menampilkan {paginatedCodes.length} dari {codes.length} data
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCodePage((current) => Math.max(1, current - 1))
                    }
                    disabled={codePage === 1}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Sebelumnya
                  </button>
                  <div className="flex items-center gap-2">
                    {Array.from(
                      { length: totalCodePages },
                      (_, index) => index + 1,
                    ).map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCodePage(page)}
                        className={`h-10 min-w-10 rounded-xl px-3 text-sm font-semibold transition ${
                          page === codePage
                            ? "bg-slate-950 text-white"
                            : "border border-slate-300 text-slate-700"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCodePage((current) =>
                        Math.min(totalCodePages, current + 1),
                      )
                    }
                    disabled={codePage === totalCodePages}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-bold">Generate Unique Code</h2>
            <div className="mt-4 flex gap-2">
              <input
                type="number"
                min={1}
                max={500}
                value={generateCount}
                onChange={(event) =>
                  setGenerateCount(Number(event.target.value))
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-950"
              />
              <button
                onClick={handleGenerateCodes}
                className="rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white"
              >
                Generate
              </button>
            </div>

            {generatedCodes.length > 0 && (
              <div className="mt-4 rounded-xl bg-slate-100 p-4">
                <p className="mb-2 text-sm font-semibold">Code baru:</p>
                <textarea
                  readOnly
                  value={generatedCodes.join("\n")}
                  className="h-40 w-full resize-none rounded-lg border border-slate-200 bg-white p-3 font-mono text-sm"
                />
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-xl font-bold">Data Kandidat</h2>

            <form onSubmit={handleCreateCandidate} className="mt-4 space-y-3">
              <input
                value={newCandidateName}
                onChange={(event) => setNewCandidateName(event.target.value)}
                placeholder="Nama kandidat"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-950"
              />
              <textarea
                value={newCandidateDescription}
                onChange={(event) =>
                  setNewCandidateDescription(event.target.value)
                }
                placeholder="Deskripsi kandidat"
                className="h-24 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-950"
              />
              <button className="w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white">
                Tambah Kandidat
              </button>
            </form>

            <div className="mt-5 space-y-3">
              {candidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-bold">{candidate.name}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {candidate.description || "-"}
                      </p>
                    </div>
                    <button
                      onClick={() => setCandidateToDelete(candidate)}
                      className="text-sm font-semibold text-red-600"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
