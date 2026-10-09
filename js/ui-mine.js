/*!
 * ui-mine.js —— 我的发布
 * 负责人：102401228 林彦翔（本轮由赵紫龙先打通闭环，可在此基础上改进）
 *
 * 这里是状态闭环的入口：只有本机发布的条目才会出现在这里，
 * 也只有在这里（以及自己那条的详情页）才有「标记为已找到 / 已归还」按钮。
 */
(function (root) {
  'use strict';

  var UI = root.LFUI = root.LFUI || {};
  var h = UI.h;
  var M = root.LFModel;
  var S = root.LFStore;

  function render() {
    h.host().innerHTML = h.screen({ title: '我的发布' }, h.skeletonList(2));
    load();
  }

  function load() {
    S.fetchMine(function (res) {
      var body = document.querySelector('.app-body');
      if (!body) return;
      if (!res.ok) {
        body.innerHTML = h.loadFailed(res.error, 'mine');
        return;
      }
      paint(res.items);
    });
  }

  function ruleCard() {
    return '' +
      '<div class="card">' +
        '<div class="fw-6">只有你能改自己发布的信息</div>' +
        '<div class="item-meta">' +
          '东西找回或归还之后，点下面卡片上的「标记为已找到 / 已归还」。' +
          '标记完，首页列表里这一条会变灰、从进行中的筛选里消失，详情页也不再展示联系方式。' +
          '标错了随时可以撤销。' +
        '</div>' +
      '</div>';
  }

  function card(item) {
    var closed = item.status === M.STATUS_CLOSED;
    var thumb = item.image ? '<img src="' + h.esc(item.image) + '" alt="">' : '';
    var typeBadge = '<span class="badge ' + (item.type === 'found' ? 'badge-found' : 'badge-lost') + '">' +
      h.esc(M.typeLabel(item)) + '</span>';
    var statusBadge = '<span class="badge ' + (closed ? 'badge-closed' : 'badge-active') + '">' +
      h.esc(M.statusLabel(item)) + '</span>';

    var mainAction = closed
      ? '<button class="btn btn-quiet" data-mact="reopen" data-id="' + h.esc(item.id) + '">撤销标记</button>'
      : '<button class="btn btn-primary" data-mact="close" data-id="' + h.esc(item.id) + '">标记为' +
          h.esc(item.type === 'found' ? '已归还' : '已找到') + '</button>';

    return '' +
      '<div class="card' + (closed ? ' is-closed' : '') + '">' +
        '<div class="item-card" data-nav="/detail/' + h.esc(item.id) + '">' +
          '<div class="item-thumb">' + thumb + '</div>' +
          '<div class="item-main">' +
            '<div class="item-title-row">' +
              '<span class="item-title ellipsis">' + h.esc(item.title) + '</span>' +
              typeBadge + statusBadge +
            '</div>' +
            '<div class="item-meta">' + h.esc(item.place) + ' \u00b7 ' + h.esc(M.formatDate(item.date)) + '</div>' +
            '<div class="item-desc ellipsis">' + h.esc(item.desc) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="mine-actions">' +
          mainAction +
          '<button class="btn btn-quiet" data-mact="edit" data-id="' + h.esc(item.id) + '">编辑</button>' +
          '<button class="btn btn-quiet btn-danger" data-mact="remove" data-id="' + h.esc(item.id) + '">删除</button>' +
        '</div>' +
      '</div>';
  }

  function paint(list) {
    var count = '<div class="list-head"><span>共 ' + list.length + ' 条</span></div>';

    if (!list.length) {
      h.host().innerHTML = h.screen({ title: '我的发布' },
        ruleCard() +
        h.empty({
          icon: '\uD83D\uDCED',
          title: '你还没有发布过信息',
          sub: '发布之后可以在这里管理状态',
          actionText: '去发布',
          actionNav: '/publish'
        })
      );
      return;
    }

    h.host().innerHTML = h.screen({ title: '我的发布' },
      ruleCard() + count + list.map(card).join(''));
  }

  function findItem(id) {
    return S.get(id);
  }

  function confirmClose(id) {
    var item = findItem(id);
    if (!item) return;
    var label = item.type === 'found' ? '已归还' : '已找到';
    h.confirmDialog({
      title: '确认标记为' + label + '？',
      sub: '标记后「' + item.title + '」会从进行中的列表里消失，详情页也不再展示联系方式。标错了可以撤销。',
      okText: '标记为' + label,
      onOk: function () {
        S.close(id);
        h.toast('已标记为' + label);
        load();
      }
    });
  }

  function confirmReopen(id) {
    var item = findItem(id);
    if (!item) return;
    h.confirmDialog({
      title: '确认撤销标记？',
      sub: '撤销后「' + item.title + '」会重新回到进行中的列表，联系方式也会再次展示。',
      okText: '撤销标记',
      onOk: function () {
        S.reopen(id);
        h.toast('已恢复为进行中');
        load();
      }
    });
  }

  function confirmRemove(id) {
    var item = findItem(id);
    if (!item) return;
    h.confirmDialog({
      title: '确认删除「' + item.title + '」？',
      sub: '删除后这条信息会从列表和「我的发布」里消失，无法恢复。',
      okText: '删除',
      onOk: function () {
        S.remove(id);
        h.toast('已删除');
        load();
      }
    });
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;

    var el = t.closest('[data-mact]');
    if (el) {
      var id = el.getAttribute('data-id');
      var act = el.getAttribute('data-mact');
      if (act === 'close') { confirmClose(id); return; }
      if (act === 'reopen') { confirmReopen(id); return; }
      if (act === 'remove') { confirmRemove(id); return; }
      if (act === 'edit') {
        root.LFRouter.navigate('/publish?id=' + encodeURIComponent(id));
        return;
      }
    }

    if (t.closest('[data-retry="mine"]')) load();
  });

  UI.mine = { render: render };
})(window);
