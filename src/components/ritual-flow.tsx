"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Check, Heart, X } from "lucide-react";
import type { Action, Ritual, State } from "@/lib/domain";
import { clock } from "@/lib/domain";

export function ritualWhen(value: string) {
  const date = new Date(`${value}:00Z`);
  const day = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"][date.getUTCDay()];
  return `${day} • ${value.slice(11, 16)}`;
}
function schedule(ritual: Ritual) {
  if (ritual.recurrence === "monthly") return `Ngày ${Number(ritual.time.slice(8, 10))} hằng tháng • ${ritual.time.slice(11, 16)}`;
  return `${ritual.recurrence === "weekly" ? "Mỗi" : "2 tuần một lần vào"} ${ritualWhen(ritual.time)}`;
}
function progress(ritual: Ritual) {
  // These are demo milestones, not a measured real-world streak.
  return ritual.recurrence === "weekly" ? `${ritual.completedCount} tuần bên nhau` : `${ritual.completedCount} lần bên nhau`;
}
type Props = { state: State; busy: boolean; variant: "prompt" | "home" | "list" | "detail";
  act: (action: Action, message: string) => Promise<boolean>; onOpen: () => void; onMemories: () => void };

export function RitualFlow({ state, busy, variant, act, onOpen, onMemories }: Props) {
  const source = state.moments[0];
  const ritual = state.rituals[0];
  const [dismissed, setDismissed] = useState(false);
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState(false);
  const [name, setName] = useState(source?.title ?? "Bữa tối, chuyện nhà");
  const [recurrence, setRecurrence] = useState<Ritual["recurrence"]>("weekly");
  const [time, setTime] = useState(`2026-09-27T${clock(source?.start ?? 1170)}`);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [writing, setWriting] = useState(false);
  const dialog = useRef<HTMLElement>(null);
  const saving = useRef(false);
  const latest = ritual && state.moments.filter(m => m.ritualId === ritual.id).at(-1);
  const saved = latest && state.memories.some(m => m.sourceId === latest.id);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLElement>("input, button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving.current) setOpen(false);
      if (event.key !== "Tab") return;
      const items = dialog.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), select:not(:disabled)");
      if (!items?.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKey); previous?.focus(); };
  }, [open, created]);

  const openForm = () => { setName(source.title); setError(""); setOpen(true); };
  if (variant === "prompt" && (source?.status !== "completed" || (ritual && !created) || dismissed)) return null;
  if (variant !== "prompt" && !ritual) return variant === "detail" ? <section className="card padded"><h1>Chưa có Nhịp nhà mới</h1><p>Hoàn thành một hoạt động rồi chọn “Tạo Nhịp nhà” nhé.</p></section> : null;

  return <>
    {variant === "prompt" && !created && <section className="card warm padded ritual-prompt">
      <span className="eyebrow"><Heart size={16} /> GIỮ MỘT NHỊP CHUNG</span>
      <h2>Khoảnh khắc này có đáng để lặp lại không?</h2>
      <p>Biến {source.title} thành một Nhịp nhà để cả gia đình duy trì đều đặn.</p>
      <div className="ritual-actions"><button className="button" onClick={openForm} disabled={busy}>Tạo Nhịp nhà</button>
        <button className="button secondary" onClick={() => setDismissed(true)}>Để sau</button></div>
    </section>}
    {ritual && variant !== "prompt" && <section className="card warm padded ritual-live">
      <span className="eyebrow"><CalendarDays size={16} /> {variant === "home" ? "NHỊP NHÀ SẮP TỚI" : "NHỊP NHÀ MÌNH TẠO"}</span>
      {variant === "detail" ? <h1>{ritual.name}</h1> : <h2>{ritual.name}</h2>}
      <p>{schedule(ritual)}</p><p className="caption">{ritual.members.length} thành viên</p>
      <div key={ritual.completedCount} className="ritual-progress" aria-live="polite">
        {variant === "detail" && <h2>Tiến độ</h2>}
        <strong>{progress(ritual)}</strong>
        <p>{ritual.completedCount}/{ritual.totalOccurrences} lần đã hoàn thành</p>
        <div className="ritual-progress-dots" aria-hidden="true">{Array.from({length: Math.min(ritual.completedCount, 8)}, (_, i) => <span key={i}><Check size={17} /></span>)}</div>
      </div>
      <h3>Lần tiếp theo</h3><p>{ritualWhen(ritual.nextOccurrence)} <span className="caption">· {ritual.nextOccurrence.slice(0, 10).split("-").reverse().join("/")}</span></p>
      {variant !== "detail" ? <button className="button" onClick={onOpen}>Xem Nhịp nhà</button> : <>
        <button className="button" disabled={busy} onClick={async () => {
          if (saving.current) return;
          saving.current = true;
          try { if (await act({ type: "complete-ritual", id: ritual.id, occurrence: ritual.nextOccurrence }, "Thêm một lần cả nhà bên nhau.")) { setWriting(false); setNote(""); setError(""); } }
          finally { saving.current = false; }
        }}>Đánh dấu đã hoàn thành</button>
        <p className="caption">Bản demo: mỗi lần bấm là hoàn thành lần hẹn tiếp theo, không cần chờ đến ngày. Buổi đầu đã được tính là 1 lần.</p>
        {latest && <div className="ritual-memory">
          <h3>{saved ? "Đã giữ lại kỷ niệm này" : "Lần này có điều gì đáng nhớ?"}</h3>
          <p className="caption">Buổi ngày {latest.date?.split("-").reverse().join("/")}</p>
          {saved ? <button className="button secondary" onClick={onMemories}>Xem kỷ niệm</button> : writing ? <form onSubmit={async event => {
            event.preventDefault();
            if (await act({ type: "memory", sourceId: latest.id, note, art: "dinner" }, "Đã lưu thêm một kỷ niệm của Nhịp nhà.")) { setWriting(false); setNote(""); }
          }}>
            <label>Lời nhắn cho lần này<textarea required maxLength={500} value={note} onChange={event => setNote(event.target.value)} /></label>
            <button className="button" disabled={busy || !note.trim()}>Lưu kỷ niệm mới</button>
          </form> : <button className="button secondary" onClick={() => setWriting(true)}>Viết kỷ niệm cho lần này</button>}
        </div>}
      </>}
    </section>}
    {open && createPortal(<div className="modal-backdrop" onClick={() => { if (!busy) setOpen(false); }}>
      <section ref={dialog} className="modal card padded ritual-modal" role="dialog" aria-modal="true" aria-labelledby="ritual-modal-title" onClick={event => event.stopPropagation()}>
        <button className="close icon-button" aria-label="Đóng" disabled={busy} onClick={() => setOpen(false)}><X /></button>
        {created && ritual ? <>
          <h2 id="ritual-modal-title">Đã tạo Nhịp nhà ❤️</h2><h3>{ritual.name}</h3><p>{schedule(ritual)}</p>
          <p>{ritual.members.length} thành viên · {progress(ritual)}</p>
          <button className="button" onClick={() => { setOpen(false); onOpen(); }}>Xem Nhịp nhà</button>
        </> : <>
          <h2 id="ritual-modal-title">Tạo Nhịp nhà</h2><p>Một cuộc hẹn nhỏ, đều đặn bên nhau.</p>
          <form onSubmit={async event => {
            event.preventDefault(); if (saving.current) return;
            if (!name.trim()) { setError("Nhập tên hoạt động nhé."); return; }
            saving.current = true; setError("");
            try {
              if (await act({ type: "create-ritual", sourceId: source.id, name: name.trim(), recurrence, time }, "Đã tạo Nhịp nhà.")) setCreated(true);
              else setError("Chưa lưu được Nhịp nhà. Vui lòng thử lại nhé.");
            } finally { saving.current = false; }
          }}>
            <label>Tên hoạt động<input required maxLength={80} value={name} disabled={busy} onChange={e => setName(e.target.value)} /></label>
            <label htmlFor="ritual-recurrence">Lặp lại</label><select id="ritual-recurrence" value={recurrence} disabled={busy} onChange={e => setRecurrence(e.target.value as Ritual["recurrence"])}>
              <option value="weekly">Hàng tuần</option><option value="biweekly">2 tuần một lần</option><option value="monthly">Hàng tháng</option>
            </select>
            <label>Thời gian<input type="datetime-local" required min="2026-09-26T00:00" max="2099-12-31T23:59" value={time} disabled={busy} onChange={e => setTime(e.target.value)} /></label>
            {time && <p className="caption">{ritualWhen(time)} · Lần hẹn đầu tiên sau buổi đã hoàn thành.</p>}
            {error && <p role="alert" className="error">{error}</p>}
            <button className="button" disabled={busy}>Lưu Nhịp nhà</button>
          </form>
        </>}
      </section>
    </div>, document.body)}
  </>;
}
