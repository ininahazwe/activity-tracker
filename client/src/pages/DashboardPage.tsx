import { useEffect, useState, useRef } from "react";
import { dashboardApi, referenceApi } from "../utils/api";
import toast from "react-hot-toast";
import { useThemeStore } from "../stores/themeStore";
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
const formatDateDisplay = (dateStr: string): string => {
  if (!dateStr) return "";
  const date = new Date(dateStr + "T00:00:00");
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

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
  const { theme } = useThemeStore();

  // ── Couleurs adaptées au thème ──
  const isDark = theme === "dark";
  const chartGrid      = isDark ? "#1f2937" : "#e5e7eb";
  const chartAxis      = isDark ? "#6b7280" : "#9ca3af";
  const tooltipBg      = isDark ? "#111827" : "#ffffff";
  const tooltipBorder  = isDark ? "#374151" : "#e5e7eb";
  const tooltipText    = isDark ? "#fff"    : "#111827";

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

  const extractRefs = (res: any): RefItem[] => {
    const actualData = res?.data?.data;
    if (!actualData || !Array.isArray(actualData)) return [];
    return actualData.map((item: any) => ({ id: item.id, name: item.name }));
  };

  useEffect(() => {
    Promise.all([
      referenceApi.list("country"),
      referenceApi.list("funder"),
      referenceApi.list("thematic_focus"),
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

  const CustomSelect = ({
                          label,
                          items,
                          filterKey,
                        }: {
    label: string;
    items: RefItem[];
    filterKey: keyof Filters;
  }) => (
      <div className="relative">
        <label className="text-xs text-gray-500 block mb-1">{label}</label>
        <button
            onClick={() => setOpenDropdown(openDropdown === filterKey ? null : filterKey)}
            className={`w-full bg-surface border ${
                openDropdown === filterKey
                    ? "border-accent ring-1 ring-accent/30"
                    : "border-border"
            } rounded text-sm px-3 py-2 text-left hover:bg-card-hover transition truncate flex justify-between items-center`}
            style={{ color: "var(--text-primary)" }}
        >
        <span className="truncate">
          {(filters[filterKey] as string[]).length > 0
              ? `${(filters[filterKey] as string[]).length} selected`
              : "All"}
        </span>
          <span
              className={`text-[10px] transition-transform ${
                  openDropdown === filterKey ? "rotate-180" : ""
              }`}
          >
          ▼
        </span>
        </button>

        {openDropdown === filterKey && (
            <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-2xl z-50 min-w-[200px] max-h-60 overflow-y-auto p-1">
              {items.map((item) => (
                  <label
                      key={item.id}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-accent/10 rounded-md cursor-pointer text-sm transition-colors group"
                      style={{ color: "var(--text-primary)" }}
                  >
                    <input
                        type="checkbox"
                        checked={(filters[filterKey] as string[]).includes(item.id)}
                        onChange={() => handleMultiSelectChange(filterKey, item.id)}
                        className="w-4 h-4 rounded border-border text-accent accent-blue-500 focus:ring-0"
                    />
                    <span className="truncate group-hover:text-accent">{item.name}</span>
                  </label>
              ))}
              {items.length === 0 && (
                  <div className="p-3 text-gray-500 text-xs text-center">No data available</div>
              )}
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
        {/* ── Header ── */}
        <div className="flex justify-between items-end">
          <div>
            <h1
                className="text-3xl font-extrabold"
                style={{ color: "var(--text-primary)" }}
            >
              Analytics Dashboard
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Real-time tracking and performance metrics
            </p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-card border border-border text-gray-400 text-xs font-bold rounded-lg hover:bg-card-hover hover:text-white transition">
              EXPORT DATA
            </button>
          </div>
        </div>

        {/* ── Filters panel ── */}
        <div className="card p-6 border border-border">
          <div className="flex items-center justify-between mb-5">
            <h3
                className="text-xs font-bold uppercase tracking-widest flex items-center gap-2"
                style={{ color: "var(--text-primary)" }}
            >
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              Global Filters
            </h3>
            <button
                onClick={resetFilters}
                className="text-[10px] font-bold text-gray-500 hover:text-accent transition uppercase"
            >
              Clear all filters
            </button>
          </div>

          <div className="grid grid-cols-5 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">From Date</label>
              <input
                  type="text"
                  placeholder="DD/MM/YYYY"
                  value={formatDateDisplay(filters.dateFrom)}
                  onChange={(e) => {
                    const isoDate = parseDateFromDDMMYYYY(e.target.value);
                    setFilters((p) => ({ ...p, dateFrom: isoDate }));
                  }}
                  className="w-full bg-surface border border-border rounded text-sm px-2 py-1.5 focus:border-accent focus:outline-none"
                  style={{ color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">To Date</label>
              <input
                  type="text"
                  placeholder="DD/MM/YYYY"
                  value={formatDateDisplay(filters.dateTo)}
                  onChange={(e) => {
                    const isoDate = parseDateFromDDMMYYYY(e.target.value);
                    setFilters((p) => ({ ...p, dateTo: isoDate }));
                  }}
                  className="w-full bg-surface border border-border rounded text-sm px-2 py-1.5 focus:border-accent focus:outline-none"
                  style={{ color: "var(--text-primary)" }}
              />
            </div>

            <CustomSelect label="Countries" items={referenceData.countries} filterKey="countries" />
            <CustomSelect label="Funders" items={referenceData.funders} filterKey="funders" />
            <CustomSelect label="Thematic Focus" items={referenceData.thematicFocus} filterKey="thematicFocus" />
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-5 gap-4">
          {kpis.map((kpi) => (
              <div
                  key={kpi.label}
                  className="card p-5 hover:border-border-light transition-all group"
              >
                <div className="text-2xl mb-3 group-hover:scale-110 transition-transform">
                  {kpi.icon}
                </div>
                <p className={`text-3xl font-black ${kpi.color}`}>{kpi.value}</p>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mt-1">
                  {kpi.label}
                </p>
              </div>
          ))}
        </div>

        {/* ── Charts ── */}
        <div className="grid grid-cols-3 gap-6">
          {/* Pie — Activities by Status */}
          <div className="card p-6">
            <h3
                className="text-sm font-bold mb-6"
                style={{ color: "var(--text-primary)" }}
            >
              Activities by Status
            </h3>
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
                      contentStyle={{
                        backgroundColor: tooltipBg,
                        border: `1px solid ${tooltipBorder}`,
                        borderRadius: "8px",
                      }}
                      itemStyle={{ color: tooltipText, fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {activitiesByStatus.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-[10px] text-gray-500 truncate">
                  {entry.status}: {entry.count}
                </span>
                  </div>
              ))}
            </div>
          </div>

          {/* Bar — Participants by Gender */}
          <div className="card p-6">
            <h3
                className="text-sm font-bold mb-6"
                style={{ color: "var(--text-primary)" }}
            >
              Participants by Gender
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={participantsByGender}>
                  <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={chartGrid}
                      vertical={false}
                  />
                  <XAxis
                      dataKey="gender"
                      stroke={chartAxis}
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                  />
                  <YAxis
                      stroke={chartAxis}
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                  />
                  <Tooltip
                      cursor={{ fill: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }}
                      contentStyle={{
                        backgroundColor: tooltipBg,
                        border: `1px solid ${tooltipBorder}`,
                        borderRadius: "8px",
                      }}
                      itemStyle={{ color: tooltipText, fontSize: "12px" }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Area — Monthly Trend (col-span-3) */}
          <div className="card p-6 col-span-3">
            <h3
                className="text-sm font-bold mb-6"
                style={{ color: "var(--text-primary)" }}
            >
              Monthly Activity Trend
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activitiesTrend}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={chartGrid}
                      vertical={false}
                  />
                  <XAxis
                      dataKey="month"
                      stroke={chartAxis}
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                  />
                  <YAxis
                      stroke={chartAxis}
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                  />
                  <Tooltip
                      contentStyle={{
                        backgroundColor: tooltipBg,
                        border: `1px solid ${tooltipBorder}`,
                        borderRadius: "8px",
                      }}
                      itemStyle={{ color: tooltipText, fontSize: "12px" }}
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

        {/* ── Loading badge ── */}
        {loading && (
            <div className="fixed bottom-4 right-4 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg animate-bounce">
              REFRESHING...
            </div>
        )}
      </div>
  );
}