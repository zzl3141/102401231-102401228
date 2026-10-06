/*!
 * ui-common.js —— 各页面共用的渲染小工具
 * 负责人：102401231 赵紫龙
 * 各页面可以往这里加公共件，但不要另起一套命名。
 */
(function (root) {
  'use strict';

  var UI = root.LFUI = root.LFUI || {};

  /** HTML 转义：所有用户输入进模板前都要过一遍 */
  function esc(v) {
    return String(v === null || v === undefined ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function host() {
    return document.getElementById('screen');
  }

  /** 顶部栏：标题 + 可选返回按钮 */
  function header(opts) {
    opts = opts || {};
    var back = opts.back
      ? '<span class="nav-back" data-nav="' + esc(opts.back) + '" title="返回">\u2039</span>'
      : '';
    var sub = opts.sub ? '<span class="h-sub">' + esc(opts.sub) + '</span>' : '';
    return '' +
      '<header class="app-header">' +
        back +
        '<span class="h-title">' + esc(opts.title || '') + '</span>' +
        sub +
      '</header>';
  }

  /** 页面骨架：顶部栏 + 内容区 */
  function screen(opts, bodyHtml) {
    return header(opts) + '<div class="app-body">' + bodyHtml + '</div>';
  }

  /** 空状态 */
  function empty(opts) {
    opts = opts || {};
    var btn = opts.actionText
      ? '<button class="btn btn-primary" data-nav="' + esc(opts.actionNav || '/home') + '">' +
          esc(opts.actionText) + '</button>'
      : '';
    return '' +
      '<div class="empty">' +
        '<div class="empty-i">' + esc(opts.icon || '\uD83D\uDD0D') + '</div>' +
        '<div class="empty-t">' + esc(opts.title || '') + '</div>' +
        (opts.sub ? '<div class="empty-s">' + esc(opts.sub) + '</div>' : '') +
        btn +
      '</div>';
  }

  /** 骨架屏占位卡片 */
  function skeletonCard() {
    return '' +
      '<div class="card item-card">' +
        '<div class="skeleton sk-thumb"></div>' +
        '<div class="item-main">' +
          '<div class="skeleton sk-line" style="width:52%"></div>' +
          '<div class="skeleton sk-line" style="width:74%"></div>' +
          '<div class="skeleton sk-line" style="width:38%"></div>' +
        '</div>' +
      '</div>';
  }

  /** 连续 n 张骨架屏卡片 */
  function skeletonList(n) {
    var out = '';
    for (var i = 0; i < (n || 3); i++) out += skeletonCard();
    return out;
  }

  /** 加载失败 + 重试。scope 决定重试按钮交给哪个页面处理 */
  function loadFailed(message, scope) {
    return '' +
      '<div class="empty">' +
        '<div class="empty-i">\u26A0\uFE0F</div>' +
        '<div class="empty-t">加载失败</div>' +
        '<div class="empty-s">' + esc(message || '请稍后重试') + '</div>' +
        '<button class="btn btn-primary" data-retry="' + esc(scope || '') + '">重新加载</button>' +
      '</div>';
  }

  /** 信息卡片：首页与搜索结果共用，保证两处展示一致 */
  function itemCard(item, opts) {
    var M = root.LFModel;
    opts = opts || {};
    var closed = item.status === M.STATUS_CLOSED;
    var thumb = item.image
      ? '<img src="' + esc(item.image) + '" alt="' + esc(item.title) + '">'
      : '';
    var typeBadge = '<span class="badge ' + (item.type === 'found' ? 'badge-found' : 'badge-lost') + '">' +
      esc(M.typeLabel(item)) + '</span>';
    var statusBadge = '<span class="badge ' + (closed ? 'badge-closed' : 'badge-active') + '">' +
      esc(M.statusLabel(item)) + '</span>';

    return '' +
      '<div class="card item-card' + (closed ? ' is-closed' : '') + '" data-nav="/detail/' + esc(item.id) + '">' +
        '<div class="item-thumb">' + thumb + '</div>' +
        '<div class="item-main">' +
          '<div class="item-title-row">' +
            '<span class="item-title ellipsis">' + esc(item.title) + '</span>' +
            typeBadge + statusBadge +
          '</div>' +
          '<div class="item-meta">' + esc(item.place) + ' \u00b7 ' + esc(M.formatDate(item.date)) + '</div>' +
          '<div class="item-desc ellipsis">' + esc(item.desc) + '</div>' +
        '</div>' +
      '</div>';
  }

  /** 骨架阶段的占位说明：对应页面实现后删掉 */
  function stageNote(title, lines) {
    var html = (lines || []).map(function (t) {
      return '<div class="n-s">\u00b7 ' + esc(t) + '</div>';
    }).join('');
    return '' +
      '<div class="card stage-note">' +
        '<div class="n-t">' + esc(title) + '</div>' +
        html +
      '</div>';
  }

  /** 轻提示 */
  function toast(text, ms) {
    var old = document.querySelector('.toast');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    document.body.appendChild(el);
    root.setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, ms || 1800);
  }

  UI.h = {
    esc: esc,
    host: host,
    header: header,
    screen: screen,
    empty: empty,
    skeletonCard: skeletonCard,
    skeletonList: skeletonList,
    loadFailed: loadFailed,
    itemCard: itemCard,
    stageNote: stageNote,
    toast: toast
  };
})(window);
