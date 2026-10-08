/*!
 * model.test.js —— 数据层纯函数的单元测试
 * 负责人：102401231 赵紫龙
 *
 * 运行方式（两种都行，都不需要 npm install）：
 *   node --test tests/
 *   npm test
 *
 * 为什么用 Node 自带的 node:test 而不是 Mocha：
 * 这个项目的要求是「下载下来双击 index.html 就能跑」，我们不想为了测试
 * 往仓库里塞 node_modules。node:test 是 Node 18+ 内置的，写法也是
 * describe / it / assert，思路和 Mocha 一致。
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const M = require(path.join(__dirname, '..', 'js', 'model.js'));

/** 一份合法表单，测试时按需覆盖某个字段 */
function validForm(over) {
  return Object.assign({
    type: 'lost',
    title: '校园卡',
    category: '证件',
    date: '2026-01-01',
    place: '一教三楼走廊',
    desc: '蓝色卡套，卡角有一道折痕，姓名首字母是 L',
    contactType: 'wechat',
    contact: 'zzl_314'
  }, over || {});
}

/** 取某个字段的错误文案，没有则返回 '' */
function errOf(res, field) {
  const hit = res.errors.filter(e => e.field === field);
  return hit.length ? hit[0].message : '';
}

function item(over) {
  return M.normalize(Object.assign({
    id: 'x1', type: 'lost', title: '校园卡', category: '证件',
    place: '一教三楼走廊', date: '2026-10-01',
    desc: '蓝色卡套，卡角有一处折痕，姓名首字母是 L',
    contactType: 'wechat', contact: 'zzl_314',
    status: 'active', createdAt: 100
  }, over || {}));
}

/* ==================================================================== */

describe('validateItem —— 必填项与格式校验', () => {
  it('空表单：8 个必填项全部报错，ok 为 false', () => {
    const res = M.validateItem({});
    assert.equal(res.ok, false);
    assert.equal(res.errors.length, 8);
    assert.equal(errOf(res, 'title'), '请填写物品名称');
    assert.equal(errOf(res, 'category'), '请选择物品类别');
    assert.equal(errOf(res, 'place'), '请填写丢失地点');
    assert.equal(errOf(res, 'desc'), '请填写特征描述');
    assert.equal(errOf(res, 'contact'), '请填写联系方式');
  });

  it('物品名称只有空格：等同于没填', () => {
    const res = M.validateItem(validForm({ title: '   ' }));
    assert.equal(errOf(res, 'title'), '请填写物品名称');
  });

  it('物品名称过短或过长：给出长度提示', () => {
    assert.match(errOf(M.validateItem(validForm({ title: '卡' })), 'title'), /2~20 个字/);
    assert.match(errOf(M.validateItem(validForm({ title: '卡'.repeat(21) })), 'title'), /2~20 个字/);
  });

  it('日期晚于今天：拦下来', () => {
    const res = M.validateItem(validForm({ date: '2099-01-01' }));
    assert.match(errOf(res, 'date'), /不能晚于今天/);
  });

  it('日期格式不对：提示格式', () => {
    const res = M.validateItem(validForm({ date: '2026/01/01' }));
    assert.match(errOf(res, 'date'), /YYYY-MM-DD/);
  });

  it('类别不在可选范围：拦下来', () => {
    const res = M.validateItem(validForm({ category: '交通工具' }));
    assert.match(errOf(res, 'category'), /不在可选范围/);
  });

  it('手机号不是 11 位：拦下来', () => {
    const res = M.validateItem(validForm({ contactType: 'phone', contact: '1380000' }));
    assert.match(errOf(res, 'contact'), /11 位数字/);
  });

  it('QQ 号含字母：拦下来', () => {
    const res = M.validateItem(validForm({ contactType: 'qq', contact: 'abc12345' }));
    assert.match(errOf(res, 'contact'), /5~12 位数字/);
  });

  it('微信号位数不够：拦下来', () => {
    const res = M.validateItem(validForm({ contactType: 'wechat', contact: 'abc' }));
    assert.match(errOf(res, 'contact'), /6~20 位/);
  });

  it('特征描述超过 200 字：拦下来', () => {
    const res = M.validateItem(validForm({ desc: '字'.repeat(201) }));
    assert.match(errOf(res, 'desc'), /10~200 个字/);
  });

  it('合法表单：ok 为 true，errors 为空', () => {
    const res = M.validateItem(validForm());
    assert.equal(res.ok, true);
    assert.deepEqual(res.errors, []);
  });

  it('招领类型的字段名用「拾取」，寻物用「丢失」', () => {
    const lost = M.validateItem(validForm({ type: 'lost', date: '' }));
    const found = M.validateItem(validForm({ type: 'found', date: '' }));
    assert.equal(errOf(lost, 'date'), '请选择丢失日期');
    assert.equal(errOf(found, 'date'), '请选择拾取日期');
  });
});

