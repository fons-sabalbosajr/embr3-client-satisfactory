import process from 'node:process';

// Suppress specific deprecated API warnings from transitive dependencies.
// DEP0060: util._extend is deprecated; some old packages still reference it.
process.on('warning', (warning) => {
  if (warning && warning.code === 'DEP0060') {
    // Ignore this specific warning to keep the console clean
    return;
  }
  // Pass through all other warnings
  console.warn(`${warning.name}: ${warning.message}\n${warning.stack || ''}`);
});
