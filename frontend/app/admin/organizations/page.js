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
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Tenant Organizations
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400 mt-1">
          Inspect, manage, and impersonate customer accounts across the entire platform.
        </p>
      </div>

      <div className="rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-900 text-neutral-400 font-medium uppercase text-[10px] border-b border-neutral-800">
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
            <tbody className="divide-y divide-neutral-800/80">
              {organizations.map((org) => (
                <tr key={org.id} className="hover:bg-neutral-900/60 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-white">{org.name}</p>
                    <p className="text-[10px] font-mono text-neutral-500">{org.id}</p>
                  </td>
                  <td className="p-4 text-neutral-300 font-medium">{org.owner}</td>
                  <td className="p-4">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-800 text-amber-300">
                      {org.plan}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-neutral-400">{org.usersCount}</td>
                  <td className="p-4 font-mono text-indigo-400 font-bold">{org.botsCount}</td>
                  <td className="p-4 font-mono text-neutral-300">{org.conversationsCount}</td>
                  <td className="p-4 font-mono text-emerald-400 font-bold">{org.leadsCount}</td>
                  <td className="p-4">
                    <StatusBadge status={org.status} size="sm" />
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href="/dashboard"
                        className="p-1.5 text-neutral-400 hover:text-amber-400 rounded-lg hover:bg-neutral-900 transition-colors"
                        title="Impersonate Tenant"
                      >
                        <UserCheck className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleToggle(org.id)}
                        className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 transition-colors cursor-pointer"
                        title={org.status === "ACTIVE" ? "Suspend Organization" : "Activate"}
                      >
                        {org.status === "ACTIVE" ? (
                          <PowerOff className="w-4 h-4 text-rose-400" />
                        ) : (
                          <Power className="w-4 h-4 text-emerald-400" />
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
