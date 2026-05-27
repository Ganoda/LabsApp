import sql from "@/app/api/utils/sql";

// GET ?userId=xxx  — all lab statuses for a user
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) return Response.json({ statuses: [] });

    const statuses = await sql`
      SELECT lab_id, status FROM user_lab_statuses WHERE user_id = ${userId}
    `;
    return Response.json({ statuses });
  } catch (error) {
    console.error("Error getting statuses:", error);
    return Response.json({ error: "Ошибка" }, { status: 500 });
  }
}

// POST { userId, labId, status }
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, labId, status } = body;
    if (!userId || !labId || !status)
      return Response.json({ error: "Нет данных" }, { status: 400 });

    const [row] = await sql`
      INSERT INTO user_lab_statuses (user_id, lab_id, status, updated_at)
      VALUES (${userId}, ${labId}, ${status}, NOW())
      ON CONFLICT (user_id, lab_id) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()
      RETURNING *
    `;
    return Response.json({ status: row });
  } catch (error) {
    console.error("Error setting status:", error);
    return Response.json({ error: "Ошибка" }, { status: 500 });
  }
}
