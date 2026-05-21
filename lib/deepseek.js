import { formatError, logError, logInfo, previewText } from "./logger.js";
import { deepseekConfig } from "../config/deepseek.js";

const FALLBACK_REPLY = "抱歉，我现在暂时无法处理这个请求，请稍后再试。";

function buildMessages(content) {
  return [
    {
      role: "system",
      content: deepseekConfig.systemPrompt,
    },
    {
      role: "user",
      content: typeof content === "string" ? content : "",
    },
  ];
}

function normalizeBaseUrl(baseUrl) {
  return baseUrl.replace(/\/+$/, "");
}

function limitReplyLength(text) {
  const maxReplyChars = deepseekConfig.maxReplyChars;

  if (!Number.isFinite(maxReplyChars) || maxReplyChars <= 0) {
    return text;
  }

  const chars = Array.from(text);
  if (chars.length <= maxReplyChars) {
    return text;
  }

  return chars.slice(0, maxReplyChars).join("");
}

export async function getDeepSeekReply(content, context = {}) {
  const traceId = context.traceId ?? "deepseek";
  const sessionId = context.sessionId ?? "";
  const apiKey = deepseekConfig.apiKey;
  const startedAt = Date.now();

  logInfo("deepseek", "request_start", {
    traceId,
    sessionId,
    model: deepseekConfig.model,
    baseUrl: deepseekConfig.baseUrl,
    contentPreview: previewText(content, 120),
    hasApiKey: Boolean(apiKey),
  });

  if (!apiKey) {
    logInfo("deepseek", "api_key_missing", {
      traceId,
      sessionId,
      durationMs: Date.now() - startedAt,
    });
    return FALLBACK_REPLY;
  }

  try {
    const response = await fetch(`${normalizeBaseUrl(deepseekConfig.baseUrl)}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: deepseekConfig.model,
        messages: buildMessages(content),
        stream: false,
      }),
      signal: AbortSignal.timeout(12000),
    });

    logInfo("deepseek", "response_received", {
      traceId,
      sessionId,
      statusCode: response.status,
      statusText: response.statusText,
      ok: response.ok,
      durationMs: Date.now() - startedAt,
    });

    if (!response.ok) {
      logError("deepseek", "request_failed_status", {
        traceId,
        sessionId,
        statusCode: response.status,
        statusText: response.statusText,
        durationMs: Date.now() - startedAt,
      });
      return FALLBACK_REPLY;
    }

    const data = await response.json();
    const answer = data?.choices?.[0]?.message?.content;

    if (typeof answer !== "string") {
      return FALLBACK_REPLY;
    }

    const trimmed = answer.trim();
    const limited = limitReplyLength(trimmed);
    const wasTruncated = limited !== trimmed;

    logInfo("deepseek", "request_success", {
      traceId,
      sessionId,
      durationMs: Date.now() - startedAt,
      answerPreview: previewText(limited, 120),
      answerLength: trimmed.length,
      returnedLength: Array.from(limited).length,
      wasTruncated,
    });
    return limited || FALLBACK_REPLY;
  } catch (error) {
    logError("deepseek", "request_exception", {
      traceId,
      sessionId,
      durationMs: Date.now() - startedAt,
      error: formatError(error),
    });
    return FALLBACK_REPLY;
  }
}
