import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    const labs = await sql`
      SELECT 
        labs.id,
        labs.title,
        labs.description,
        labs.task_pdf_url,
        labs.due_date,
        labs.status,
        labs.created_at,
        subjects.id AS subject_id,
        subjects.name AS subject_name,
        COUNT(submissions.id)::int AS submissions_count
      FROM labs
      JOIN subjects ON subjects.id = labs.subject_id
      LEFT JOIN submissions ON submissions.lab_id = labs.id
      GROUP BY labs.id, subjects.id
      ORDER BY labs.due_date ASC NULLS LAST, labs.id ASC
    `;
    return Response.json({ labs });
  } catch (error) {
    console.error("Error listing labs:", error);
    return Response.json(
      { error: "Не удалось загрузить лабораторные" },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { subject_id, title, description, task_pdf_url, due_date, status } =
      body;

    if (!subject_id || !title) {
      return Response.json(
        { error: "Укажите предмет и название" },
        { status: 400 },
      );
    }

    const [lab] = await sql`
      INSERT INTO labs (subject_id, title, description, task_pdf_url, due_date, status)
      VALUES (${subject_id}, ${title}, ${description || null}, ${task_pdf_url || null}, ${due_date || null}, ${status || "pending"})
      RETURNING *
    `;
    return Response.json({ lab });
  } catch (error) {
    console.error("Error creating lab:", error);
    return Response.json(
      { error: "Не удалось создать лабораторную" },
      { status: 500 },
    );
  }
}
