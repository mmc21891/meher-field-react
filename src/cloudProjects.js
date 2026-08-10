import { cloud } from "./cloudClient";

export async function loadCloudProjects(userId) {
  const { data, error } = await cloud
    .from("field_data")
    .select("projects, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function saveCloudProjects(userId, projects, updatedAt) {
  const { error } = await cloud.from("field_data").upsert(
    {
      user_id: userId,
      projects,
      updated_at: updatedAt,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw error;
  }
}

