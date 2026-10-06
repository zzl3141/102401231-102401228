/*!
 * router.js —— hash 路由
 * 负责人：102401231 赵紫龙
 *
 * 用 hash 路由（#/home）而不是多页面，是因为助教直接双击 index.html
 * 用 file:// 打开，hash 路由不涉及任何跨文件请求，最不容易出问题。
 */
(function (root) {
  'use strict';

  var routes = [];
  var afterHooks = [];
  var notFound = null;

  /** '/detail/:id' -> RegExp + 参数名列表 */
  function compile(pattern) {
    var keys = [];
    var source = String(pattern).replace(/\/+$/, '').replace(/:([A-Za-z0-9_]+)/g, function (_, key) {
      keys.push(key);
      return '([^/]+)';
    });
    return { re: new RegExp('^' + source + '$'), keys: keys };
  }

  function register(pattern, handler) {
    var c = compile(pattern);
    routes.push({ pattern: pattern, re: c.re, keys: c.keys, handler: handler });
  }

  function setNotFound(handler) {
    notFound = handler;
  }

  function afterRender(fn) {
    if (typeof fn === 'function') afterHooks.push(fn);
  }

  /** '#/detail/itm_1?from=home' -> { path: '/detail/itm_1', query: { from: 'home' } } */
  function parse(hash) {
    var h = String(hash || '').replace(/^#/, '');
    if (!h || h === '/') h = '/home';

    var query = {};
    var qIndex = h.indexOf('?');
    if (qIndex >= 0) {
      h.slice(qIndex + 1).split('&').forEach(function (pair) {
        if (!pair) return;
        var kv = pair.split('=');
        var k = decodeURIComponent(kv[0] || '');
        if (k) query[k] = decodeURIComponent(kv.slice(1).join('=') || '');
      });
      h = h.slice(0, qIndex);
    }

    if (h.length > 1) h = h.replace(/\/+$/, '');
    if (!h) h = '/home';
    return { path: h, query: query };
  }

  function resolve(path) {
    for (var i = 0; i < routes.length; i++) {
      var m = routes[i].re.exec(path);
      if (!m) continue;
      var params = {};
      for (var j = 0; j < routes[i].keys.length; j++) {
        params[routes[i].keys[j]] = decodeURIComponent(m[j + 1]);
      }
      return { route: routes[i], params: params };
    }
    return null;
  }

  function render() {
    var parsed = parse(root.location.hash);
    var matched = resolve(parsed.path);
    var ctx = {
      path: parsed.path,
      params: matched ? matched.params : {},
      query: parsed.query,
      matched: !!matched
    };

    if (matched) matched.route.handler(ctx);
    else if (notFound) notFound(ctx);

    afterHooks.forEach(function (fn) {
      try { fn(ctx); } catch (e) { /* 钩子出错不影响页面 */ }
    });
    return ctx;
  }

  function navigate(path) {
    var target = '#' + String(path || '/home');
    if (root.location.hash === target) render();
    else root.location.hash = target;
  }

  function start() {
    root.addEventListener('hashchange', render);
    render();
  }

  function currentPath() {
    return parse(root.location.hash).path;
  }

  root.LFRouter = {
    register: register,
    setNotFound: setNotFound,
    afterRender: afterRender,
    navigate: navigate,
    render: render,
    start: start,
    parse: parse,
    resolve: resolve,
    currentPath: currentPath
  };
})(window);
