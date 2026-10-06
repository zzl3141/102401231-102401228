/*!
 * ui-detail.js —— 信息详情页（阶段 5 实现）
 * 负责人：102401228 林彦翔
 *
 * 阶段 5 要做：
 *  - 展示图片、名称、类型、时间、地点、特征描述、联系方式
 *  - 一键复制联系方式
 *  - 已结束的信息：顶部状态横幅 + 联系方式区域置灰、不可点
 *  - 本人发布的条目：底部按钮变为「标记为已找到 / 已归还」
 */
(function (root) {
  'use strict';

  var UI = root.LFUI = root.LFUI || {};
  var h = UI.h;
  var M = root.LFModel;
  var S = root.LFStore;

  function render(ctx) {
    var id = ctx && ctx.params && ctx.params.id;
    var item = S.get(id);

    if (!item) {
      h.host().innerHTML = h.screen({ title: '信息详情', back: '/home' },
        h.empty({
          icon: '\uD83D\uDDC2\uFE0F',
          title: '这条信息不存在或已被删除',
          sub: '可能链接已经失效',
          actionText: '返回首页浏览',
          actionNav: '/home'
        })
      );
      return;
    }

    var body = '' +
      h.itemCard(item) +
      h.stageNote('详情页将在阶段 5 实现', [
        '负责人：102401228 林彦翔',
        '已按 id 从数据层取到：' + item.id + '（' + M.statusLabel(item) + '）',
        '要做：完整信息 + 一键复制联系方式 + 已结束状态横幅 + 本人可标记状态'
      ]);

    h.host().innerHTML = h.screen({ title: '信息详情', back: '/home' }, body);
  }

  UI.detail = { render: render };
})(window);