/* ==================================================================== */

describe('createItem —— 新条目初始化', () => {
  it('补齐 id / createdAt / status，联系方式类型非法时退回 other', () => {
    const it1 = M.createItem(validForm({ contactType: 'telepathy' }), 1791158400000);
    assert.match(it1.id, /^itm_1791158400000_/);
    assert.equal(it1.status, 'active');
    assert.equal(it1.createdAt, 1791158400000);
    assert.equal(it1.closedReason, '');
    assert.equal(it1.closedAt, 0);
    assert.equal(it1.contactType, 'other');
    assert.equal(it1.title, '校园卡');
  });

  it('前后空格会被去掉', () => {
    const it2 = M.createItem(validForm({ title: '  雨伞  ', place: ' 图书馆 ' }));
    assert.equal(it2.title, '雨伞');
    assert.equal(it2.place, '图书馆');
  });
});

/* ==================================================================== */

describe('matchKeyword —— 关键词匹配', () => {
  const it1 = item({ title: '蓝牙耳机', desc: '白色充电盒，盒盖有划痕', place: '三区食堂二楼' });

  it('空关键词（含全是空格）不做过滤，返回 true', () => {
    assert.equal(M.matchKeyword(it1, ''), true);
    assert.equal(M.matchKeyword(it1, '   '), true);
    assert.equal(M.isBlankKeyword('   '), true);
  });

  it('命中物品名称', () => {
    assert.equal(M.matchKeyword(it1, '耳机'), true);
  });

  it('命中描述和地点', () => {
    assert.equal(M.matchKeyword(it1, '划痕'), true);
    assert.equal(M.matchKeyword(it1, '食堂'), true);
  });

  it('匹配不到就返回 false', () => {
    assert.equal(M.matchKeyword(it1, '电动车'), false);
  });

  it('% 和 _ 按普通字符处理，不当通配符', () => {
    assert.equal(M.matchKeyword(it1, '%'), false);
    assert.equal(M.matchKeyword(it1, '_'), false);
  });
});

/* ==================================================================== */

describe('filterItems —— 组合筛选', () => {
  const list = [
    item({ id: 'a', type: 'lost', title: '校园卡', category: '证件', place: '一教三楼走廊', date: '2026-10-04', createdAt: 4 }),
    item({ id: 'b', type: 'found', title: '蓝牙耳机', category: '电子产品', place: '三区食堂二楼', date: '2026-10-05', createdAt: 5 }),
    item({ id: 'c', type: 'found', title: '雨伞', category: '雨伞', place: '图书馆一楼', date: '2026-10-02', createdAt: 2 }),
    item({ id: 'd', type: 'found', title: '旧校园卡', category: '证件', place: '三区食堂门口', date: '2026-09-30', createdAt: 1, status: 'closed' })
  ];

  it('默认只返回进行中的信息，且按日期倒序', () => {
    const out = M.filterItems(list, {});
    assert.deepEqual(out.map(x => x.id), ['b', 'a', 'c']);
  });

  it('type 筛选', () => {
    assert.deepEqual(M.filterItems(list, { type: 'lost' }).map(x => x.id), ['a']);
    assert.deepEqual(M.filterItems(list, { type: 'found' }).map(x => x.id), ['b', 'c']);
  });

  it('category 筛选', () => {
    assert.deepEqual(M.filterItems(list, { category: '证件' }).map(x => x.id), ['a']);
  });

  it('place 按子串筛选', () => {
    assert.deepEqual(M.filterItems(list, { place: '图书馆' }).map(x => x.id), ['c']);
  });

  it('status=closed 只看已结束，status=all 看全部', () => {
    assert.deepEqual(M.filterItems(list, { status: 'closed' }).map(x => x.id), ['d']);
    assert.equal(M.filterItems(list, { status: 'all' }).length, 4);
  });

  it('关键词可以和分类叠加', () => {
    assert.deepEqual(M.filterItems(list, { keyword: '校园卡', type: 'found' }).map(x => x.id), []);
    assert.deepEqual(M.filterItems(list, { keyword: '校园卡', status: 'all' }).map(x => x.id), ['a', 'd']);
  });

  it('查询条件为空、列表为空都不报错', () => {
    assert.deepEqual(M.filterItems(null, null), []);
    assert.deepEqual(M.filterItems([], { keyword: '雨伞' }), []);
  });

  it('已结束的排在进行中的后面', () => {
    const out = M.filterItems(list, { status: 'all' });
    assert.equal(out[out.length - 1].id, 'd');
  });
});

