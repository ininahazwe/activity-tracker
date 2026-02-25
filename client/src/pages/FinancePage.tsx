import { useEffect, useState } from "react";
import { financeApi } from "../utils/api";
import toast from "react-hot-toast";

export default function FinancePage() {
    const [finances, setFinances] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        financeApi
            .list()
            .then((res) => {
                // Axios retourne la réponse dans res.data
                setFinances(res.data || []);
            })
            .catch((error) => {
                console.error("[FINANCE] Error:", error);
                toast.error("Failed to load finance data");
            })
            .finally(() => setLoading(false));
    }, []);

    const total = finances.reduce((s: number, f: any) => s + (f.amount || 0), 0);

    return (
        <div>
            <div className="flex justify-between items-center mb-5">
                <div>
                    <h2 className="text-white text-xl font-extrabold">Finance</h2>
                    <p className="text-gray-500 text-xs">
                        {finances.length} grants — Total: ${(total / 1000000).toFixed(2)}M
                    </p>
                </div>
                <button className="btn-primary bg-gradient-to-r from-accent to-purple-500">
                    + Add Grant
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                    {
                        icon: "💰",
                        label: "Total Funding",
                        value: `$${(total / 1000000).toFixed(2)}M`,
                        color: "text-emerald-400",
                    },
                    {
                        icon: "📊",
                        label: "Avg / Project",
                        value: `$${finances.length > 0 ? Math.round(total / finances.length / 1000) : 0}k`,
                        color: "text-accent",
                    },
                    {
                        icon: "🆕",
                        label: "New Grants",
                        value: `$${(
                            finances
                                .filter((f: any) => f.status === "NEW")
                                .reduce((s: number, f: any) => s + (f.amount || 0), 0) / 1000
                        ).toFixed(0)}k`,
                        color: "text-amber-400",
                    },
                    {
                        icon: "📈",
                        label: "Continuous",
                        value: `$${(
                            finances
                                .filter((f: any) => f.status === "CONTINUOUS")
                                .reduce((s: number, f: any) => s + (f.amount || 0), 0) / 1000
                        ).toFixed(0)}k`,
                        color: "text-purple-400",
                    },
                ].map((k) => (
                    <div key={k.label} className="card p-5">
                        <div className="text-xl mb-2">{k.icon}</div>
                        <p className={`text-2xl font-extrabold font-mono ${k.color}`}>{k.value}</p>
                        <p className="text-gray-400 text-xs mt-1">{k.label}</p>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-500 text-sm">Loading...</div>
                ) : finances.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 text-sm">
                        No finance data yet. Create your first finance entry.
                    </div>
                ) : (
                    <table className="w-full text-xs">
                        <thead>
                        <tr>
                            {["Project", "Funder", "Amount", "Status", "Year"].map((h) => (
                                <th
                                    key={h}
                                    className="text-left text-gray-500 font-semibold uppercase tracking-wide text-[10px] px-4 py-3 border-b border-border"
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {finances.map((f: any) => (
                            <tr
                                key={f.id}
                                className="border-b border-border hover:bg-card-hover transition-colors"
                            >
                                <td className="px-4 py-3 text-white font-semibold">{f.project?.name || "-"}</td>
                                <td className="px-4 py-3 text-gray-400">{f.funder || "-"}</td>
                                <td className="px-4 py-3 font-mono font-semibold text-emerald-400">
                                    ${(f.amount || 0).toLocaleString()}
                                </td>
                                <td className="px-4 py-3">
                    <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-semibold
                      ${
                            f.status === "NEW"
                                ? "bg-amber-400/10 text-amber-400"
                                : "bg-purple-400/10 text-purple-400"
                        }`}
                    >
                      {f.status || "PENDING"}
                    </span>
                                </td>
                                <td className="px-4 py-3 text-gray-500 font-mono">{f.year || "-"}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}