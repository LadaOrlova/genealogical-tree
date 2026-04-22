// Инициализация интерактивного графа на Cytoscape.js + dagre.
// Построение узлов-людей, узлов-союзов и рёбер из data.js.

(function () {
  const { people, marriages, lineInfo } = window.__data;

  // —————————————— Построение cytoscape-элементов ——————————————

  const elements = [];

  // Узлы людей
  people.forEach((p) => {
    const dates = [p.birth, p.death].filter(Boolean).join(' — ');
    elements.push({
      group: 'nodes',
      data: {
        id: p.id,
        type: 'person',
        label: p.name,
        fullName: p.fullName,
        dates,
        profession: p.profession || '',
        place: p.place || '',
        notes: p.notes || '',
        line: p.line,
        gen: p.gen,
        certain: p.certain,
      },
      classes: [
        'person',
        p.certain ? 'certain' : 'uncertain',
        `line-${p.line}`,
        p.id === 'vladlena' ? 'you' : '',
      ].filter(Boolean).join(' '),
    });
  });

  // Узлы-союзы (невидимые) + рёбра супруг↔союз и союз→ребёнок
  marriages.forEach((m) => {
    elements.push({
      group: 'nodes',
      data: { id: m.id, type: 'union', certain: m.certain },
      classes: `union ${m.certain ? 'certain' : 'uncertain'}`,
    });

    m.spouses.forEach((sp) => {
      if (!people.find((p) => p.id === sp)) return;
      elements.push({
        group: 'edges',
        data: {
          id: `${m.id}--${sp}`,
          source: sp,
          target: m.id,
          etype: 'marriage',
          certain: m.certain,
        },
        classes: `e-marriage ${m.certain ? 'certain' : 'uncertain'}`,
      });
    });

    m.children.forEach((ch) => {
      if (!people.find((p) => p.id === ch)) return;
      elements.push({
        group: 'edges',
        data: {
          id: `${m.id}->${ch}`,
          source: m.id,
          target: ch,
          etype: 'parent',
          certain: m.certain,
        },
        classes: `e-parent ${m.certain ? 'certain' : 'uncertain'}`,
      });
    });
  });

  // —————————————— Стили ——————————————

  const style = [
    {
      selector: 'node.person',
      style: {
        'shape': 'round-rectangle',
        'background-color': '#ffffff',
        'border-width': 1.5,
        'border-color': (ele) => lineInfo[ele.data('line')]?.color || '#64748b',
        'width': 200,
        'height': 76,
        'padding': 10,
        'label': 'data(label)',
        'color': '#0f172a',
        'font-family': 'Inter, system-ui, sans-serif',
        'font-size': 14,
        'font-weight': 600,
        'text-valign': 'top',
        'text-halign': 'center',
        'text-margin-y': 18,
        'text-wrap': 'wrap',
        'text-max-width': 180,
      },
    },
    {
      selector: 'node.person.uncertain',
      style: {
        'border-style': 'dashed',
        'background-color': '#f8fafc',
        'color': '#475569',
      },
    },
    {
      selector: 'node.you',
      style: {
        'border-width': 3,
        'border-color': '#7c3aed',
        'background-color': '#faf5ff',
      },
    },

    {
      selector: 'node.union',
      style: {
        'shape': 'ellipse',
        'width': 8,
        'height': 8,
        'background-color': '#cbd5e1',
        'border-width': 0,
        'label': '',
      },
    },
    {
      selector: 'node.union.uncertain',
      style: {
        'background-color': '#e2e8f0',
      },
    },

    {
      selector: 'edge',
      style: {
        'curve-style': 'taxi',
        'taxi-direction': 'downward',
        'taxi-turn': 30,
        'taxi-turn-min-distance': 12,
        'width': 1.5,
        'line-color': '#94a3b8',
        'target-arrow-shape': 'none',
      },
    },
    {
      selector: 'edge.e-marriage',
      style: {
        'curve-style': 'straight',
        'line-color': '#cbd5e1',
        'width': 1.5,
      },
    },
    {
      selector: 'edge.uncertain',
      style: {
        'line-style': 'dashed',
        'line-color': '#cbd5e1',
      },
    },

    {
      selector: '.highlighted',
      style: {
        'border-color': '#7c3aed',
        'border-width': 3,
        'background-color': '#faf5ff',
      },
    },
    {
      selector: '.faded',
      style: {
        'opacity': 0.2,
      },
    },
  ];

  // —————————————— Cytoscape init ——————————————

  // Регистрируем dagre
  if (window.cytoscapeDagre) cytoscape.use(window.cytoscapeDagre);

  const cy = cytoscape({
    container: document.getElementById('tree'),
    elements,
    style,
    minZoom: 0.2,
    maxZoom: 2.5,
    wheelSensitivity: 0.25,
    layout: {
      name: 'dagre',
      rankDir: 'TB',
      nodeSep: 38,
      rankSep: 90,
      edgeSep: 14,
      ranker: 'tight-tree',
    },
  });

  window.cy = cy;

  // Кастомный рендер подписи под именем: даты + профессия
  // Cytoscape не умеет из коробки рисовать многострочные html-подписи,
  // поэтому мы добавляем вспомогательные поля в label через символ \n.
  cy.nodes('.person').forEach((n) => {
    const d = n.data();
    const lines = [d.label];
    if (d.dates) lines.push(d.dates);
    if (d.profession) {
      const prof = d.profession.length > 34 ? d.profession.slice(0, 32) + '…' : d.profession;
      lines.push(prof);
    }
    n.data('label', lines.join('\n'));
  });

  // Обновляем стиль лейбла для многострочности
  cy.style()
    .selector('node.person')
    .style({
      'text-valign': 'center',
      'text-halign': 'center',
      'text-margin-y': 0,
      'font-size': 13,
      'font-weight': 500,
      'line-height': 1.35,
    })
    .update();

  cy.fit(null, 40);

  // —————————————— UI: детальная панель ——————————————

  const panel = document.getElementById('panel');
  const panelBody = document.getElementById('panel-body');
  const panelClose = document.getElementById('panel-close');

  function openPanel(d) {
    const line = lineInfo[d.line] || {};
    const rows = [
      ['Полное имя', d.fullName && d.fullName !== '?' ? d.fullName : ''],
      ['Годы жизни', d.dates],
      ['Профессия', d.profession],
      ['Место', d.place],
    ].filter(([, v]) => v);

    panelBody.innerHTML = `
      <div class="panel-line" style="color: ${line.color}">${line.label || ''}</div>
      <h2>${escape(d.label.split('\n')[0])}</h2>
      ${d.certain ? '' : '<div class="panel-uncertain">Данные под вопросом — имя или связь пока не подтверждены</div>'}
      <dl>
        ${rows.map(([k, v]) => `<dt>${k}</dt><dd>${escape(v)}</dd>`).join('')}
      </dl>
      ${d.notes ? `<div class="panel-notes">${escape(d.notes)}</div>` : ''}
    `;
    panel.classList.add('open');
  }

  function closePanel() {
    panel.classList.remove('open');
    cy.elements().removeClass('highlighted faded');
  }

  panelClose.addEventListener('click', closePanel);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
  });

  cy.on('tap', 'node.person', (evt) => {
    const n = evt.target;
    cy.elements().addClass('faded');
    const neighborhood = n.closedNeighborhood().union(n.predecessors()).union(n.successors());
    neighborhood.removeClass('faded');
    n.addClass('highlighted');
    openPanel(n.data());
  });

  cy.on('tap', (evt) => {
    if (evt.target === cy) closePanel();
  });

  // —————————————— Контролы: зум, фит, поиск, фильтр ——————————————

  document.getElementById('zoom-in').addEventListener('click', () => {
    cy.zoom({ level: cy.zoom() * 1.25, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  });
  document.getElementById('zoom-out').addEventListener('click', () => {
    cy.zoom({ level: cy.zoom() / 1.25, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  });
  document.getElementById('zoom-fit').addEventListener('click', () => {
    cy.fit(null, 40);
  });
  document.getElementById('focus-me').addEventListener('click', () => {
    const me = cy.$('#vladlena');
    cy.animate({ center: { eles: me }, zoom: 1, duration: 400 });
  });

  // Поиск
  const searchInput = document.getElementById('search');
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    cy.elements().removeClass('highlighted faded');
    if (!q) return;
    const matches = cy.nodes('.person').filter((n) => {
      const d = n.data();
      return (
        d.label.toLowerCase().includes(q) ||
        (d.fullName || '').toLowerCase().includes(q) ||
        (d.profession || '').toLowerCase().includes(q) ||
        (d.place || '').toLowerCase().includes(q)
      );
    });
    if (matches.length === 0) return;
    cy.elements().addClass('faded');
    matches.removeClass('faded').addClass('highlighted');
    cy.animate({ fit: { eles: matches, padding: 80 }, duration: 400 });
  });

  // Фильтры линий (legend как тумблеры)
  const legendEl = document.getElementById('legend');
  const hiddenLines = new Set();
  Object.entries(lineInfo).forEach(([key, info]) => {
    const btn = document.createElement('button');
    btn.className = 'legend-item';
    btn.dataset.line = key;
    btn.innerHTML = `<span class="dot" style="background:${info.color}"></span>${info.label}`;
    btn.addEventListener('click', () => {
      if (hiddenLines.has(key)) {
        hiddenLines.delete(key);
        btn.classList.remove('off');
      } else {
        hiddenLines.add(key);
        btn.classList.add('off');
      }
      applyLineFilter();
    });
    legendEl.appendChild(btn);
  });

  function applyLineFilter() {
    cy.nodes('.person').forEach((n) => {
      if (hiddenLines.has(n.data('line'))) n.style('display', 'none');
      else n.style('display', 'element');
    });
  }

  // Переключатель: показывать только подтверждённое
  const certainOnly = document.getElementById('certain-only');
  certainOnly.addEventListener('change', () => {
    if (certainOnly.checked) {
      cy.elements('.uncertain').style('display', 'none');
    } else {
      cy.elements('.uncertain').style('display', 'element');
      applyLineFilter();
    }
  });

  // —————————————— утилиты ——————————————

  function escape(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
})();
