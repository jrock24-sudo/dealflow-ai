import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "Missing address parameter" }, { status: 400 });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`;
    const r = await fetch(url, {
      headers: {
        "User-Agent": "DealFlowAI/1.0 (real-estate-investment-tool; contact@dealflowai.com)",
        Accept: "application/json",
      },
    });

    if (!r.ok) {
      return NextResponse.json({ error: "Geocode service error" }, { status: r.status });
    }

    const data = await r.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Geocode proxy error:", err);
    return NextResponse.json({ error: "Geocode failed" }, { status: 500 });
  }
}
