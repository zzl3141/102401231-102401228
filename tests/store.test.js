/*!
 * store.test.js —— 数据存取层的单元测试
 * 负责人：102401231 赵紫龙
 *
 * store.js 依赖浏览器的 localStorage，这里用一个内存版 localStorage 顶替，
 * 所以测试可以直接在 Node 里跑，不需要浏览器环境。
 *
 * 运行：node --test tests/
 */
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

/* ---- 用内存对象冒充 localStorage，必须在 require store.js 之前准备好 ---- */
const memory = {};
global.window = global;
global.localStorage = {
  getItem(key) { return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null; },
  setItem(key, value) { memory[key] = String(value); },
  removeItem(key) { delete memory[key]; },
  clear() { Object.keys(memory).forEach(k => delete memory[k]); }
};

const M = require(path.join(__dirname, '..', 'js', 'model.js'));
global.LFModel = M;
require(path.join(__dirname, '..', 'js', 'store.js'));
const S = global.LFStore;

/** 每个用例都从干净状态开始 */
beforeEach(() => {
  global.localStorage.clear();
});

function newForm(over) {
  return Object.assign({
    type: 'lost',
    title: '保温杯',
    category: '其他',
    date: '2026-10-06',
    place: '三区食堂一楼',
    desc: '银色保温杯，杯盖边缘有一处磕碰，杯身贴了一张贴纸',
    contactType: 'wechat',
    contact: 'bottle2026'
  }, over || {});
}

/* ==================================================================== */

describe('初始化与内置示例数据', () => {
  it('第一次打开：写入 8 条示例数据，其中 7 条进行中、1 条已结束', () => {
    assert.equal(S.all().length, 0);
    const seeded = S.seedIfEmpty();
    assert.equal(seeded.length, 8);
    assert.deepEqual(M.stats(seeded), { total: 8, active: 7, closed: 1 });
  });

  it('已经有数据时不会被示例数据覆盖', () => {
    S.seedIfEmpty();
    S.create(newForm());
    const before = S.all().length;
    S.seedIfEmpty();
    assert.equal(S.all().length, before);
  });

  it('reset 能把数据恢复成初始的 8 条', () => {
    S.seedIfEmpty();
    S.create(newForm());
    assert.equal(S.all().length, 9);
    assert.equal(S.reset().length, 8);
  });

  it('示例数据里预置了「我发布的」条目，用来演示我的发布', () => {
    S.seedIfEmpty();
    assert.ok(S.mine().length >= 2);
    assert.equal(S.isMine('itm_seed_3'), true);
    assert.equal(S.isMine('itm_seed_1'), false);
  });
});

/* ==================================================================== */

describe('新增与查询', () => {
  it('create 之后：进得了列表、查得到、算「我发布的」', () => {
    S.seedIfEmpty();
    const item = S.create(newForm());

    assert.equal(S.all().length, 9);
    assert.equal(S.get(item.id).title, '保温杯');
    assert.equal(S.isMine(item.id), true);
    assert.ok(S.mine().some(x => x.id === item.id));
    assert.ok(S.query({ keyword: '保温杯' }).some(x => x.id === item.id));
  });

  it('get 取不存在的 id 返回 null', () => {
    S.seedIfEmpty();
    assert.equal(S.get('不存在'), null);
  });

  it('query 默认只返回进行中的信息', () => {
    S.seedIfEmpty();
    assert.equal(S.query({}).length, 7);
  });

  it('placeTags 来自真实数据，且认得出新发布信息里的地点', () => {
    S.seedIfEmpty();
    assert.ok(S.placeTags().includes('图书馆'));
    S.create(newForm({ place: '操场看台' }));
    assert.ok(S.placeTags().includes('操场'));
  });
});

/* ==================================================================== */

