/*!
 * ui-home.js —— 首页（阶段 3 实现）
 * 负责人：102401231 赵紫龙
 *
 * 这一版只有骨架：顶部栏 + 搜索入口 + 数据层自检。
 * 阶段 3 要做：全部 / 寻物 / 招领 分类、信息卡片列表、加载中与加载失败状态。
 */
(function (root) {
  'use strict';

  var UI = root.LFUI = root.LFUI || {};
  var h = UI.h;
  var M = root.LFModel;
  var S = root.LFStore;

  function render() {
    var st = M.stats(S.all());
    var mineCount = S.mine().length;

    var body = '' +
      '<div class="searchbox" data-nav="/search"><span>\uD83D\uDD0D</span><span>搜索物品名称、地点</span></div>' +
      '<div class="mt-12"></div>' +
      h.stageNote('首页列表将在阶段 3 实现', [
        '负责人：102401231 赵紫龙',
        '要做：全部 / 寻物 / 招领 分类、信息卡片列表、加载中与加载失败状态'
      ]) +
      '<div class="card">' +
        '<div class="row">' +
          '<span class="grow fw-6">数据层自检</span>' +
          '<span class="badge badge-active">已就绪</span>' +
        '</div>' +
        '<div class="item-meta">共有 ' + st.total + ' 条信息：' + st.active + ' 条进行中、' + st.closed + ' 条已结束</div>' +
        '<div class="item-meta">我的发布：' + mineCount + ' 条</div>' +
      '</div>';

    h.host().innerHTML = h.screen({ title: '校园失物招领', sub: 'FZU' }, body);
  }

  UI.home = { render: render };
})(window);
