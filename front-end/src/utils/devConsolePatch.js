if (import.meta.env.DEV) {
  const muteMsg = msg => {
    if (typeof msg !== 'string') return false;
    return (
      msg.startsWith('Navigated to') ||
      msg.startsWith('Fetched Current User') ||
      msg.startsWith('Connected to Socket.IO')
    );
  };

  const wrap = (originalFn) => (...args) => {
    if (muteMsg(args[0])) return;
    originalFn(...args);
  };

  console.log = wrap(console.log);
  console.info = wrap(console.info);
  console.debug = wrap(console.debug);
  console.warn = wrap(console.warn);
}
