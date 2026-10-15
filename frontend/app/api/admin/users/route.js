import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/guard";
import { queryDb } from "@/lib/db/dbPool";

let demoUsersStore = null;

function getGeneratedDemoUsers() {
  if (demoUsersStore) return demoUsersStore;

  const firstNames = ["Aarav", "Priya", "Rahul", "Ananya", "Rohan", "Sneha", "Vikram", "Neha", "Aditya", "Pooja", "Arjun", "Kavya", "Siddharth", "Meera", "Kabir"];
  const lastNames = ["Sharma", "Verma", "Patel", "Mehta", "Iyer", "Nair", "Reddy", "Gupta", "Malhotra", "Kapoor", "Bose", "Choudhury", "Deshmukh", "Singhania", "Joshi"];
  const roles = ["Workspace Owner", "Admin", "Team Member", "Analyst"];
  const organizations = [
    "Emperor Smart Solutions",
    "Acme Healthcare Systems",
    "Apex Global FinTech",
    "Solaria Energy",
    "Vanguard Logistics",
    "Nova Retail Cloud",
    "Quantum EdTech",
    "Nexus RealEstate",
  ];

  const list = [
    {
      id: "u_super_01",
      name: "Emperor Smart Solution",
      email: "admin@emperorsmartsolutions.com",
      organization: "Emperor Smart Solutions",
      role: "Platform Super Admin",
      status: "Active",
      bots: 3,
      lastLogin: "Active now",
      createdAt: "2026-01-15",
    },
    {
      id: "u_tenant_02",
      name: "Srajan Shukla",
      email: "admin@company.com",
      organization: "Emperor Smart Solutions",
      role: "Workspace Owner",
      status: "Active",
      bots: 2,
      lastLogin: "10 mins ago",
      createdAt: "2026-01-18",
    },
  ];

  for (let i = 3; i <= 1500; i++) {
    const fName = firstNames[(i * 3) % firstNames.length];
    const lName = lastNames[(i * 5) % lastNames.length];
    const org = organizations[i % organizations.length];
    const role = i % 4 === 0 ? "Workspace Owner" : i % 3 === 0 ? "Admin" : "Team Member";
    const status = i % 19 === 0 ? "Inactive" : "Active";
    const bots = 1 + (i % 5);
    const dateOffset = Math.floor(i / 3);
    const createdDate = new Date(Date.now() - dateOffset * 86400000).toISOString().split("T")[0];

    list.push({
      id: `u_client_${String(i).padStart(4, "0")}`,
      name: `${fName} ${lName}`,
      email: `${fName.toLowerCase()}.${lName.toLowerCase()}${i}@${org.toLowerCase().replace(/[^a-z]/g, "")}.com`,
      organization: org,
      role,
      status,
      bots,
      lastLogin: i % 2 === 0 ? `${(i % 50) + 1} mins ago` : `${(i % 14) + 1} days ago`,
      createdAt: createdDate,
    });
  }

  demoUsersStore = list;
  return demoUsersStore;
}

export async function GET(request) {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get("limit") || "25", 10)));
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const role = (searchParams.get("role") || "ALL").toUpperCase();
    const status = (searchParams.get("status") || "ALL").toUpperCase();

    let pool = getGeneratedDemoUsers();

    if (search) {
      pool = pool.filter(
        (u) =>
          u.name.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search) ||
          u.organization.toLowerCase().includes(search)
      );
    }

    if (role !== "ALL") {
      pool = pool.filter((u) => u.role.toUpperCase().includes(role));
    }

    if (status !== "ALL") {
      pool = pool.filter((u) => u.status.toUpperCase() === status);
    }

    const totalCount = pool.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const offset = (page - 1) * limit;
    const items = pool.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      stats: {
        totalUsers: pool.length,
        activeUsers: pool.filter((u) => u.status === "Active").length,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
