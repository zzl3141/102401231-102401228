/*!
 * ui-detail.js —— 信息详情页
 * 负责人：102401228 林彦翔（本轮由赵紫龙先打通闭环，可在此基础上改进）
 *
 * 关键规则（来自设计方案的状态闭环）：
 *  - 进行中 + 非本人：展示联系方式，主按钮是「复制联系方式，联系发布者」
 *  - 进行中 + 本人  ：主按钮变成「标记为已找到 / 已归还」
 *  - 已结束        ：顶部状态横幅 + 不再展示联系方式，只读
 */
(function (root) {
  'use strict';

  var UI = root.LFUI = root.LFUI || {};
  var h = UI.h;
  var M = root.LFModel;
  var S = root.LFStore;

  var current = null;      /* 当前这条信息 */
  var lastCtx = null;      /* 记住路由参数，重试时用 */

  function two(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function shortDate(ts) {
    var d = new Date(Number(ts) || 0);
    if (!ts) return '';
    return two(d.getMonth() + 1) + '-' + two(d.getDate());
  }

  function detailSkeleton() {
    return '' +
      '<div class="skeleton" style="height:190px;border-radius:14px;margin-bottom:12px"></div>' +
      '<div class="card">' +
        '<div class="skeleton sk-line" style="width:46%"></div>' +
        '<div class="skeleton sk-line" style="width:72%"></div>' +
        '<div class="skeleton sk-line" style="width:58%"></div>' +
      '</div>' +
      '<div class="card"><div class="skeleton sk-line" style="width:88%"></div>' +
        '<div class="skeleton sk-line" style="width:64%"></div></div>';
  }

  function render(ctx) {
    lastCtx = ctx;
    var id = ctx && ctx.params && ctx.params.id;
    h.host().innerHTML = h.screen({ title: '信息详情', back: '/home' }, detailSkeleton());
    load(id, !!(ctx && ctx.query && ctx.query.fail === '1'));
  }

  function load(id, forceFail) {
    var body = document.querySelector('.app-body');
    if (!body) return;

    if (forceFail) {
      body.innerHTML = h.loadFailed('网络开了个小差（走查演示）', 'detail');
      return;
    }

    S.fetchItem(id, function (res) {
      var box = document.querySelector('.app-body');
      if (!box) return;
      if (!res.ok) {
        box.innerHTML = h.loadFailed(res.error, 'detail');
        return;
      }
      if (!res.item) {
        box.innerHTML = h.empty({
          icon: '\uD83D\uDDC2\uFE0F',
          title: '这条信息不存在或已被删除',
          sub: '可能链接已经失效',
          actionText: '返回首页浏览',
          actionNav: '/home'
        });
        return;
      }
      paint(res.item);
    });
  }

  function row(label, value) {
    return '<div class="d-row"><span class="d-k">' + h.esc(label) + '</span>' +
      '<span class="d-v">' + h.esc(value) + '</span></div>';
  }

  function closedBanner(item) {
    var when = shortDate(item.closedAt);
    return '该物品' + (item.closedReason || M.statusLabel(item)) +
      (when ? ' · 由发布者于 ' + when + ' 标记' : '');
  }

  function contactHtml(item, mine, closed) {
    if (closed) {
      return '<div class="section-title">联系方式</div>' +
        '<div class="contact-off">该信息已结束，不再展示联系方式</div>';
    }
    if (mine) {
      return '<div class="section-title">联系方式（你填写的）</div>' +
        '<div class="contact-box"><span class="contact-val">' + h.esc(M.contactText(item)) + '</span></div>' +
        '<div class="item-meta">这是你发布的信息，其他同学在这一栏会看到复制按钮</div>';
    }
    return '<div class="section-title">联系方式</div>' +
      '<div class="contact-box">' +
        '<span class="contact-val">' + h.esc(M.contactText(item)) + '</span>' +
        '<button class="btn btn-ghost" data-act="copy">复制</button>' +
      '</div>' +
      '<div class="item-meta">联系时请说明是在校园失物招领看到的，方便对方确认</div>';
  }

  function bodyHtml(item, mine, closed) {
    var hero = item.image
      ? '<div class="detail-hero"><img src="' + h.esc(item.image) + '" alt="' + h.esc(item.title) + '"></div>'
      : '<div class="detail-hero is-empty">\uD83D\uDDBC\uFE0F</div>';

    var banner = closed
      ? '<div class="banner banner-closed"><span>\u2705</span><span>' + h.esc(closedBanner(item)) + '</span></div>'
      : '';

    var typeBadge = '<span class="badge ' + (item.type === 'found' ? 'badge-found' : 'badge-lost') + '">' +
      h.esc(M.typeLabel(item)) + '</span>';
    var statusBadge = '<span class="badge ' + (closed ? 'badge-closed' : 'badge-active') + '">' +
      h.esc(M.statusLabel(item)) + '</span>';

    var rows = '' +
      row('类别', item.category || '未填写') +
      row(item.type === 'found' ? '拾取时间' : '丢失时间', item.date) +
      row(item.type === 'found' ? '拾取地点' : '丢失地点', item.place) +
      row('发布时间', M.relativeTime(item.createdAt) || '—');

    return '' +
      hero + banner +
      '<div class="card">' +
        '<div class="detail-title-row">' +
          '<span class="detail-title">' + h.esc(item.title) + '</span>' +
          typeBadge + statusBadge +
        '</div>' +
        '<div class="detail-rows">' + rows + '</div>' +
      '</div>' +
      '<div class="card">' +
        '<div class="section-title">特征描述</div>' +
        '<div class="desc-block">' + h.esc(item.desc || '发布者没有填写特征描述') + '</div>' +
      '</div>' +
      '<div class="card">' + contactHtml(item, mine, closed) + '</div>';
  }

  function actionBarHtml(item, mine, closed) {
    var inner;
    if (closed) {
      inner = mine
        ? '<button class="btn btn-quiet btn-block" data-act="reopen">撤销标记，恢复为' +
            h.esc(item.type === 'found' ? '待认领' : '寻找中') + '</button>'
        : '<button class="btn btn-block" disabled>该信息已结束</button>';
    } else if (mine) {
      inner = '<button class="btn btn-primary btn-block" data-act="close">标记为' +
        h.esc(item.type === 'found' ? '已归还' : '已找到') + '</button>';
    } else {
      inner = '<button class="btn btn-primary btn-block" data-act="copy">复制联系方式，联系发布者</button>';
    }
    return '<div class="action-bar">' + inner + '</div>';
  }

  function paint(item) {
    current = item;
    var mine = S.isMine(item.id);
    var closed = item.status === M.STATUS_CLOSED;

    h.host().innerHTML =
      h.screen({ title: '信息详情', back: '/home' }, bodyHtml(item, mine, closed)) +
      actionBarHtml(item, mine, closed);

    var body = document.querySelector('.app-body');
    if (body) body.classList.add('pb-action');
  }

  function doCopy() {
    if (!current) return;
    var text = M.trim(current.contact);
    if (!text) {
      h.toast('这条信息没有留下联系方式');
      return;
    }
    h.copyText(text, function (ok) {
      h.toast(ok ? '已复制：' + M.contactText(current) : '复制失败，请手动选中后复制');
    });
  }

  function doClose() {
    if (!current) return;
    var label = current.type === 'found' ? '已归还' : '已找到';
    h.confirmDialog({
      title: '确认标记为' + label + '？',
      sub: '标记后这条信息会从进行中的列表里消失，也不再展示联系方式。万一标错了，可以在「我的发布」里撤销。',
      okText: '标记为' + label,
      onOk: function () {
        S.close(current.id);
        h.toast('已标记为' + label);
        render(lastCtx);
      }
    });
  }

  function doReopen() {
    if (!current) return;
    h.confirmDialog({
      title: '确认撤销标记？',
      sub: '撤销后这条信息会重新回到进行中的列表，联系方式也会再次展示。',
      okText: '撤销标记',
      onOk: function () {
        S.reopen(current.id);
        h.toast('已恢复为进行中');
        render(lastCtx);
      }
    });
  }

  /* 事件委托只注册一次 */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;

    var el = t.closest('[data-act]');
    if (el) {
      var act = el.getAttribute('data-act');
      if (act === 'copy') { doCopy(); return; }
      if (act === 'close') { doClose(); return; }
      if (act === 'reopen') { doReopen(); return; }
    }

    if (t.closest('[data-retry="detail"]')) {
      var id = lastCtx && lastCtx.params && lastCtx.params.id;
      h.host().innerHTML = h.screen({ title: '信息详情', back: '/home' }, detailSkeleton());
      load(id, false);
    }
  });

  UI.detail = { render: render };
})(window);
