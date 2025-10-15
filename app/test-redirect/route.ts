import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  console.log("\n=== TEST REDIRECT ===");
  console.log("Full URL:", request.url);
  
  const url = request.nextUrl.searchParams.get("url");
  console.log("URL param:", url);
  console.log("URL type:", typeof url);
  
  if (!url) {
    return NextResponse.json({ error: "No URL provided" });
  }
  
  console.log("Attempting redirect to:", url);
  
  try {
    return NextResponse.redirect(url, 302);
  } catch (error) {
    console.error("Redirect failed:", error);
    return NextResponse.json({ 
      error: "Redirect failed",
      url: url,
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