describe('修改与状态流转', () => {
  it('update 改得了普通字段', () => {
    S.seedIfEmpty();
    const id = 'itm_seed_3';
    S.update(id, { title: '宿舍钥匙（已换锁芯）', desc: '换了锁芯，钥匙柄上的标签已经撕掉了' });
    assert.equal(S.get(id).title, '宿舍钥匙（已换锁芯）');
  });

  it('update 不能通过 patch 偷改状态和 id', () => {
    S.seedIfEmpty();
    const id = 'itm_seed_3';
    S.update(id, { id: 'hacked', status: 'closed', createdAt: 0 });
    const after = S.get(id);
    assert.equal(after.id, id);
    assert.equal(after.status, 'active');
    assert.equal(after.createdAt, 1790985600000);
    assert.equal(S.get('hacked'), null);
  });

  it('close 之后：默认列表里消失、已结束里出现', () => {
    S.seedIfEmpty();
    const id = 'itm_seed_3';
    S.close(id, 1791158400000);

    assert.equal(S.get(id).status, 'closed');
    assert.equal(S.get(id).closedReason, '已找到');
    assert.equal(S.query({}).length, 6);
    assert.ok(S.query({ status: 'closed' }).some(x => x.id === id));
  });

  it('reopen 之后重新回到进行中的列表', () => {
    S.seedIfEmpty();
    const id = 'itm_seed_3';
    S.close(id, 1791158400000);
    S.reopen(id);

    assert.equal(S.get(id).status, 'active');
    assert.equal(S.get(id).closedReason, '');
    assert.ok(S.query({}).some(x => x.id === id));
  });

  it('对不存在的 id 做 close：返回 null，不抛错', () => {
    S.seedIfEmpty();
    assert.equal(S.close('不存在'), null);
  });
});

/* ==================================================================== */

describe('最近搜索', () => {
  it('一开始是空的', () => {
    assert.deepEqual(S.recent(), []);
  });

  it('记一次搜索后能读到，重复的会提到最前', () => {
    S.addRecent('雨伞');
    S.addRecent('校园卡');
    assert.deepEqual(S.recent(), ['校园卡', '雨伞']);
    S.addRecent('雨伞');
    assert.deepEqual(S.recent(), ['雨伞', '校园卡']);
  });

  it('最多只留 6 条', () => {
    ['a', 'b', 'c', 'd', 'e', 'f', 'g'].forEach(k => S.addRecent(k));
    assert.equal(S.recent().length, 6);
    assert.equal(S.recent()[0], 'g');
  });

  it('空关键词不记', () => {
    S.addRecent('雨伞');
    S.addRecent('   ');
    assert.deepEqual(S.recent(), ['雨伞']);
  });

  it('clearRecent 能清空', () => {
    S.addRecent('雨伞');
    S.clearRecent();
    assert.deepEqual(S.recent(), []);
  });
});

/* ==================================================================== */

describe('脏数据容错', () => {
  it('localStorage 里存了坏 JSON 时，读到空列表而不是崩掉', () => {
    global.localStorage.setItem(S.KEY_ITEMS, '{坏掉的数据');
    assert.deepEqual(S.all(), []);
  });

  it('「我的发布」存了坏 JSON 时，读到空数组', () => {
    global.localStorage.setItem(S.KEY_MINE, '不是数组');
    assert.deepEqual(S.myIds(), []);
  });

  it('「我的发布」里的 id 不是字符串时会被过滤掉', () => {
    global.localStorage.setItem(S.KEY_MINE, JSON.stringify(['itm_seed_3', 123, null, '']));
    assert.deepEqual(S.myIds(), ['itm_seed_3']);
  });

  it('物品列表里混进非法条目时，只保留合法的', () => {
    global.localStorage.setItem(S.KEY_ITEMS, JSON.stringify([
      { id: 'a', title: '雨伞' }, null, 'x', { title: '没有 id' }
    ]));
    assert.equal(S.all().length, 1);
    assert.equal(S.all()[0].id, 'a');
  });
});

/* ==================================================================== */

describe('异步读取外壳', () => {
  it('fetchItems 回调返回 { ok: true, items }', async () => {
    S.seedIfEmpty();
    const res = await new Promise(resolve => S.fetchItems({}, resolve));
    assert.equal(res.ok, true);
    assert.equal(res.items.length, 7);
  });

  it('fetchItems 传 __fail 时返回失败，用来演示加载失败与重试', async () => {
    S.seedIfEmpty();
    const res = await new Promise(resolve => S.fetchItems({ __fail: true }, resolve));
    assert.equal(res.ok, false);
    assert.ok(res.error);
  });

  it('fetchItem 取单条，取不到时 item 为 null', async () => {
    S.seedIfEmpty();
    const hit = await new Promise(resolve => S.fetchItem('itm_seed_1', resolve));
    assert.equal(hit.ok, true);
    assert.equal(hit.item.title, '蓝牙耳机');

    const miss = await new Promise(resolve => S.fetchItem('不存在', resolve));
    assert.equal(miss.ok, true);
    assert.equal(miss.item, null);
  });

  it('fetchMine 只返回自己发布的条目', async () => {
    S.seedIfEmpty();
    const res = await new Promise(resolve => S.fetchMine(resolve));
    assert.equal(res.ok, true);
    assert.ok(res.items.every(x => S.isMine(x.id)));
  });
});
