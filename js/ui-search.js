/*!
 * ui-search.js —— 搜索页（阶段 4 实现）
 * 负责人：102401231 赵紫龙
 *
 * 阶段 4 要做：关键词匹配（名称 / 描述 / 地点）、全部 / 寻物 / 招领 筛选、无结果空状态。
 * 数据层的 LFModel.filterItems 与 LFModel.matchKeyword 已经可以直接调用。
 */
(function (root) {
  'use strict';

  var UI = root.LFUI = root.LFUI || {};
  var h = UI.h;

  function render(ctx) {
    var kw = (ctx && ctx.query && ctx.query.kw) || '';

    var body = '' +
      '<div class="searchbox">' +
        '<span>\uD83D\uDD0D</span>' +
        '<input id="kw" type="search" placeholder="搜索物品名称、地点" value="' + h.esc(kw) + '">' +
      '</div>' +
      '<div class="mt-12"></div>' +
      h.stageNote('搜索将在阶段 4 实现', [
        '负责人：102401231 赵紫龙',
        '要把输入的关键词接到 LFModel.filterItems({ keyword: kw })',
        '空关键词不展示结果，而是显示「还没开始搜索」的初始态'
      ]) +
      h.empty({
        icon: '\uD83D\uDD0E',
        title: '还没有开始搜索',
        sub: '输入物品名称试试，例如「校园卡」「雨伞」'
      });

    h.host().innerHTML = h.screen({ title: '搜索', back: '/home' }, body);
  }

  UI.search = { render: render };
})(window);
