// Генеалогический граф. Cytoscape.js + dagre + HTML-лейблы на карточках.

(function () {
  const { people, marriages, lineInfo } = window.__data;

  // ————— Построение cytoscape-элементов —————

  const elements = [];

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
        links: p.links || [],
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
        data: { id: `${m.id}--${sp}`, source: sp, target: m.id, etype: 'marriage', certain: m.certain },
        classes: `e-marriage ${m.certain ? 'certain' : 'uncertain'}`,
      });
    });
    m.children.forEach((ch) => {
      if (!people.find((p) => p.id === ch)) return;
      elements.push({
        group: 'edges',
        data: { id: `${m.id}->${ch}`, source: m.id, target: ch, etype: 'parent', certain: m.certain },
        classes: `e-parent ${m.certain ? 'certain' : 'uncertain'}`,
      });
    });
  });

  // ————— Стили: сами узлы-персоны рендерим через HTML-label, поэтому в стилях — просто прозрачные «контейнеры» правильного размера —————

  const personWidth = 250;
  const personHeight = 96;

  const style = [
    {
      selector: 'node.person',
      style: {
        'width': personWidth,
        'height': personHeight,
        'background-opacity': 0,
        'border-width': 0,
        'label': '',
        'shape': 'round-rectangle',
      },
    },
    {
      selector: 'node.union',
      style: {
        'shape': 'ellipse',
        'width': 6,
        'height': 6,
        'background-color': '#2a2a33',
        'border-width': 0,
      },
    },

    {
      selector: 'edge',
      style: {
        'curve-style': 'taxi',
        'taxi-direction': 'downward',
        'taxi-turn': 40,
        'taxi-turn-min-distance': 16,
        'width': 1.5,
        'line-color': '#3a3a46',
        'target-arrow-shape': 'none',
      },
    },
    {
      selector: 'edge.e-marriage',
      style: {
        'curve-style': 'straight',
        'line-color': '#3a3a46',
        'width': 1.2,
        'line-style': 'solid',
      },
    },
    {
      selector: 'edge.uncertain',
      style: {
        'line-style': 'dashed',
        'line-dash-pattern': [5, 5],
        'line-color': '#2e2e38',
      },
    },
  ];

  if (window.cytoscapeDagre) cytoscape.use(window.cytoscapeDagre);

  const cy = cytoscape({
    container: document.getElementById('tree'),
    elements,
    style,
    minZoom: 0.25,
    maxZoom: 2.2,
    wheelSensitivity: 0.25,
    layout: {
      name: 'dagre',
      rankDir: 'TB',
      nodeSep: 36,
      rankSep: 110,
      edgeSep: 12,
      ranker: 'tight-tree',
    },
  });
  window.cy = cy;

  // ————— HTML-карточки для узлов-персон —————

  if (cy.nodeHtmlLabel) {
    cy.nodeHtmlLabel([
      {
        query: 'node.person',
        valign: 'center',
        halign: 'center',
        valignBox: 'center',
        halignBox: 'center',
        tpl: (d) => renderCard(d),
      },
    ]);
  }

  function renderCard(d) {
    const classes = [
      'node-card',
      `line-${d.line}`,
      d.certain ? '' : 'uncertain',
      d.id === 'vladlena' ? 'you' : '',
    ].filter(Boolean).join(' ');

    const name = escapeHtml(d.label);
    const dates = escapeHtml(d.dates);
    const prof = escapeHtml(d.profession);

    return `
      <div class="${classes}" data-id="${d.id}">
        <div class="line-bar"></div>
        <div class="body">
          <div class="name">${name}</div>
          ${dates ? `<div class="dates">${dates}</div>` : ''}
          ${prof ? `<div class="profession">${prof}</div>` : ''}
        </div>
      </div>
    `;
  }

  cy.ready(() => {
    cy.fit(null, 60);
  });

  // ————— Детальная панель —————

  const panel = document.getElementById('panel');
  const panelBody = document.getElementById('panel-body');
  const panelClose = document.getElementById('panel-close');

  function openPanel(d) {
    const info = lineInfo[d.line] || {};
    const rows = [
      ['Полное имя', d.fullName && d.fullName !== '?' ? d.fullName : ''],
      ['Годы жизни', d.dates],
      ['Профессия', d.profession],
      ['Место', d.place],
    ].filter(([, v]) => v);

    const notesHtml = (d.notes || '')
      .split(/\n+/)
      .filter(Boolean)
      .map((p) => `<p>${escapeHtml(p)}</p>`)
      .join('');

    const linksHtml = (d.links || []).length
      ? `<div class="panel-links">
           ${d.links.map((l) => `
             <a href="${escapeAttr(l.url)}" target="_blank" rel="noopener">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
               ${escapeHtml(l.title)}
             </a>
           `).join('')}
         </div>`
      : '';

    panelBody.innerHTML = `
      <div class="panel-line-pill">
        <span class="dot" style="background:${info.color}; box-shadow: 0 0 8px ${info.color}"></span>
        ${escapeHtml(info.label || '')}
      </div>
      <h2>${escapeHtml(d.label)}</h2>
      ${d.fullName && d.fullName !== d.label && d.fullName !== '?' ? `<div class="panel-fullname">${escapeHtml(d.fullName)}</div>` : ''}
      ${d.certain ? '' : `
        <div class="panel-warn">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>
          Данные под вопросом
        </div>`}
      ${rows.length ? `<dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${escapeHtml(v)}</dd>`).join('')}</dl>` : ''}
      ${notesHtml ? `<div class="panel-notes">${notesHtml}</div>` : ''}
      ${linksHtml}
    `;
    panel.classList.add('open');
  }

  function closePanel() {
    panel.classList.remove('open');
    cy.elements().removeClass('faded');
    document.querySelectorAll('.node-card.selected').forEach((el) => el.classList.remove('selected'));
    document.querySelectorAll('.node-card.faded').forEach((el) => el.classList.remove('faded'));
  }

  panelClose.addEventListener('click', closePanel);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
  });

  function selectNode(n) {
    document.querySelectorAll('.node-card.selected').forEach((el) => el.classList.remove('selected'));
    document.querySelectorAll('.node-card').forEach((el) => el.classList.add('faded'));

    const relatives = n.closedNeighborhood().union(n.predecessors()).union(n.successors());
    relatives.forEach((el) => {
      if (el.isNode() && el.hasClass('person')) {
        const card = document.querySelector(`.node-card[data-id="${el.id()}"]`);
        if (card) card.classList.remove('faded');
      }
    });

    const myCard = document.querySelector(`.node-card[data-id="${n.id()}"]`);
    if (myCard) {
      myCard.classList.remove('faded');
      myCard.classList.add('selected');
    }

    openPanel(n.data());
  }

  cy.on('tap', 'node.person', (evt) => selectNode(evt.target));

  cy.on('tap', (evt) => {
    if (evt.target === cy) closePanel();
  });

  // ————— Контролы: зум, fit, ко мне —————

  document.getElementById('zoom-in').addEventListener('click', () => {
    cy.animate({ zoom: Math.min(cy.maxZoom(), cy.zoom() * 1.25), duration: 160 });
  });
  document.getElementById('zoom-out').addEventListener('click', () => {
    cy.animate({ zoom: Math.max(cy.minZoom(), cy.zoom() / 1.25), duration: 160 });
  });
  document.getElementById('zoom-fit').addEventListener('click', () => {
    cy.animate({ fit: { padding: 60 }, duration: 400 });
  });
  document.getElementById('focus-me').addEventListener('click', () => {
    const me = cy.$('#vladlena');
    if (me.length) {
      cy.animate({ center: { eles: me }, zoom: 1, duration: 500 });
      selectNode(me);
    }
  });

  // ————— Поиск —————

  const searchInput = document.getElementById('search');
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();

    document.querySelectorAll('.node-card.faded').forEach((el) => el.classList.remove('faded'));
    document.querySelectorAll('.node-card.selected').forEach((el) => el.classList.remove('selected'));
    if (!q) return;

    const matches = cy.nodes('.person').filter((n) => {
      const d = n.data();
      return (
        (d.label || '').toLowerCase().includes(q) ||
        (d.fullName || '').toLowerCase().includes(q) ||
        (d.profession || '').toLowerCase().includes(q) ||
        (d.place || '').toLowerCase().includes(q) ||
        (d.notes || '').toLowerCase().includes(q)
      );
    });

    if (matches.length === 0) return;

    document.querySelectorAll('.node-card').forEach((el) => el.classList.add('faded'));
    matches.forEach((n) => {
      const card = document.querySelector(`.node-card[data-id="${n.id()}"]`);
      if (card) {
        card.classList.remove('faded');
        card.classList.add('selected');
      }
    });
    cy.animate({ fit: { eles: matches, padding: 100 }, duration: 450 });
  });

  // ————— Легенда с подсчётом и фильтрами —————

  const legendEl = document.getElementById('legend');
  const hiddenLines = new Set();
  const lineCounts = {};
  people.forEach((p) => { lineCounts[p.line] = (lineCounts[p.line] || 0) + 1; });

  Object.entries(lineInfo).forEach(([key, info]) => {
    if (!lineCounts[key]) return;
    const btn = document.createElement('button');
    btn.className = 'legend-item';
    btn.dataset.line = key;
    btn.innerHTML = `
      <span class="dot" style="background:${info.color}; color:${info.color}"></span>
      <span>${info.label}</span>
      <span class="count">${lineCounts[key]}</span>
    `;
    btn.addEventListener('click', () => {
      if (hiddenLines.has(key)) { hiddenLines.delete(key); btn.classList.remove('off'); }
      else { hiddenLines.add(key); btn.classList.add('off'); }
      applyFilters();
    });
    legendEl.appendChild(btn);
  });

  // ————— Toggle «только подтверждённое» —————

  const certainOnly = document.getElementById('certain-only');
  const certainToggleWrap = document.getElementById('certain-toggle');
  certainToggleWrap.addEventListener('click', () => {
    certainOnly.checked = !certainOnly.checked;
    certainToggleWrap.classList.toggle('on', certainOnly.checked);
    applyFilters();
  });

  function applyFilters() {
    const onlyCertain = certainOnly.checked;
    cy.nodes('.person').forEach((n) => {
      const hidden = hiddenLines.has(n.data('line')) || (onlyCertain && !n.data('certain'));
      n.style('display', hidden ? 'none' : 'element');
    });
    cy.nodes('.union').forEach((u) => {
      const connected = u.connectedEdges().sources().union(u.connectedEdges().targets()).not(u);
      const allHidden = connected.every((n) => n.style('display') === 'none');
      u.style('display', allHidden ? 'none' : 'element');
    });
  }

  // ————— утилиты —————

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function escapeAttr(s) { return escapeHtml(s); }
})();
