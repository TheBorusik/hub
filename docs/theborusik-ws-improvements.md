# @theborusik/ws и @theborusik/ws-react — предложения по улучшению

> Бэклог идей после миграции hub на overlay-based reconnect (PR #3, commit
> `6c22415`). Приоритет субъективный.

## 1. Экспоненциальный бэкофф + jitter для реконнектов (**HIGH**)

**Сейчас** (`auth-websocket.ts:168-174`):

```ts
const delay = this.reconnectDelay * this.reconnectAttempts
```

При 5 попытках и `base=1000ms` → 1s / 2s / 3s / 4s / 5s. На плохой сети
все попытки исчерпываются за 15 секунд → `onConnectionError`.

**Предлагается:**

```ts
const delay = Math.min(
  maxReconnectDelay ?? 30_000,
  this.reconnectDelay * 2 ** (this.reconnectAttempts - 1),
) + Math.random() * this.reconnectDelay;
```

Плюс `maxReconnectAttempts = Infinity` по умолчанию (пусть хоть час
пытается, overlay-карточка всё равно покажет статус). Это стандарт для
WebSocket-клиентов (Slack, Discord, RxDB).

**Риск:** consumer'ы которые полагаются на `onConnectionError` после 5
попыток — сломаются. Нужен опциональный флаг `giveUpAfterAttempts`.

## 2. Heartbeat / dead-connection detection (**HIGH**)

**Сейчас:** `onclose` не триггерится если обрыв сети не сопровождается
FIN-пакетом (roaming Wi-Fi → LTE, заснувший ноутбук, failover NAT). 
`attemptReconnect` не вызывается — клиент думает что всё ок, запросы
зависают до timeout'а (`defaultTimeoutMs=10s`).

Дополнительно: многие WebSocket-прокси (Nginx, Cloudflare, AWS ALB)
закрывают idle-соединения после 60-120 сек.

**Предлагается:** опциональный heartbeat в `AuthWebSocket`:

```ts
interface AuthWebSocketOptions {
  heartbeat?: {
    intervalMs?: number;      // default 25_000
    timeoutMs?: number;        // default 10_000
    pingMessage?: () => Message<any>;  // default { Type: "Ping", ... }
  };
}
```

Логика:
1. После `onopen` запускаем `setInterval` каждые `intervalMs`.
2. Шлём `Ping`, стартуем `setTimeout(timeoutMs)`.
3. При получении `Pong` (по `CorrelationId`) — cancel timeout.
4. Timeout expired → `ws.close(4000, "heartbeat timeout")` → триггерит
   `onclose` → `attemptReconnect`.

**Требует поддержки сервером** — тот должен отвечать на `Ping` типа
`{ Type: "Pong", CorrelationId: <тот же> }`. Сервер с типизированными
сообщениями обычно это уже умеет.

## 3. Reject pending requests при disconnect (**HIGH**)

**Сейчас** (`auth-websocket.ts:203-234`):

```ts
private waitResponseForMessage(...): Promise<Message<any>> {
  // ...
  this.messageHandlers.set(correlationId, handler);
}
```

При `onclose` `messageHandlers` остаются нетронутыми. Все pending
promises висят с активными `setTimeout` — reject'ятся через
`defaultTimeoutMs` с "Request timeout" уже **после** того как
переподключение прошло. У consumer'а получается «forever spinner» на
вечно крутящейся кнопке.

**Предлагается** в `onclose`:

```ts
this.ws.onclose = () => {
  // Отклоняем все pending — consumer знает что соединение упало.
  for (const [cid, handler] of this.messageHandlers) {
    handler({ Type: "Error", CorrelationId: cid, Payload: { Code: "WEBSOCKET_CLOSED" } });
  }
  this.messageHandlers.clear();
  if (!this.connectionFailed) this.attemptReconnect();
};
```

Опционально: `autoRetryPendingAfterReconnect: boolean` — сохранять
pending requests в «холодильнике» и повторно отправлять после
reauth. Полезно для идемпотентных GET'ов.

## 4. Typed event-emitter на AuthWebSocket (**MEDIUM**)

**Сейчас:** `events: WebSocketEvents` передаётся **один раз** в options.
Только один callback на событие.

На React-слое это решается через `WebSocketProvider` + `useWebSocket`,
но для vanilla (скрипты, нативные вызовы, сторонний код) — проблема.

**Предлагается:** дополнительно к `events` добавить `on/off`:

```ts
ws.on("authenticated", (v) => { ... });
ws.on("message", (msg) => { ... });  // все входящие (фильтрация извне)
ws.off("authenticated", handler);
```

Или полноценный `EventTarget`:

```ts
ws.addEventListener("authenticated", handler, { signal: abortCtrl.signal });
```

Решает кейсы типа «залогиниться → вызвать телеметрию», «подписаться на
push-нотификации с сервера», «измерить latency до первого auth».

## 5. Хук `useWebSocketCommand<T>` в `@theborusik/ws-react` (**MEDIUM**)

**Сейчас:** consumer пишет руками:

```tsx
const api = useContourApi();
const [data, setData] = useState(null);
const [loading, setLoading] = useState(false);
useEffect(() => {
  if (!api) return;
  setLoading(true);
  api.getProcessTree().then(setData).finally(() => setLoading(false));
}, [api]);
```

