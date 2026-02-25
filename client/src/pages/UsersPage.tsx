import { useEffect, useState } from "react";
import { userApi } from "../utils/api";
import toast from "react-hot-toast";

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-purple-400/10 text-purple-400",
  MANAGER: "bg-accent/10 text-accent",
  FIELD: "bg-emerald-400/10 text-emerald-400",
};

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userApi
      .list()
      .then((res) => setUsers(res.data))
      .catch(() => toast.error("Failed to load users"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-white text-xl font-extrabold">Users & Roles</h2>
          <p className="text-gray-500 text-xs">{users.length} team members</p>
        </div>
        <button className="btn-primary bg-gradient-to-r from-accent to-purple-500">+ Invite User</button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 text-sm">Loading...</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr>
                {["User", "Role", "Projects", "Activities", "Status"].map((h) => (
                  <th key={h} className="text-left text-gray-500 font-semibold uppercase tracking-wide text-[10px] px-4 py-3 border-b border-border">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u.id} className="border-b border-border hover:bg-card-hover transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-accent/20 text-accent flex items-center justify-center text-[11px] font-bold">
                        {u.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-semibold">{u.name}</p>
                        <p className="text-gray-500 text-[10px]">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-semibold ${ROLE_COLORS[u.role] || ""}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{u.projects?.map((p: any) => p.name).join(", ")}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono">{u.activityCount || 0}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-semibold
                      ${u.status === "ACTIVE" ? "bg-emerald-400/10 text-emerald-400" : u.status === "INVITED" ? "bg-amber-400/10 text-amber-400" : "bg-gray-400/10 text-gray-400"}`}>
                      {u.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
