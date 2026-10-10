"use client";

import React, { useState } from "react";
import { UserPlus, Mail, Shield, Check, Trash2, Plus } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { mockTeamMembers } from "@/lib/mock/data";

export default function TeamPage() {
  const [members, setMembers] = useState(mockTeamMembers);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [newMember, setNewMember] = useState({ name: "", email: "", role: "Member" });

  const handleInvite = (e) => {
    e.preventDefault();
    if (!newMember.name || !newMember.email) return;

    const added = {
      id: `tm_${Date.now()}`,
      name: newMember.name,
      email: newMember.email,
      role: newMember.role,
      status: "Active",
      addedDate: new Date().toISOString().split("T")[0],
    };
    setMembers([...members, added]);
    setNewMember({ name: "", email: "", role: "Member" });
    setInviteModalOpen(false);
  };

  const handleRemove = (id) => {
    setMembers(members.filter((m) => m.id !== id));
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Team & Permissions
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Invite colleagues to collaborate on bots, review conversations, and manage captured leads.
          </p>
        </div>

        <button
          onClick={() => setInviteModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-xs shadow-indigo-600/30 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Invite Member
        </button>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-400 font-medium uppercase text-[10px] border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="p-4">Name & Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Permissions</th>
                <th className="p-4">Status</th>
                <th className="p-4">Added Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-linear-to-tr from-indigo-600 to-violet-600 text-white font-bold flex items-center justify-center text-xs">
                        {m.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <p className="font-bold text-neutral-900 dark:text-white">{m.name}</p>
                        <p className="text-[11px] text-neutral-400">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-semibold text-neutral-800 dark:text-neutral-200">
                    <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800">
                      {m.role}
                    </span>
                  </td>
                  <td className="p-4 text-neutral-500">
                    {m.role === "Owner"
                      ? "Full Tenant Access & Billing"
                      : m.role === "Admin"
                      ? "Manage Bots, Knowledge & Leads"
                      : "View Analytics & Inbox"}
                  </td>
                  <td className="p-4">
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                      {m.status}
                    </span>
                  </td>
                  <td className="p-4 text-neutral-400">{m.addedDate}</td>
                  <td className="p-4 text-right">
                    {m.role !== "Owner" && (
                      <button
                        onClick={() => handleRemove(m.id)}
                        className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title="Remove Member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite New Teammate"
        description="Your team member will receive an email invitation to access your organization workspace."
      >
        <form onSubmit={handleInvite} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rahul Sharma"
              value={newMember.name}
              onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/40"
            />
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Business Email Address
            </label>
            <input
              type="email"
              required
              placeholder="rahul@company.com"
              value={newMember.email}
              onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/40"
            />
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Assigned Role
            </label>
            <select
              value={newMember.role}
              onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/40"
            >
              <option value="Admin">Admin (Can edit bots and train knowledge)</option>
              <option value="Member">Member (Can view conversations & leads)</option>
              <option value="Viewer">Viewer (Read-only)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setInviteModalOpen(false)}
              className="px-3.5 py-2 text-neutral-500 hover:bg-neutral-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl"
            >
              Send Invitation
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
