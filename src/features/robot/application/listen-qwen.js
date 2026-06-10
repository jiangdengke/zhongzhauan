import { getDeepSeekReply } from "@/integrations/deepseek/client.js";
import { logError, logInfo, makeTraceId, previewText } from "@/shared/logging/logger.js";
import { DEFAULT_ROBOT_ID, ROBOT_EVENTS, ROBOT_REPLIES } from "../domain/constants.js";
import { createCommandReply } from "./command-replies.js";
import { createAcceptedPayload, createResponsePayload, normalizeListenPayload } from "./listen-request.js";

export function createInvalidListenJsonResult({ requestId = makeTraceId("listen"), startedAt = Date.now() } = {}) {
  logError("listenQwen", "invalid_json", {
    traceId: requestId,
    durationMs: Date.now() - startedAt,
  });

  return {
    status: 200,
    traceId: requestId,
    body: createResponsePayload(DEFAULT_ROBOT_ID, ROBOT_REPLIES.invalidJson),
  };
}

export async function handleListenQwen(payload, options = {}, dependencies = {}) {
  const requestId = options.requestId ?? makeTraceId("listen");
  const startedAt = options.startedAt ?? Date.now();
  const getConversationReply = dependencies.getConversationReply ?? getDeepSeekReply;
  const request = normalizeListenPayload(payload, requestId);

  logInfo("listenQwen", "request_received", {
    traceId: request.traceId,
    requestId,
    robotId: request.robotId,
    event: request.event,
    language: request.language,
    sessionId: request.sessionId,
    functionName: request.functionName,
    contentPreview: previewText(request.content, 120),
    functionParamPreview: previewText(typeof request.functionParam === "string" ? request.functionParam : "", 120),
    hasFunctionParam: request.functionParam !== undefined && request.functionParam !== null,
    stream: false,
  });

  if (request.event === ROBOT_EVENTS.speechContext) {
    const reply = await getConversationReply(request.content, {
      traceId: request.traceId,
      sessionId: request.sessionId,
    });

    logInfo("listenQwen", "response_ready", {
      traceId: request.traceId,
      sessionId: request.sessionId,
      robotId: request.robotId,
      event: request.event,
      durationMs: Date.now() - startedAt,
      replyPreview: previewText(reply, 120),
      stream: false,
    });

    return {
      status: 200,
      traceId: request.traceId,
      body: createResponsePayload(request.robotId, reply),
    };
  }

  if (request.event === ROBOT_EVENTS.asrPartial) {
    logInfo("listenQwen", "asr_partial_received", {
      traceId: request.traceId,
      sessionId: request.sessionId,
      robotId: request.robotId,
      language: request.language,
      contentPreview: previewText(request.content, 120),
      durationMs: Date.now() - startedAt,
      stream: false,
    });

    return {
      status: 200,
      traceId: request.traceId,
      body: createAcceptedPayload(),
    };
  }

  if (request.event === ROBOT_EVENTS.command) {
    const commandReply = createCommandReply(request);

    logInfo("listenQwen", "branch_cmd", {
      traceId: request.traceId,
      sessionId: request.sessionId,
      robotId: request.robotId,
      functionName: request.functionName,
      commandOk: commandReply.ok,
      durationMs: Date.now() - startedAt,
      replyPreview: previewText(commandReply.reply, 120),
      stream: false,
    });

    return {
      status: 200,
      traceId: request.traceId,
      body: createResponsePayload(request.robotId, commandReply.reply),
    };
  }

  logError("listenQwen", "unknown_event", {
    traceId: request.traceId,
    sessionId: request.sessionId,
    robotId: request.robotId,
    event: request.event,
    durationMs: Date.now() - startedAt,
    stream: false,
  });

  return {
    status: 200,
    traceId: request.traceId,
    body: createResponsePayload(request.robotId, ROBOT_REPLIES.unknownEvent),
  };
}
