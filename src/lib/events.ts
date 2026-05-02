type Listener = (data: unknown) => void;

class EventBus {
  private channels = new Map<string, Set<Listener>>();

  subscribe(channel: string, fn: Listener) {
    let set = this.channels.get(channel);
    if (!set) {
      set = new Set();
      this.channels.set(channel, set);
    }
    set.add(fn);
    return () => {
      set!.delete(fn);
      if (set!.size === 0) this.channels.delete(channel);
    };
  }

  publish(channel: string, data: unknown) {
    const set = this.channels.get(channel);
    if (!set) return;
    for (const fn of set) {
      try {
        fn(data);
      } catch {
        /* ignore listener errors */
      }
    }
  }
}

const g = globalThis as unknown as { __smartreceiptBus?: EventBus };
export const bus = g.__smartreceiptBus ?? (g.__smartreceiptBus = new EventBus());

export const roomChannel = (code: string) => `room:${code}`;
