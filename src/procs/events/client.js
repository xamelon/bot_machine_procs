(() => {
  if (window.__hyperEventsInstalled) return;
  window.__hyperEventsInstalled = true;

  let es;
  let reconnectTimer = null;
  let retryMs = 1000;

  function emitDomEvent(data) {
    document.dispatchEvent(new CustomEvent('hyper-events', { detail: data }));
  }

  // Track the server's start timestamp so a reload broadcast that happens
  // before the page even fully wired up still triggers a refresh, and so
  // we ignore stale `hello` echoes when reconnecting to the same process.
  let serverStart = null;

  function handle(data) {
    emitDomEvent(data);
    // Server restarted under us — reload to pick up the new process.
    if (data?.type === 'hello') sawServer(data.serverStart);
    // `reload` is NOT handled here. emitDomEvent already dispatched it as a
    // `hyper-events` DOM event, and whoever wants to re-render says so with an
    // hx-trigger on that event — the same way #chat and #chat-who do. A page
    // that cannot express it that way (no htmx) still has the DOM event.
    // location.reload() would drop this stream, the chat and every open tab.
  }

  // The same fact, off the request path — and this is the one that fires.
  //
  // A tab that has been sitting in the background is exactly the tab that
  // outlives a restart, and its stream is the first casualty: Chrome throttles
  // the retry timer of a hidden tab to minutes and freezes a discarded one
  // outright, so `hello` never arrives. Meanwhile its htmx requests work
  // perfectly the moment somebody clicks — old javascript against new markup,
  // which is how `window.chat.compose is not a function` gets to a console.
  // Every answer carries the process that gave it, so the first click after a
  // restart is what reloads the page.
  function sawServer(start) {
    if (typeof start !== 'number' || !start) return;
    if (serverStart !== null && serverStart !== start) { location.reload(); return; }
    serverStart = start;
  }

  function disconnect() {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    try { es?.close(); } catch {}
    es = null;
  }

  function scheduleReconnect() {
    if (document.visibilityState !== 'visible' || reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, retryMs);
    retryMs = Math.min(retryMs * 2, 10000);
  }

  function connect() {
    // Hidden tabs must not retain permanent HTTP/1 connections. Enough
    // background SSE streams consume Chrome's per-origin connection pool and
    // make ordinary htmx/fetch requests appear frozen.
    if (document.visibilityState !== 'visible') return;
    disconnect();
    es = new EventSource('/procs/events');
    es.onmessage = (e) => {
      try { handle(JSON.parse(e.data)); retryMs = 1000; } catch {}
    };
    es.onerror = () => {
      disconnect();
      scheduleReconnect();
    };
  }

  // Only a visible tab owns an SSE socket. On return the server's `hello`
  // event drives the same catch-up refreshes as an ordinary reconnect.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') { disconnect(); return; }
    retryMs = 1000;
    connect();
  });
  window.addEventListener('pagehide', disconnect);

  // Not while the document is still loading. An EventSource opened during the
  // load keeps the browser's tab spinner turning FOREVER — the stream never
  // ends, which is the point of it — and a tab that always looks like it is
  // loading is a tab whose loading indicator has stopped meaning anything. One
  // tick after `load` costs nothing: the stream is for what happens next.
  if (document.readyState === 'complete') connect();
  else window.addEventListener('load', () => setTimeout(connect, 0), { once: true });
})();
