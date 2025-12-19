// ========================
// Constants / Utils
// ========================
const STORAGE_KEY = "hyeonse-calendar-events-v1";

const pad2 = (n) => String(n).padStart(2, "0");
const keyOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[ch]));
}

function loadEvents() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function saveEvents(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// category -> CSS class
const EVENT_CLASS = {
  "시험": "event-exam",
  "과제": "event-task",
  "알바": "event-alba",
  "생일": "event-birthday",
  "일상": "event-daily",
  "여행": "event-trip",
};

// overlay helper (너 modal이 is-open으로 열리니 그 방식 유지)
function openOverlay(overlay) {
  if (!overlay) return;
  overlay.classList.add("is-open");
  overlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}
function closeOverlay(overlay) {
  if (!overlay) return;
  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

// ========================
// ViewMode Dropdown
// ========================
function setupViewModeDropdown() {
  const wrap = document.querySelector("[data-viewmode]");
  if (!wrap) return;

  const btn = wrap.querySelector("[data-vm-btn]");
  const menu = wrap.querySelector("[data-vm-menu]");
  if (!btn || !menu) return;

  const open = () => {
    menu.classList.add("open");
    btn.setAttribute("aria-expanded", "true");
  };
  const close = () => {
    menu.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
  };
  const toggle = () => (menu.classList.contains("open") ? close() : open());

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggle();
  });

  menu.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-href]");
    if (!b) return;
    const href = b.getAttribute("data-href");
    if (href) window.location.href = href;
  });

  document.addEventListener("click", () => close());
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
}

// ========================
// Month Grid Render
// ========================
const monthState = {
  cursor: new Date(), // 지금은 "이번 달" 고정. 필요하면 prev/next 붙일 때 이걸로 이동시키면 됨.
};

function addEventBadge(cell, ev) {
  const el = document.createElement("div");
  el.className = `calendar-event ${EVENT_CLASS[ev.category] || "event-daily"}`;
  el.textContent = ev.title;

  // ✅ 클릭해서 상세보기 위해 id 심기
  el.dataset.eventId = ev.id;
  el.classList.add("event-card"); // ✅ 클릭 셀렉터용(가급적 CSS 영향 없게 클래스만 추가)

  cell.appendChild(el);

  // ✅ D-day 표시(원하면 전용 클래스/디자인으로 변경 가능)
  if (ev.isDday) {
    const dday = document.createElement("div");
    dday.className = "calendar-event event-daily";
    dday.textContent = "D-day";
    dday.dataset.eventId = ev.id; // D-day 눌러도 상세 열리게
    dday.classList.add("event-card");
    cell.appendChild(dday);
  }
}

function renderMonthGrid() {
  const grid = document.querySelector("[data-month-grid]");
  const title = document.querySelector("[data-month-title]");
  if (!grid || !title) return;

  const cur = new Date(monthState.cursor);
  const y = cur.getFullYear();
  const m = cur.getMonth(); // 0~11
  title.textContent = `${y}년 ${m + 1}월`;

  const first = new Date(y, m, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay()); // 일요일 시작

  // 날짜별 이벤트 그룹핑
  const eventsByDay = {}; // key -> [ev,...]

  // (샘플) 필요 없으면 제거해도 됨
  const sample = (yy, mm, dd, arr) => {
    const k = `${yy}-${pad2(mm)}-${pad2(dd)}`;
    eventsByDay[k] = arr;
  };

  // ✅ 샘플 (원하면 삭제)
  sample(y, m + 1, 4,  [{ id:"sample-1", category:"알바", title:"알바", memo:"", isDday:false }]);
  sample(y, m + 1, 11, [{ id:"sample-2", category:"알바", title:"알바", memo:"", isDday:false }]);
  sample(y, m + 1, 18, [{ id:"sample-3", category:"알바", title:"알바", memo:"", isDday:false }]);
  sample(y, m + 1, 24, [{ id:"sample-4", category:"과제", title:"웹프 보고서...", memo:"", isDday:false }]);
  sample(y, m + 1, 27, [{ id:"sample-5", category:"과제", title:"교양 조별 발표", memo:"", isDday:false }]);
  sample(y, m + 1, 19, [{ id:"sample-6", category:"생일", title:"서윤이 생일", memo:"", isDday:false }]);

  // localStorage 이벤트 주입
  const saved = loadEvents();
  for (const ev of saved) {
    if (!ev?.date || !ev?.title) continue;
    const d = new Date(ev.date);
    if (Number.isNaN(d.getTime())) continue;
    if (d.getFullYear() !== y || d.getMonth() !== m) continue;

    const k = keyOf(d);
    (eventsByDay[k] ||= []).push({
      id: ev.id,
      title: ev.title,
      date: ev.date,
      category: ev.category || "일상",
      memo: ev.memo || "",
      isDday: !!ev.isDday,
    });
  }

  // 렌더
  grid.innerHTML = "";
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const isOther = d.getMonth() !== m;

    const cell = document.createElement("div");
    cell.className = "cell" + (isOther ? " other" : "");

    const num = document.createElement("div");
    num.className = "daynum" + (isOther ? " muted" : "");
    num.textContent = d.getDate();
    cell.appendChild(num);

    const k = keyOf(d);
    (eventsByDay[k] || []).forEach((ev) => addEventBadge(cell, ev));

    grid.appendChild(cell);
  }
}

