const MAX_RECENT_EVENTS = 100;

function getEventState() {
  if (!globalThis.__robotEventState) {
    globalThis.__robotEventState = {
      listeners: new Set(),
      recentEvents: [],
      sequence: 0,
    };
  }

  return globalThis.__robotEventState;
}

function createEventId(state, type) {
  state.sequence += 1;
  return `${type}-${Date.now()}-${state.sequence}`;
}

export function publishRobotEvent(type, data = {}) {
  const state = getEventState();
  const event = {
    id: createEventId(state, type),
    type,
    at: new Date().toISOString(),
    data,
  };

  state.recentEvents.push(event);
  if (state.recentEvents.length > MAX_RECENT_EVENTS) {
    state.recentEvents.shift();
  }

  for (const listener of state.listeners) {
    try {
      listener(event);
    } catch {
      state.listeners.delete(listener);
    }
  }

  return event;
}

export function subscribeRobotEvents(listener, options = {}) {
  const state = getEventState();
  state.listeners.add(listener);

  if (options.replayRecent) {
    for (const event of state.recentEvents) {
      listener({
        ...event,
        replayed: true,
      });
    }
  }

  return () => {
    state.listeners.delete(listener);
  };
}
