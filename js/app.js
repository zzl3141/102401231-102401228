/*!
 * app.js —— 启动入口
 * 负责人：102401231 赵紫龙
 *
 * 职责：
 *  1. 首次打开时写入内置示例数据
 *  2. 注册路由表
 *  3. 启动路由并同步底部导航高亮
 *  4. 统一接管所有 [data-nav] 元素的点击，各页面不用各自绑事件
 */
(function (root) {
  'use strict';

  var UI = root.LFUI;
  var Router = root.LFRouter;
  var Store = root.LFStore;

  function registerRoutes() {
    Router.register('/home', UI.home.render);
    Router.register('/search', UI.search.render);
    Router.register('/detail/:id', UI.detail.render);
    Router.register('/publish', UI.publish.render);
    Router.register('/mine', UI.mine.render);

    Router.setNotFound(function (ctx) {
      UI.h.host().innerHTML = UI.h.screen({ title: '页面不存在', back: '/home' },
        UI.h.empty({
          icon: '\uD83E\uDDED',
          title: '找不到这个页面',
          sub: ctx.path,
          actionText: '返回首页',
          actionNav: '/home'
        })
      );
    });
  }

  /** 底部导航高亮：搜索页与详情页也算在首页这一栏下 */
  function syncTab() {
    var path = Router.currentPath();
    var tab = '/home';
    if (path.indexOf('/publish') === 0) tab = '/publish';
    else if (path.indexOf('/mine') === 0) tab = '/mine';

    var tabs = document.querySelectorAll('#tabbar .tab');
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].getAttribute('data-tab') === tab) tabs[i].classList.add('on');
      else tabs[i].classList.remove('on');
    }
  }

  /** 页面里任何带 data-nav 的元素，点击后统一跳转 */
  function bindNav() {
    document.addEventListener('click', function (e) {
      var el = e.target && e.target.closest ? e.target.closest('[data-nav]') : null;
      if (!el) return;
      var to = el.getAttribute('data-nav');
      if (!to) return;
      e.preventDefault();
      Router.navigate(to);
    });
  }

  function boot() {
    Store.seedIfEmpty();
    registerRoutes();
    Router.afterRender(syncTab);
    bindNav();
    Router.start();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
