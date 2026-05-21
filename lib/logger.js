import { randomUUID } from "crypto";

const LOG_FORMAT = process.env.LOG_FORMAT ?? "pretty";

const MESSAGE_LABELS = {
  voiceMonitor: {
    invalid_json: "JSON 解析失败",
    invalid_status: "状态值非法",
    request_completed: "语音状态",
  },
  listenQwen: {
    invalid_json: "JSON 解析失败",
    request_received: "收到请求",
    branch_speech_context: "普通对话 -> DeepSeek",
    branch_cmd: "命令请求 -> 固定回复",
    response_ready: "响应完成",
    unknown_event: "未知事件",
  },
  deepseek: {
    request_start: "DeepSeek 请求",
    api_key_missing: "DeepSeek 缺少 API Key",
    response_received: "DeepSeek 响应",
    request_failed_status: "DeepSeek 状态异常",
    request_success: "DeepSeek 成功",
    request_exception: "DeepSeek 异常",
  },
};

const KEY_LABELS = {
  traceId: "trace",
  requestId: "request",
  sessionId: "session",
  robotId: "robot",
  functionName: "function",
  contentPreview: "text",
  functionParamPreview: "param",
  replyPreview: "reply",
  answerPreview: "answer",
  answerLength: "answerLen",
  hasApiKey: "apiKey",
  durationMs: "cost",
};

const DETAIL_ORDER = [
  "traceId",
  "requestId",
  "sessionId",
  "robotId",
  "status",
  "phase",
  "event",
  "functionName",
  "model",
  "baseUrl",
  "hasApiKey",
  "statusCode",
  "statusText",
  "ok",
  "contentPreview",
  "functionParamPreview",
  "replyPreview",
  "answerPreview",
  "answerLength",
  "durationMs",
  "error",
];

export function makeTraceId(prefix = "req") {
  return `${prefix}_${randomUUID()}`;
}

export function previewText(value, maxLength = 120) {
  if (typeof value !== "string") {
    return "";
  }

  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength)}...`;
}

export function formatError(error) {
  if (!error) {
    return null;
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === "object") {
    return {
      name: error.name ?? "Error",
      message: error.message ?? String(error),
    };
  }

  return {
    name: "Error",
    message: String(error),
  };
}

function formatTimestamp(date) {
  const pad = (value, width = 2) => String(value).padStart(width, "0");

  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`,
  ].join(" ");
}

function readableMessage(scope, message) {
  return MESSAGE_LABELS[scope]?.[message] ?? message;
}

function readableKey(key) {
  return KEY_LABELS[key] ?? key;
}

function shortenTrace(value) {
  if (typeof value !== "string" || value.length <= 32) {
    return value;
  }

  return `${value.slice(0, 20)}...`;
}

function formatValue(key, value) {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  if (key === "durationMs") {
    return `${value}ms`;
  }

  if (key === "traceId" || key === "requestId") {
    return shortenTrace(value);
  }

  if (key === "error") {
    return value.message ?? String(value);
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  const text = String(value);
  if (
    key.endsWith("Preview") ||
    text.includes(" ") ||
    text.includes("\t") ||
    text.includes("\n")
  ) {
    return JSON.stringify(text);
  }

  return text;
}

function formatDetails(details) {
  const keys = [
    ...DETAIL_ORDER.filter((key) => Object.hasOwn(details, key)),
    ...Object.keys(details).filter((key) => !DETAIL_ORDER.includes(key)),
  ];

  return keys
    .map((key) => {
      const value = formatValue(key, details[key]);
      if (!value) {
        return "";
      }

      return `${readableKey(key)}=${value}`;
    })
    .filter(Boolean)
    .join(" ");
}

function formatPretty(record) {
  const { ts, level, scope, message, ...details } = record;
  const detailText = formatDetails(details);
  const line = `${formatTimestamp(new Date(ts))} ${level.toUpperCase()} [${scope}] ${readableMessage(scope, message)}`;

  return detailText ? `${line} ${detailText}` : line;
}

function emit(level, scope, message, details = {}) {
  const record = {
    ts: new Date().toISOString(),
    level,
    scope,
    message,
    ...details,
  };

  const line = LOG_FORMAT === "json" ? JSON.stringify(record) : formatPretty(record);

  if (level === "error") {
    console.error(line);
    return;
  }

  console.log(line);
}

export function logInfo(scope, message, details = {}) {
  emit("info", scope, message, details);
}

export function logError(scope, message, details = {}) {
  emit("error", scope, message, details);
}
