import { NextResponse } from "next/server";

export async function GET() {
  console.log("PING route hit!");
  return NextResponse.json({ message: "pong" });
}

