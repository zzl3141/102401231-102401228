/*!
 * ui-home.js —— 首页
 * 负责人：102401231 赵紫龙
 *
 * 包含：搜索入口、全部 / 寻物 / 招领 分类、类别筛选、
 *       进行中 / 已结束 切换、信息卡片列表、骨架屏、加载失败与重试、空状态。
 *
 * 已结束的信息默认不出现在列表里，要点「已结束」才看得到——
 * 这是设计方案里「状态闭环」对外的表现之一。
 */
(function (root) {
  'use strict';

  var UI = root.LFUI = root.LFUI || {};
  var h = UI.h;
  var M = root.LFModel;
  var S = root.LFStore;

  /* 页面筛选状态放在模块里：切换分类不重新走路由，列表不会闪一下 */
  var state = { type: 'all', category: 'all', status: 'active' };

  var TYPE_TABS = [
    { value: 'all', label: '全部' },
    { value: 'lost', label: '寻物' },
    { value: 'found', label: '招领' }
  ];

  var STATUS_TABS = [
    { value: 'active', label: '进行中' },
    { value: 'closed', label: '已结束' }
  ];

  function shell() {
    var typeSeg = TYPE_TABS.map(function (t) {
      return '<span class="' + (t.value === state.type ? 'on' : '') + '" ' +
        'data-hf="type" data-hv="' + h.esc(t.value) + '">' + h.esc(t.label) + '</span>';
    }).join('');

    var catChips = [{ value: 'all', label: '全部类别' }]
      .concat(M.CATEGORIES.map(function (c) { return { value: c, label: c }; }))
      .map(function (it) {
        return '<span class="chip' + (it.value === state.category ? ' on' : '') + '" ' +
          'data-hf="category" data-hv="' + h.esc(it.value) + '">' + h.esc(it.label) + '</span>';
      }).join('');

    var statusChips = STATUS_TABS.map(function (t) {
      return '<span class="chip' + (t.value === state.status ? ' on' : '') + '" ' +
        'data-hf="status" data-hv="' + h.esc(t.value) + '">' + h.esc(t.label) + '</span>';
    }).join('');

    return '' +
      '<div class="searchbox" data-nav="/search">' +
        '<span>\uD83D\uDD0D</span><span>搜索物品名称、地点</span>' +
      '</div>' +
      '<div class="filter-bar">' +
        '<div class="seg">' + typeSeg + '</div>' +
        '<div class="chips">' + catChips + '</div>' +
      '</div>' +
      '<div class="list-head">' +
        '<span id="count">加载中…</span>' +
        '<span class="chips">' + statusChips + '</span>' +
      '</div>' +
      '<div id="list">' + h.skeletonList(3) + '</div>';
  }

  function render(ctx) {
    var q = (ctx && ctx.query) || {};
    if (q.type) state.type = q.type;
    if (q.category) state.category = q.category;
    if (q.status) state.status = q.status;
    paint(q.fail === '1');
  }

  function paint(forceFail) {
    h.host().innerHTML = h.screen({ title: '校园失物招领', sub: 'FZU' }, shell());
    load(forceFail);
  }

  function load(forceFail) {
    S.fetchItems({
      type: state.type,
      category: state.category,
      status: state.status,
      __fail: !!forceFail
    }, function (res) {
      var box = document.getElementById('list');
      if (!box) return;                      /* 页面已经切走，别再往旧节点上画 */
      var count = document.getElementById('count');

      if (!res.ok) {
        if (count) count.textContent = '';
        box.innerHTML = h.loadFailed(res.error, 'home');
        return;
      }

      if (count) {
        count.textContent = '共 ' + res.items.length + ' 条' +
          (state.status === 'closed' ? '已结束' : '进行中') + '的信息';
      }

      if (!res.items.length) {
        box.innerHTML = h.empty({
          icon: state.status === 'closed' ? '\uD83D\uDCE6' : '\uD83D\uDCEB',
          title: state.status === 'closed' ? '还没有已结束的信息' : '这个分类下暂时没有信息',
          sub: '换个分类看看，或者自己发布一条',
          actionText: '去发布',
          actionNav: '/publish'
        });
        return;
      }

      box.innerHTML = res.items.map(function (it) { return h.itemCard(it); }).join('');
    });
  }

  /* 事件用委托挂在 document 上，只注册一次，重绘多少次都不会重复绑定 */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;

    var filter = t.closest('[data-hf]');
    if (filter) {
      state[filter.getAttribute('data-hf')] = filter.getAttribute('data-hv');
      paint(false);
      return;
    }

    if (t.closest('[data-retry="home"]')) load(false);
  });

  UI.home = { render: render, state: state };
})(window);
