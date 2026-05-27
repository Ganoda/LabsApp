import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    const subjects = await sql`
      SELECT 
        subjects.id,
        subjects.name,
        COUNT(labs.id)::int AS labs_count
      FROM subjects
      LEFT JOIN labs ON labs.subject_id = subjects.id
      GROUP BY subjects.id
      ORDER BY subjects.name ASC
    `;
    return Response.json({ subjects });
  } catch (error) {
    console.error("Error listing subjects:", error);
    return Response.json(
      { error: "Не удалось загрузить предметы" },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name } = body;
    if (!name) {
      return Response.json(
        { error: "Укажите название предмета" },
        { status: 400 },
      );
    }
    const [subject] = await sql`
      INSERT INTO subjects (name) VALUES (${name}) RETURNING *
    `;
    return Response.json({ subject });
  } catch (error) {
    console.error("Error creating subject:", error);
    return Response.json(
      { error: "Не удалось создать предмет" },
      { status: 500 },
    );
  }
}