**Предлагается** встроенный SWR-like хук:

```tsx
const { data, error, loading, refetch } = useWebSocketCommand(
  WfmCommand.GetProcessTree,
  {},
  { enabled: isAuthenticated, staleTime: 60_000 },
);
```

Фичи:
- **Dedupe** одинаковых запросов (cmd+payload-key) — если два компонента
  запрашивают одно и то же, сервер получает один запрос, оба получают
  один ответ.
- **Автоматический refetch** при `onAuthenticated` (после reauth).
- **Cache** с TTL — `staleTime` для stale-while-revalidate.
- **Cancel on unmount** — через `AbortController`.

Меньше boilerplate в страницах, меньше race-condition'ов.

## 6. Fix React StrictMode dev-warning (**LOW**)

**Сейчас** (`index.tsx:155-158`):

```ts
return () => {
  instance.disconnect();
};
```

В dev StrictMode React делает mount → unmount → remount. Первый unmount
закрывает сокет **до** того как он открыт → `WebSocket is closed before
the connection is established` в console.

**Предлагается:** deferred cleanup с отменой:

```ts
useEffect(() => {
  let cancelled = false;
  const instance = build({...});
  queueMicrotask(() => {
    if (!cancelled) {
      setWs(instance);
      void instance.connect();
    }
  });
  return () => {
    cancelled = true;
    // disconnect только если commit уже случился
    queueMicrotask(() => instance.disconnect());
  };
}, []);
```

Или: сохранять instance в module-level Map по url и переиспользовать,
пока хотя бы один провайдер жив.

## 7. Debug-панель как отдельный пакет `@theborusik/ws-react-devtools` (**LOW**)

У sportmax есть `DevDebugPanel` с `addWebSocketMessage` — живёт на уровне
приложения. Можно оформить как отдельный пакет:

- Floating-panel с историей сообщений.
- Фильтр по direction / type / success.
- Поиск по raw JSON.
- Replay-кнопка (повторить request).
- Latency-гистограмма (чтобы видеть server-side slowdowns).

Подключение:

```tsx
<WebSocketProvider ...>
  <WebSocketDevtools />
  {children}
</WebSocketProvider>
```

## 8. Идемпотентность `connect()` и race-guards (**LOW**)

**Сейчас** `connect()` в начале делает:

```ts
if (this.ws?.readyState === WebSocket.OPEN) return
```

Но не проверяет состояние `CONNECTING`. Если кто-то дважды вызвал
`connect()` подряд (возможно при retry + race), будут две
попытки установить соединение.

**Предлагается:** явный state-machine:

```ts
type WsState = "idle" | "connecting" | "connected" | "failed";
```

И `connect()` respects current state (отказывает если already connecting).

## 9. Сериализация `onDebugMessage.raw` на больших payload'ах (**LOW**)

**Сейчас:** `raw: JSON.stringify(message, null, 2)` вычисляется
синхронно перед передачей в callback. Для сообщений с большими моделями
(полный catalog, global models) — это 100+KB JSON.stringify, blocks UI
thread на ~10-50 ms в dev.

**Предлагается:** lazy `raw` через getter:

```ts
onDebugMessage?.({
  direction: "request",
  type: message.Type,
  data: message,
  get raw() { return JSON.stringify(message, null, 2); },
});
```

Consumer'ы, которые смотрят только `data` (типичный React панель), не
платят за stringify.

## 10. TypeScript: строгие типы для `sendRequest<TReq, TRes>` (**LOW**)

**Сейчас** `sendRequest(payload: any, apiMethod: string)` — untyped.

**Предлагается:**

```ts
interface CommandMap {
  "WFM.ProcessAssembly.GetModels": { request: {}; response: GetModelsResponse };
  "Auth.GetRoles": { request: {}; response: { Roles: Role[] } };
  // ...
}

sendRequest<K extends keyof CommandMap>(
  payload: CommandMap[K]["request"],
  apiMethod: K,
  options?: SendOptions,
): Promise<Message<CommandMap[K]["response"]>>
```

Consumer расширяет `CommandMap` через declaration-merging. Это ломает
обратную совместимость, но для новых проектов — чистый DX.

---

## Что предлагаю сделать в hub'е как workaround без изменения библиотеки

### Сейчас (быстро, без изменения библиотеки)
1. **Увеличить `maxReconnectAttempts` до 20** и `reconnectDelayMs` до 2000
   в нашем `ContourWebSocketProvider` — это даст ~80 секунд попыток.
2. **Добавить periodic ping через `api.sendRequest`** на уровне
   `ContourWebSocketProvider` (если есть серверная команда `Ping`).
3. **В `useContourApi` обернуть `sendRequest` в retry** при
   `WEBSOCKET_CLOSED` ошибке — один автоматический retry после
   успешного reauth.

### Потом (через PR в библиотеку)
1. Heartbeat (п. 2) — критично для prod через прокси.
2. Reject pending on disconnect (п. 3) — чинит UX-баг forever spinner.
3. Backoff + jitter (п. 1) — стабильность на плохой сети.

---

**Последний апдейт:** 2026-04-21.
**Автор:** проект hub — результат разбора `TheBorusik/sportmax` против
наших паттернов.
