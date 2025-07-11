if (import.meta.env.DEV) {
  const muteMsg = msg =>
    typeof msg === 'string' && msg.startsWith('Navigated to');

  const wrap = (originalFn) => (...args) => {
    if (muteMsg(args[0])) return;
    originalFn(...args);
  };

  console.log = wrap(console.log);
  console.info = wrap(console.info);
  console.debug = wrap(console.debug);
  console.warn = wrap(console.warn);
}
