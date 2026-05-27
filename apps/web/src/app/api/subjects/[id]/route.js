import sql from "@/app/api/utils/sql";

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name } = body;
    if (!name) {
      return Response.json({ error: "Укажите название" }, { status: 400 });
    }
    const [subject] = await sql`
      UPDATE subjects SET name = ${name} WHERE id = ${id} RETURNING *
    `;
    if (!subject) {
      return Response.json({ error: "Предмет не найден" }, { status: 404 });
    }
    return Response.json({ subject });
  } catch (error) {
    console.error("Error updating subject:", error);
    return Response.json(
      { error: "Не удалось обновить предмет" },
      { status: 500 },
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    await sql`DELETE FROM subjects WHERE id = ${id}`;
    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting subject:", error);
    return Response.json(
      { error: "Не удалось удалить предмет" },
      { status: 500 },
    );
  }
}
