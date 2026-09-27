/**
 * Comlink worker istemcisi, çökme korumalı. Worker çökerse (ör. bellek
 * yetersizliği) bekleyen çağrılar `WorkerCrashed` ile reddedilir ve bir
 * sonraki çağrıda worker yeniden oluşturulur. Uygulama çökmez.
 *
 * `factory` içinde `new Worker(new URL('./x.ts', import.meta.url))` yazılmalı:
 * Vite worker'ları bu kalıbı görerek paketler.
 */
import * as Comlink from 'comlink';

export class WorkerCrashed extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = 'WorkerCrashed';
  }
}

export function createWorkerClient<T>(factory: () => Worker) {
  let worker: Worker | null = null;
  let remote: Comlink.Remote<T> | null = null;
  let pending: ((e: WorkerCrashed) => void)[] = [];

  const reset = (detail: string) => {
    const fail = pending;
    pending = [];
    worker?.terminate();
    worker = null;
    remote = null;
    fail.forEach((f) => f(new WorkerCrashed(detail)));
  };

  const ensure = (): Comlink.Remote<T> => {
    if (remote) return remote;
    worker = factory();
    worker.addEventListener('error', (e) => reset(e.message || 'worker error'));
    remote = Comlink.wrap<T>(worker);
    return remote;
  };

  return {
    /** Uzak çağrıyı çökme korumasıyla çalıştırır. */
    call<R>(fn: (api: Comlink.Remote<T>) => Promise<R>): Promise<R> {
      const api = ensure();
      return new Promise<R>((resolve, reject) => {
        const onCrash = (e: WorkerCrashed) => reject(e);
        pending.push(onCrash);
        fn(api)
          .then(resolve, (err: unknown) => reject(new WorkerCrashed(err instanceof Error ? err.message : String(err))))
          .finally(() => {
            pending = pending.filter((f) => f !== onCrash);
          });
      });
    },
    /** Uzun süren işi iptal etmek için worker'ı öldürür (bir sonraki çağrı yenisini açar). */
    terminate() {
      reset('terminated');
    },
  };
}
