"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  Coffee,
  Heart,
  Home,
  ImagePlus,
  Leaf,
  LoaderCircle,
  LockKeyhole,
  MessageCircleHeart,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  Utensils,
  X,
} from "lucide-react";
import { Scene } from "@/components/scene";
import { RitualFlow } from "@/components/ritual-flow";
import {
  clock,
  normalizeFamilyState,
  seed,
  sharedWindows,
  stateSchema,
  transition,
  type Action,
  type Member,
  type State,
} from "@/lib/domain";

type Tab = "home" | "family" | "care" | "ritual" | "memories";
type View = Tab | "suggestion" | "ritual-detail" | "ritual-repeat";
const nav: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Hôm nay", icon: Home },
  { id: "family", label: "Gia đình", icon: Users },
  { id: "care", label: "Quan tâm", icon: Heart },
  { id: "ritual", label: "Nhịp nhà", icon: CalendarDays },
  { id: "memories", label: "Kỷ niệm", icon: ImagePlus },
];
const storageKey = "heartbridge-demo-v1";
function Avatar({
  member,
  small = false,
}: {
  member: Member;
  small?: boolean;
}) {
  return (
    <span
      className={`avatar ${member.color} ${small ? "small" : ""}`}
      title={member.name}
    >
      {member.initials}
    </span>
  );
}
function Faces({ members }: { members: Member[] }) {
  return (
    <div className="faces">
      {members.map((m) => (
        <Avatar key={m.id} member={m} small />
      ))}
    </div>
  );
}
function Label({ children }: { children: ReactNode }) {
  return <div className="eyebrow">{children}</div>;
}

