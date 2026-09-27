import { z } from "zod";

export const DEMO_DATE = "2026-09-25";
export type Member = {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string;
  available: [number, number][];
  share: boolean;
};
export type Moment = {
  id: string;
  title: string;
  start: number;
  end: number;
  participants: string[];
  status: "planned" | "completed";
  ritualId: string;
  availabilityChanged?: boolean;
  date?: string;
};
export type Memory = {
  id: string;
  sourceId: string;
  title: string;
  date: string;
  note: string;
  participants: string[];
  art: "dinner" | "dalat" | "breakfast";
};
export type State = {
  version: 1;
  revision: number;
  members: Member[];
  care: {
    status: "open" | "accepted" | "picked-up" | "delivered";
    helper: string | null;
  };
  moments: Moment[];
  memories: Memory[];
  rituals: Ritual[];
};
const ritualTimeSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).refine(value => {
  const date = new Date(`${value}:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 16) === value;
});
const ritualSchema = z.object({
  id: z.string(), name: z.string().trim().min(1).max(80),
  recurrence: z.enum(["weekly", "biweekly", "monthly"]),
  time: ritualTimeSchema, members: z.array(z.string()),
  completedCount: z.number().int().positive(), totalOccurrences: z.number().int().positive(),
  nextOccurrence: ritualTimeSchema,
});
export type Ritual = z.infer<typeof ritualSchema>;
export function nextRitualDate(value: string, recurrence: Ritual["recurrence"], anchor: string): string {
  const date = new Date(`${value}:00Z`);
  if (recurrence === "monthly") {
    const day = Number(anchor.slice(8, 10));
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + 1);
    const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(day, last));
  } else date.setUTCDate(date.getUTCDate() + (recurrence === "weekly" ? 7 : 14));
  return date.toISOString().slice(0, 16);
}
const intervalSchema = z
  .tuple([z.number().int().min(0).max(1440), z.number().int().min(0).max(1440)])
  .refine(([a, b]) => b > a);
export const stateSchema = z.object({
  version: z.literal(1),
  revision: z.number().int().nonnegative(),
  rituals: z.array(ritualSchema).default([]),
  members: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        role: z.string(),
        initials: z.string(),
        color: z.enum(["rose", "blue", "sage", "peach"]),
        available: z.array(intervalSchema).min(1),
        share: z.boolean(),
      }),
    )
    .length(4)
    .refine(
      (m) =>
        m.map((x) => x.id).join(",") === "lan,hung,ha,minh" &&
        m[3].available.length <= 2,
    ),
  care: z.object({
    status: z.enum(["open", "accepted", "picked-up", "delivered"]),
    helper: z.string().nullable(),
  }),
  moments: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      start: z.number(),
      end: z.number(),
      participants: z.array(z.string()),
      status: z.enum(["planned", "completed"]),
      ritualId: z.string(),
      availabilityChanged: z.boolean().optional(),
      date: z.string().optional(),
    }),
  ),
  memories: z.array(
    z.object({
      id: z.string(),
      sourceId: z.string(),
      title: z.string(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      note: z.string(),
      participants: z.array(z.string()),
      art: z.enum(["dinner", "dalat", "breakfast"]),
    }),
  ),
});
export const clock = (minutes: number) =>
  `${Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0")}:${(minutes % 60).toString().padStart(2, "0")}`;
export function seed(): State {
  return {
    version: 1,
    revision: 0,
    rituals: [],
    members: [
      {
        id: "lan",
        name: "Bà Lan",
        role: "Bà · 68 tuổi",
        initials: "L",
        color: "rose",
        available: [[1080, 1230]],
        share: true,
      },
      {
        id: "hung",
        name: "Bố Hùng",
        role: "Bố · 44 tuổi",
        initials: "H",
        color: "blue",
        available: [[1140, 1320]],
        share: true,
      },
      {
        id: "ha",
        name: "Mẹ Hà",
        role: "Mẹ · 42 tuổi",
        initials: "H",
        color: "sage",
        available: [[1170, 1320]],
        share: true,
      },
      {
        id: "minh",
        name: "Minh",
        role: "Con · 20 tuổi",
        initials: "M",
        color: "peach",
        available: [[1170, 1215]],
        share: true,
      },
    ],
    care: { status: "open", helper: null },
    moments: [],
    memories: [
      {
        id: "old-breakfast",
        sourceId: "breakfast-sep20",
        title: "Bữa sáng Chủ nhật",
        date: "2026-09-20",
        note: "“Lâu rồi mới đông đủ vậy.” — Bà Lan",
        participants: ["lan", "hung", "ha", "minh"],
        art: "breakfast",
      },
      {
        id: "old-dalat",
        sourceId: "trip-2025",
        title: "Một chút nắng Đà Lạt",
        date: "2025-09-25",
        note: "Cả nhà cùng đi, cả nhà cùng nhớ. Bố vẫn kể mãi chuyện lạc đường đến vườn hoa.",
        participants: ["lan", "hung", "ha", "minh"],
        art: "dalat",
      },
    ],
  };
}
// Upgrade the earlier demo schedule without resetting appointments or memories.
export function normalizeFamilyState(current: State): State {
  const next = structuredClone(current);
  next.rituals ??= [];
  const fixed = seed().members;
  next.members = next.members.map((member, i) => i < 3
    ? { ...member, available: fixed[i].available, share: true }
    : { ...member, available: [member.available[member.available.length - 1]] });
  return next;
}
export function sharedWindows(members: Member[]): [number, number][] {
  if (!members.length || members.some((m) => !m.share)) return [];
  let windows: [number, number][] = [[1080, 1320]];
  for (const member of members)
    windows = windows.flatMap(([a, b]) =>
      member.available
        .map(([c, d]): [number, number] => [Math.max(a, c), Math.min(b, d)])
        .filter(([c, d]) => d > c),
    );
  return windows.filter(([a, b]) => b - a >= 30);
}
export const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("create-ritual"), sourceId: z.string().min(1).max(100),
    name: z.string().trim().min(1).max(80), recurrence: z.enum(["weekly", "biweekly", "monthly"]),
    time: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/), }).strict(),
  z.object({ type: z.literal("complete-ritual"), id: z.string().min(1).max(150), occurrence: z.string().max(30) }).strict(),
  z.object({ type: z.literal("plan") }).strict(),
  z
    .object({
      type: z.literal("care"),
      status: z.enum(["accepted", "picked-up", "delivered"]),
    })
    .strict(),
  z
    .object({ type: z.literal("complete"), id: z.string().min(1).max(100) })
    .strict(),
  z
    .object({
      type: z.literal("memory"),
      sourceId: z.string().min(1).max(100),
      note: z
        .string()
        .trim()
        .min(1, "Thêm một lời nhắn để giữ lại khoảnh khắc.")
        .max(500),
      art: z.enum(["dinner", "dalat", "breakfast"]),
    })
    .strict(),
  z
    .object({
      type: z.literal("availability"),
      memberId: z.literal("minh"),
      start: z.number().int().min(0).max(1439),
      end: z.number().int().min(1).max(1439),
      share: z.boolean(),
    })
    .strict(),
  z.object({ type: z.literal("reset") }).strict(),
]);
export type Action = z.infer<typeof actionSchema>;
export class DomainError extends Error {}
export function transition(current: State, input: Action): State {
  const action = actionSchema.parse(input);
  if (action.type === "reset")
    return { ...seed(), revision: current.revision + 1 };
  const s = normalizeFamilyState(current);
  if (action.type === "create-ritual") {
    const source = s.moments.find(m => m.id === action.sourceId && m.status === "completed");
    if (!source) throw new DomainError("Hãy hoàn thành hoạt động trước khi tạo Nhịp nhà.");
    const id = `ritual-${source.id}`;
    if (s.rituals.some(r => r.id === id)) return current;
    const date = new Date(`${action.time}:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 16) !== action.time || action.time.slice(0, 10) <= DEMO_DATE)
      throw new DomainError("Chọn ngày hợp lệ sau ngày demo 25/09/2026.");
    s.rituals.push({ id, name: action.name, recurrence: action.recurrence, time: action.time,
      members: [...source.participants], completedCount: 1, totalOccurrences: 1, nextOccurrence: action.time });
  }
  if (action.type === "complete-ritual") {
    const ritual = s.rituals.find(r => r.id === action.id);
    if (!ritual) throw new DomainError("Chưa tìm thấy Nhịp nhà này.");
    const id = `${ritual.id}-${action.occurrence}`;
    if (s.moments.some(m => m.id === id)) return current;
    if (ritual.nextOccurrence !== action.occurrence) throw new DomainError("Lần hẹn đã thay đổi. Hãy tải lại để xem lịch mới.");
    const start = Number(action.occurrence.slice(11, 13)) * 60 + Number(action.occurrence.slice(14, 16));
    s.moments.push({ id, title: ritual.name, start, end: start, participants: [...ritual.members],
      status: "completed", ritualId: ritual.id, date: action.occurrence.slice(0, 10) });
    ritual.completedCount++;
    ritual.totalOccurrences++;
    ritual.nextOccurrence = nextRitualDate(ritual.nextOccurrence, ritual.recurrence, ritual.time);
  }
  if (action.type === "plan") {
    if (s.moments.some((m) => m.ritualId === "friday-dinner")) return current;
    const window = sharedWindows(s.members)[0];
    if (!window)
      throw new DomainError(
        "Chưa có khoảng rảnh chung. Hãy xem lại nhịp sống của cả nhà.",
      );
    s.moments.push({
      id: "dinner-2026-09-25",
      title: "Bữa tối, chuyện nhà",
      start: window[0],
      end: Math.min(window[1], window[0] + 45),
      participants: s.members.map((m) => m.id),
      status: "planned",
      ritualId: "friday-dinner",
    });
  }
  if (action.type === "care") {
    const steps = ["open", "accepted", "picked-up", "delivered"];
    if (s.care.status === action.status) return current;
    if (steps.indexOf(action.status) !== steps.indexOf(s.care.status) + 1)
      throw new DomainError(
        "Hãy cập nhật lần lượt việc nhận giúp, lấy thuốc và mang về.",
      );
    s.care.status = action.status;
    s.care.helper = "minh";
  }
  if (action.type === "complete") {
    const moment = s.moments.find((m) => m.id === action.id);
    if (!moment) throw new DomainError("Chưa có hoạt động được lên lịch.");
    if (moment.status === "completed") return current;
    moment.status = "completed";
  }
  if (action.type === "memory") {
    const moment = s.moments.find((m) => m.id === action.sourceId);
    if (!moment || moment.status !== "completed")
      throw new DomainError("Hãy hoàn thành hoạt động trước khi lưu kỷ niệm.");
    if (s.memories.some((m) => m.sourceId === action.sourceId)) return current;
    s.memories.unshift({
      id: `memory-${moment.id}`,
      sourceId: moment.id,
      title: moment.title,
      date: moment.date ?? DEMO_DATE,
      note: action.note,
      participants: moment.participants,
      art: action.art,
    });
  }
  if (action.type === "availability") {
    if (action.start >= action.end)
      throw new DomainError("Giờ kết thúc phải sau giờ bắt đầu trong cùng ngày.");
    const member = s.members.find((m) => m.id === action.memberId)!;
    if (member.share !== action.share || member.available[0][0] !== action.start || member.available[0][1] !== action.end)
      s.moments.forEach((moment) => { moment.availabilityChanged = true; });
    member.available = [[action.start, action.end]];
    member.share = action.share;
  }
  s.revision++;
  return s;
}