/* ==================================================================== */

describe('状态流转 —— markClosed / reopenItem / isMine / statusLabel', () => {
  it('标记已找到：写入状态、结束原因和结束时间', () => {
    const before = item({ id: 'a', type: 'lost' });
    const after = M.markClosed(before, 1791158400000);
    assert.equal(after.status, 'closed');
    assert.equal(after.closedReason, '已找到');
    assert.equal(after.closedAt, 1791158400000);
    assert.equal(before.status, 'active', '不能改到原对象');
  });

  it('招领信息的结束原因是「已归还」', () => {
    assert.equal(M.markClosed(item({ type: 'found' }), 1).closedReason, '已归还');
  });

  it('已经结束的条目再标记一次：不动 closedAt', () => {
    const closed = M.markClosed(item({ id: 'a' }), 111);
    const again = M.markClosed(closed, 999);
    assert.equal(again.closedAt, 111);
  });

  it('撤销标记：恢复进行中并清空结束信息', () => {
    const back = M.reopenItem(M.markClosed(item({ id: 'a' }), 111));
    assert.equal(back.status, 'active');
    assert.equal(back.closedReason, '');
    assert.equal(back.closedAt, 0);
  });

  it('没结束过的条目撤销：原样返回', () => {
    const it1 = item({ id: 'a' });
    assert.equal(M.reopenItem(it1), it1);
  });

  it('isMine 按 id 判断', () => {
    assert.equal(M.isMine({ id: 'a' }, ['a', 'b']), true);
    assert.equal(M.isMine({ id: 'z' }, ['a', 'b']), false);
    assert.equal(M.isMine(null, ['a']), false);
  });

  it('statusLabel 四种文案', () => {
    assert.equal(M.statusLabel(item({ type: 'lost' })), '寻找中');
    assert.equal(M.statusLabel(item({ type: 'found' })), '待认领');
    assert.equal(M.statusLabel(item({ type: 'lost', status: 'closed' })), '已找到');
    assert.equal(M.statusLabel(item({ type: 'found', status: 'closed' })), '已归还');
  });
});

/* ==================================================================== */

describe('展示格式化', () => {
  it('formatDate 只留月日，非标准格式原样返回', () => {
    assert.equal(M.formatDate('2026-10-05'), '10-05');
    assert.equal(M.formatDate('下周'), '下周');
  });

  it('relativeTime 分档：刚刚 / 分钟 / 小时 / 天 / 具体日期', () => {
    const now = 1791158400000;
    assert.equal(M.relativeTime(now - 30 * 1000, now), '刚刚');
    assert.equal(M.relativeTime(now - 5 * 60 * 1000, now), '5 分钟前');
    assert.equal(M.relativeTime(now - 3 * 3600 * 1000, now), '3 小时前');
    assert.equal(M.relativeTime(now - 2 * 86400 * 1000, now), '2 天前');
    assert.equal(M.relativeTime(0, now), '');
  });

  it('contactText 带上联系方式类型', () => {
    assert.equal(M.contactText(item({ contactType: 'qq', contact: '12345' })), 'QQ：12345');
  });

  it('stats 统计总数与进行中 / 已结束', () => {
    const s = M.stats([item({ id: 'a' }), item({ id: 'b', status: 'closed' })]);
    assert.deepEqual(s, { total: 2, active: 1, closed: 1 });
  });
});

/* ==================================================================== */

