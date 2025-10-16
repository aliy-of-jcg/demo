import { NextRequest, NextResponse } from "next/server";
import clickhouse from "@/lib/clickhouse";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Link ID is required" },
        { status: 400 }
      );
    }

    // Mark the link as inactive instead of deleting it
    // This preserves the data for analytics/history
    await clickhouse.command({
      query: `
        ALTER TABLE analytics.tracking_codes
        UPDATE is_active = 0
        WHERE id = '${id}'
      `,
    });

    return NextResponse.json({
      success: true,
      message: "Link deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting tracking link:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete tracking link",
      },
      { status: 500 }
    );
  }
}

