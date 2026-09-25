// Logs IDKit widget error codes to the server console while debugging.
export async function POST(request: Request) {
  console.log("[idkit error]", await request.text());
  return new Response(null, { status: 204 });
}
