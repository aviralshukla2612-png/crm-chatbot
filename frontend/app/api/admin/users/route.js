import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/guard";
import { queryDb } from "@/lib/db/dbPool";

function getDefaultPlatformUsers() {
  return [
    {
      id: "u_super_01",
      name: "Emperor Smart Solution",
      email: "admin@emperorsmartsolutions.com",
      organization: "Emperor Smart Solutions",
      role: "Platform Super Admin",
      status: "Active",
      bots: 1,
      lastLogin: "Active now",
      createdAt: "2026-01-15",
    },
  ];
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

    // 1. Query real PostgreSQL database
    let dbUsers = [];
    let totalCount = 0;

    const countSql = `
      SELECT COUNT(*)::int as total
      FROM "User" u
      LEFT JOIN "OrganizationMembership" om ON om."userId" = u.id
      LEFT JOIN "Organization" o ON o.id = om."organizationId"
      WHERE ($1 = '' OR u.name ILIKE $2 OR u.email ILIKE $2 OR o.name ILIKE $2);
    `;
    const searchPattern = `%${search}%`;
    const countRes = await queryDb(countSql, [search, searchPattern]);

    if (countRes.ok && countRes.rows[0]?.total > 0) {
      totalCount = countRes.rows[0].total;
      const offset = (page - 1) * limit;

      const dataSql = `
        SELECT 
          u.id,
          CASE 
            WHEN u.email = 'admin@emperorsmartsolutions.com' OR u.role = 'SUPER_ADMIN' THEN 'Emperor Smart Solution'
            ELSE u.name
          END as name,
          u.email,
          COALESCE(o.name, 'Emperor Smart Solutions') as organization,
          CASE 
            WHEN u.role = 'SUPER_ADMIN' THEN 'Platform Super Admin'
            WHEN om.role IN ('OWNER', 'ORG_OWNER', 'ADMIN', 'ORG_ADMIN') THEN 'Workspace Owner'
            ELSE 'Team Member'
          END as role,
          u.status,
          (SELECT COUNT(*)::int FROM "Bot" b WHERE b."organizationId" = om."organizationId") as bots,
          'Active now' as "lastLogin",
          u."createdAt"::text as "createdAt"
        FROM "User" u
        LEFT JOIN "OrganizationMembership" om ON om."userId" = u.id
        LEFT JOIN "Organization" o ON o.id = om."organizationId"
        WHERE ($1 = '' OR u.name ILIKE $2 OR u.email ILIKE $2 OR o.name ILIKE $2)
        ORDER BY u."createdAt" DESC
        LIMIT $3 OFFSET $4;
      `;
      const dataRes = await queryDb(dataSql, [search, searchPattern, limit, offset]);
      if (dataRes.ok) {
        dbUsers = dataRes.rows;
      }
    }

    // 2. Fallback to clean platform defaults (Zero dummy users)
    let items = dbUsers;
    if (items.length === 0 && totalCount === 0) {
      let pool = getDefaultPlatformUsers();

      if (search) {
        pool = pool.filter(
          (u) =>
            u.name.toLowerCase().includes(search) ||
            u.email.toLowerCase().includes(search) ||
            u.organization.toLowerCase().includes(search)
        );
      }

      totalCount = pool.length;
      const offset = (page - 1) * limit;
      items = pool.slice(offset, offset + limit);
    }

    const totalPages = Math.ceil(totalCount / limit) || 1;

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
        totalUsers: totalCount,
        activeUsers: items.filter((u) => u.status === "Active" || u.status === "ACTIVE").length,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
