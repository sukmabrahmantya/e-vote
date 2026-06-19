import { useEffect, useState } from "react";
import { api, type Candidate } from "../lib/api";
import { Card } from "../components/Card";

type VotePageProps = {
  navigate: (path: string) => void;
};

type ToastState = {
  message: string;
  type: "error" | "success";
};

export function VotePage({ navigate }: VotePageProps) {
  const [step, setStep] = useState<"code" | "vote" | "done">("code");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [customName, setCustomName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleValidateCode(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setToast(null);
    setIsLoading(true);

    try {
      await api.validateCode(code.trim());
      const response = await api.getCandidates();
      setCandidates(response.candidates);
      setStep("vote");
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : "Kode tidak valid",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVote(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    const isCustom = selectedCandidateId === "custom";

    if (!selectedCandidateId) {
      setError("Silakan pilih kandidat terlebih dahulu.");
      return;
    }

    if (isCustom && !customName.trim()) {
      setError("Silakan isi nama kandidat pilihan Anda.");
      return;
    }

    setIsLoading(true);

    try {
      await api.submitVote({
        code: code.trim(),
        candidateId: selectedCandidateId,
        customName: isCustom ? customName.trim() : undefined,
      });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan vote");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    document.title = "Vote | E-Vote";
  }, []);

  useEffect(() => {
    if (!toast?.message) return;

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  return (
    <main className="mx-auto flex flex-col min-h-screen w-full justify-center items-center p-4">
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
      <div className="mb-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
          E-Vote
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
          Halaman Voting
        </h1>
        <p className="mt-2 text-slate-600">
          Masukkan unique code yang diberikan admin untuk mulai memilih.
        </p>
      </div>

      {step === "code" && (
        <Card className="mx-auto w-full max-w-md">
          <form onSubmit={handleValidateCode} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Unique Code
              </span>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="Contoh: A7X9K2"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-lg font-semibold tracking-widest outline-none focus:border-slate-950"
              />
            </label>

            <button
              disabled={isLoading || !code.trim()}
              className="w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {isLoading ? "Memeriksa..." : "Masuk ke Voting"}
            </button>
          </form>
        </Card>
      )}

      {step === "vote" && (
        <form onSubmit={handleVote} className="space-y-6">
          <div className="space-y-4">
            {candidates.map((candidate) => (
              <button
                type="button"
                key={candidate.id}
                onClick={() => setSelectedCandidateId(candidate.id)}
                className={`group relative flex min-h-36 w-full items-stretch overflow-hidden rounded-3xl border bg-white text-left shadow-sm transition ${
                  selectedCandidateId === candidate.id
                    ? "border-emerald-500 shadow-lg ring-2 ring-emerald-200"
                    : "border-slate-200 hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md"
                }`}
              >
                <div
                  className={`w-3 shrink-0 ${
                    selectedCandidateId === candidate.id
                      ? "bg-emerald-500"
                      : "bg-slate-100 group-hover:bg-slate-200"
                  }`}
                />
                <div className="flex flex-1 items-start justify-between gap-4 p-5 md:p-6">
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-bold ${
                        selectedCandidateId === candidate.id
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {candidate.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex min-h-24 flex-1 flex-col justify-between">
                      <div>
                        <p className="text-xl font-bold text-slate-950">
                          {candidate.name}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {candidate.description || "-"}
                        </p>
                      </div>
                      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                        Tekan untuk memilih
                      </p>
                    </div>
                  </div>
                  <div
                    className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold transition ${
                      selectedCandidateId === candidate.id
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-slate-300 bg-white text-slate-400"
                    }`}
                  >
                    {selectedCandidateId === candidate.id ? "OK" : ""}
                  </div>
                </div>
              </button>
            ))}

            <button
              type="button"
              onClick={() => setSelectedCandidateId("custom")}
              className={`group relative w-full overflow-hidden rounded-3xl border bg-white text-left shadow-sm transition ${
                selectedCandidateId === "custom"
                  ? "border-amber-500 shadow-lg ring-2 ring-amber-200"
                  : "border-slate-200 hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md"
              }`}
            >
              <div
                className={`absolute inset-y-0 left-0 w-3 ${
                  selectedCandidateId === "custom"
                    ? "bg-amber-500"
                    : "bg-slate-100 group-hover:bg-slate-200"
                }`}
              />
              <div className="flex min-h-36 items-start justify-between gap-4 p-5 pl-8 md:p-6 md:pl-9">
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-bold ${
                      selectedCandidateId === "custom"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    ?
                  </div>
                  <div className="flex min-h-24 flex-1 flex-col justify-between">
                    <div>
                      <p className="text-xl font-bold text-slate-950">
                        Isi sendiri
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Pilih kandidat di luar daftar yang tersedia dan isi nama
                        secara manual.
                      </p>
                    </div>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Opsi alternatif
                    </p>
                  </div>
                </div>
                <div
                  className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold transition ${
                    selectedCandidateId === "custom"
                      ? "border-amber-500 bg-amber-500 text-white"
                      : "border-slate-300 bg-white text-slate-400"
                  }`}
                >
                  {selectedCandidateId === "custom" ? "OK" : ""}
                </div>
              </div>

              {selectedCandidateId === "custom" && (
                <div className="border-t border-amber-100 bg-amber-50/60 px-5 py-5 md:px-6">
                  <input
                    value={customName}
                    onChange={(event) => setCustomName(event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    placeholder="Nama kandidat"
                    className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 outline-none focus:border-amber-500"
                  />
                </div>
              )}
            </button>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-center">
            <button
              disabled={isLoading}
              className="rounded-xl bg-slate-950 px-8 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {isLoading ? "Menyimpan..." : "Submit Vote"}
            </button>
          </div>
        </form>
      )}

      {step === "done" && (
        <Card className="mx-auto max-w-lg text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-slate-950">Terima kasih</h2>
          <p className="mt-2 text-slate-600">
            Vote Anda sudah berhasil disimpan. Unique code ini tidak dapat
            digunakan kembali.
          </p>
        </Card>
      )}
    </main>
  );
}
