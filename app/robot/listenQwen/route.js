import { NextResponse } from "next/server";
import { getDeepSeekReply } from "../../../lib/deepseek.js";
import { logError, logInfo, makeTraceId, previewText } from "../../../lib/logger.js";

function readString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

const CMD_REPLY = "好的，我已经收到请求，请稍等。";

export async function POST(request) {
  const requestId = makeTraceId("listen");
  const startedAt = Date.now();
  let payload;

  try {
    payload = await request.json();
  } catch {
    logError("listenQwen", "invalid_json", {
      traceId: requestId,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      {
        robotId: "4",
        event: "RESPONSE_CONTEXT",
        content: "请求体不是有效的 JSON。",
      },
      { status: 400, headers: { "x-trace-id": requestId } },
    );
  }

  const robotId = readString(payload?.robotId, "4");
  const event = readString(payload?.event);
  const content = readString(payload?.content);
  const sessionId = readString(payload?.sessionId);
  const functionName = readString(payload?.function?.name);
  const functionParam = payload?.function?.param;
  const traceId = sessionId || requestId;

  logInfo("listenQwen", "request_received", {
    traceId,
    requestId,
    robotId,
    event,
    sessionId,
    functionName,
    contentPreview: previewText(content, 120),
    functionParamPreview: previewText(typeof functionParam === "string" ? functionParam : "", 120),
    hasFunctionParam: functionParam !== undefined && functionParam !== null,
  });

  if (event === "SPEECH_CONTEXT") {
    const reply = await getDeepSeekReply(content, {
      traceId,
      sessionId,
    });

    logInfo("listenQwen", "response_ready", {
      traceId,
      sessionId,
      robotId,
      event,
      durationMs: Date.now() - startedAt,
      replyPreview: previewText(reply, 120),
    });

    return NextResponse.json({
      robotId,
      event: "RESPONSE_CONTEXT",
      content: reply,
    }, { headers: { "x-trace-id": traceId } });
  }

  if (event === "CMD") {
    logInfo("listenQwen", "branch_cmd", {
      traceId,
      sessionId,
      robotId,
      functionName,
      durationMs: Date.now() - startedAt,
      replyPreview: previewText(CMD_REPLY, 120),
    });

    return NextResponse.json({
      robotId,
      event: "RESPONSE_CONTEXT",
      content: CMD_REPLY,
    }, { headers: { "x-trace-id": traceId } });
  }

  logError("listenQwen", "unknown_event", {
    traceId,
    sessionId,
    robotId,
    event,
    durationMs: Date.now() - startedAt,
  });

  return NextResponse.json({
    robotId,
    event: "RESPONSE_CONTEXT",
    content: "我已经收到请求，请稍等。",
  }, { headers: { "x-trace-id": traceId } });
}
