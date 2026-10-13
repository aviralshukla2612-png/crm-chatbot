"use client";

import React from "react";
import { Users, Mail, Building2, Shield, MoreVertical } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";

const mockAdminUsers = [
  {
    id: "u_1",
    name: "Aviral Shukla",
    email: "aviral@emperorsolutions.com",
    organization: "Emperor Smart Solutions",
    role: "Owner",
    status: "Active",
    bots: 1,
    lastLogin: "Active now",
    created: "2026-01-15",
  },
];

export default function AdminUsersPage() {
  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Platform Users & Members
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400 mt-1">
          Audit user accounts, organization assignments, and permission roles across all tenant domains.
        </p>
      </div>

      <div className="rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-900 text-neutral-400 font-medium uppercase text-[10px] border-b border-neutral-800">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Organization</th>
                <th className="p-4">Role</th>
                <th className="p-4">Bots</th>
                <th className="p-4">Last Login</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80">
              {mockAdminUsers.map((u) => (
                <tr key={u.id} className="hover:bg-neutral-900/60 transition-colors">
                  <td className="p-4 font-bold text-white">{u.name}</td>
                  <td className="p-4 text-neutral-300">{u.email}</td>
                  <td className="p-4 text-neutral-400">{u.organization}</td>
                  <td className="p-4">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-800 text-amber-300">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-bold text-indigo-400">{u.bots}</td>
                  <td className="p-4 text-neutral-400">{u.lastLogin}</td>
                  <td className="p-4">
                    <StatusBadge status={u.status} size="sm" />
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