describe('序列化与脏数据容错', () => {
  it('normalize 对完全不是对象的数据返回 null', () => {
    assert.equal(M.normalize(null), null);
    assert.equal(M.normalize('字符串'), null);
    assert.equal(M.normalize(123), null);
  });

  it('normalize 缺 id 或缺名称时返回 null', () => {
    assert.equal(M.normalize({ title: '校园卡' }), null);
    assert.equal(M.normalize({ id: 'a' }), null);
  });

  it('normalize 给缺失字段补默认值', () => {
    const n = M.normalize({ id: 'a', title: '雨伞' });
    assert.equal(n.type, 'lost');
    assert.equal(n.status, 'active');
    assert.equal(n.contactType, 'other');
    assert.equal(n.closedReason, '');
    assert.equal(n.createdAt, 0);
  });

  it('deserialize 遇到坏 JSON 返回空数组，不抛错', () => {
    assert.deepEqual(M.deserialize('{坏掉的'), []);
    assert.deepEqual(M.deserialize(''), []);
    assert.deepEqual(M.deserialize('{"a":1}'), []);
  });

  it('deserialize 会跳过数组里不合法的条目', () => {
    const out = M.deserialize('[{"id":"a","title":"雨伞"},null,3,{"title":"没有id"}]');
    assert.equal(out.length, 1);
    assert.equal(out[0].id, 'a');
  });

  it('serialize → deserialize 往返不丢数据', () => {
    const list = [item({ id: 'a' }), item({ id: 'b', type: 'found', status: 'closed' })];
    assert.deepEqual(M.deserialize(M.serialize(list)), list);
  });
});

/* ==================================================================== */

describe('附加特点：地点标签 / 相关推荐 / 最近搜索', () => {
  it('placeTagsOf 只返回当前数据里真的出现过的地点', () => {
    const list = [item({ place: '三区食堂二楼' }), item({ place: '图书馆一楼' }), item({ place: '紫金楼楼下' })];
    assert.deepEqual(M.placeTagsOf(list), ['三区食堂', '图书馆', '紫金楼']);
    assert.deepEqual(M.placeTagsOf([]), []);
  });

  it('hasOverlap 能认出共同词，也认得单字标题', () => {
    assert.equal(M.hasOverlap('蓝牙耳机', '无线耳机'), true);
    assert.equal(M.hasOverlap('校园卡', '宿舍钥匙'), false);
    assert.equal(M.hasOverlap('伞', '雨伞'), true);
  });

  it('相关推荐：名称或类别对得上才推荐', () => {
    const target = item({ id: 'lost1', type: 'lost', title: '蓝牙耳机', category: '电子产品', place: '三区食堂二楼' });
    const list = [
      target,
      item({ id: 'found1', type: 'found', title: '蓝牙耳机', category: '电子产品', place: '三区食堂二楼' }),
      item({ id: 'found2', type: 'found', title: '雨伞', category: '雨伞', place: '图书馆一楼' }),
      item({ id: 'found3', type: 'found', title: '雨伞', category: '雨伞', place: '图书馆二楼' })
    ];
    const rel = M.relatedItems(list, target);
    assert.deepEqual(rel.map(x => x.id), ['found1']);
  });

  it('相关推荐：同类型不推、已结束不推、自己也不推', () => {
    const target = item({ id: 'lost1', type: 'lost', title: '蓝牙耳机', category: '电子产品' });
    const list = [
      target,
      item({ id: 'lost2', type: 'lost', title: '蓝牙耳机', category: '电子产品' }),
      item({ id: 'found1', type: 'found', title: '蓝牙耳机', category: '电子产品', status: 'closed' })
    ];
    assert.deepEqual(M.relatedItems(list, target), []);
  });

  it('相关推荐：类别相同就能配上，最多返回 limit 条', () => {
    const target = item({ id: 'lost1', type: 'lost', title: '校园卡', category: '证件' });
    const list = [target]
      .concat([1, 2, 3, 4].map(i => item({ id: 'f' + i, type: 'found', title: '证件' + i, category: '证件', createdAt: i })));
    assert.equal(M.relatedItems(list, target).length, 3);
    assert.equal(M.relatedItems(list, target, 4).length, 4);
  });

  it('相关推荐：目标为空时返回空数组', () => {
    assert.deepEqual(M.relatedItems([item()], null), []);
  });

  it('最近搜索：新的排最前、重复的提到最前、不超过上限', () => {
    assert.deepEqual(M.pushRecent(['雨伞', '校园卡'], '钥匙', 3), ['钥匙', '雨伞', '校园卡']);
    assert.deepEqual(M.pushRecent(['雨伞', '校园卡'], '雨伞', 3), ['雨伞', '校园卡']);
    assert.deepEqual(M.pushRecent(['a', 'b', 'c'], 'd', 3), ['d', 'a', 'b']);
    assert.deepEqual(M.pushRecent(['a', 'b'], '  ', 3), ['a', 'b']);
    assert.deepEqual(M.pushRecent(null, '雨伞', 3), ['雨伞']);
  });
});
