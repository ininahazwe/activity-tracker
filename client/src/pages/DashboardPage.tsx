import { useEffect, useState, useRef } from "react";
import { dashboardApi, referenceApi } from "../utils/api";
import toast from "react-hot-toast";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

// ─── UTILITIES ───
/**
 * Convertit une date au format ISO (YYYY-MM-DD) en format d'affichage (DD/MM/YYYY)
 */
const formatDateDisplay = (dateStr: string): string => {
  if (!dateStr) return "";
  const date = new Date(dateStr + "T00:00:00");
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Convertit une date du format d'affichage (DD/MM/YYYY) en format ISO (YYYY-MM-DD)
 */
const parseDateFromDDMMYYYY = (dateStr: string): string => {
  if (!dateStr) return "";
  const parts = dateStr.split("/");
  if (parts.length !== 3) return "";
  const day = String(parts[0]).padStart(2, "0");
  const month = String(parts[1]).padStart(2, "0");
  const year = parts[2];
  return `${year}-${month}-${day}`;
};

// ─── INTERFACES ───
interface DashboardStats {
  totalActivities: number;
  draftActivities: number;
  submittedActivities: number;
  validatedActivities: number;
  rejectedActivities: number;
  totalParticipants: number;
}

interface Filters {
  dateFrom: string;
  dateTo: string;
  countries: string[];
  funders: string[];
  thematicFocus: string[];
  projectId: string;
}

interface RefItem {
  id: string;
  name: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activitiesByStatus, setActivitiesByStatus] = useState<any[]>([]);
  const [participantsByGender, setParticipantsByGender] = useState<any[]>([]);
  const [activitiesTrend, setActivitiesTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState<Filters>({
    dateFrom: "",
    dateTo: "",
    countries: [],
    funders: [],
    thematicFocus: [],
    projectId: "",
  });

  const [referenceData, setReferenceData] = useState<{
    countries: RefItem[];
    funders: RefItem[];
    thematicFocus: RefItem[];
  }>({
    countries: [],
    funders: [],
    thematicFocus: [],
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Extraction corrigée pour descendre dans res.data.data [cite: 48, 50]
  const extractRefs = (res: any): RefItem[] => {
    const actualData = res?.data?.data;
    if (!actualData || !Array.isArray(actualData)) return [];
    return actualData.map((item: any) => ({
      id: item.id,
      name: item.name
    }));
  };

  useEffect(() => {
    Promise.all([
      referenceApi.list("country"),        // Catégorie corrigée [cite: 37, 39]
      referenceApi.list("funder"),         // Catégorie corrigée [cite: 48, 50]
      referenceApi.list("thematic_focus"), // Catégorie corrigée [cite: 43]
    ])
        .then(([countriesRes, fundersRes, thematicRes]) => {
          setReferenceData({
            countries: extractRefs(countriesRes),
            funders: extractRefs(fundersRes),
            thematicFocus: extractRefs(thematicRes),
          });
        })
        .catch((error) => console.error("[DASHBOARD] Error references:", error));
  }, []);

  const loadDashboardData = () => {
    setLoading(true);
    Promise.all([
      dashboardApi.stats(filters).then((res) => setStats(res.data)),
      dashboardApi.activitiesByStatus(filters).then((res) => setActivitiesByStatus(res.data || [])),
      dashboardApi.participantsByGender(filters).then((res) => setParticipantsByGender(res.data || [])),
      dashboardApi.activitiesTrend(filters).then((res) => setActivitiesTrend(res.data || [])),
    ])
        .catch((error) => {
          console.error("[DASHBOARD] Error loading data:", error);
          toast.error("Failed to update dashboard");
        })
        .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboardData();
  }, [filters]);

  const handleMultiSelectChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: (prev[key] as string[]).includes(value)
          ? (prev[key] as string[]).filter((v) => v !== value)
          : [...(prev[key] as string[]), value],
    }));
  };

  const resetFilters = () => {
    setFilters({
      dateFrom: "",
      dateTo: "",
      countries: [],
      funders: [],
      thematicFocus: [],
      projectId: "",
    });
    setOpenDropdown(null);
  };

  // Sélecteur utilisant l'ID pour la valeur et le Name pour l'affichage [cite: 7, 48]
  const CustomSelect = ({ label, items, filterKey }: { label: string; items: RefItem[]; filterKey: keyof Filters }) => (
      <div className="relative">
        <label className="text-xs text-gray-400 block mb-1">{label}</label>
        <button
            onClick={() => setOpenDropdown(openDropdown === filterKey ? null : filterKey)}
            className={`w-full bg-gray-700 border ${
                openDropdown === filterKey ? "border-blue-500 ring-1 ring-blue-500/50" : "border-gray-600"
            } rounded text-white text-sm px-3 py-2 text-left hover:bg-gray-600 transition truncate flex justify-between items-center`}
        >
        <span className="truncate">
          {(filters[filterKey] as string[]).length > 0
              ? `${(filters[filterKey] as string[]).length} selected`
              : "All"}
        </span>
          <span className={`text-[10px] transition-transform ${openDropdown === filterKey ? "rotate-180" : ""}`}>
          ▼
        </span>
        </button>

        {openDropdown === filterKey && (
            <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl z-50 min-w-[200px] max-h-60 overflow-y-auto p-1 animate-[fadeIn_0.1s_ease]">
              {items.map((item) => (
                  <label
                      key={item.id}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-blue-600/20 rounded-md cursor-pointer text-white text-sm transition-colors group"
                  >
                    <input
                        type="checkbox"
                        checked={(filters[filterKey] as string[]).includes(item.id)}
                        onChange={() => handleMultiSelectChange(filterKey, item.id)}
                        className="w-4 h-4 rounded border-gray-600 text-blue-500 accent-blue-500 focus:ring-0"
                    />
                    <span className="truncate group-hover:text-blue-200">{item.name}</span>
                  </label>
              ))}
              {items.length === 0 && <div className="p-3 text-gray-500 text-xs text-center">No data available</div>}
            </div>
        )}
      </div>
  );

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  const kpis = [
    { icon: "📋", label: "Total Activities", value: stats?.totalActivities || 0, color: "text-blue-400" },
    { icon: "👥", label: "Attendees", value: stats?.totalParticipants || 0, color: "text-purple-400" },
    { icon: "✅", label: "Validated", value: stats?.validatedActivities || 0, color: "text-green-400" },
    { icon: "⏳", label: "Submitted", value: stats?.submittedActivities || 0, color: "text-yellow-400" },
    { icon: "✏️", label: "Draft", value: stats?.draftActivities || 0, color: "text-gray-400" },
  ];

  return (
      <div className="space-y-6 pb-10" ref={containerRef}>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-white text-3xl font-extrabold">Analytics Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Real-time tracking and performance metrics</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 text-xs font-bold rounded-lg hover:bg-gray-700 transition">
              EXPORT DATA
            </button>
          </div>
        </div>

        <div className="card p-6 bg-gray-900/50 border border-gray-800 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              Global Filters
            </h3>
            <button
                onClick={resetFilters}
                className="text-[10px] font-bold text-gray-500 hover:text-white transition uppercase"
            >
              Clear all filters
            </button>
          </div>

          <div className="grid grid-cols-5 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">From Date</label>
              <input
                  type="text"
                  placeholder="DD/MM/YYYY"
                  value={formatDateDisplay(filters.dateFrom)}
                  onChange={(e) => {
                    const isoDate = parseDateFromDDMMYYYY(e.target.value);
                    setFilters((p) => ({ ...p, dateFrom: isoDate }));
                  }}
                  className="w-full bg-gray-700 border border-gray-600 rounded text-white text-sm px-2 py-1.5 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">To Date</label>
              <input
                  type="text"
                  placeholder="DD/MM/YYYY"
                  value={formatDateDisplay(filters.dateTo)}
                  onChange={(e) => {
                    const isoDate = parseDateFromDDMMYYYY(e.target.value);
                    setFilters((p) => ({ ...p, dateTo: isoDate }));
                  }}
                  className="w-full bg-gray-700 border border-gray-600 rounded text-white text-sm px-2 py-1.5 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <CustomSelect label="Countries" items={referenceData.countries} filterKey="countries" />
            <CustomSelect label="Funders" items={referenceData.funders} filterKey="funders" />
            <CustomSelect label="Thematic Focus" items={referenceData.thematicFocus} filterKey="thematicFocus" />
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          {kpis.map((kpi) => (
              <div key={kpi.label} className="card p-5 border border-gray-800 hover:border-gray-700 transition-all group">
                <div className="text-2xl mb-3 group-hover:scale-110 transition-transform">{kpi.icon}</div>
                <p className={`text-3xl font-black ${kpi.color}`}>{kpi.value}</p>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mt-1">{kpi.label}</p>
              </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="card p-6 border border-gray-800">
            <h3 className="text-white text-sm font-bold mb-6">Activities by Status</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                      data={activitiesByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="count"
                  >
                    {activitiesByStatus.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                      contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }}
                      itemStyle={{ color: "#fff", fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {activitiesByStatus.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-[10px] text-gray-400 truncate">{entry.status}: {entry.count}</span>
                  </div>
              ))}
            </div>
          </div>

          <div className="card p-6 border border-gray-800">
            <h3 className="text-white text-sm font-bold mb-6">Participants by Gender</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={participantsByGender}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="gender" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.05)" }}
                      contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-6 border border-gray-800 col-span-3">
            <h3 className="text-white text-sm font-bold mb-6">Monthly Activity Trend</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activitiesTrend}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="month" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                      contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }}
                  />
                  <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorCount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {loading && (
            <div className="fixed bottom-4 right-4 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg animate-bounce">
              REFRESHING...
            </div>
        )}
      </div>
  );
}