export default function Page() {
  const [state, setState] = useState<State>(seed);
  const [view, setView] = useState<View>("home");
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"mock" | "mongo">("mock");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const loadStarted = useRef(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [settings, setSettings] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState("19:30");
  const [end, setEnd] = useState("20:15");
  const [sharing, setSharing] = useState(true);
  const [note, setNote] = useState("");
  const [art, setArt] = useState<"dinner" | "dalat" | "breakfast">("dinner");
  const [adding, setAdding] = useState(false);
  const window = sharedWindows(state.members)[0];
  const windowHeading = !state.members[3].share
    ? "Minh đang không chia sẻ lịch rảnh"
    : "Hôm nay chưa có khoảng thời gian cả nhà cùng rảnh";
  const windowHint = !state.members[3].share
    ? "HeartBridge cần thời gian rảnh được chia sẻ để tìm Family Window."
    : "Thử điều chỉnh thời gian của Minh hoặc chọn một ngày khác.";
  const moment = state.moments[0];
  const memory = state.memories.find((m) => m.sourceId === moment?.id);
  const active: Tab =
    view.startsWith("ritual") || view === "suggestion"
      ? "ritual"
      : (view as Tab);

  async function load() {
    setError("");
    try {
      const response = await fetch("/api/demo", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMode(data.mode);
      let initial = data.state as State;
      if (data.mode === "mock") {
        try {
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            const candidate = stateSchema.safeParse(JSON.parse(stored));
            if (candidate.success) initial = candidate.data;
          }
        } catch {
          /* A fresh demo remains usable if storage is unavailable. */
        }
      }
      setState(normalizeFamilyState(initial));
      setReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chưa tải được dữ liệu.");
    }
  }
  useEffect(() => {
    if (!loadStarted.current) {
      loadStarted.current = true;
      void load();
    }
  }, []);
  useEffect(() => {
    if (mode !== "mock") return;
    const sync = (event: StorageEvent) => {
      if (event.key !== storageKey || !event.newValue) return;
      try {
        const parsed = stateSchema.safeParse(JSON.parse(event.newValue));
        if (parsed.success) setState(normalizeFamilyState(parsed.data));
      } catch {
        /* Ignore invalid state from other tabs. */
      }
    };
    globalThis.window.addEventListener("storage", sync);
    return () => globalThis.window.removeEventListener("storage", sync);
  }, [mode]);
  useEffect(() => {
    const syncView = () => {
      const hash = globalThis.window.location.hash.slice(1);
      if (
        [
          "home",
          "family",
          "care",
          "ritual",
          "memories",
          "suggestion",
          "ritual-detail",
          "ritual-repeat",
        ].includes(hash)
      )
        setView(hash as View);
      else setView("home");
    };
    syncView();
    globalThis.window.addEventListener("popstate", syncView);
    return () => globalThis.window.removeEventListener("popstate", syncView);
  }, []);
  useEffect(() => {
    if (!settings && !editing) return;
    const previous = document.activeElement as HTMLElement;
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (inFlight.current) return;
        setEditing(false);
        setSettings(false);
        setConfirmReset(false);
      }
      if (event.key === "Tab") {
        const focusable = document
          .querySelector('[role="dialog"]')
          ?.querySelectorAll<HTMLElement>(
            "button:not(:disabled), input, textarea, a[href]",
          );
        if (!focusable?.length) return;
        const first = focusable[0],
          last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", keydown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, [settings, editing]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    document.title = `${nav.find((n) => n.id === active)?.label} · HeartBridge`;
    windowScroll();
  }, [view, active]);
  function windowScroll() {
    globalThis.window?.scrollTo({ top: 0, behavior: "instant" });
  }
  function go(next: View) {
    globalThis.window.history.pushState(null, "", `#${next}`);
    setView(next);
    setError("");
    setAdding(false);
  }
  async function act(action: Action, message: string): Promise<boolean> {
    if (inFlight.current || !ready) return false;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      let next: State;
      if (mode === "mongo") {
        const response = await fetch("/api/demo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, revision: state.revision }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        next = result.state;
      } else {
        next = transition(state, action);
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          throw new Error(
            "Bộ nhớ thiết bị không khả dụng. Hãy cho phép lưu dữ liệu hoặc thử trình duyệt khác.",
          );
        }
      }
      setState(next);
      setToast(message);
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Chưa lưu được, bạn thử lại nhé.",
      );
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  const button = (
    text: string,
    onClick: () => void,
    secondary = false,
    icon = true,
  ) => (
    <button
      className={secondary ? "button secondary" : "button"}
      onClick={onClick}
      disabled={busy || !ready}
    >
      {busy ? <LoaderCircle size={18} className="spin" /> : null}
      {text}
      {icon && !busy ? <ArrowRight size={17} /> : null}
    </button>
  );
  const back = (target: View) => (
    <button className="back" onClick={() => go(target)}>
      <ArrowLeft size={17} /> Quay lại
    </button>
  );
  const ritualFlow = (variant: "prompt" | "home" | "list" | "detail") => (
    <RitualFlow state={state} busy={busy} variant={variant} act={act}
      onOpen={() => go("ritual-repeat")} onMemories={() => go("memories")} />
  );
  const careLabels = [
    "Đang cần giúp",
    "Minh đã nhận giúp",
    "Đã lấy thuốc",
    "Đã mang về cho bà",
  ];
  const careStep = ["open", "accepted", "picked-up", "delivered"].indexOf(
    state.care.status,
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="HeartBridge trang chủ">
          <img src="/icon.svg" alt="" />
          HeartBridge<span>NHỊP NHÀ MÌNH</span>
        </a>
        <div className="family-switch">
          <div className="family-emblem">
            <Users size={22} />
          </div>
          <div>
            <strong>Nhà mình</strong>
            <span>Gia đình Nguyễn · 4 thành viên</span>
          </div>
        </div>
        <nav aria-label="Điều hướng chính">
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              aria-current={active === id ? "page" : undefined}
              className={active === id ? "nav-item active" : "nav-item"}
              onClick={() => go(id)}
            >
              <Icon size={20} />
              {label}
              {id === "care" && careStep === 0 && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <Leaf size={23} />
          <p>
            Những điều nhỏ bé.
            <br />
            Gắn kết thật lâu.
          </p>
          <span>Mỗi ngày, gần nhau hơn một chút.</span>
        </div>
        <button className="account" onClick={() => setSettings(true)}>
          <Avatar member={state.members[3]} />
          <span>
            <strong>Nguyễn Minh</strong>
            <small>Không gian gia đình</small>
          </span>
          <Settings size={18} />
        </button>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <div className="mobile-brand">
            <img src="/icon.svg" alt="" />
            HeartBridge
          </div>
          <span className="breadcrumb">
            Nhà mình <ChevronRight size={13} />{" "}
            {nav.find((n) => n.id === active)?.label}
          </span>
          <div className="topbar-right">
            <span className="demo-badge">Trải nghiệm mẫu</span>
            <span className="top-date">Thứ Sáu, 25 tháng 9</span>
            <button
              className="icon-button"
              aria-label="Cài đặt"
              onClick={() => setSettings(true)}
            >
              <Settings size={19} />
            </button>
          </div>
        </header>
        <main key={view} id="main-content" aria-busy={busy}>
          {error && !editing && (
            <div className="error" role="alert">
              {error}
              {!ready && <button onClick={() => void load()}>Thử lại</button>}
            </div>
          )}
          {!ready ? (
            <div className="loading">
              <LoaderCircle className="spin" /> Đang mở cửa nhà mình…
            </div>
          ) : (
            <>
              {view === "home" && (
                <>
                  <div className="page-heading">
                    <div>
                      <Label>
                        <Sun size={15} /> THỨ SÁU, 25 THÁNG 9
                      </Label>
                      <h1>
                        Chào Minh, <span>về nhà thôi.</span>
                      </h1>
                      <p>
                        Giữa những ngày bận rộn, luôn có thời gian cho nhau.
                      </p>
                    </div>
                    <div className="private-tag">
                      <LockKeyhole size={13} /> Chỉ gia đình mình
                    </div>
                  </div>
                  <div className="status-strip">
                    {state.members.map((m) => (
                      <div className="member-status" key={m.id}>
                        <Avatar member={m} />
                        <div>
                          <strong>{m.name}</strong>
                          <span>
                            <i className={m.id === "lan" ? "online" : ""} />
                            {!m.share
                              ? "Chưa chia sẻ"
                              : m.id === "lan"
                                ? "Rảnh từ 18:00"
                                : `Rảnh từ ${clock(m.available[m.available.length - 1][0])}`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="home-grid">
                    <section className="window-card">
                      <div className="window-copy">
                        <Label>
                          <Sparkles size={15} /> KHOẢNG RẢNH CHUNG
                        </Label>
                        <h2>
                          {moment ? (
                            "Một buổi tối đã có hẹn."
                          ) : window ? (
                            <>
                              Tối nay,
                              <br />
                              cả nhà cùng rảnh.
                            </>
                          ) : (
                            "Mỗi người một nhịp."
                          )}
                        </h2>
                        <p>
                          {moment
                            ? "Nhà mình đã dành một khoảng thời gian cho nhau."
                            : window
                              ? "Gác lại một chút bận rộn. Dành một chút cho nhà mình."
                              : "Chia sẻ giờ rảnh để tìm một khoảnh khắc phù hợp."}
                        </p>
                        {(window || moment) && (
                          <div className="window-time">
                            <Clock3 size={20} />
                            <strong>
                              {clock(moment?.start ?? window[0])}
                              <span>—</span>
                              {clock(moment?.end ?? window[1])}
                            </strong>
                            <span className="duration">
                              {(moment?.end ?? window[1]) -
                                (moment?.start ?? window[0])}{" "}
                              phút bên nhau
                            </span>
                          </div>
                        )}
                        <div className="together">
                          <Faces members={state.members} />
                          <span>
                            {window || moment
                              ? "Đủ 4 thành viên"
                              : "Chờ nhịp chung của cả nhà"}
                          </span>
                        </div>
                        {button(
                          moment
                            ? "Xem buổi hẹn nhà mình"
                            : "Tìm thời gian bên nhau",
                          () => go(moment ? "ritual-detail" : "family"),
                        )}
                      </div>
                      <div className="hero-illustration">
                        <Scene />
                        <div className="illustration-caption">
                          <Heart size={13} /> Nhà là nơi ta dành thời gian cho
                          nhau.
                        </div>
                      </div>
                    </section>
                    <section className="care-home card">
                      <div className="section-title">
                        <span className="icon-tile rose-tile">
                          <Heart size={20} />
                        </span>
                        <Label>MỘT CHÚT QUAN TÂM</Label>
                      </div>
                      <h3>
                        {careStep === 3
                          ? "Bà đã nhận thuốc rồi."
                          : "Chiều nay, giúp bà nhé?"}
                      </h3>
                      <p>
                        {careStep === 3
                          ? "Một việc nhỏ, một ngày nhẹ lòng hơn."
                          : "Bà cần lấy thuốc tại nhà thuốc quen trước 18:30."}
                      </p>
                      <div className="care-person">
                        <Avatar member={state.members[0]} />
                        <div>
                          <strong>Bà Lan</strong>
                          <span>
                            {careStep === 0
                              ? "Đang cần một bàn tay"
                              : careLabels[careStep]}
                          </span>
                        </div>
                        <span className="tiny-heart">♡</span>
                      </div>
                      <div className="soft-note">
                        <Clock3 size={15} />
                        {careStep === 3
                          ? "Cảm ơn cháu nhé, Minh!"
                          : "Minh rảnh 17:00–18:30, có thể giúp bà."}
                      </div>
                      {button(
                        careStep === 0
                          ? "Con giúp bà nhé"
                          : "Xem lời nhắn của bà",
                        () => go("care"),
                        true,
                      )}
                    </section>
                  </div>
                  <div className="lower-grid">
                    <section>
                      <div className="section-heading">
                        <h2>Giữ nhịp nhà mình</h2>
                        <button
                          className="text-link"
                          onClick={() => go("ritual")}
                        >
                          Xem tất cả <ArrowRight size={15} />
                        </button>
                      </div>
                      <button
                        className="ritual-preview card"
                        onClick={() => go("ritual")}
                      >
                        <div className="ritual-symbol">
                          <Coffee size={31} />
                        </div>
                        <div>
                          <Label>THÓI QUEN NHỎ · GẮN KẾT LỚN</Label>
                          <h3>Bữa sáng Chủ nhật</h3>
                          <p>Chủ nhật, 27/09 · 08:00 – 09:00</p>
                          <div className="consistency">
                            <span>
                              <Leaf size={14} /> 6 tuần bên nhau
                            </span>
                            <span>7/8 lần gần nhất</span>
                          </div>
                        </div>
                        <ChevronRight size={19} />
                      </button>
                    </section>
                    <section>
                      <div className="section-heading">
                        <h2>Một ngày đáng nhớ</h2>
                        <button
                          className="text-link"
                          onClick={() => go("memories")}
                        >
                          Mở ký ức <ArrowRight size={15} />
                        </button>
                      </div>
                      <button
                        className="memory-preview card"
                        onClick={() => go("memories")}
                      >
                        <div className="memory-thumb">
                          <Scene variant={memory ? "dinner" : "dalat"} />
                        </div>
                        <div>
                          <Label>
                            {memory
                              ? "VỪA ĐƯỢC LƯU"
                              : "NGÀY NÀY, MỘT NĂM TRƯỚC"}
                          </Label>
                          <h3>
                            {memory
                              ? "Bữa tối, chuyện nhà"
                              : "Một chút nắng Đà Lạt"}
                          </h3>
                          <p>
                            {memory
                              ? "Một buổi tối để nhớ."
                              : "Có những chuyến đi cứ nhắc là cười."}
                          </p>
                          <span className="text-link">
                            Cùng xem lại <ArrowRight size={14} />
                          </span>
                        </div>
                      </button>
                    </section>
                  </div>
                  {ritualFlow("home")}
                  <div className="home-footer">
                    <Heart size={13} /> Thời gian bên nhau, kỷ niệm ở lại.
                  </div>
                </>
              )}
              {view === "family" && (
                <>
                  <div className="page-heading">
                    <div>
                      <Label>NHỊP SỐNG GIA ĐÌNH</Label>
                      <h1>
                        Tìm một nhịp <span>chung.</span>
                      </h1>
                      <p>
                        Chỉ cần biết lúc nào rảnh, để dành thời gian cho nhau.
                      </p>
                    </div>
                  </div>
                  <div className="content-grid">
                    <section className="card padded">
                      <div className="section-heading">
                        <h2>Chiều tối hôm nay</h2>
                        <span className="muted">25/09/2026</span>
                      </div>
                      <div className="timeline-head">
                        <span>THÀNH VIÊN</span>
                        <div>
                          {[18, 19, 20, 21, 22].map((h) => (
                            <span key={h}>{h}h</span>
                          ))}
                        </div>
                      </div>
                      {state.members.map((m) => (
                        <div className="timeline-row" key={m.id}>
                          <div>
                            <Avatar member={m} small />
                            <strong>{m.name}</strong>
                          </div>
                          <div
                            className="time-track"
                            role="img"
                            aria-label={`${m.name}: ${
                              m.share
                                ? m.available
                                    .map(
                                      ([s, e]) =>
                                        `${clock(s)} đến ${clock(e)}`,
                                    )
                                    .join(", ")
                                : "Chưa chia sẻ"
                            }`}
                          >
                            {m.share ? (
                              m.available
                                .filter(([s, e]) => e > 1080 && s < 1320)
                                .map(([s, e], i) => (
                                  <span
                                    key={i}
                                    className={`free-block ${m.color}`}
                                    style={{
                                      left: `${((Math.max(s, 1080) - 1080) / 240) * 100}%`,
                                      width: `${((Math.min(e, 1320) - Math.max(s, 1080)) / 240) * 100}%`,
                                    }}
                                  />
                                ))
                            ) : (
                              <span className="not-shared">Chưa chia sẻ</span>
                            )}
                          </div>
                        </div>
                      ))}
                      <div className="legend">
                        <span>
                          <i /> Thời gian rảnh
                        </span>
                        <span>
                          <i /> Bận / chưa có giờ rảnh
                        </span>
                      </div>
                      <div className="privacy-note">
                        <ShieldCheck size={19} />
                        <p>
                          Lịch riêng vẫn là của mỗi người.
                          <br />
                          <span>
                            Chỉ giờ rảnh được chia sẻ. Không có tên sự kiện hay
                            vị trí.
                          </span>
                        </p>
                      </div>
                      <button
                        className="text-link"
                        onClick={() => {
                          const m = state.members[3];
                          setStart(clock(m.available[0][0]));
                          setEnd(clock(m.available[0][1]));
                          setSharing(m.share);
                          setError("");
                          setEditing(!editing);
                        }}
                      >
                        Chỉnh giờ rảnh <ChevronRight size={15} />
                      </button>
                      <p className="caption">Bà, Bố và Mẹ dùng lịch mẫu cố định. Minh có thể chỉnh giờ rảnh; khoảng chung được tính lại khi lưu. Ngày demo: 25/09/2026.</p>
                      {editing && createPortal(
                        <div className="modal-backdrop" onClick={() => { if (!busy) setEditing(false); }}>
                        <section className="modal card padded availability-modal" role="dialog" aria-modal="true" aria-labelledby="availability-title" onClick={(e) => e.stopPropagation()}>
                        <h2 id="availability-title">Chỉnh giờ rảnh của Minh</h2>
                        <p>Hôm nay · 25/09/2026</p>
                        <form
                          className="edit-form"
                          onSubmit={async (e) => {
                            e.preventDefault();
                            const toMinutes = (v: string) =>
                              Number(v.split(":")[0]) * 60 +
                              Number(v.split(":")[1]);
                            if (toMinutes(start) >= toMinutes(end)) {
                              setError("Giờ kết thúc phải sau giờ bắt đầu trong cùng ngày.");
                              return;
                            }
                            if (
                              await act(
                                {
                                  type: "availability",
                                  memberId: "minh",
                                  start: toMinutes(start),
                                  end: toMinutes(end),
                                  share: sharing,
                                },
                                "Đã cập nhật nhịp sống của Minh.",
                              )
                            )
                              setEditing(false);
                          }}
                        >
                          <div className="form-row">
                            <label>
                              Bắt đầu
                              <input
                                type="time"
                                autoFocus
                                disabled={busy}
                                value={start}
                                onChange={(e) => setStart(e.target.value)}
                                required
                              />
                            </label>
                            <label>
                              Kết thúc
                              <input
                                type="time"
                                disabled={busy}
                                value={end}
                                onChange={(e) => setEnd(e.target.value)}
                                required
                              />
                            </label>
                          </div>
                          <label className="checkbox">
                            <input
                              type="checkbox"
                              disabled={busy}
                              checked={sharing}
                              onChange={(e) => setSharing(e.target.checked)}
                            />{" "}
                            Chia sẻ thời gian rảnh với gia đình
                          </label>
                          {error && <p className="error" role="alert">{error}</p>}
                          <div className="form-row">
                            <button type="button" className="button secondary" disabled={busy} onClick={() => { setEditing(false); setError(""); }}>Hủy</button>
                            <button className="button" disabled={busy}>Lưu thay đổi <Check size={17} /></button>
                          </div>
                        </form>
                        </section></div>, document.body)}
                    </section>
                    <section className="card warm padded">
                      <Label>
                        <Sparkles size={16} /> THỜI GIAN BÊN NHAU
                      </Label>
                      {window && <p className="success-text"><Check size={16} /> Cả nhà cùng rảnh</p>}
                      <h2 className={window ? "big-time" : undefined}>
                        {window
                          ? `${clock(window[0])} – ${clock(window[1])}`
                          : windowHeading}
                      </h2>
                      <p>
                        {window
                          ? `${window[1] - window[0]} phút bên nhau`
                          : windowHint}
                      </p>
                      <Faces members={state.members} />
                      <button className="button family-window-cta" disabled={!window || busy || !ready} onClick={() => { if (window) go("suggestion"); }}>
                        Lên kế hoạch cho khoảng thời gian này <ArrowRight size={17} />
                      </button>
                      {moment && (
                        <p className="soft-note">
                          Buổi hẹn đã lên lịch vẫn giữ nguyên. Thay đổi giờ rảnh
                          chỉ cập nhật gợi ý mới.
                        </p>
                      )}
                    </section>
                  </div>
                </>
              )}
              {view === "suggestion" && !window && (
                <>
                  {back("family")}
                  <section className="card warm padded">
                    <Label>FAMILY WINDOW</Label>
                    <h1>{windowHeading}</h1>
                    <p>{windowHint}</p>
                    <button className="button family-window-cta" disabled>Lên lịch bữa tối</button>
                    {button("Xem lại giờ rảnh", () => go("family"), true)}
                    {moment && button("Xem buổi hẹn đã lên lịch", () => go("ritual-detail"), true)}
                  </section>
                </>
              )}
              {view === "suggestion" && window && (
                <>
                  {back("family")}
                  <div className="page-heading">
                    <div>
                      <Label>DÀNH RIÊNG CHO NHÀ MÌNH</Label>
                      <h1>
                        Một bữa cơm. <span>Nhiều câu chuyện.</span>
                      </h1>
                      <p>Một gợi ý nhỏ từ nhịp sống của cả gia đình.</p>
                    </div>
                  </div>
                  <div className="content-grid">
                    <section className="card overflow-hidden">
                      <Scene />
                      <div className="padded">
                        <Label>
                          <Utensils size={15} /> FAMILY MOMENT
                        </Label>
                        <h2>Bữa tối, chuyện nhà</h2>
                        <p>
                          {window
                            ? `${clock(window[0])} – ${clock(Math.min(window[1], window[0] + 45))} · Tối nay`
                            : "Hãy tìm lại giờ rảnh chung trước khi lên lịch."}
                        </p>
                        <div className="soft-note">
                          <ImagePlus size={20} />
                          <span>
                            Sau bữa cơm, cùng mở lại album Đà Lạt một năm trước
                            nhé.
                          </span>
                        </div>
                      </div>
                    </section>
                    <section className="card padded">
                      <h2>Vì sao phù hợp?</h2>
                      <ul className="reasons">
                        <li>
                          <Check />{" "}
                          {window
                            ? "Cả nhà cùng rảnh trong khoảng này."
                            : "Giờ rảnh đã thay đổi, hãy kiểm tra lại."}
                        </li>
                        <li>
                          <Check />{" "}
                          {window && window[0] < 1230
                            ? "Phù hợp với mong muốn ăn trước 20:30 của bà."
                            : "Có thể cần hỏi lại bà về giờ ăn tối."}
                        </li>
                        <li>
                          <Check /> Đã 6 ngày kể từ bữa tối chung gần nhất.
                        </li>
                        <li>
                          <Check /> Hôm nay tròn một năm chuyến đi Đà Lạt.
                        </li>
                      </ul>
                      <p className="muted">
                        Gợi ý dựa trên giờ rảnh, sở thích và kỷ niệm mẫu của gia
                        đình.
                      </p>
                      <Faces members={state.members} />
                      <div className="action-space">
                        {window &&
                          button(
                            moment
                              ? "Xem buổi hẹn đã lên lịch"
                              : "Lên lịch bữa tối",
                            async () => {
                              if (
                                moment ||
                                (await act(
                                  { type: "plan" },
                                  "Đã lên lịch một buổi hẹn cho nhà mình.",
                                ))
                              )
                                go("ritual-detail");
                            },
                          )}
                      </div>
                    </section>
                  </div>
                </>
              )}
              {view === "ritual" && (
                <>
                  <div className="page-heading">
                    <div>
                      <Label>FAMILY RITUALS</Label>
                      <h1>
                        Điều nhỏ bé, <span>thành thân quen.</span>
                      </h1>
                      <p>Những cuộc hẹn giúp gia đình luôn tìm về nhau.</p>
                    </div>
                  </div>
                  {ritualFlow("list")}
                  {ritualFlow("prompt")}
                  <div className="content-grid">
                    <section className="card overflow-hidden">
                      <Scene variant="breakfast" />
                      <div className="padded">
                        <Label>
                          <Leaf size={15} /> 6 TUẦN BÊN NHAU
                        </Label>
                        <h2>Bữa sáng Chủ nhật</h2>
                        <p>Mỗi Chủ nhật · 08:00–09:00</p>
                        <div
                          className="week-dots"
                          role="img"
                          aria-label="7 trên 8 Chủ nhật đã hoàn thành"
                        >
                          {[
                            true,
                            false,
                            true,
                            true,
                            true,
                            true,
                            true,
                            true,
                          ].map((done, i) => (
                            <span key={i} className={done ? "done" : ""}>
                              {done ? <Check size={17} /> : "–"}
                            </span>
                          ))}
                        </div>
                        <p className="muted">
                          7/8 Chủ nhật gần nhất cả nhà đã ngồi lại cùng nhau.
                        </p>
                        <Faces members={state.members} />
                        <div className="soft-note">
                          <CalendarDays size={19} /> Hẹn tiếp: Chủ nhật, 27/09
                          lúc 08:00
                        </div>
                      </div>
                    </section>
                    <section className="card warm padded">
                      <Label>
                        <Sparkles size={15} />{" "}
                        {moment ? "BUỔI HẸN HÔM NAY" : "GỢI Ý CHO HÔM NAY"}
                      </Label>
                      <h2>Bữa tối, chuyện nhà</h2>
                      <p>
                        {moment?.status === "completed"
                          ? "Nhà mình đã có thêm một buổi tối bên nhau."
                          : "Một bữa cơm ấm, một album cũ, vài câu chuyện mới."}
                      </p>
                      <div className="ritual-symbol large">
                        <Utensils size={48} />
                      </div>
                      {!moment && !window ? <>
                        <p>{windowHeading}</p>
                        <button className="button family-window-cta" disabled>Khám phá gợi ý</button>
                        {button("Xem lại giờ rảnh", () => go("family"), true)}
                      </> : button(moment ? "Xem buổi hẹn" : "Khám phá gợi ý", () =>
                        go(moment ? "ritual-detail" : "suggestion"),
                      )}
                    </section>
                  </div>
                </>
              )}
              {view === "ritual-repeat" && <>{back("ritual")}{ritualFlow("detail")}</>}
              {view === "ritual-detail" && (
                <>
                  {back("ritual")}
                  <div className="page-heading">
                    <div>
                      <Label>BUỔI HẸN NHÀ MÌNH</Label>
                      <h1>
                        Bữa tối, <span>chuyện nhà.</span>
                      </h1>
                      <p>
                        {moment?.status === "completed"
                          ? "Một buổi tối bình thường, một kỷ niệm đặc biệt."
                          : "Dành một chỗ ở bàn ăn. Dành một chút thời gian cho nhau."}
                      </p>
                    </div>
                  </div>
                  {!moment ? (
                    <section className="card padded">
                      <h2>Mình chưa có lịch hẹn.</h2>
                      {button("Tìm một hoạt động", () => go("family"))}
                    </section>
                  ) : (
                    <div className="content-grid">
                      <section className="card overflow-hidden">
                        <Scene />
                        <div className="padded">
                          <span className="status-pill">
                            <Check size={14} />
                            {moment.status === "completed"
                              ? "Đã cùng nhau hoàn thành"
                              : "Đã lên lịch"}
                          </span>
                          <h2>
                            {clock(moment.start)} – {clock(moment.end)}
                          </h2>
                          <p>Thứ Sáu, 25/09 · Tại nhà</p>
                          {moment.availabilityChanged && <p className="soft-note">Lịch rảnh đã thay đổi sau khi buổi hẹn được tạo. Buổi hẹn này vẫn giữ nguyên giờ.</p>}
                          <Faces members={state.members} />
                          <p className="muted">
                            Dự kiến 4 thành viên · Mẫu trải nghiệm gia đình
                          </p>
                          <div className="soft-note">
                            <MessageCircleHeart size={20} /> “Mỗi người kể một
                            điều vui trong ngày nhé.”
                          </div>
                        </div>
                      </section>
                      <section className="card padded">
                        <h2>
                          {moment.status === "completed"
                            ? "Giữ lại khoảnh khắc"
                            : "Một chút trước buổi hẹn"}
                        </h2>
                        {moment.status === "planned" ? (
                          <>
                            <p>
                              Bà đang nhờ lấy thuốc trước 18:30. Minh có một
                              khoảng rảnh để giúp bà trước bữa tối.
                            </p>
                            <button
                              className="care-inline"
                              onClick={() => go("care")}
                            >
                              <Heart size={19} />
                              <span>{careLabels[careStep]}</span>
                              <ChevronRight size={18} />
                            </button>
                            <hr />
                            <p>
                              Khi cả nhà đã dùng bữa và trò chuyện xong, hãy
                              đánh dấu khoảnh khắc này.
                            </p>
                            {button("Đã cùng nhau dùng bữa", async () => {
                              await act(
                                { type: "complete", id: moment.id },
                                "Thêm một buổi tối bên nhau.",
                              );
                            })}
                            <p className="caption">
                              Trong bản trải nghiệm, bạn có thể đi tiếp mà không
                              chờ đến giờ hẹn.
                            </p>
                          </>
                        ) : (
                          <>
                            <p>
                              {memory
                                ? "Kỷ niệm của buổi tối đã nằm trong câu chuyện nhà mình."
                                : "Một câu chuyện, một lời nhắn. Giữ lại điều khiến bạn mỉm cười."}
                            </p>
                            {button(
                              memory
                                ? "Xem kỷ niệm đã lưu"
                                : "Viết một kỷ niệm",
                              () => {
                                go("memories");
                                setAdding(!memory);
                              },
                            )}
                            <div className="soft-note">
                              <Leaf size={20} /> Bữa tối đầu tiên được ghi nhận.
                              Những lần tiếp theo sẽ làm nên nhịp nhà.
                            </div>
                          </>
                        )}
                      </section>
                    </div>
                  )}
                </>
              )}
              {view === "ritual-detail" && ritualFlow("prompt")}
              {view === "care" && (
                <>
                  <div className="page-heading">
                    <div>
                      <Label>CARE LOOP</Label>
                      <h1>
                        Quan tâm, <span>từ điều nhỏ.</span>
                      </h1>
                      <p>Một lời nhờ, một bàn tay. Nhà mình nhẹ lòng hơn.</p>
                    </div>
                  </div>
                  <div className="content-grid">
                    <section className="card padded">
                      <div className="care-person">
                        <Avatar member={state.members[0]} />
                        <div>
                          <strong>Bà Lan nhắn nhà mình</strong>
                          <span>Hôm nay · 16:00</span>
                        </div>
                        <Heart size={21} className="accent" />
                      </div>
                      <blockquote>
                        “Chiều ai lấy thuốc giúp bà nhé? Nhà thuốc đã chuẩn bị
                        sẵn rồi.”
                      </blockquote>
                      <div className="details-row">
                        <Clock3 size={20} />
                        <div>
                          <strong>Trước 18:30 hôm nay</strong>
                          <span>Nhà thuốc quen của gia đình</span>
                        </div>
                      </div>
                      <div className="soft-note">
                        <ShieldCheck size={18} /> Chỉ hỗ trợ lấy thuốc theo lời
                        nhờ của bà.
                      </div>
                      <div className="care-steps">
                        {["Nhận giúp bà", "Đã lấy thuốc", "Mang về cho bà"].map(
                          (s, i) => (
                            <div
                              key={s}
                              className={careStep > i ? "completed" : ""}
                            >
                              <span>
                                {careStep > i ? <Check size={16} /> : i + 1}
                              </span>
                              <strong>{s}</strong>
                            </div>
                          ),
                        )}
                      </div>
                    </section>
                    <section className="card warm padded">
                      <Label>
                        <Heart size={16} />{" "}
                        {careStep === 3
                          ? "MỘT VÒNG QUAN TÂM TRỌN VẸN"
                          : "MINH CÓ THỂ GIÚP"}
                      </Label>
                      <h2>
                        {careStep === 3
                          ? "“Cảm ơn cháu nhé.”"
                          : careLabels[careStep]}
                      </h2>
                      <p>
                        {careStep === 0
                          ? "Minh đã chia sẻ khoảng rảnh 17:00–18:30. Việc giúp bà vẫn kịp trước bữa tối của cả nhà."
                          : careStep === 1
                            ? "Bà biết Minh đã nhận giúp rồi. Khi lấy được thuốc, cập nhật cho bà yên tâm nhé."
                            : careStep === 2
                              ? "Thuốc đã lấy xong. Đánh dấu khi Minh mang về cho bà."
                              : "Bà đã nhận thuốc. Cảm ơn Minh vì một chút quan tâm hôm nay."}
                      </p>
                      <div className="helper">
                        <Avatar member={state.members[3]} />
                        <div>
                          <strong>Nguyễn Minh</strong>
                          <span>
                            {careStep === 3
                              ? "Đã giúp bà xong"
                              : "Tự nguyện nhận giúp"}
                          </span>
                        </div>
                      </div>
                      {careStep < 3
                        ? button(
                            [
                              "Con giúp bà nhé",
                              "Con đã lấy thuốc",
                              "Đã mang thuốc về cho bà",
                            ][careStep],
                            async () => {
                              await act(
                                {
                                  type: "care",
                                  status: (
                                    [
                                      "accepted",
                                      "picked-up",
                                      "delivered",
                                    ] as const
                                  )[careStep],
                                },
                                [
                                  "Bà đã biết Minh nhận giúp.",
                                  "Đã báo bà: thuốc lấy xong rồi.",
                                  "Bà cảm ơn Minh nhé!",
                                ][careStep],
                              );
                            },
                          )
                        : button(
                            moment
                              ? "Về buổi hẹn gia đình"
                              : "Tìm thời gian bên nhau",
                            () => go(moment ? "ritual-detail" : "family"),
                          )}
                    </section>
                  </div>
                </>
              )}
              {view === "memories" && (
                <>
                  <div className="page-heading">
                    <div>
                      <Label>LIVING MEMORIES</Label>
                      <h1>
                        Chuyện <span>nhà mình.</span>
                      </h1>
                      <p>Những khoảnh khắc qua đi. Sự ấm áp ở lại.</p>
                    </div>
                    {moment?.status === "completed" && !memory && !adding && (
                      <button
                        className="button"
                        onClick={() => setAdding(true)}
                      >
                        <Plus size={17} /> Lưu bữa tối hôm nay
                      </button>
                    )}
                  </div>
                  {adding && moment?.status === "completed" && !memory && (
                    <form
                      className="card padded memory-form"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (
                          await act(
                            { type: "memory", sourceId: moment.id, note, art },
                            "Đã giữ lại một kỷ niệm cho nhà mình.",
                          )
                        ) {
                          setAdding(false);
                          setNote("");
                        }
                      }}
                    >
                      <h2>Bữa tối hôm nay, bạn nhớ điều gì?</h2>
                      <label>
                        Lời nhắn của bạn
                        <textarea
                          required
                          maxLength={500}
                          rows={3}
                          placeholder="Ba kể lại chuyến Đà Lạt năm ngoái…"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                        />
                      </label>
                      <span className="caption">
                        {note.length}/500 ký tự · Chỉ gia đình mình đọc được
                      </span>
                      <label>Chọn minh họa cho kỷ niệm</label>
                      <div className="art-picker">
                        {(["dinner", "dalat", "breakfast"] as const).map(
                          (a, i) => (
                            <button
                              type="button"
                              key={a}
                              className={art === a ? "selected" : ""}
                              aria-pressed={art === a}
                              onClick={() => setArt(a)}
                            >
                              <Scene variant={a} />
                              <span>
                                {["Bữa cơm ấm", "Đà Lạt", "Bữa sáng"][i]}{" "}
                                {art === a && <Check size={14} />}
                              </span>
                            </button>
                          ),
                        )}
                      </div>
                      <div className="form-actions">
                        <button
                          className="button"
                          disabled={busy || !note.trim()}
                        >
                          Lưu kỷ niệm <Heart size={17} />
                        </button>
                        <button
                          type="button"
                          className="text-link"
                          onClick={() => setAdding(false)}
                        >
                          Để sau
                        </button>
                      </div>
                    </form>
                  )}
                  {!adding && ritualFlow("prompt")}
                  <div className="memories-grid">
                    {state.memories.map((m) => (
                      <article className="card memory-card" key={m.id}>
                        <Scene variant={m.art} />
                        <div className="padded">
                          <Label>
                            {new Date(
                              `${m.date}T12:00:00+07:00`,
                            ).toLocaleDateString("vi-VN", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                              timeZone: "Asia/Ho_Chi_Minh",
                            })}
                          </Label>
                          <h2>{m.title}</h2>
                          <p className="memory-note">{m.note}</p>
                          <div className="memory-meta">
                            <Faces
                              members={state.members.filter((x) =>
                                m.participants.includes(x.id),
                              )}
                            />
                            <span>
                              {m.participants.length} thành viên · Ký ức chung
                            </span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                  <p className="home-footer">
                    <LockKeyhole size={13} /> Câu chuyện chỉ thuộc về gia đình
                    mình.
                  </p>
                </>
              )}
            </>
          )}
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Điều hướng điện thoại">
        {nav.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={active === id ? "active" : ""}
            aria-current={active === id ? "page" : undefined}
            onClick={() => go(id)}
          >
            <Icon size={21} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {toast && (
        <div key={state.revision} role="status" className="toast">
          <CheckCheck size={19} />
          {toast}
        </div>
      )}
      {settings && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setSettings(false);
            setConfirmReset(false);
          }}
        >
          <section
            className="modal card padded"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close icon-button"
              aria-label="Đóng cài đặt"
              autoFocus
              onClick={() => {
                setSettings(false);
                setConfirmReset(false);
              }}
            >
              <X />
            </button>
            <Label>KHÔNG GIAN NHÀ MÌNH</Label>
            <h2 id="settings-title">Chào Minh.</h2>
            <p>
              Bạn đang khám phá một ngày mẫu của gia đình Nguyễn: 25/09/2026.
            </p>
            <div className="privacy-note">
              <ShieldCheck size={22} />
              <p>
                Dữ liệu là câu chuyện minh họa.
                <br />
                <span>
                  {mode === "mock"
                    ? "Thay đổi được lưu trên trình duyệt này."
                    : "Mỗi trình duyệt có một phiên trải nghiệm riêng."}
                </span>
              </p>
            </div>
            <p className="caption">
              Giờ rảnh chỉ chia sẻ busy/free. Bản trải nghiệm chưa có tài khoản
              hay đồng bộ lịch cá nhân.
            </p>
            {confirmReset ? (
              <>
                <p>
                  Bắt đầu lại sẽ xóa các thao tác trong phiên trải nghiệm này.
                </p>
                {button(
                  "Xác nhận bắt đầu lại",
                  async () => {
                    if (
                      await act(
                        { type: "reset" },
                        "Nhà mình đã sẵn sàng cho câu chuyện mới.",
                      )
                    ) {
                      setSettings(false);
                      setConfirmReset(false);
                      setNote("");
                      setEditing(false);
                      go("home");
                    }
                  },
                  true,
                )}
                <button
                  className="text-link cancel-reset"
                  onClick={() => setConfirmReset(false)}
                >
                  Giữ lại trải nghiệm
                </button>
              </>
            ) : (
              button(
                "Bắt đầu lại câu chuyện mẫu",
                () => setConfirmReset(true),
                true,
              )
            )}
          </section>
        </div>
      )}
    </div>
  );
}
