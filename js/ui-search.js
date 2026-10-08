/*!
 * ui-search.js —— 搜索页
 * 负责人：102401231 赵紫龙
 *
 * 包含：关键词搜索（名称 / 描述 / 地点）、只看寻物 / 只看招领、
 *       骨架屏、加载失败与重试、无结果空状态、热门搜索。
 *
 * 两个约定：
 *  1. 关键词只输空格 = 没输入：显示初始态，而不是把全部信息列出来。
 *  2. 搜索结果默认只包含进行中的信息，已结束的不再打扰用户。
 */
(function (root) {
  'use strict';

  var UI = root.LFUI = root.LFUI || {};
  var h = UI.h;
  var M = root.LFModel;
  var S = root.LFStore;

  var HOT = ['校园卡', '钥匙', '雨伞', '耳机', '课本'];

  var state = { kw: '', type: 'all' };
  var timer = null;

  var TYPE_TABS = [
    { value: 'all', label: '全部' },
    { value: 'lost', label: '只看寻物' },
    { value: 'found', label: '只看招领' }
  ];

  function shell() {
    var typeSeg = TYPE_TABS.map(function (t) {
      return '<span class="' + (t.value === state.type ? 'on' : '') + '" ' +
        'data-sf="type" data-sv="' + h.esc(t.value) + '">' + h.esc(t.label) + '</span>';
    }).join('');

    return '' +
      '<div class="searchbox search-head">' +
        '<span>\uD83D\uDD0D</span>' +
        '<input id="kw" type="search" autocomplete="off" ' +
          'placeholder="搜索物品名称、地点" value="' + h.esc(state.kw) + '">' +
        '<span class="search-clear' + (state.kw ? '' : ' hide') + '" id="clearKw" title="清空">\u00d7</span>' +
      '</div>' +
      '<div class="filter-bar">' +
        '<div class="seg">' + typeSeg + '</div>' +
      '</div>' +
      '<div class="list-head"><span id="count"></span></div>' +
      '<div id="list"></div>';
  }

  function render(ctx) {
    var q = (ctx && ctx.query) || {};
    state.kw = q.kw || '';
    if (q.type) state.type = q.type;

    h.host().innerHTML = h.screen({ title: '搜索', back: '/home' }, shell());
    syncChips();
    focusInput();
    run(q.fail === '1');
  }

  function focusInput() {
    var input = document.getElementById('kw');
    if (!input) return;
    try {
      input.focus();
      var n = input.value.length;
      input.setSelectionRange(n, n);
    } catch (e) { /* 某些环境下不支持，忽略即可 */ }
  }

  function syncChips() {
    var chips = document.querySelectorAll('[data-sf]');
    for (var i = 0; i < chips.length; i++) {
      if (chips[i].getAttribute('data-sv') === state.type) chips[i].classList.add('on');
      else chips[i].classList.remove('on');
    }
  }

  function syncClear() {
    var btn = document.getElementById('clearKw');
    if (!btn) return;
    if (state.kw) btn.classList.remove('hide');
    else btn.classList.add('hide');
  }

  function initialState() {
    var recents = S.recent();
    var recentBlock = recents.length
      ? '<div class="row" style="justify-content:space-between">' +
          '<span class="hot-title">最近搜索</span>' +
          '<span class="chip" data-sclear="1">清空</span>' +
        '</div>' +
        '<div class="chips mt-12">' + recents.map(function (k) {
          return '<span class="chip" data-skw="' + h.esc(k) + '">' + h.esc(k) + '</span>';
        }).join('') + '</div>'
      : '';

    return '' +
      (recentBlock ? '<div class="card">' + recentBlock + '</div>' : '') +
      '<div class="card">' +
        '<div class="hot-title">热门搜索</div>' +
        '<div class="chips mt-12">' + HOT.map(function (k) {
          return '<span class="chip" data-skw="' + h.esc(k) + '">' + h.esc(k) + '</span>';
        }).join('') + '</div>' +
        '<div class="item-meta">输入物品名称就能查，描述和地点里的字也能匹配到；按回车会把这次搜索记进「最近搜索」</div>' +
      '</div>';
  }

  function run(forceFail) {
    var kw = M.trim(state.kw);
    var box = document.getElementById('list');
    var count = document.getElementById('count');
    if (!box) return;

    if (M.isBlankKeyword(kw)) {
      if (count) count.textContent = '';
      box.innerHTML = initialState();
      return;
    }

    box.innerHTML = h.skeletonList(2);
    if (count) count.textContent = '搜索中…';

    S.fetchItems({
      keyword: kw,
      type: state.type,
      status: 'active',
      __fail: !!forceFail
    }, function (res) {
      var box2 = document.getElementById('list');
      if (!box2) return;
      var count2 = document.getElementById('count');

      if (!res.ok) {
        if (count2) count2.textContent = '';
        box2.innerHTML = h.loadFailed(res.error, 'search');
        return;
      }

      if (count2) count2.textContent = '找到 ' + res.items.length + ' 条与「' + kw + '」相关的信息';

      if (!res.items.length) {
        box2.innerHTML = h.empty({
          icon: '\uD83D\uDD0E',
          title: '没有找到相关的信息',
          sub: '换个关键词试试，比如只填物品名称',
          actionText: '返回首页浏览',
          actionNav: '/home'
        });
        return;
      }

      box2.innerHTML = res.items.map(function (it) { return h.itemCard(it); }).join('');
    });
  }

  function scheduleRun() {
    if (timer) root.clearTimeout(timer);
    timer = root.setTimeout(function () { run(false); }, 250);
  }

  /* 输入时只重画结果区，不重画整个页面，否则输入框会失去焦点 */
  document.addEventListener('input', function (e) {
    if (!e.target || e.target.id !== 'kw') return;
    state.kw = e.target.value;
    syncClear();
    scheduleRun();
  });

  /* 按回车才记「最近搜索」：边打字边记会把「雨」「雨伞」这种半截词也记进去 */
  document.addEventListener('keydown', function (e) {
    if (!e.target || e.target.id !== 'kw') return;
    if (e.key !== 'Enter') return;
    if (M.isBlankKeyword(state.kw)) return;
    S.addRecent(state.kw);
    run(false);
  });

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;

    var hot = t.closest('[data-skw]');
    if (hot) {
      state.kw = hot.getAttribute('data-skw');
      var input = document.getElementById('kw');
      if (input) input.value = state.kw;
      syncClear();
      S.addRecent(state.kw);
      run(false);
      return;
    }

    if (t.closest('[data-sclear]')) {
      S.clearRecent();
      run(false);
      return;
    }

    var chip = t.closest('[data-sf]');
    if (chip) {
      state.type = chip.getAttribute('data-sv');
      syncChips();
      run(false);
      return;
    }

    if (t.closest('#clearKw')) {
      state.kw = '';
      var inp = document.getElementById('kw');
      if (inp) {
        inp.value = '';
        inp.focus();
      }
      syncClear();
      run(false);
      return;
    }

    if (t.closest('[data-retry="search"]')) run(false);
  });

  UI.search = { render: render, state: state };
})(window);
