import yaml from 'js-yaml';

// Config Example
//
// ```json
// {
//   "url": "https://example.com",
//   "excluded": ["SERVER_NAME"]
// }
async function proxyProvider(cfg: any): Promise<Response> {
  const text = await fetch(cfg.url).then((resp) => resp.text());

  let data;
  try {
    data = yaml.load(text);
  } catch (_) {
    data = {};
  }

  let { proxies } = data as any;
  proxies = (proxies ?? []).filter((item: any) => !(cfg.excluded ?? []).includes(item));
  return new Response(yaml.dump({ proxies }));
}

// Config Example
//
// ```json
// {
//   "urls": [
//     "https://example.com"
//   ]
//   "included": ["DOMAIN"],
//   "excluded": ["DOMAIN"]
// }
async function ruleProvider(cfg: any): Promise<Response> {
  const texts = await Promise.all(
    cfg.urls.map((url: string) => fetch(url).then((resp) => resp.text())),
  );

  const payload = texts
    .map((text) => {
      try {
        const data = yaml.load(text);
        const { payload: list } = data as any;
        return list ?? [];
      } catch (_) {
        return [];
      }
    })
    .concat(cfg.included ?? [])
    .flatMap((item) => item)
    .filter((item: any) => !(cfg.excluded ?? []).includes(item));

  return new Response(yaml.dump({ payload }));
}

export default {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === '/proxy-provider') {
      const base64 = url.searchParams.get('cfg') ?? 'e30';
      const json = atob(base64);
      const data = JSON.parse(json);
      return proxyProvider(data);
    }

    if (url.pathname === '/rule-provider') {
      const base64 = url.searchParams.get('cfg') ?? 'e30';
      const json = atob(base64);
      const data = JSON.parse(json);
      return ruleProvider(data);
    }

    return new Response('Not Found', { status: 404 });
  },
};
