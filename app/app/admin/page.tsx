import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admin";
import { getRecentAuditLogs, getRecentFailedJobs } from "@/lib/supabase/admin-queries";
import { AdminRevokeShareLink } from "./AdminRevokeShareLink";
import { AdminSeedDemos } from "./AdminSeedDemos";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { userId } = await auth();
  if (!userId || !isAdmin(userId)) notFound();

  const [auditLogs, failedJobs] = await Promise.all([
    getRecentAuditLogs(),
    getRecentFailedJobs(),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <Link href="/app" className="text-sm text-mute hover:text-ink">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold mt-2">Admin</h1>
        <p className="text-mute text-sm mt-1">
          Audit logs and job failures only. No answers or manual content.
        </p>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-ink mb-3">Seed demo manuals</h2>
        <AdminSeedDemos />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink mb-3">Revoke share link</h2>
        <AdminRevokeShareLink />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink mb-3">Recent audit logs</h2>
        <div className="overflow-x-auto rounded-lg border border-stone-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="text-left p-3 font-medium">Time</th>
                <th className="text-left p-3 font-medium">Action</th>
                <th className="text-left p-3 font-medium">User ID</th>
                <th className="text-left p-3 font-medium">Metadata (IDs only)</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-3 text-mute">
                    No audit logs.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="border-b border-stone-100">
                    <td className="p-3 text-mute">
                      {new Date(log.created_at).toISOString().replace("T", " ").slice(0, 19)}
                    </td>
                    <td className="p-3">{log.action}</td>
                    <td className="p-3 font-mono text-xs text-mute truncate max-w-[120px]">
                      {log.user_id ?? "—"}
                    </td>
                    <td className="p-3 font-mono text-xs text-mute">
                      {JSON.stringify(log.metadata)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink mb-3">Recent failed jobs</h2>
        <div className="overflow-x-auto rounded-lg border border-stone-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="text-left p-3 font-medium">Time</th>
                <th className="text-left p-3 font-medium">Job ID</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Error</th>
              </tr>
            </thead>
            <tbody>
              {failedJobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-3 text-mute">
                    No failed jobs.
                  </td>
                </tr>
              ) : (
                failedJobs.map((job) => (
                  <tr key={job.id} className="border-b border-stone-100">
                    <td className="p-3 text-mute">
                      {new Date(job.created_at).toISOString().replace("T", " ").slice(0, 19)}
                    </td>
                    <td className="p-3 font-mono text-xs">{job.id.slice(0, 8)}…</td>
                    <td className="p-3">{job.type}</td>
                    <td className="p-3">{job.status}</td>
                    <td className="p-3 text-mute text-xs max-w-[200px] truncate">
                      {job.error_message ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
