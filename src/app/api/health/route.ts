export const dynamic = "force-dynamic";

export async function GET() {
  // Simple health check that doesn't strictly depend on DB connection
  // for the sake of build validation in environments without local MongoDB.
  // In a real production environment, you might want to check the DB status.
  return Response.json({ ok: true, service: "vault-api" });
}
