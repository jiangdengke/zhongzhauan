import { NextResponse } from "next/server";
import { logError, logInfo, makeTraceId } from "../../../lib/logger.js";

export async function POST(request) {
  const traceId = makeTraceId("voice");
  const startedAt = Date.now();
  let payload;

  try {
    payload = await request.json();
  } catch {
    logError("voiceMonitor", "invalid_json", {
      traceId,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: { "x-trace-id": traceId } });
  }

  const robotId = typeof payload?.robotId === "string" ? payload.robotId : "4";
  const status = typeof payload?.status === "string" ? payload.status : "";

  if (status !== "0" && status !== "1") {
    logError("voiceMonitor", "invalid_status", {
      traceId,
      robotId,
      status,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      { error: 'status must be "0" or "1"' },
      { status: 400, headers: { "x-trace-id": traceId } },
    );
  }

  const phase = status === "0" ? "start-recording" : "end-recording";
  logInfo("voiceMonitor", "request_completed", {
    traceId,
    robotId,
    status,
    phase,
    durationMs: Date.now() - startedAt,
  });

  return NextResponse.json({ ok: true }, { headers: { "x-trace-id": traceId } });
}
