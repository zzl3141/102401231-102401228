/*!
 * store.js —— 数据存取层
 * 负责人：102401231 赵紫龙
 *
 * 用 localStorage 保存数据（本次作业不要求后台），
 * 所有写操作都经过 model.js 的纯函数，方便单元测试。
 */
(function (root) {
  'use strict';

  var M = root.LFModel;

  var KEY_ITEMS = 'laf.items.v1';
  var KEY_MINE = 'laf.mine.v1';

  /* ---------------- 内置示例数据 ----------------
     第一次打开时写入，让页面不是空的。清空浏览器数据后会重新写入。 */
  var SEED = [
    {
      id: 'itm_seed_1', type: 'found', title: '蓝牙耳机', category: '电子产品',
      place: '三区食堂二楼', date: '2026-10-05',
      desc: '白色充电盒，盒盖内侧有一道划痕，右耳耳机上贴了一小块蓝色贴纸',
      contactType: 'wechat', contact: 'zzl_314', image: 'img/earbuds.jpg',
      status: 'active', createdAt: 1791158400000
    },
    {
      id: 'itm_seed_2', type: 'lost', title: '校园卡', category: '证件',
      place: '一教三楼走廊', date: '2026-10-04',
      desc: '蓝色卡套，卡角有一道折痕，姓名首字母是 L，卡里还夹着一张借书条',
      contactType: 'qq', contact: '22120584', image: 'img/card.jpg',
      status: 'active', createdAt: 1791072000000
    },
    {
      id: 'itm_seed_3', type: 'lost', title: '宿舍钥匙', category: '钥匙',
      place: '紫金楼 12 号楼楼下', date: '2026-10-03',
      desc: '一把铜钥匙，挂着一只黄色小猫挂件，钥匙柄上贴了白色标签',
      contactType: 'phone', contact: '13800001234', image: 'img/keys.jpg',
      status: 'active', createdAt: 1790985600000
    },
    {
      id: 'itm_seed_4', type: 'found', title: '雨伞', category: '雨伞',
      place: '图书馆一楼自习区', date: '2026-10-02',
      desc: '黑色长柄伞，伞柄缠了一圈灰色胶带，伞骨有一根略微变形',
      contactType: 'wechat', contact: 'umbrella2026', image: 'img/umbrella.jpg',
      status: 'active', createdAt: 1790899200000
    },
    {
      id: 'itm_seed_5', type: 'found', title: '高等数学课本', category: '书籍',
      place: '二教 205 教室', date: '2026-10-01',
      desc: '封面内页写了名字首字，书里有大量蓝笔笔记，还夹着一张草稿纸',
      contactType: 'qq', contact: '10240214', image: 'img/book.jpg',
      status: 'active', createdAt: 1790812800000
    },
    {
      id: 'itm_seed_6', type: 'found', title: '校园卡', category: '证件',
      place: '三区食堂门口', date: '2026-09-30',
      desc: '透明卡套，背面贴了一张动漫贴纸，卡面姓名只有一个字',
      contactType: 'wechat', contact: 'cardsaver', image: 'img/campus.jpg',
      status: 'closed', closedReason: '已归还', closedAt: 1791072000000,
      createdAt: 1790726400000
    }
  ];

  /* 示例数据里哪几条算「我发布的」，用来演示我的发布 / 标记状态 */
  var SEED_MINE = ['itm_seed_3', 'itm_seed_6'];

  /* ---------------- localStorage 读写（失败不抛错） ---------------- */

  function readRaw(key) {
    try {
      return root.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function writeRaw(key, value) {
    try {
      root.localStorage.setItem(key, value);
      return true;
    } catch (e) {
      return false;
    }
  }

  function readItems() {
    return M.deserialize(readRaw(KEY_ITEMS));
  }

  function writeItems(items) {
    return writeRaw(KEY_ITEMS, M.serialize(items));
  }

  /* 「我的发布」存的是 id 数组，和物品列表不同，不能用 LFModel.deserialize
     （那个函数会按物品结构做 normalize，纯字符串会被丢掉）。 */
  function readMine() {
    var raw = readRaw(KEY_MINE);
    if (!raw) return [];
    var ids;
    try {
      ids = JSON.parse(raw);
    } catch (e) {
      return [];
    }
    if (!Array.isArray(ids)) return [];
    return ids.filter(function (x) { return typeof x === 'string' && x !== ''; });
  }

  function writeMine(ids) {
    var list = Array.isArray(ids) ? ids : [];
    return writeRaw(KEY_MINE, JSON.stringify(list));
  }

  /* ---------------- 对外接口 ---------------- */

  function all() {
    return readItems();
  }

  function get(id) {
    var list = readItems();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  /** 按条件查询（默认只返回进行中的信息） */
  function query(q) {
    return M.filterItems(readItems(), q || {});
  }

  function myIds() {
    return readMine();
  }

  function mine() {
    var ids = readMine();
    return M.sortItems(readItems().filter(function (it) {
      return M.isMine(it, ids);
    }));
  }

  function isMine(id) {
    return readMine().indexOf(id) >= 0;
  }

  /** 新增一条信息，并记录为本机发布 */
  function create(form, now) {
    var item = M.createItem(form, now);
    var list = readItems();
    list.push(item);
    writeItems(list);

    var ids = readMine();
    ids.push(item.id);
    writeMine(ids);
    return item;
  }

  /** 局部更新一条信息（id / createdAt / status 不允许通过这里改） */
  function update(id, patch) {
    var list = readItems();
    var hit = null;
    var blocked = ['id', 'createdAt', 'status', 'closedAt', 'closedReason'];

    for (var i = 0; i < list.length; i++) {
      if (list[i].id !== id) continue;
      var merged = list[i];
      for (var k in (patch || {})) {
        if (!Object.prototype.hasOwnProperty.call(patch, k)) continue;
        if (blocked.indexOf(k) >= 0) continue;
        merged[k] = patch[k];
      }
      list[i] = M.normalize(merged) || merged;
      hit = list[i];
      break;
    }

    if (hit) writeItems(list);
    return hit;
  }

  /** 标记为已找到 / 已归还 */
  function close(id, now) {
    return setClosed(id, true, now);
  }

  /** 撤销标记 */
  function reopen(id) {
    return setClosed(id, false);
  }

  function setClosed(id, closed, now) {
    var list = readItems();
    var hit = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id !== id) continue;
      list[i] = closed ? M.markClosed(list[i], now) : M.reopenItem(list[i]);
      hit = list[i];
      break;
    }
    if (hit) writeItems(list);
    return hit;
  }

  /** 删除一条信息（同时从「我的发布」里移除） */
  function remove(id) {
    writeItems(readItems().filter(function (it) { return it.id !== id; }));
    writeMine(readMine().filter(function (x) { return x !== id; }));
    return true;
  }

  /** 恢复成内置示例数据（走查 / 演示用） */
  function reset() {
    var items = [];
    SEED.forEach(function (raw) {
      var n = M.normalize(raw);
      if (n) items.push(n);
    });
    writeItems(items);
    writeMine(SEED_MINE.slice());
    return items;
  }

  /** 第一次打开（或数据被清空）时写入示例数据 */
  function seedIfEmpty() {
    if (readItems().length === 0) return reset();
    return readItems();
  }

  /* ---------------- 异步读取外壳 ----------------
     数据现在来自 localStorage（同步），这里把它包装成异步读取，
     目的是让「加载中 / 加载失败 / 重试」这三条状态真实存在
     （走查清单第 W 项里要过一遍），而不是只在设计稿上画出来。
     以后接真实后台，只需要改这一个函数，页面不用动。

     走查用开关：路由上带 ?fail=1 可以强制让本次读取失败，
     用来看加载失败与重试长什么样，例如 #/home?fail=1、#/search?kw=雨伞&fail=1 */
  var LOAD_DELAY = 220;

  function fetchItems(queryObj, onDone) {
    var q = {};
    for (var k in (queryObj || {})) {
      if (Object.prototype.hasOwnProperty.call(queryObj, k)) q[k] = queryObj[k];
    }
    var forced = q.__fail === true;
    delete q.__fail;

    root.setTimeout(function () {
      if (forced) {
        onDone({ ok: false, error: '网络开了个小差（走查演示）' });
        return;
      }
      try {
        onDone({ ok: true, items: M.filterItems(readItems(), q) });
      } catch (e) {
        onDone({ ok: false, error: (e && e.message) || '读取失败' });
      }
    }, LOAD_DELAY);
  }

  /** 异步取单条（详情页用），拿不到时 ok 为 true 但 item 为 null */
  function fetchItem(id, onDone) {
    root.setTimeout(function () {
      try {
        onDone({ ok: true, item: get(id) });
      } catch (e) {
        onDone({ ok: false, error: (e && e.message) || '读取失败' });
      }
    }, LOAD_DELAY);
  }

  /** 异步取「我的发布」（我的发布页用） */
  function fetchMine(onDone) {
    root.setTimeout(function () {
      try {
        onDone({ ok: true, items: mine() });
      } catch (e) {
        onDone({ ok: false, error: (e && e.message) || '读取失败' });
      }
    }, LOAD_DELAY);
  }

  root.LFStore = {
    KEY_ITEMS: KEY_ITEMS,
    KEY_MINE: KEY_MINE,
    LOAD_DELAY: LOAD_DELAY,
    all: all,
    get: get,
    query: query,
    fetchItems: fetchItems,
    fetchItem: fetchItem,
    fetchMine: fetchMine,
    mine: mine,
    myIds: myIds,
    isMine: isMine,
    create: create,
    update: update,
    close: close,
    reopen: reopen,
    remove: remove,
    reset: reset,
    seedIfEmpty: seedIfEmpty
  };
})(window);
