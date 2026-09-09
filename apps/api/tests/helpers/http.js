import http from 'node:http';

/**
 * Minimal fetch-based test client for Express apps (no supertest).
 */
export function createTestServer(app) {
  const server = http.createServer(app);

  async function listen() {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    return `http://127.0.0.1:${port}`;
  }

  async function close() {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }

  function client(baseUrl) {
    return {
      async request(method, path, { body, headers = {}, cookie } = {}) {
        const finalHeaders = { ...headers };
        if (body !== undefined) {
          finalHeaders['Content-Type'] = finalHeaders['Content-Type'] || 'application/json';
        }
        if (cookie) {
          finalHeaders.Cookie = cookie;
        }

        const response = await fetch(`${baseUrl}${path}`, {
          method,
          headers: finalHeaders,
          body: body === undefined ? undefined : JSON.stringify(body),
        });

        const contentType = response.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');
        const payload = isJson ? await response.json() : await response.text();

        return {
          status: response.status,
          headers: response.headers,
          body: payload,
          getSetCookie() {
            if (typeof response.headers.getSetCookie === 'function') {
              return response.headers.getSetCookie();
            }
            const single = response.headers.get('set-cookie');
            return single ? [single] : [];
          },
        };
      },
      get(path, options) {
        return this.request('GET', path, options);
      },
      post(path, options) {
        return this.request('POST', path, options);
      },
      patch(path, options) {
        return this.request('PATCH', path, options);
      },
      delete(path, options) {
        return this.request('DELETE', path, options);
      },
    };
  }

  return { listen, close, client };
}

export function readCookie(setCookieHeaders, name) {
  for (const entry of setCookieHeaders) {
    const part = String(entry).split(';')[0];
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key === name) return decodeURIComponent(part.slice(eq + 1));
  }
  return null;
}
