"use client";

import React, { useEffect, useState } from "react";
import {
  Building2,
  Users,
  Bot,
  MessageSquare,
  Users2,
  Power,
  PowerOff,
  UserCheck,
  Trash2,
  ExternalLink,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { adminApi } from "@/lib/api/admin";

export default function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await adminApi.getPlatformOverview();
      setOrganizations(data.organizations);
      setLoading(false);
    }
    load();
  }, []);

  const handleToggle = async (id) => {
    const updated = await adminApi.toggleOrgStatus(id);
    setOrganizations(organizations.map((o) => (o.id === id ? updated : o)));
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Tenant Organizations
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Inspect, manage, and impersonate customer accounts across the entire platform.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="p-4">Organization</th>
                <th className="p-4">Owner</th>
                <th className="p-4">Plan</th>
                <th className="p-4">Users</th>
                <th className="p-4">Bots</th>
                <th className="p-4">Chats</th>
                <th className="p-4">Leads</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {organizations.map((org) => (
                <tr key={org.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-slate-900">{org.name}</p>
                    <p className="text-[10px] font-mono text-slate-400">{org.id}</p>
                  </td>
                  <td className="p-4 text-slate-700 font-medium">{org.owner}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      {org.plan}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-slate-600">{org.usersCount}</td>
                  <td className="p-4 font-mono text-indigo-600 font-bold">{org.botsCount}</td>
                  <td className="p-4 font-mono text-slate-600">{org.conversationsCount}</td>
                  <td className="p-4 font-mono text-emerald-600 font-bold">{org.leadsCount}</td>
                  <td className="p-4">
                    <StatusBadge status={org.status} size="sm" />
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href="/dashboard"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
                        title="Impersonate Tenant"
                      >
                        <UserCheck className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleToggle(org.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        title={org.status === "ACTIVE" ? "Suspend Organization" : "Activate"}
                      >
                        {org.status === "ACTIVE" ? (
                          <PowerOff className="w-4 h-4 text-rose-500" />
                        ) : (
                          <Power className="w-4 h-4 text-emerald-500" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
