(() => {
  const originalFetch = window.fetch.bind(window);
  if (!window.location.hostname.endsWith('.github.io')) return;

  const repository = window.location.pathname.split('/').filter(Boolean)[0] || '';
  const basePath = repository ? `/${repository}` : '';
  let dataPromise;

  async function readItems() {
    if (!dataPromise) {
      dataPromise = originalFetch(`${basePath}/data/category_items.json`)
        .then((response) => {
          if (!response.ok) throw new Error(`Data request failed: ${response.status}`);
          return response.json();
        });
    }
    return dataPromise;
  }

  window.fetch = async (input, init = {}) => {
    const requestUrl = typeof input === 'string' ? input : input?.url;
    const url = new URL(requestUrl, window.location.href);
    const method = String(init.method || (typeof input !== 'string' && input?.method) || 'GET').toUpperCase();

    if (method === 'GET' && url.pathname.endsWith('/__pb/api/category_items')) {
      const data = await readItems();
      const categoryId = url.searchParams.get('category_id');
      const page = Math.max(1, Number(url.searchParams.get('page') || 1));
      const perPage = Math.max(1, Number(url.searchParams.get('perPage') || 500));
      const filtered = categoryId
        ? data.items.filter((item) => item.category_id === categoryId)
        : data.items;
      const start = (page - 1) * perPage;
      return new Response(JSON.stringify({
        items: filtered.slice(start, start + perPage),
        page,
        perPage,
        totalItems: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / perPage))
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    return originalFetch(input, init);
  };
})();
