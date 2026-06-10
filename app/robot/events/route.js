import { subscribeRobotEvents } from "@/features/robot/application/robot-events.js";
import { createSseHeaders, encodeSseEvent } from "@/shared/http/sse.js";

export const dynamic = "force-dynamic";

function closeController(controller) {
  try {
    controller.close();
  } catch {
    // The client may have already closed the connection.
  }
}

export async function GET(request) {
  let unsubscribe = () => {};
  let keepAlive = null;
  let isClosed = false;

  const stream = new ReadableStream({
    start(controller) {
      function enqueue(type, data) {
        if (isClosed) {
          return;
        }

        controller.enqueue(encodeSseEvent(type, data));
      }

      function cleanup() {
        if (isClosed) {
          return;
        }

        isClosed = true;
        if (keepAlive) {
          clearInterval(keepAlive);
        }
        unsubscribe();
        closeController(controller);
      }

      enqueue("ready", {
        ok: true,
        at: new Date().toISOString(),
      });

      unsubscribe = subscribeRobotEvents((event) => {
        enqueue(event.type, event);
      }, { replayRecent: true });

      keepAlive = setInterval(() => {
        enqueue("ping", {
          at: new Date().toISOString(),
        });
      }, 15000);

      request.signal.addEventListener("abort", cleanup, { once: true });
    },
    cancel() {
      isClosed = true;
      if (keepAlive) {
        clearInterval(keepAlive);
      }
      unsubscribe();
    },
  });

  return new Response(stream, {
    headers: createSseHeaders({
      "X-Accel-Buffering": "no",
    }),
  });
}
