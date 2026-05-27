import sql from "@/app/api/utils/sql";

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    await sql`DELETE FROM submissions WHERE id = ${id}`;
    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting submission:", error);
    return Response.json({ error: "Не удалось удалить" }, { status: 500 });
  }
}
