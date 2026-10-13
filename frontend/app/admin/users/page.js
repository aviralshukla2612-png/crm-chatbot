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
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Platform Users & Members
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Audit user accounts, organization assignments, and permission roles across all tenant domains.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-200/80">
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
            <tbody className="divide-y divide-slate-100">
              {mockAdminUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="p-4 font-bold text-slate-900">{u.name}</td>
                  <td className="p-4 text-slate-600">{u.email}</td>
                  <td className="p-4 text-slate-600 font-medium">{u.organization}</td>
                  <td className="p-4">
                    <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-semibold">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-bold text-indigo-600">{u.bots}</td>
                  <td className="p-4 text-slate-500">{u.lastLogin}</td>
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
