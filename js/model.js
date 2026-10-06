/*!
 * model.js —— 数据层纯函数
 * 负责人：102401231 赵紫龙
 *
 * 约定：
 *  - 只做数据加工，不碰 DOM、不碰 localStorage，方便直接用 Node + Mocha 做单元测试。
 *  - 文件头用 UMD 包装：浏览器里挂到 window.LFModel，Node 里用 require 引入。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LFModel = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------------- 常量 ---------------- */

  var TYPES = { lost: '寻物', found: '招领' };
  var CLOSED_REASON = { lost: '已找到', found: '已归还' };
  var ACTIVE_LABEL = { lost: '寻找中', found: '待认领' };
  var CLOSED_LABEL = { lost: '已找到', found: '已归还' };

  var CATEGORIES = ['证件', '电子产品', '钥匙', '雨伞', '书籍', '其他'];
  var CONTACT_TYPES = { wechat: '微信', qq: 'QQ', phone: '手机号', other: '其他' };

  var NAME_MIN = 2, NAME_MAX = 20;
  var DESC_MIN = 10, DESC_MAX = 200;
  var PLACE_MIN = 2;

  var STATUS_ACTIVE = 'active';
  var STATUS_CLOSED = 'closed';

  /* ---------------- 工具 ---------------- */

  function trim(v) {
    return (v === null || v === undefined) ? '' : String(v).trim();
  }

  function two(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function toDateStr(d) {
    return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate());
  }

  function todayStr(now) {
    return toDateStr(now ? new Date(now) : new Date());
  }

  function isCategory(v) {
    return CATEGORIES.indexOf(v) >= 0;
  }

  function shallow(o) {
    var c = {};
    for (var k in o) {
      if (Object.prototype.hasOwnProperty.call(o, k)) c[k] = o[k];
    }
    return c;
  }

  /* ---------------- 校验 ---------------- */

  /**
   * 联系方式格式校验。返回空字符串表示通过，否则返回错误文案。
   */
  function checkContact(contact, contactType) {
    var v = trim(contact);
    if (contactType === 'phone') {
      return /^1[3-9]\d{9}$/.test(v) ? '' : '手机号应为 11 位数字';
    }
    if (contactType === 'qq') {
      return /^[1-9]\d{4,11}$/.test(v) ? '' : 'QQ 号应为 5~12 位数字';
    }
    if (contactType === 'wechat') {
      return /^[A-Za-z][A-Za-z0-9_-]{5,19}$/.test(v) ? '' : '微信号应为 6~20 位，字母开头';
    }
    return (v.length >= 2 && v.length <= 50) ? '' : '请填写 2~50 个字的联系方式';
  }

  /**
   * 校验发布表单。
   * @returns {{ok: boolean, errors: Array<{field: string, message: string}>}}
   */
  function validateItem(form, now) {
    form = form || {};
    var errors = [];
    var type = form.type;
    var title = trim(form.title);
    var category = trim(form.category);
    var date = trim(form.date);
    var place = trim(form.place);
    var desc = trim(form.desc);
    var contactType = trim(form.contactType);
    var contact = trim(form.contact);
    var dateLabel = (type === 'found') ? '拾取日期' : '丢失日期';
    var placeLabel = (type === 'found') ? '拾取地点' : '丢失地点';

    if (type !== 'lost' && type !== 'found') {
      errors.push({ field: 'type', message: '请选择信息类型（寻物 / 招领）' });
    }

    if (!title) {
      errors.push({ field: 'title', message: '请填写物品名称' });
    } else if (title.length < NAME_MIN || title.length > NAME_MAX) {
      errors.push({ field: 'title', message: '物品名称请填写 ' + NAME_MIN + '~' + NAME_MAX + ' 个字' });
    }

    if (!category) {
      errors.push({ field: 'category', message: '请选择物品类别' });
    } else if (!isCategory(category)) {
      errors.push({ field: 'category', message: '物品类别不在可选范围内' });
    }

    if (!date) {
      errors.push({ field: 'date', message: '请选择' + dateLabel });
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push({ field: 'date', message: dateLabel + '格式应为 YYYY-MM-DD' });
    } else if (date > todayStr(now)) {
      errors.push({ field: 'date', message: dateLabel + '不能晚于今天' });
    }

    if (!place) {
      errors.push({ field: 'place', message: '请填写' + placeLabel });
    } else if (place.length < PLACE_MIN) {
      errors.push({ field: 'place', message: placeLabel + '至少 ' + PLACE_MIN + ' 个字' });
    }

    if (!desc) {
      errors.push({ field: 'desc', message: '请填写特征描述' });
    } else if (desc.length < DESC_MIN || desc.length > DESC_MAX) {
      errors.push({ field: 'desc', message: '特征描述请填写 ' + DESC_MIN + '~' + DESC_MAX + ' 个字' });
    }

    if (!contactType) {
      errors.push({ field: 'contactType', message: '请选择联系方式类型' });
    } else if (!CONTACT_TYPES[contactType]) {
      errors.push({ field: 'contactType', message: '联系方式类型不支持' });
    }

    if (!contact) {
      errors.push({ field: 'contact', message: '请填写联系方式' });
    } else if (CONTACT_TYPES[contactType]) {
      var ce = checkContact(contact, contactType);
      if (ce) errors.push({ field: 'contact', message: ce });
    }

    return { ok: errors.length === 0, errors: errors };
  }

  /* ---------------- 创建 ---------------- */

  /**
   * 由表单生成一条新信息（补 id / createdAt / status）。
   */
  function createItem(form, now) {
    form = form || {};
    var ts = now || Date.now();
    return {
      id: 'itm_' + ts + '_' + Math.random().toString(36).slice(2, 6),
      type: form.type === 'found' ? 'found' : 'lost',
      title: trim(form.title),
      category: trim(form.category),
      place: trim(form.place),
      date: trim(form.date),
      desc: trim(form.desc),
      contactType: CONTACT_TYPES[trim(form.contactType)] ? trim(form.contactType) : 'other',
      contact: trim(form.contact),
      image: trim(form.image),
      status: STATUS_ACTIVE,
      closedReason: '',
      createdAt: ts,
      closedAt: 0
    };
  }

  /* ---------------- 检索与排序 ---------------- */

  /**
   * 关键词匹配：命中物品名称 / 特征描述 / 地点 / 类别 / 类型。
   * 关键词为空（含全是空格）时返回 true，表示不做过滤。
   * `%`、`_` 等字符一律按普通字符处理，不当作通配符。
   */
  function matchKeyword(item, keyword) {
    if (!item) return false;
    var k = trim(keyword).toLowerCase();
    if (!k) return true;
    var hay = [
      item.title, item.desc, item.place, item.category,
      TYPES[item.type] || ''
    ].join(' ').toLowerCase();
    return hay.indexOf(k) >= 0;
  }

  function isBlankKeyword(keyword) {
    return trim(keyword) === '';
  }

  /**
   * 排序：进行中的排在前面；同类按日期倒序，再按创建时间倒序。
   */
  function sortItems(items) {
    return (items || []).slice().sort(function (a, b) {
      var ac = a.status === STATUS_CLOSED;
      var bc = b.status === STATUS_CLOSED;
      if (ac !== bc) return ac ? 1 : -1;
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }

  /**
   * 组合筛选。status 默认 'active'（列表默认不展示已结束的信息）。
   * @param {object} query {keyword, type, category, place, status}
   *   type / category 传 'all' 或留空表示不限；status 支持 'active' | 'closed' | 'all'。
   */
  function filterItems(items, query) {
    query = query || {};
    var status = query.status || STATUS_ACTIVE;
    var type = (query.type && query.type !== 'all') ? query.type : '';
    var category = (query.category && query.category !== 'all') ? query.category : '';
    var place = trim(query.place).toLowerCase();
    var out = [];

    (items || []).forEach(function (it) {
      if (!it) return;
      if (type && it.type !== type) return;
      if (category && it.category !== category) return;
      if (place && String(it.place || '').toLowerCase().indexOf(place) < 0) return;
      if (status !== 'all' && it.status !== status) return;
      if (!matchKeyword(it, query.keyword)) return;
      out.push(it);
    });

    return sortItems(out);
  }

  /* ---------------- 状态流转 ---------------- */

  /**
   * 标记为已找到 / 已归还。已经是结束状态的条目原样返回，不重复标记。
   */
  function markClosed(item, now) {
    if (!item) return item;
    if (item.status === STATUS_CLOSED) return item;
    var copy = shallow(item);
    copy.status = STATUS_CLOSED;
    copy.closedReason = CLOSED_REASON[item.type] || '已结束';
    copy.closedAt = now || Date.now();
    return copy;
  }

  /**
   * 撤销标记，恢复为进行中。
   */
  function reopenItem(item) {
    if (!item) return item;
    if (item.status !== STATUS_CLOSED) return item;
    var copy = shallow(item);
    copy.status = STATUS_ACTIVE;
    copy.closedReason = '';
    copy.closedAt = 0;
    return copy;
  }

  /** 是否是本机发布的条目 */
  function isMine(item, myIds) {
    if (!item || !item.id) return false;
    return (myIds || []).indexOf(item.id) >= 0;
  }

  /* ---------------- 展示 ---------------- */

  function typeLabel(item) {
    return TYPES[item && item.type] || '';
  }

  /** 列表 / 详情上的状态文案：寻找中、待认领、已找到、已归还 */
  function statusLabel(item) {
    if (!item) return '';
    if (item.status === STATUS_CLOSED) {
      return item.closedReason || CLOSED_LABEL[item.type] || '已结束';
    }
    return ACTIVE_LABEL[item.type] || '进行中';
  }

  /** '2026-10-05' -> '10-05' */
  function formatDate(dateStr) {
    var v = trim(dateStr);
    return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v.slice(5) : v;
  }

  /** 相对时间：刚刚 / N 分钟前 / N 小时前 / N 天前 / 具体日期 */
  function relativeTime(ts, now) {
    var t = Number(ts) || 0;
    if (!t) return '';
    var diff = (now || Date.now()) - t;
    if (diff < 60 * 1000) return '刚刚';
    if (diff < 60 * 60 * 1000) return Math.floor(diff / (60 * 1000)) + ' 分钟前';
    if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / (60 * 60 * 1000)) + ' 小时前';
    if (diff < 7 * 24 * 60 * 60 * 1000) return Math.floor(diff / (24 * 60 * 60 * 1000)) + ' 天前';
    return toDateStr(new Date(t));
  }

  function contactText(item) {
    if (!item) return '';
    return (CONTACT_TYPES[item.contactType] || '联系方式') + '：' + trim(item.contact);
  }

  function stats(items) {
    var list = items || [];
    var active = 0;
    var closed = 0;
    list.forEach(function (it) {
      if (it && it.status === STATUS_CLOSED) closed++;
      else active++;
    });
    return { total: list.length, active: active, closed: closed };
  }

  /* ---------------- 序列化 / 脏数据容错 ---------------- */

  /**
   * 把任意来源的一条数据整理成合法 Item；无法修复时返回 null。
   */
  function normalize(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var id = trim(raw.id);
    var title = trim(raw.title);
    if (!id || !title) return null;

    var type = raw.type === 'found' ? 'found' : 'lost';
    var status = raw.status === STATUS_CLOSED ? STATUS_CLOSED : STATUS_ACTIVE;

    return {
      id: id,
      type: type,
      title: title,
      category: trim(raw.category),
      place: trim(raw.place),
      date: trim(raw.date),
      desc: trim(raw.desc),
      contactType: CONTACT_TYPES[trim(raw.contactType)] ? trim(raw.contactType) : 'other',
      contact: trim(raw.contact),
      image: trim(raw.image),
      status: status,
      closedReason: status === STATUS_CLOSED
        ? (trim(raw.closedReason) || CLOSED_REASON[type])
        : '',
      createdAt: Number(raw.createdAt) || 0,
      closedAt: Number(raw.closedAt) || 0
    };
  }

  /** 从 JSON 文本还原列表；文本损坏、不是数组、或某条不合法时安全跳过。 */
  function deserialize(text) {
    if (!text) return [];
    var data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return [];
    }
    if (!Array.isArray(data)) return [];
    var out = [];
    data.forEach(function (raw) {
      var n = normalize(raw);
      if (n) out.push(n);
    });
    return out;
  }

  function serialize(items) {
    try {
      return JSON.stringify(items || []);
    } catch (e) {
      return '[]';
    }
  }

  /* ---------------- 导出 ---------------- */

  return {
    TYPES: TYPES,
    CLOSED_REASON: CLOSED_REASON,
    CATEGORIES: CATEGORIES,
    CONTACT_TYPES: CONTACT_TYPES,
    STATUS_ACTIVE: STATUS_ACTIVE,
    STATUS_CLOSED: STATUS_CLOSED,
    NAME_MIN: NAME_MIN,
    NAME_MAX: NAME_MAX,
    DESC_MIN: DESC_MIN,
    DESC_MAX: DESC_MAX,

    trim: trim,
    todayStr: todayStr,
    checkContact: checkContact,
    validateItem: validateItem,
    createItem: createItem,

    matchKeyword: matchKeyword,
    isBlankKeyword: isBlankKeyword,
    sortItems: sortItems,
    filterItems: filterItems,

    markClosed: markClosed,
    reopenItem: reopenItem,
    isMine: isMine,

    typeLabel: typeLabel,
    statusLabel: statusLabel,
    formatDate: formatDate,
    relativeTime: relativeTime,
    contactText: contactText,
    stats: stats,

    normalize: normalize,
    deserialize: deserialize,
    serialize: serialize
  };
});
