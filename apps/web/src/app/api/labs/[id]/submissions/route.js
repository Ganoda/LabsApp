import sql from "@/app/api/utils/sql";

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const submissions = await sql`
      SELECT
        submissions.*,
        user_profiles.nickname AS profile_nickname,
        user_profiles.avatar   AS profile_avatar
      FROM submissions
      LEFT JOIN user_profiles ON user_profiles.id = submissions.user_id
      WHERE submissions.lab_id = ${id}
      ORDER BY submissions.created_at DESC
    `;
    return Response.json({ submissions });
  } catch (error) {
    console.error("Error listing submissions:", error);
    return Response.json(
      { error: "Не удалось загрузить выполнения" },
      { status: 500 },
    );
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { author_name, file_url, file_name, file_mime_type, note, user_id } =
      body;

    if (!author_name || !file_url || !file_name) {
      return Response.json(
        { error: "Укажите имя и прикрепите файл" },
        { status: 400 },
      );
    }

    const [submission] = await sql`
      INSERT INTO submissions (lab_id, author_name, file_url, file_name, file_mime_type, note, user_id)
      VALUES (${id}, ${author_name}, ${file_url}, ${file_name}, ${file_mime_type || null}, ${note || null}, ${user_id || null})
      RETURNING *
    `;
    return Response.json({ submission });
  } catch (error) {
    console.error("Error creating submission:", error);
    return Response.json(
      { error: "Не удалось добавить выполнение" },
      { status: 500 },
    );
  }
}