// ========================
// Detail Modal (view / edit / delete)
// ========================
const detailState = {
  selectedId: null,
};

function setupDetailModal() {
  const detailModal = document.getElementById("detailModal");
  if (!detailModal) return; // month.html에 추가 안 했으면 그냥 스킵

  const closeX = document.getElementById("closeDetailModal");
  const closeBtn = document.getElementById("detailCloseBtn");
  const editBtn = document.getElementById("detailEditBtn");
  const delBtn = document.getElementById("detailDeleteBtn");

  const titleEl = document.getElementById("detailTitle");
  const metaEl = document.getElementById("detailMeta");
  const memoEl = document.getElementById("detailMemo");

  function openDetailById(id) {
    const ev = loadEvents().find(x => x.id === id) || null;

    // 샘플 클릭 시: localStorage에 없어서 ev가 null일 수 있음 → 샘플은 상세보기 비활성 처리
    if (!ev) {
      // 샘플도 상세를 원하면, 샘플을 localStorage에 넣거나 별도 저장 구조로 바꿔야 함.
      return;
    }

    detailState.selectedId = id;

    titleEl.textContent = ev.title;
    metaEl.textContent = `${ev.date} · ${ev.category}${ev.isDday ? " · D-day" : ""}`;
    memoEl.textContent = ev.memo || "";

    openOverlay(detailModal);
  }

  // ✅ Month 이벤트(카드/라벨) 클릭 → 상세 오픈 (위임)
  document.addEventListener("click", (e) => {
    const card = e.target.closest(".event-card[data-event-id]");
    if (!card) return;

    const id = card.dataset.eventId;
    if (!id) return;

    openDetailById(id);
  });

  function closeDetail() {
    closeOverlay(detailModal);
  }

  closeX?.addEventListener("click", closeDetail);
  closeBtn?.addEventListener("click", closeDetail);

  // 삭제
  delBtn?.addEventListener("click", () => {
    const id = detailState.selectedId;
    if (!id) return;

    const next = loadEvents().filter(x => x.id !== id);
    saveEvents(next);

    closeDetail();
    renderMonthGrid();
  });

  // 수정: addModal을 편집 모드로 열기
  editBtn?.addEventListener("click", () => {
    const id = detailState.selectedId;
    if (!id) return;

    const ev = loadEvents().find(x => x.id === id);
    if (!ev) return;

    closeDetail();
    openAddModalForEdit(ev); // 아래 setupAddModal에서 제공
  });
}

// ========================
// Add Modal (create + edit reuse)
// ========================
let openAddModalForEdit = null; // setupAddModal에서 할당

