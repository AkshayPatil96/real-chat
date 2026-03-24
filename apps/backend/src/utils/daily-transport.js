import build from 'pino-abstract-transport';
import fs from 'fs';
import path from 'path';

/**
 * Custom Pino Transport to write to logs/{date}/{filename}
 * @param {object} opts
 * @param {string} opts.folder
 * @param {string} opts.filename
 */
export default async function (opts) {
  let currentStream = null;
  let currentDate = '';

  // Helper to ensure stream points to today's folder
  const getStream = () => {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    if (date !== currentDate || !currentStream) {
      if (currentStream) {
        currentStream.end();
      }

      currentDate = date;
      const dir = path.join(opts.folder, date);

      // Sync is fine here as it happens once per day/startup
      fs.mkdirSync(dir, { recursive: true });

      const filePath = path.join(dir, opts.filename);
      currentStream = fs.createWriteStream(filePath, { flags: 'a' });
    }
    return currentStream;
  };

  return build(async function (source) {
    for await (const obj of source) {
      const stream = getStream();
      // Ensure newline for NDJSON format
      const method = JSON.stringify(obj) + '\n';

      const success = stream.write(method);
      if (!success) {
        await new Promise((resolve) => stream.once('drain', resolve));
      }
    }
  });
}
