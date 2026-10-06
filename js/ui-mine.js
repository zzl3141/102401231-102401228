/*!
 * ui-mine.js —— 我的发布（阶段 7 实现）
 * 负责人：102401228 林彦翔
 *
 * 阶段 7 要做：
 *  - 列出本机发布的条目（LFStore.mine()）
 *  - 「标记为已找到 / 已归还」→ 二次确认 → LFStore.close(id)
 *  - 已结束的条目提供「撤销标记」→ LFStore.reopen(id)
 *  - 编辑入口 → LFStore.update(id, patch)
 */
(function (root) {
  'use strict';

  var UI = root.LFUI = root.LFUI || {};
  var h = UI.h;
  var S = root.LFStore;

  function render() {
    var list = S.mine();

    var body = '' +
      h.stageNote('我的发布将在阶段 7 实现', [
        '负责人：102401228 林彦翔',
        '本机已发布 ' + list.length + ' 条，列表数据用 LFStore.mine() 取',
        '要做：标记已找到 / 已归还 + 二次确认 + 撤销标记 + 编辑'
      ]) +
      (list.length
        ? list.map(function (it) { return h.itemCard(it); }).join('')
        : h.empty({
            icon: '\uD83D\uDCED',
            title: '你还没有发布过信息',
            sub: '发布之后可以在这里管理状态',
            actionText: '去发布',
            actionNav: '/publish'
          }));

    h.host().innerHTML = h.screen({ title: '我的发布' }, body);
  }

  UI.mine = { render: render };
})(window);
