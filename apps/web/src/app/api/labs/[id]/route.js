import sql from "@/app/api/utils/sql";

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const [lab] = await sql`
      SELECT 
        labs.*,
        subjects.id AS subject_id,
        subjects.name AS subject_name
      FROM labs
      JOIN subjects ON subjects.id = labs.subject_id
      WHERE labs.id = ${id}
    `;
    if (!lab) {
      return Response.json(
        { error: "Лабораторная не найдена" },
        { status: 404 },
      );
    }
    return Response.json({ lab });
  } catch (error) {
    console.error("Error getting lab:", error);
    return Response.json(
      { error: "Не удалось загрузить лабораторную" },
      { status: 500 },
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { subject_id, title, description, task_pdf_url, due_date, status } =
      body;

    const setClauses = [];
    const values = [];
    let i = 1;

    if (subject_id !== undefined) {
      setClauses.push(`subject_id = $${i++}`);
      values.push(subject_id);
    }
    if (title !== undefined) {
      setClauses.push(`title = $${i++}`);
      values.push(title);
    }
    if (description !== undefined) {
      setClauses.push(`description = $${i++}`);
      values.push(description);
    }
    if (task_pdf_url !== undefined) {
      setClauses.push(`task_pdf_url = $${i++}`);
      values.push(task_pdf_url);
    }
    if (due_date !== undefined) {
      setClauses.push(`due_date = $${i++}`);
      values.push(due_date);
    }
    if (status !== undefined) {
      setClauses.push(`status = $${i++}`);
      values.push(status);
    }

    if (setClauses.length === 0) {
      return Response.json(
        { error: "Нет данных для обновления" },
        { status: 400 },
      );
    }

    values.push(id);
    const query = `UPDATE labs SET ${setClauses.join(", ")} WHERE id = $${i} RETURNING *`;
    const result = await sql(query, values);
    return Response.json({ lab: result[0] });
  } catch (error) {
    console.error("Error updating lab:", error);
    return Response.json(
      { error: "Не удалось обновить лабораторную" },
      { status: 500 },
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    await sql`DELETE FROM labs WHERE id = ${id}`;
    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting lab:", error);
    return Response.json(
      { error: "Не удалось удалить лабораторную" },
      { status: 500 },
    );
  }
}