function setupAddModal() {
  const openBtn = document.getElementById("openAddModal");
  const overlay = document.getElementById("addModal");
  const closeBtn = document.getElementById("closeAddModal");
  const cancelBtn = document.getElementById("cancelAdd");
  const form = document.getElementById("addForm");

  const titleInput = document.getElementById("todoTitle");
  const dateInput = document.getElementById("todoDate");
  const memoInput = document.getElementById("todoMemo");
  const catHidden = document.getElementById("todoCategory");
  const catGrid = document.getElementById("catGrid");
  const toggleDday = document.getElementById("toggleDday");
  const modalTitle = document.getElementById("addModalTitle");

  if (!openBtn || !overlay) return;

  const CLOSE_ON_BACKDROP = false;

  let selectedCat = "시험";
  let isDday = false;
  let editingId = null; // ✅ 편집 모드일 때만 값 있음

  function setCategory(cat) {
    selectedCat = cat;
    if (catHidden) catHidden.value = cat;
    if (!catGrid) return;

    catGrid.querySelectorAll(".modal-cat").forEach((b) => {
      b.classList.toggle("is-selected", b.dataset.cat === cat);
    });
  }

  function setDday(on) {
    isDday = !!on;
    toggleDday?.classList.toggle("is-on", isDday);
  }

  function resetFormToCreate() {
    editingId = null;
    modalTitle && (modalTitle.textContent = "새로운 일정 추가");

    if (titleInput) titleInput.value = "";
    if (memoInput) memoInput.value = "";
    if (dateInput) dateInput.value = "";

    setCategory("시험");
    setDday(false);
  }

  function openCreate() {
    resetFormToCreate();
    openOverlay(overlay);
    titleInput?.focus();
  }

  // ✅ 외부에서 "편집 모드로 열기" 호출할 수 있도록 제공
  openAddModalForEdit = function(ev) {
    editingId = ev.id;
    modalTitle && (modalTitle.textContent = "일정 수정");

    if (titleInput) titleInput.value = ev.title || "";
    if (memoInput) memoInput.value = ev.memo || "";
    if (dateInput) dateInput.value = ev.date || "";

    setCategory(ev.category || "시험");
    setDday(!!ev.isDday);

    openOverlay(overlay);
    titleInput?.focus();
  };

  function close() {
    closeOverlay(overlay);
    openBtn.focus();
  }

  openBtn.addEventListener("click", openCreate);
  closeBtn?.addEventListener("click", close);
  cancelBtn?.addEventListener("click", close);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay && CLOSE_ON_BACKDROP) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("is-open")) close();
  });

  catGrid?.addEventListener("click", (e) => {
    const btn = e.target.closest(".modal-cat");
    if (!btn) return;
    setCategory(btn.dataset.cat);
  });

  toggleDday?.addEventListener("click", () => {
    setDday(!isDday);
  });

  // 저장(create or update)
  form?.addEventListener("submit", (e) => {
    e.preventDefault();

    const title = (titleInput?.value || "").trim();
    const date = (dateInput?.value || "").trim();
    const memo = (memoInput?.value || "").trim();

    if (!title) {
      alert("제목을 입력해주세요.");
      titleInput?.focus();
      return;
    }
    if (!date) {
      alert("날짜를 선택해주세요.");
      dateInput?.focus();
      return;
    }

    const list = loadEvents();

    if (editingId) {
      const idx = list.findIndex(x => x.id === editingId);
      if (idx !== -1) {
        list[idx] = {
          ...list[idx],
          title,
          date,
          category: selectedCat,
          memo,
          isDday,
        };
      }
    } else {
      list.push({
        id: String(Date.now() + Math.random()),
        title,
        date,
        category: selectedCat,
        memo,
        isDday,
      });
    }

    saveEvents(list);
    close();
    renderMonthGrid();
  });
}

// ========================
// Mini Calendar (Dashboard)
// ========================
function renderMiniCalendar({ year, monthIndex, mountId, labelId }) {
  const grid = document.getElementById(mountId);
  const label = document.getElementById(labelId);
  if (!grid) return;

  const today = new Date();
  const y = year ?? today.getFullYear();
  const m = (monthIndex ?? 11);

  if (label) label.textContent = `${m + 1}월`;

  const first = new Date(y, m, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  grid.innerHTML = "";

  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);

    const isOtherMonth = d.getMonth() !== m;
    const isToday =
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate() &&
      !isOtherMonth;

    const cell = document.createElement("div");
    cell.className = "mini-cal__day" + (isOtherMonth ? " is-muted" : "") + (isToday ? " is-today" : "");

    const span = document.createElement("span");
    span.textContent = d.getDate();
    cell.appendChild(span);

    grid.appendChild(cell);
  }
}

// ========================
// Year View (safe)
// ========================
function setupYearView() {
  const grid = document.getElementById("yearGrid");
  const titleEl = document.getElementById("yearTitle");
  if (!grid || !titleEl) return;

  const btnPrev = document.getElementById("yearPrev");
  const btnNext = document.getElementById("yearNext");
  const btnToday = document.getElementById("yearToday");

  let currentYear = new Date().getFullYear();

  function monthBlock(year, monthIndex) {
    const wrap = document.createElement("section");
    wrap.className = "year-month";

    const h = document.createElement("h3");
    h.className = "year-month__title";
    h.textContent = `${monthIndex + 1}월`;
    wrap.appendChild(h);

    const dow = document.createElement("div");
    dow.className = "year-month__dow";
    dow.innerHTML = `
      <span class="sun">일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span class="sat">토</span>
    `;
    wrap.appendChild(dow);

    const days = document.createElement("div");
    days.className = "year-month__days";
    wrap.appendChild(days);

    const first = new Date(year, monthIndex, 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());

    const today = new Date();
    const ty = today.getFullYear();
    const tm = today.getMonth();
    const td = today.getDate();

    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);

      const el = document.createElement("div");
      el.className = "year-day";
      el.textContent = d.getDate();

      if (d.getMonth() !== monthIndex) el.classList.add("is-other");
      if (d.getFullYear() === ty && d.getMonth() === tm && d.getDate() === td) el.classList.add("is-today");

      days.appendChild(el);
    }

    return wrap;
  }

  function render(year) {
    currentYear = year;
    titleEl.textContent = `${year}년`;
    grid.innerHTML = "";
    for (let m = 0; m < 12; m++) grid.appendChild(monthBlock(year, m));
  }

  btnPrev?.addEventListener("click", () => render(currentYear - 1));
  btnNext?.addEventListener("click", () => render(currentYear + 1));
  btnToday?.addEventListener("click", () => render(new Date().getFullYear()));

  render(currentYear);
}

