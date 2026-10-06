/*!
 * ui-publish.js —— 发布页（阶段 6 实现）
 * 负责人：102401228 林彦翔
 *
 * 阶段 6 要做：
 *  - 寻物 / 招领 切换，字段在「丢失时间 / 丢失地点」与「拾取时间 / 拾取地点」之间切换
 *  - 校验直接调 LFModel.validateItem(form)，返回 { ok, errors: [{field, message}] }，按 field 标红
 *  - 提交中按钮显示「发布中…」并禁用，防止重复提交
 *  - 提交成功调用 LFStore.create(form)，再跳到详情页
 */
(function (root) {
  'use strict';

  var UI = root.LFUI = root.LFUI || {};
  var h = UI.h;
  var M = root.LFModel;

  function render() {
    var body = '' +
      h.stageNote('发布页将在阶段 6 实现', [
        '负责人：102401228 林彦翔',
        '必填项：类型、物品名称、类别、日期、地点、特征描述、联系方式',
        '校验：LFModel.validateItem(form) → { ok, errors }',
        '类别可选值：' + M.CATEGORIES.join(' / '),
        '联系方式类型：' + Object.keys(M.CONTACT_TYPES).join(' / ')
      ]) +
      h.empty({
        icon: '\uD83D\uDCDD',
        title: '发布表单还没实现',
        sub: '把表单接到 validateItem 与 LFStore.create 上即可'
      });

    h.host().innerHTML = h.screen({ title: '发布信息', back: '/home' }, body);
  }

  UI.publish = { render: render };
})(window);
