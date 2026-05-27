import sql from "@/app/api/utils/sql";
import { randomUUID } from "crypto";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const nickname = searchParams.get("nickname");

    if (id) {
      const [profile] = await sql`SELECT * FROM user_profiles WHERE id = ${id}`;
      return Response.json({ profile: profile || null });
    }
    if (nickname) {
      const [profile] =
        await sql`SELECT * FROM user_profiles WHERE LOWER(nickname) = LOWER(${nickname}) LIMIT 1`;
      return Response.json({ profile: profile || null });
    }
    return Response.json({ error: "Нет id или nickname" }, { status: 400 });
  } catch (error) {
    console.error("Error getting profile:", error);
    return Response.json({ error: "Ошибка" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { id, nickname, avatar } = body;
    if (!nickname)
      return Response.json({ error: "Нет данных" }, { status: 400 });

    // If no id — try find existing by nickname first (same account across devices)
    if (!id) {
      const [existing] = await sql`
        SELECT * FROM user_profiles WHERE LOWER(nickname) = LOWER(${nickname.trim()}) LIMIT 1
      `;
      if (existing) {
        // Update avatar if changed, return existing profile
        const [updated] = await sql`
          UPDATE user_profiles SET avatar = ${avatar || existing.avatar}
          WHERE id = ${existing.id} RETURNING *
        `;
        return Response.json({ profile: updated });
      }
      // Create new with generated id
      const newId = randomUUID();
      const [profile] = await sql`
        INSERT INTO user_profiles (id, nickname, avatar)
        VALUES (${newId}, ${nickname.trim()}, ${avatar || "😊"})
        RETURNING *
      `;
      return Response.json({ profile });
    }

    // id provided → upsert (for updates from existing session)
    const [profile] = await sql`
      INSERT INTO user_profiles (id, nickname, avatar)
      VALUES (${id}, ${nickname.trim()}, ${avatar || "😊"})
      ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, avatar = EXCLUDED.avatar
      RETURNING *
    `;
    return Response.json({ profile });
  } catch (error) {
    console.error("Error saving profile:", error);
    return Response.json({ error: "Ошибка" }, { status: 500 });
  }
}