// ========================
// Week View
// ========================
function startOfWeekSunday(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  return x;
}

function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function renderWeekView() {
  const grid = document.getElementById("weekGrid");
  if (!grid) return;

  if (!window.__weekStart) {
    window.__weekStart = startOfWeekSunday(new Date());
  }
  const weekStart = new Date(window.__weekStart);

  const titleEl = document.querySelector("[data-year-title]");
  if (titleEl) {
    titleEl.textContent = `${weekStart.getFullYear()}년 ${weekStart.getMonth() + 1}월`;
  }

  grid.innerHTML = "";

  // header row
  const empty = document.createElement("div");
  empty.className = "week-cell";
  empty.style.background = "#fff";
  grid.appendChild(empty);

  const dows = ["일", "월", "화", "수", "목", "금", "토"];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);

    const head = document.createElement("div");
    head.className = "week-cell week-head" + (i === 0 ? " sun" : i === 6 ? " sat" : "");
    head.innerHTML = `<div class="dow">${dows[i]}</div><div class="date">${d.getDate()}</div>`;
    grid.appendChild(head);
  }

  const times = ["09:00", "12:00", "15:00", "18:00", "21:00", "24:00"];
  const saved = loadEvents();

  for (let r = 0; r < times.length; r++) {
    const t = document.createElement("div");
    t.className = "week-cell week-time";
    t.innerHTML = `<div class="t1">${times[r]}</div><div class="t2">AM</div>`;
    grid.appendChild(t);

    for (let c = 0; c < 7; c++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + c);
      const key = ymd(day);

      const cell = document.createElement("div");
      cell.className = "week-cell";

      const slotEvents = saved.filter(ev => {
        if (!ev?.date || !ev?.title) return false;
        const k = ymd(new Date(ev.date));
        if (k !== key) return false;

        if (!ev.time) return r === 0;     // time 없으면 첫 행에만
        return ev.time === times[r];
      });

      slotEvents.forEach(ev => {
        const cls = EVENT_CLASS[ev.category] || "event-daily";
        const el = document.createElement("div");
        el.className = `week-event ${cls}`;
        el.textContent = ev.title;
        cell.appendChild(el);
      });

      grid.appendChild(cell);
    }
  }
}

function setupWeekNavButtons() {
  // week.html에서도 id가 yearPrev/yearNext/yearToday라 했으니 그대로 사용
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    if (btn.id === "yearPrev") {
      window.__weekStart = startOfWeekSunday(window.__weekStart || new Date());
      window.__weekStart.setDate(window.__weekStart.getDate() - 7);
      renderWeekView();
    }

    if (btn.id === "yearNext") {
      window.__weekStart = startOfWeekSunday(window.__weekStart || new Date());
      window.__weekStart.setDate(window.__weekStart.getDate() + 7);
      renderWeekView();
    }

    if (btn.id === "yearToday") {
      window.__weekStart = startOfWeekSunday(new Date());
      renderWeekView();
    }
  });
}

// ========================
// Boot
// ========================
document.addEventListener("DOMContentLoaded", () => {
  setupViewModeDropdown();
  setupAddModal();
  setupDetailModal();

  // 각 페이지에 해당 요소가 있을 때만 동작
  renderMonthGrid();

  try { setupYearView(); } catch (e) { console.error("YearView crashed:", e); }
  setupWeekNavButtons();
  renderWeekView();

  // dashboard mini calendar (있을 때만 렌더)
  renderMiniCalendar({
    year: new Date().getFullYear(),
    monthIndex: 11,
    mountId: "miniCalGrid",
    labelId: "miniCalMonthLabel",
  });
});
