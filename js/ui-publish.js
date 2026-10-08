/*!
 * ui-publish.js —— 发布 / 编辑信息
 * 负责人：102401228 林彦翔（本轮由赵紫龙先打通闭环，可在此基础上改进）
 *
 * 两条路径共用一个页面：
 *   #/publish              新建
 *   #/publish?id=itm_xxx   编辑（从「我的发布」进来）
 *
 * 表单校验全部走 LFModel.validateItem，页面这一层不自己写校验规则，
 * 这样单元测试测的就是真正在跑的代码。
 */
(function (root) {
  'use strict';

  var UI = root.LFUI = root.LFUI || {};
  var h = UI.h;
  var M = root.LFModel;
  var S = root.LFStore;

  var state = null;
  var editingId = null;
  var errors = {};
  var submitting = false;

  function blankState(type) {
    return {
      type: type === 'found' ? 'found' : 'lost',
      title: '',
      category: '',
      date: M.todayStr(),
      place: '',
      desc: '',
      contactType: 'wechat',
      contact: '',
      image: ''
    };
  }

  function render(ctx) {
    var q = (ctx && ctx.query) || {};
    editingId = q.id ? String(q.id) : null;
    errors = {};
    submitting = false;

    if (editingId) {
      var it = S.get(editingId);
      if (!it) {
        h.host().innerHTML = h.screen({ title: '编辑信息', back: '/mine' },
          h.empty({
            icon: '\uD83D\uDDC2\uFE0F',
            title: '这条信息不存在或已被删除',
            sub: '可能链接已经失效',
            actionText: '返回我的发布',
            actionNav: '/mine'
          })
        );
        return;
      }
      state = {
        type: it.type, title: it.title, category: it.category, date: it.date,
        place: it.place, desc: it.desc, contactType: it.contactType,
        contact: it.contact, image: it.image || ''
      };
    } else {
      state = blankState(q.type);
    }

    paint();
  }

  /* ---------------- 表单片段 ---------------- */

  function fieldHtml(name, label, control, required) {
    return '' +
      '<div class="field" id="f-' + name + '">' +
        '<label class="lab" for="i-' + name + '">' + h.esc(label) +
          (required ? '<span class="req">*</span>' : '') + '</label>' +
        control +
      '</div>';
  }

  function inputHtml(name, opts) {
    opts = opts || {};
    return '<input class="input" id="i-' + name + '" name="' + name + '" ' +
      'type="' + (opts.type || 'text') + '" ' +
      (opts.maxlength ? 'maxlength="' + opts.maxlength + '" ' : '') +
      'placeholder="' + h.esc(opts.placeholder || '') + '" ' +
      'value="' + h.esc(state[name]) + '">';
  }

  function selectHtml(name, options, placeholder) {
    var opts = '';
    if (placeholder) {
      opts += '<option value=""' + (state[name] ? '' : ' selected') + ' disabled>' +
        h.esc(placeholder) + '</option>';
    }
    opts += options.map(function (o) {
      var v = typeof o === 'string' ? o : o.value;
      var t = typeof o === 'string' ? o : o.label;
      return '<option value="' + h.esc(v) + '"' + (state[name] === v ? ' selected' : '') + '>' +
        h.esc(t) + '</option>';
    }).join('');
    return '<select class="input" id="i-' + name + '" name="' + name + '">' + opts + '</select>';
  }

  function typeSegHtml() {
    var kinds = [
      { value: 'lost', label: '寻物' },
      { value: 'found', label: '招领' }
    ];
    return '<div class="seg">' + kinds.map(function (k) {
      return '<span class="' + (state.type === k.value ? 'on' : '') + '" ' +
        'data-ptype="' + k.value + '">' + k.label + '</span>';
    }).join('') + '</div>';
  }

  function previewHtml() {
    var inner = state.image
      ? '<img src="' + h.esc(state.image) + '" alt="物品图片">'
      : '\uD83D\uDCF7';
    var remove = state.image
      ? '<button class="btn btn-quiet" data-act="rmimg">移除图片</button>'
      : '';
    return '' +
      '<div class="img-pick">' +
        '<div class="img-preview" data-act="pick" title="选择图片">' + inner + '</div>' +
        '<div class="grow">' +
          '<div class="img-hint">照片有帮助，但拿不到也没关系，可以留空。</div>' +
          '<div class="row mt-12">' +
            '<button class="btn btn-quiet" data-act="pick">选择图片</button>' + remove +
          '</div>' +
        '</div>' +
      '</div>' +
      '<input type="file" id="imgFile" accept="image/*" class="hide">';
  }

  function paint() {
    var isLost = state.type === 'lost';
    var dateLabel = isLost ? '丢失时间' : '拾取时间';
    var placeLabel = isLost ? '丢失地点' : '拾取地点';

    var catOptions = M.CATEGORIES.map(function (c) { return { value: c, label: c }; });
    var contactOptions = Object.keys(M.CONTACT_TYPES).map(function (k) {
      return { value: k, label: M.CONTACT_TYPES[k] };
    });

    var body = '' +
      '<div class="filter-bar">' + typeSegHtml() + '</div>' +
      '<div class="card">' +
        fieldHtml('title', '物品名称', inputHtml('title', {
          maxlength: M.NAME_MAX, placeholder: '例如：校园卡、蓝牙耳机'
        }), true) +
        fieldHtml('category', '物品类别', selectHtml('category', catOptions, '请选择类别'), true) +
        fieldHtml('date', dateLabel, inputHtml('date', { type: 'date' }), true) +
        fieldHtml('place', placeLabel, inputHtml('place', {
          placeholder: isLost ? '例如：一教三楼走廊' : '例如：三区食堂二楼'
        }), true) +
        fieldHtml('desc', '特征描述',
          '<textarea class="input" id="i-desc" name="desc" maxlength="' + M.DESC_MAX + '" ' +
            'placeholder="说说颜色、外观、有没有特殊标记，越具体越容易被认出来">' +
            h.esc(state.desc) + '</textarea>' +
          '<div class="counter" id="descCounter">' + M.trim(state.desc).length + ' / ' + M.DESC_MAX + '</div>',
          true) +
      '</div>' +
      '<div class="card">' +
        fieldHtml('contactType', '联系方式类型',
          selectHtml('contactType', contactOptions), true) +
        fieldHtml('contact', '联系方式', inputHtml('contact', {
          placeholder: state.contactType === 'phone' ? '11 位手机号' : '微信号 / QQ 号'
        }), true) +
        '<div class="item-meta">联系方式会展示在详情页，建议留微信号或 QQ 号。这里是纯前端演示，数据只存在本机浏览器里。</div>' +
      '</div>' +
      '<div class="card">' +
        '<div class="section-title">物品图片（选填）</div>' +
        previewHtml() +
      '</div>' +
      '<div class="form-actions">' +
        '<button class="btn btn-primary btn-block" data-act="submit">' +
          (editingId ? '保存修改' : '立即发布') + '</button>' +
      '</div>';

    h.host().innerHTML = h.screen({
      title: editingId ? '编辑信息' : '发布信息',
      back: editingId ? '/mine' : '/home'
    }, body);
  }

  /* ---------------- 取值与校验 ---------------- */

  function valOf(name) {
    var el = document.querySelector('[name="' + name + '"]');
    return el ? el.value : '';
  }

  function collect() {
    return {
      type: state.type,
      title: valOf('title'),
      category: valOf('category'),
      date: valOf('date'),
      place: valOf('place'),
      desc: valOf('desc'),
      contactType: valOf('contactType'),
      contact: valOf('contact'),
      image: state.image
    };
  }

  function clearErrors() {
    var tips = document.querySelectorAll('.err-tip');
    for (var i = 0; i < tips.length; i++) {
      if (tips[i].parentNode) tips[i].parentNode.removeChild(tips[i]);
    }
    var bad = document.querySelectorAll('.input.err');
    for (var j = 0; j < bad.length; j++) bad[j].classList.remove('err');
  }

  function showErrors() {
    clearErrors();
    Object.keys(errors).forEach(function (field) {
      var el = document.querySelector('[name="' + field + '"]');
      if (el) el.classList.add('err');
      var wrap = document.getElementById('f-' + field);
      if (wrap) {
        wrap.insertAdjacentHTML('beforeend',
          '<div class="err-tip">' + h.esc(errors[field]) + '</div>');
      }
    });

    /* 类型错误没有对应输入框，用一句提示带过 */
    if (errors.type) h.toast(errors.type);

    var first = document.querySelector('.input.err');
    if (first && first.scrollIntoView) {
      first.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  function clearFieldError(name) {
    var el = document.querySelector('[name="' + name + '"]');
    if (el) el.classList.remove('err');
    var wrap = document.getElementById('f-' + name);
    if (wrap) {
      var tip = wrap.querySelector('.err-tip');
      if (tip && tip.parentNode) tip.parentNode.removeChild(tip);
    }
    delete errors[name];
  }

  /* ---------------- 提交 ---------------- */

  function submit() {
    if (submitting) return;

    var form = collect();
    state = form;

    var res = M.validateItem(form);
    errors = {};
    res.errors.forEach(function (e) {
      if (!errors[e.field]) errors[e.field] = e.message;
    });
    if (!res.ok) {
      showErrors();
      return;
    }
    clearErrors();

    submitting = true;
    var btn = document.querySelector('[data-act="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.classList.add('is-loading');
      btn.textContent = editingId ? '保存中…' : '发布中…';
    }

    /* 模拟一次提交往返：既让「提交中…」真的能被看到，也顺便防住连点 */
    root.setTimeout(function () {
      var item = editingId ? S.update(editingId, form) : S.create(form);
      submitting = false;

      if (!item) {
        h.toast('保存失败，请重试');
        if (btn) {
          btn.disabled = false;
          btn.classList.remove('is-loading');
          btn.textContent = editingId ? '保存修改' : '立即发布';
        }
        return;
      }

      h.toast(editingId ? '修改已保存' : '发布成功');
      root.LFRouter.navigate('/detail/' + item.id);
    }, S.LOAD_DELAY);
  }

  /* ---------------- 事件 ---------------- */

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;

    var kind = t.closest('[data-ptype]');
    if (kind) {
      var next = kind.getAttribute('data-ptype');
      if (next !== state.type) {
        var form = collect();
        form.type = next;
        state = form;
        paint();
      }
      return;
    }

    var act = t.closest('[data-act]');
    if (act) {
      var name = act.getAttribute('data-act');
      if (name === 'submit') { submit(); return; }
      if (name === 'pick') {
        var file = document.getElementById('imgFile');
        if (file) file.click();
        return;
      }
      if (name === 'rmimg') {
        state.image = '';
        paint();
        return;
      }
    }

    if (t.closest('[data-retry="publish"]')) paint();
  });

  document.addEventListener('input', function (e) {
    var el = e.target;
    if (!el || !el.name) return;

    if (el.name === 'desc') {
      var counter = document.getElementById('descCounter');
      if (counter) {
        var n = M.trim(el.value).length;
        counter.textContent = n + ' / ' + M.DESC_MAX;
        if (n > M.DESC_MAX) counter.classList.add('over');
        else counter.classList.remove('over');
      }
    }
    clearFieldError(el.name);
  });

  document.addEventListener('change', function (e) {
    var el = e.target;
    if (!el) return;

    if (el.id === 'imgFile') {
      var f = el.files && el.files[0];
      if (!f) return;
      h.readImageFile(f, function (dataUrl) {
        if (!dataUrl) {
          h.toast('这张图片读不出来，换一张试试');
          return;
        }
        state.image = dataUrl;
        paint();
        h.toast('图片已添加');
      });
      return;
    }

    if (el.name === 'contactType') {
      var form = collect();
      form.contactType = el.value;
      state = form;
      paint();
      return;
    }

    if (el.name) clearFieldError(el.name);
  });

  UI.publish = { render: render };
})(window);
