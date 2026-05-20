import { getSampleCourseRaw, getDemoStudentRaw, SAMPLE_COURSE_ID, DEMO_STUDENT_EMAIL } from "./sample-course.js";

export { DEMO_STUDENT_EMAIL };

const STORAGE_KEY = "vallodental_academy_data";
const DATA_VERSION = 9;

export const DEFAULT_PLATFORM_SETTINGS = {
  branding: {
    academyName: "Vallodental Academy",
    tagline: "Academia premium de prótesis dentales",
    supportEmail: "cursos@admin.com",
    defaultLanguage: "Español",
  },
  access: {
    maintenanceMode: false,
    allowRegistration: false,
    defaultStudentStatus: "active",
  },
  learning: {
    defaultSequentialUnlock: true,
    certificatesEnabled: true,
    defaultExamPassScore: 70,
    showProgressPublicly: false,
  },
  grading: {
    notifyOnSubmission: true,
    defaultFeedbackDays: 5,
    allowSkipCorrection: true,
  },
  communication: {
    messagesEnabled: true,
    communityEnabled: true,
    teacherName: "Alfredo Vallo",
    welcomeMessage:
      "¡Bienvenido al campus Vallodental! Escríbeme si tienes dudas sobre el contenido o las entregas.",
  },
  certificates: {
    issuerName: "Vallodental Academy",
    directorName: "Alfredo Vallo",
    qrVerification: true,
  },
};

export function normalizePlatformSettings(raw = {}) {
  const s = DEFAULT_PLATFORM_SETTINGS;
  return {
    branding: { ...s.branding, ...(raw.branding || {}) },
    access: { ...s.access, ...(raw.access || {}) },
    learning: { ...s.learning, ...(raw.learning || {}) },
    grading: { ...s.grading, ...(raw.grading || {}) },
    communication: { ...s.communication, ...(raw.communication || {}) },
    certificates: { ...s.certificates, ...(raw.certificates || {}) },
  };
}

export function getPlatformSettings() {
  return normalizePlatformSettings(loadRaw().platformSettings);
}

export function savePlatformSettings(patch) {
  const data = loadRaw();
  const current = normalizePlatformSettings(data.platformSettings);
  const next = normalizePlatformSettings(current);
  Object.keys(patch).forEach((key) => {
    if (patch[key] && typeof patch[key] === "object" && !Array.isArray(patch[key])) {
      next[key] = { ...next[key], ...patch[key] };
    } else {
      next[key] = patch[key];
    }
  });
  data.platformSettings = normalizePlatformSettings(next);
  saveRaw(data);
  logActivity("settings_saved", null, "Configuración actualizada");
  return data.platformSettings;
}

export function resetPlatformSettings() {
  const data = loadRaw();
  data.platformSettings = normalizePlatformSettings({});
  saveRaw(data);
  return data.platformSettings;
}

export function exportAllData() {
  const data = loadRaw();
  return JSON.stringify(
    {
      courses: data.courses,
      students: data.students,
      progress: data.progress,
      activityLogs: data.activityLogs,
      submissions: data.submissions,
      messages: data.messages,
      communityPosts: data.communityPosts,
      payments: data.payments,
      platformSettings: data.platformSettings,
      exportedAt: new Date().toISOString(),
    },
    null,
    2
  );
}

export function importAllData(jsonString) {
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return { ok: false, error: "El archivo JSON no es válido." };
  }
  if (!Array.isArray(parsed.courses) || !Array.isArray(parsed.students)) {
    return { ok: false, error: "El formato de datos no es compatible." };
  }
  const data = ensureSeedData({
    courses: parsed.courses.map(normalizeCourse),
    students: parsed.students,
    progress: parsed.progress || [],
    activityLogs: parsed.activityLogs || [],
    submissions: parsed.submissions || [],
    messages: parsed.messages || [],
    communityPosts: parsed.communityPosts || [],
    payments: parsed.payments || [],
    platformSettings: normalizePlatformSettings(parsed.platformSettings),
    dataVersion: DATA_VERSION,
  });
  saveRaw(data);
  return { ok: true };
}

export const BLOCK_TYPES = {
  heading: "Título",
  subheading: "Subtítulo",
  paragraph: "Texto",
  quote: "Cita",
  callout: "Destacado",
  alert: "Alerta",
  image: "Imagen",
  gallery: "Galería",
  video: "Vídeo",
  pdf: "PDF",
  audio: "Audio",
  stl: "Archivo STL",
  file: "Descargable",
  divider: "Separador",
  list: "Lista",
  table: "Tabla",
  emoji: "Emoji",
  accordion: "Acordeón",
  tabs: "Pestañas",
  button: "Botón",
};

export const COLOR_PRESETS = [
  { name: "Oro", value: "#c9a96e" },
  { name: "Crema", value: "#f0ece4" },
  { name: "Blanco", value: "#ffffff" },
  { name: "Dorado claro", value: "#e8d5b0" },
  { name: "Gris", value: "#888888" },
  { name: "Verde clínico", value: "#8ec5a3" },
  { name: "Azul tech", value: "#7eb8da" },
  { name: "Coral", value: "#d4847a" },
];

export const EMOJI_PICKS = [
  "🦷", "✨", "🎯", "📐", "🔬", "💎", "⚡", "🏆", "✅", "📎",
  "🎬", "📷", "🖊️", "💡", "⭐", "🔥", "👨‍⚕️", "🏥", "📚", "🎓",
  "💉", "🧪", "🔍", "📊", "🛠️", "👑", "🌟", "💬", "📌", "🧠",
  "👍", "❤️", "🚀", "⚙️", "🔗", "📋", "🗂️", "✏️", "🎨", "🔒",
];

export const STOCK_COVERS = [
  "https://static.wixstatic.com/media/aca030_c3d4df8430f040f9a2e65c4b80077a66~mv2.jpg",
];

export const LEVELS = ["Principiante", "Intermedio", "Avanzado", "Experto"];
export const LANGUAGES = ["Español", "Inglés", "Portugués"];

function emptyDescBlocks() {
  return [
    createBlock("heading", { text: "Sobre este curso", size: "xl" }),
    createBlock("paragraph", { text: "Describe qué aprenderán tus alumnos, requisitos previos y metodología." }),
    createBlock("callout", { text: "💡 Incluye casos reales de laboratorio para maximizar el aprendizaje." }),
  ];
}

export const ACTIVITY_TYPES = {
  practice: "Práctica guiada",
  lab: "Laboratorio / casos",
  discussion: "Debate / reflexión",
  reading: "Lectura y análisis",
  case: "Caso clínico",
  upload: "Entrega de archivos",
};

function emptyLesson() {
  return {
    id: uid("l"),
    title: "Nueva lección",
    published: true,
    durationMin: 10,
    videoUrl: "",
    blocks: [createBlock("paragraph", { text: "Contenido de la lección..." })],
    assignment: null,
    quiz: null,
    unlock: { mode: "sequential", date: null },
  };
}

export function emptyLessonItem() {
  return { kind: "lesson", ...emptyLesson() };
}

export function emptyActivity(title = "Nueva actividad") {
  return {
    kind: "activity",
    id: uid("act"),
    title,
    published: true,
    activityType: "practice",
    durationMin: 15,
    instructions: "Describe qué debe hacer el alumno en esta actividad.",
    blocks: [createBlock("paragraph", { text: "Material de apoyo para la actividad..." })],
    assignment: null,
    unlock: { mode: "sequential", date: null },
  };
}

export function emptyExam(title = "Examen") {
  const quiz = createQuiz();
  return {
    kind: "exam",
    id: uid("ex"),
    title,
    published: true,
    instructions: "Lee atentamente cada pregunta antes de responder.",
    blocks: [],
    timeLimitMin: quiz.timeLimitMin,
    maxAttempts: quiz.maxAttempts,
    passScore: quiz.passScore,
    shuffleQuestions: false,
    questions: quiz.questions,
    unlock: { mode: "sequential", date: null },
  };
}

function normalizeItem(raw) {
  const kind = raw.kind || "lesson";
  if (kind === "lesson") {
    const base = emptyLesson();
    return {
      kind: "lesson",
      ...base,
      ...raw,
      blocks: raw.blocks?.length ? raw.blocks : base.blocks,
      assignment: raw.assignment ? normalizeAssignment(raw.assignment) : null,
      quiz: raw.quiz ?? null,
      unlock: raw.unlock || base.unlock,
    };
  }
  if (kind === "activity") {
    const base = emptyActivity();
    return {
      kind: "activity",
      ...base,
      ...raw,
      blocks: raw.blocks?.length ? raw.blocks : base.blocks,
      assignment: raw.assignment ? normalizeAssignment(raw.assignment) : null,
      unlock: raw.unlock || base.unlock,
    };
  }
  if (kind === "exam") {
    const base = emptyExam(raw.title);
    return {
      kind: "exam",
      ...base,
      ...raw,
      questions: raw.questions?.length ? raw.questions : base.questions,
      unlock: raw.unlock || base.unlock,
    };
  }
  return raw;
}

function migrateTopicItems(topic) {
  if (Array.isArray(topic.items) && topic.items.length) {
    return topic.items.map(normalizeItem);
  }
  return (topic.lessons || [emptyLesson()]).map((l) => normalizeItem({ kind: "lesson", ...l }));
}

function emptyTopic(title = "Nuevo tema") {
  return { id: uid("t"), title, published: true, items: [emptyLessonItem()] };
}

function emptyMod(title = "Módulo 1") {
  return { id: uid("m"), title, published: true, unlockDays: 0, items: [], topics: [emptyTopic("Tema 1")] };
}

function normalizeStructure(structure) {
  return structure.map((mod) => ({
    ...mod,
    items: (mod.items || []).map(normalizeItem),
    topics: (mod.topics || []).map((t) => ({
      ...t,
      items: migrateTopicItems(t),
    })),
  }));
}

function migrateStructure(course) {
  if (Array.isArray(course.structure) && course.structure.length) return course.structure;
  if (Array.isArray(course.courseModules) && course.courseModules.length) {
    return course.courseModules.map((m) => ({
      id: m.id || uid("m"),
      title: m.title || "Módulo",
      published: m.published !== false,
      unlockDays: m.unlockDays || 0,
      items: [],
      topics: [
        {
          id: uid("t"),
          title: "Contenido",
          published: true,
          lessons: (m.lessons || []).map((l) => ({
            ...emptyLesson(),
            ...l,
            blocks: l.blocks?.length ? l.blocks : [createBlock("paragraph")],
          })),
        },
      ],
    }));
  }
  return [emptyMod("Módulo 1")];
}

export function normalizeCourse(course) {
  const structure = normalizeStructure(migrateStructure(course));
  return {
    id: course.id,
    title: course.title || "Sin título",
    subtitle: course.subtitle || "",
    shortDescription: course.shortDescription || "",
    category: course.category || "General",
    level: course.level || "Intermedio",
    language: course.language || "Español",
    instructor: course.instructor || "Alfredo Vallo",
    tags: Array.isArray(course.tags) ? course.tags : [],
    status: course.status || "draft",
    price: Number(course.price) || 0,
    durationHours: Number(course.durationHours) || 0,
    accentColor: course.accentColor || "#c9a96e",
    coverImage: course.coverImage || "",
    bannerImage: course.bannerImage || course.coverImage || "",
    thumbnail: course.thumbnail || course.coverImage || "",
    trailerUrl: course.trailerUrl || "",
    blocks: Array.isArray(course.blocks) && course.blocks.length ? course.blocks : emptyDescBlocks(),
    items: (course.items || []).map(normalizeItem),
    structure,
    settings: {
      sequentialUnlock: course.settings?.sequentialUnlock !== false,
      dripContent: course.settings?.dripContent || false,
      certificateEnabled: course.settings?.certificateEnabled !== false,
      commentsEnabled: course.settings?.commentsEnabled !== false,
      ...(course.settings || {}),
    },
    modules: structure.length,
    createdAt: course.createdAt || new Date().toISOString(),
    updatedAt: course.updatedAt || course.createdAt || new Date().toISOString(),
  };
}

function syncSubmissionProgress(data) {
  let changed = false;
  data.submissions.forEach((sub) => {
    if (sub.status !== "pending_review" && sub.status !== "graded") return;
    const prog = data.progress.find((p) => p.studentId === sub.studentId && p.path === sub.path);
    if (prog?.completed) return;
    changed = true;
    const row = {
      completed: true,
      completedAt: sub.submittedAt || new Date().toISOString(),
      submissionId: sub.id,
      pendingGrade: sub.status === "pending_review",
    };
    if (prog) Object.assign(prog, row);
    else data.progress.push({ id: uid("p"), studentId: sub.studentId, courseId: sub.courseId, path: sub.path, ...row });
  });
  return changed;
}

export const COMMUNITY_ICONS = ["📢", "✦", "◷", "🎓", "💬", "🔥", "📌", "🎯", "📎", "🏆", "🔬", "⭐"];

export function normalizeCommunityPost(raw = {}) {
  return {
    id: raw.id || uid("post"),
    title: raw.title || "Sin título",
    text: raw.text || "",
    icon: raw.icon || "📢",
    courseId: raw.courseId || null,
    pinned: !!raw.pinned,
    published: raw.published !== false,
    authorName: raw.authorName || DEFAULT_PLATFORM_SETTINGS.communication.teacherName,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
  };
}

export const PAYMENT_STATUS_LABELS = {
  paid: "Pagado",
  pending: "Pendiente",
  refunded: "Reembolsado",
  failed: "Fallido",
};

export const PAYMENT_METHOD_LABELS = {
  stripe: "Stripe",
  transfer: "Transferencia",
  manual: "Manual",
};

export function normalizePayment(raw = {}) {
  return {
    id: raw.id || uid("pay"),
    studentId: raw.studentId || "",
    studentName: raw.studentName || "",
    studentEmail: raw.studentEmail || "",
    courseId: raw.courseId || "",
    courseTitle: raw.courseTitle || "",
    amount: Number(raw.amount) || 0,
    currency: raw.currency || "EUR",
    status: raw.status || "paid",
    method: raw.method || "stripe",
    stripeId: raw.stripeId || "",
    invoiceNumber: raw.invoiceNumber || "",
    paidAt: raw.paidAt || raw.createdAt || new Date().toISOString(),
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}

function syncPaymentsData(data) {
  const map = new Map((data.payments || []).map((p) => [`${p.studentId}:${p.courseId}`, normalizePayment(p)]));
  let invoiceSeq = map.size + 1;
  (data.students || []).forEach((student) => {
    (student.courseIds || []).forEach((courseId) => {
      const key = `${student.id}:${courseId}`;
      if (map.has(key)) return;
      const course = (data.courses || []).find((c) => c.id === courseId);
      if (!course) return;
      const paidAt = student.createdAt || new Date().toISOString();
      const year = new Date(paidAt).getFullYear();
      map.set(
        key,
        normalizePayment({
          studentId: student.id,
          studentName: student.name,
          studentEmail: student.email,
          courseId,
          courseTitle: course.title,
          amount: course.price || 0,
          status: "paid",
          method: "stripe",
          stripeId: `pi_mock_${Math.random().toString(36).slice(2, 12)}`,
          invoiceNumber: `INV-${year}-${String(invoiceSeq++).padStart(4, "0")}`,
          paidAt,
          createdAt: paidAt,
        })
      );
    });
  });
  return [...map.values()].sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));
}

export function getPayments(filter = {}) {
  const data = loadRaw();
  const synced = syncPaymentsData(data);
  if (synced.length !== (data.payments || []).length) {
    data.payments = synced;
    saveRaw(data);
  }
  let list = synced;
  if (filter.status) list = list.filter((p) => p.status === filter.status);
  if (filter.courseId) list = list.filter((p) => p.courseId === filter.courseId);
  if (filter.method) list = list.filter((p) => p.method === filter.method);
  return list;
}

export function getPayment(id) {
  return getPayments().find((p) => p.id === id) || null;
}

export function getPaymentStats() {
  const payments = getPayments();
  const paid = payments.filter((p) => p.status === "paid");
  const pending = payments.filter((p) => p.status === "pending");
  const refunded = payments.filter((p) => p.status === "refunded");
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const totalRevenue = paid.reduce((sum, p) => sum + p.amount, 0);
  const monthRevenue = paid
    .filter((p) => new Date(p.paidAt) >= monthStart)
    .reduce((sum, p) => sum + p.amount, 0);
  return {
    totalRevenue,
    monthRevenue,
    pendingAmount: pending.reduce((sum, p) => sum + p.amount, 0),
    transactions: payments.length,
    paidCount: paid.length,
    pendingCount: pending.length,
    refundedCount: refunded.length,
    avgOrder: paid.length ? Math.round(totalRevenue / paid.length) : 0,
  };
}

export function getPaymentChartData(months = 6) {
  const payments = getPayments().filter((p) => p.status === "paid");
  const now = new Date();
  const bars = [];
  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
    const amount = payments
      .filter((p) => {
        const d = new Date(p.paidAt);
        return d >= start && d <= end;
      })
      .reduce((sum, p) => sum + p.amount, 0);
    bars.push({
      label: start.toLocaleDateString("es-ES", { month: "short" }),
      amount,
    });
  }
  const max = Math.max(...bars.map((b) => b.amount), 1);
  return bars.map((b) => ({ ...b, pct: Math.round((b.amount / max) * 100) }));
}

export function updatePaymentStatus(id, status) {
  const data = loadRaw();
  const i = (data.payments || []).findIndex((p) => p.id === id);
  if (i < 0) return null;
  data.payments[i] = normalizePayment({ ...data.payments[i], status });
  saveRaw(data);
  return data.payments[i];
}

export const CERTIFICATE_STATUS_LABELS = {
  issued: "Emitido",
  almost: "Casi completo",
  in_progress: "En progreso",
  not_started: "Sin iniciar",
};

export function getAdminCertificates(filter = {}) {
  let records = [];
  getStudents().forEach((student) => {
    (student.courseIds || []).forEach((courseId) => {
      const course = getCourse(courseId);
      if (!course) return;
      const prog = getStudentCourseProgress(student.id, courseId);
      const eligible = isCertificateEligible(student.id, courseId);
      const completedAt = getCourseCompletionDate(student.id, courseId);
      let status = "not_started";
      if (eligible) status = "issued";
      else if (prog.percent >= 50) status = "almost";
      else if (prog.percent > 0) status = "in_progress";

      records.push({
        id: `${student.id}-${courseId}`,
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
        courseId,
        courseTitle: course.title,
        percent: prog.percent,
        status,
        eligible,
        completedAt,
        ref: `VA-${String(courseId).slice(2, 8).toUpperCase()}-${String(student.id).slice(2, 6).toUpperCase()}`,
      });
    });
  });
  if (filter.status) records = records.filter((r) => r.status === filter.status);
  if (filter.courseId) records = records.filter((r) => r.courseId === filter.courseId);
  return records.sort((a, b) => {
    if (a.status === "issued" && b.status !== "issued") return -1;
    if (b.status === "issued" && a.status !== "issued") return 1;
    return b.percent - a.percent;
  });
}

export function getCertificateStats() {
  const all = getAdminCertificates();
  return {
    total: all.length,
    issued: all.filter((r) => r.status === "issued").length,
    almost: all.filter((r) => r.status === "almost").length,
    inProgress: all.filter((r) => r.status === "in_progress").length,
  };
}

function ensureSeedData(data) {
  const demo = normalizeCourse(getSampleCourseRaw());
  const demoIdx = data.courses.findIndex((c) => c.id === SAMPLE_COURSE_ID);
  if (demoIdx >= 0) data.courses[demoIdx] = demo;
  else data.courses.unshift(demo);
  if (!data.students.some((s) => s.email?.toLowerCase() === DEMO_STUDENT_EMAIL)) {
    data.students.unshift(getDemoStudentRaw());
  } else {
    data.students = data.students.map((s) =>
      s.email?.toLowerCase() === DEMO_STUDENT_EMAIL && !s.courseIds.includes(SAMPLE_COURSE_ID)
        ? { ...s, courseIds: [...s.courseIds, SAMPLE_COURSE_ID] }
        : s
    );
  }
  syncSubmissionProgress(data);
  if (!data.messages?.length) {
    const demoStudent = data.students.find((s) => s.email?.toLowerCase() === DEMO_STUDENT_EMAIL);
    if (demoStudent) {
      data.messages = [
        {
          id: uid("msg"),
          studentId: demoStudent.id,
          courseId: SAMPLE_COURSE_ID,
          from: "teacher",
          senderName: "Alfredo Vallo",
          text: "¡Bienvenido al campus! Escríbeme aquí si tienes dudas sobre estratificación o el examen final.",
          read: false,
          createdAt: new Date().toISOString(),
        },
      ];
    }
  }
  if (!data.communityPosts?.length) {
    const now = new Date().toISOString();
    data.communityPosts = [
      {
        id: uid("post"),
        title: "Bienvenida a la comunidad Vallodental",
        text: "Aquí publicamos anuncios importantes, sesiones en directo y novedades de la academia.",
        icon: "✦",
        courseId: null,
        pinned: true,
        published: true,
        authorName: data.platformSettings?.communication?.teacherName || "Alfredo Vallo",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uid("post"),
        title: "Entrega de prácticas — recordatorio",
        text: "Sube tus archivos STL y capturas de estratificación antes del viernes para recibir feedback personalizado.",
        icon: "📎",
        courseId: SAMPLE_COURSE_ID,
        pinned: false,
        published: true,
        authorName: data.platformSettings?.communication?.teacherName || "Alfredo Vallo",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
  }
  data.communityPosts = (data.communityPosts || []).map(normalizeCommunityPost);
  data.payments = syncPaymentsData(data);
  data.platformSettings = normalizePlatformSettings(data.platformSettings);
  data.dataVersion = DATA_VERSION;
  return data;
}

function loadRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const data = ensureSeedData({
        courses: [normalizeCourse(getSampleCourseRaw())],
        students: [getDemoStudentRaw()],
        progress: [],
        activityLogs: [],
        submissions: [],
        messages: [],
        communityPosts: [],
        payments: [],
        platformSettings: normalizePlatformSettings({}),
        dataVersion: DATA_VERSION,
      });
      saveRaw(data);
      return data;
    }
    const parsed = JSON.parse(raw);
    let data = {
      courses: (parsed.courses || []).map(normalizeCourse),
      students: parsed.students || [],
      progress: parsed.progress || [],
      activityLogs: parsed.activityLogs || [],
      submissions: parsed.submissions || [],
      messages: parsed.messages || [],
      communityPosts: parsed.communityPosts || [],
      payments: parsed.payments || [],
      platformSettings: normalizePlatformSettings(parsed.platformSettings),
      dataVersion: parsed.dataVersion || 0,
    };
    if (syncSubmissionProgress(data)) saveRaw(data);
    if (data.dataVersion < DATA_VERSION) {
      data = ensureSeedData(data);
      saveRaw(data);
    }
    return data;
  } catch {
    return ensureSeedData({
      courses: [normalizeCourse(getSampleCourseRaw())],
      students: [getDemoStudentRaw()],
      progress: [],
      activityLogs: [],
      submissions: [],
      messages: [],
      communityPosts: [],
      payments: [],
      platformSettings: normalizePlatformSettings({}),
      dataVersion: DATA_VERSION,
    });
  }
}

function saveRaw(data) {
  data.dataVersion = DATA_VERSION;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function uid(prefix = "id") {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function getCourses() {
  return loadRaw().courses.map(normalizeCourse);
}

export function getCourse(id) {
  const c = getCourses().find((x) => x.id === id);
  return c ? normalizeCourse(c) : null;
}

export function saveCourse(course) {
  const data = loadRaw();
  const normalized = normalizeCourse({ ...course, updatedAt: new Date().toISOString() });
  normalized.modules = normalized.structure.length;
  const i = data.courses.findIndex((c) => c.id === normalized.id);
  if (i >= 0) data.courses[i] = normalized;
  else data.courses.unshift(normalized);
  saveRaw(data);
  logActivity("course_saved", normalized.id, normalized.title);
  return normalized;
}

export function createEmptyCourse() {
  const learning = getPlatformSettings().learning;
  return saveCourse({
    id: uid("c"),
    title: "Nuevo curso",
    subtitle: "",
    shortDescription: "",
    category: "General",
    status: "draft",
    price: 0,
    structure: [emptyMod()],
    blocks: emptyDescBlocks(),
    settings: {
      sequentialUnlock: learning.defaultSequentialUnlock,
      dripContent: false,
      certificateEnabled: learning.certificatesEnabled,
      commentsEnabled: true,
    },
    createdAt: new Date().toISOString(),
  });
}

export function duplicateCourse(id) {
  const src = getCourse(id);
  if (!src) return null;
  const copy = structuredClone(src);
  copy.id = uid("c");
  copy.title = `${src.title} (copia)`;
  copy.status = "draft";
  copy.createdAt = new Date().toISOString();
  return saveCourse(copy);
}

export function deleteCourse(id) {
  const data = loadRaw();
  data.courses = data.courses.filter((c) => c.id !== id);
  data.students = data.students.map((s) => ({
    ...s,
    courseIds: s.courseIds.filter((cid) => cid !== id),
  }));
  data.progress = data.progress.filter((p) => p.courseId !== id);
  saveRaw(data);
}

export function getStudentByEmail(email) {
  return getStudents().find((s) => s.email?.toLowerCase() === email.trim().toLowerCase()) || null;
}

export function getStudentCourses(studentId) {
  const student = getStudent(studentId);
  if (!student) return [];
  return student.courseIds
    .map((id) => getCourse(id))
    .filter((c) => c && c.status === "published");
}

/** Lista ordenada de elementos del curso para el alumno */
export function getCourseCurriculum(course) {
  const rows = [];
  const push = (scope, item, moduleId = null, topicId = null, moduleTitle = "", topicTitle = "") => {
    const path = scope === "course"
      ? `course:${item.id}`
      : scope === "module"
        ? `module:${moduleId}:${item.id}`
        : `topic:${moduleId}:${topicId}:${item.id}`;
    rows.push({ scope, item, moduleId, topicId, moduleTitle, topicTitle, path });
  };

  (course.items || []).forEach((item) => push("course", item, null, null, "", "Curso"));

  course.structure.forEach((mod) => {
    (mod.items || []).forEach((item) => push("module", item, mod.id, null, mod.title, mod.title));
    mod.topics.forEach((topic) => {
      (topic.items || []).forEach((item) => push("topic", item, mod.id, topic.id, mod.title, topic.title));
    });
  });
  return rows;
}

export function countCurriculumItems(course) {
  return getCourseCurriculum(course).length;
}

export function getStudentProgress(studentId, courseId = null) {
  return loadRaw().progress.filter(
    (p) => p.studentId === studentId && (!courseId || p.courseId === courseId)
  );
}

export function isItemCompleted(studentId, path) {
  return getStudentProgress(studentId).some((p) => p.path === path && p.completed);
}

export function markItemComplete(studentId, courseId, path, extra = {}) {
  const data = loadRaw();
  let row = data.progress.find((p) => p.studentId === studentId && p.path === path);
  if (!row) {
    row = { id: uid("p"), studentId, courseId, path, completed: true, completedAt: new Date().toISOString(), ...extra };
    data.progress.push(row);
  } else {
    Object.assign(row, { completed: true, completedAt: new Date().toISOString(), ...extra });
  }
  saveRaw(data);
  return row;
}

export function getStudentCourseProgress(studentId, courseId) {
  const course = getCourse(courseId);
  if (!course) return { total: 0, completed: 0, percent: 0 };
  const curriculum = getCourseCurriculum(course);
  const done = curriculum.filter((r) => isItemCompleted(studentId, r.path)).length;
  const total = curriculum.length;
  return { total, completed: done, percent: total ? Math.round((done / total) * 100) : 0 };
}

export function isCurriculumItemUnlocked(course, row, studentId) {
  const mode = row.item.unlock?.mode || "sequential";
  if (mode === "open") return true;
  if (mode === "manual") return false;
  if (mode === "date" && row.item.unlock?.date) {
    return new Date(row.item.unlock.date) <= new Date();
  }
  if (!course.settings?.sequentialUnlock && mode !== "sequential") return true;
  const curriculum = getCourseCurriculum(course);
  const idx = curriculum.findIndex((r) => r.path === row.path);
  if (idx <= 0) return true;
  return isItemCompleted(studentId, curriculum[idx - 1].path);
}

export function getStudents() {
  return loadRaw().students;
}

export function getStudent(id) {
  return getStudents().find((s) => s.id === id) || null;
}

export function saveStudent(student) {
  const data = loadRaw();
  const i = data.students.findIndex((s) => s.id === student.id);
  if (i >= 0) data.students[i] = student;
  else data.students.unshift(student);
  saveRaw(data);
  return student;
}

export function createStudent(payload) {
  const defaultStatus = getPlatformSettings().access.defaultStudentStatus;
  return saveStudent({
    id: uid("s"),
    name: payload.name,
    email: payload.email,
    status: payload.status || defaultStatus || "active",
    courseIds: payload.courseIds || [],
    createdAt: new Date().toISOString(),
  });
}

const STUDENT_PREFS_PREFIX = "vallodental_student_prefs_";

export function deleteStudent(id) {
  const data = loadRaw();
  data.students = data.students.filter((s) => s.id !== id);
  data.progress = data.progress.filter((p) => p.studentId !== id);
  data.submissions = data.submissions.filter((s) => s.studentId !== id);
  if (data.messages) data.messages = data.messages.filter((m) => m.studentId !== id);
  saveRaw(data);
  clearStudentBrowserCache(id);
}

/** Borra progreso, entregas, alertas vistas y caché del reproductor de un alumno. */
export function resetStudentLearningData(studentId) {
  const data = loadRaw();
  const ids = collectStudentIds(data, studentId);
  if (!ids.size) return false;

  const courseIds = new Set();
  ids.forEach((id) => {
    const s = data.students.find((st) => st.id === id);
    (s?.courseIds || []).forEach((cid) => courseIds.add(cid));
  });

  data.progress = (data.progress || []).filter((p) => !ids.has(p.studentId));
  data.submissions = (data.submissions || []).filter((s) => !ids.has(s.studentId));
  (data.messages || []).forEach((m) => {
    if (ids.has(m.studentId) && m.from === "teacher") m.read = false;
  });
  saveRaw(data);

  ids.forEach((id) => clearStudentBrowserCache(id, [...courseIds]));
  return true;
}

/** Reinicia el alumno demo (cursos@alumno.com). */
export function resetDemoStudent() {
  const byEmail = getStudentByEmail(DEMO_STUDENT_EMAIL);
  if (byEmail) return resetStudentLearningData(byEmail.id);
  return resetStudentLearningData("s-demo");
}

/** Restaura curso demo, alumno y contenido base (mantiene cursos propios). */
export function restoreDemoSeedData() {
  const data = loadRaw();
  saveRaw(ensureSeedData({ ...data }));
  return true;
}

function collectStudentIds(data, studentId) {
  const student = data.students?.find((s) => s.id === studentId);
  if (!student) return new Set();
  const ids = new Set([studentId]);
  const email = student.email?.toLowerCase();
  if (email) {
    data.students.forEach((s) => {
      if (s.email?.toLowerCase() === email) ids.add(s.id);
    });
  }
  return ids;
}

function clearStudentBrowserCache(studentId, courseIds = []) {
  try {
    const keysToRemove = new Set();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (
        key === `${STUDENT_PREFS_PREFIX}${studentId}` ||
        key === `vallodental_study_${studentId}` ||
        key.startsWith(`vallodental_notes_${studentId}_`) ||
        key.includes(`_${studentId}_`) ||
        key.endsWith(`_${studentId}`)
      ) {
        keysToRemove.add(key);
      }
    }
    courseIds.forEach((courseId) => {
      keysToRemove.add(`vallodental_last_${studentId}_${courseId}`);
      keysToRemove.add(`vallodental_fav_${studentId}_${courseId}`);
      keysToRemove.add(`vallodental_react_${studentId}_${courseId}`);
    });
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    /* ignore */
  }
}

export const DEFAULT_STUDENT_PREFS = {
  emailReminders: true,
  studyReminders: true,
  showCommunityActivity: true,
  compactDashboard: false,
  seenNotificationIds: [],
  seenTaskIds: [],
};

export function getSeenNotificationIds(studentId) {
  return getStudentPreferences(studentId).seenNotificationIds || [];
}

export function markNotificationsSeen(studentId, ids) {
  const seen = new Set(getSeenNotificationIds(studentId));
  ids.forEach((id) => seen.add(id));
  return saveStudentPreferences(studentId, { seenNotificationIds: [...seen] }).seenNotificationIds;
}

export function getSeenTaskIds(studentId) {
  return getStudentPreferences(studentId).seenTaskIds || [];
}

export function markTasksSeen(studentId, submissionIds) {
  if (!submissionIds?.length) return getSeenTaskIds(studentId);
  const taskSeen = new Set(getSeenTaskIds(studentId));
  const notifSeen = new Set(getSeenNotificationIds(studentId));
  submissionIds.forEach((id) => {
    taskSeen.add(id);
    notifSeen.add(`sub-${id}`);
  });
  saveStudentPreferences(studentId, {
    seenTaskIds: [...taskSeen],
    seenNotificationIds: [...notifSeen],
  });
  return [...taskSeen];
}

export function getStudentPreferences(studentId) {
  try {
    const raw = localStorage.getItem(`${STUDENT_PREFS_PREFIX}${studentId}`);
    return raw ? { ...DEFAULT_STUDENT_PREFS, ...JSON.parse(raw) } : { ...DEFAULT_STUDENT_PREFS };
  } catch {
    return { ...DEFAULT_STUDENT_PREFS };
  }
}

export function saveStudentPreferences(studentId, patch) {
  const next = { ...getStudentPreferences(studentId), ...patch };
  localStorage.setItem(`${STUDENT_PREFS_PREFIX}${studentId}`, JSON.stringify(next));
  return next;
}

export function getProgress(courseId, studentId) {
  return loadRaw().progress.filter(
    (p) => (!courseId || p.courseId === courseId) && (!studentId || p.studentId === studentId)
  );
}

export function getCourseProgressSummary(courseId) {
  const course = getCourse(courseId);
  if (!course) return null;
  let totalLessons = 0;
  course.structure.forEach((m) =>
    m.topics.forEach((t) => {
      totalLessons += (t.items || []).filter((i) => i.kind === "lesson").length;
    })
  );
  const students = getStudents().filter((s) => s.courseIds.includes(courseId));
  const progress = getProgress(courseId);
  return students.map((student) => {
    const sp = progress.filter((p) => p.studentId === student.id);
    const completed = sp.filter((p) => p.completed).length;
    const pct = totalLessons ? Math.round((completed / totalLessons) * 100) : 0;
    return { student, completed, totalLessons, percent: pct, watchTime: sp.reduce((s, p) => s + (p.watchTime || 0), 0) };
  });
}

export function getCourseAdminStats(courseId) {
  const course = getCourse(courseId);
  if (!course) return { enrollments: 0, avgProgress: 0, revenue: 0, totalLessons: 0 };
  const summary = getCourseProgressSummary(courseId) || [];
  const enrollments = summary.length;
  const avgProgress = enrollments
    ? Math.round(summary.reduce((acc, row) => acc + row.percent, 0) / enrollments)
    : 0;
  const revenue = enrollments * (course.price || 0);
  const totalLessons = summary[0]?.totalLessons || 0;
  return { enrollments, avgProgress, revenue, totalLessons };
}

export function getStudentOverallProgress(studentId) {
  const student = getStudent(studentId);
  if (!student?.courseIds?.length) return { percent: 0, courses: 0 };
  let total = 0;
  let count = 0;
  student.courseIds.forEach((cid) => {
    const p = getStudentCourseProgress(studentId, cid);
    if (p.total) {
      total += p.percent;
      count += 1;
    }
  });
  return { percent: count ? Math.round(total / count) : 0, courses: student.courseIds.length };
}

export function toggleCourseStatus(id) {
  const course = getCourse(id);
  if (!course) return null;
  course.status = course.status === "published" ? "draft" : "published";
  return saveCourse(course);
}

export function logActivity(action, courseId, label) {
  const data = loadRaw();
  data.activityLogs.unshift({
    id: uid("a"),
    action,
    courseId,
    label,
    createdAt: new Date().toISOString(),
  });
  data.activityLogs = data.activityLogs.slice(0, 100);
  saveRaw(data);
}

export function getStats() {
  const data = loadRaw();
  const published = data.courses.filter((c) => c.status === "published").length;
  const activeStudents = data.students.filter((s) => s.status === "active").length;
  const enrollments = data.students.reduce((n, s) => n + s.courseIds.length, 0);
  const revenue = data.students.reduce((total, student) => {
    return (
      total +
      student.courseIds.reduce((sum, cid) => {
        const course = data.courses.find((c) => c.id === cid);
        return sum + (course?.price || 0);
      }, 0)
    );
  }, 0);
  return {
    totalCourses: data.courses.length,
    publishedCourses: published,
    totalStudents: data.students.length,
    activeStudents,
    enrollments,
    revenue,
  };
}

export function getRecentActivity(limit = 8) {
  const data = loadRaw();
  const events = [
    ...data.courses.map((c) => ({
      label: c.title,
      detail: c.status === "published" ? "Curso publicado" : "Borrador",
      date: c.updatedAt || c.createdAt,
    })),
    ...data.students.map((s) => ({
      label: s.name,
      detail: `${s.courseIds.length} curso(s)`,
      date: s.createdAt,
    })),
  ];
  return events.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export function getAdminInsights() {
  const stats = getStats();
  const data = loadRaw();
  const pendingReviews = data.submissions.filter((s) => s.status === "pending_review").length;
  const unreadMessages = getTeacherUnreadCount();
  let totalPct = 0;
  let count = 0;
  data.students.forEach((s) => {
    s.courseIds.forEach((cid) => {
      const p = getStudentCourseProgress(s.id, cid);
      if (p.total) {
        totalPct += p.percent;
        count += 1;
      }
    });
  });
  const avgCompletion = count ? Math.round(totalPct / count) : 0;
  const tips = [];
  if (pendingReviews > 0) {
    tips.push({ title: "Correcciones pendientes", text: `${pendingReviews} entrega${pendingReviews > 1 ? "s" : ""} esperan revisión del profesor.` });
  }
  if (unreadMessages > 0) {
    tips.push({ title: "Mensajes de alumnos", text: `${unreadMessages} conversación${unreadMessages > 1 ? "es" : ""} sin responder.` });
  }
  if (stats.publishedCourses < stats.totalCourses) {
    tips.push({ title: "Cursos en borrador", text: "Publica cursos pendientes para activar matrículas." });
  }
  const draftPosts = (data.communityPosts || []).filter((p) => !p.published).length;
  if (draftPosts > 0) {
    tips.push({ title: "Anuncios en borrador", text: `${draftPosts} publicación${draftPosts > 1 ? "es" : ""} de comunidad sin publicar.` });
  }
  if (!tips.length) {
    tips.push({ title: "Plataforma al día", text: "No hay alertas críticas. Buen momento para crear contenido nuevo." });
  }
  tips.push({ title: "Engagement", text: `Finalización media del ${avgCompletion}%. Refuerza módulos con menor progreso.` });
  return { pendingReviews, unreadMessages, avgCompletion, tips: tips.slice(0, 4) };
}

export function getAdminActivityFeed(limit = 12) {
  const data = loadRaw();
  const items = [];
  data.submissions.slice(0, 20).forEach((sub) => {
    const st =
      sub.status === "pending_review"
        ? "Pendiente revisión"
        : sub.status === "graded"
          ? "Corregido"
          : sub.status === "failed"
            ? "No aprobado"
            : sub.status;
    items.push({
      type: "submission",
      icon: "◎",
      title: sub.itemTitle,
      detail: `${sub.studentName} · ${st}`,
      date: sub.submittedAt,
      href: "/admin/correcciones",
    });
  });
  (data.messages || [])
    .filter((m) => m.from === "student")
    .slice(-10)
    .forEach((m) => {
      const st = getStudent(m.studentId);
      items.push({
        type: "message",
        icon: "✉",
        title: `Mensaje de ${st?.name || "alumno"}`,
        detail: m.text.slice(0, 80),
        date: m.createdAt,
        href: "/admin/mensajes",
      });
    });
  (data.communityPosts || []).slice(0, 10).forEach((p) => {
    items.push({
      type: "community",
      icon: "◈",
      title: p.title,
      detail: p.published ? (p.courseId ? "Anuncio de curso" : "Anuncio global") : "Borrador",
      date: p.updatedAt || p.createdAt,
      href: "/admin/comunidad",
    });
  });
  data.courses.forEach((c) => {
    items.push({
      type: "course",
      icon: "▤",
      title: c.title,
      detail: c.status === "published" ? "Curso publicado" : "Borrador actualizado",
      date: c.updatedAt || c.createdAt,
      href: `/admin/curso-editor?id=${c.id}`,
    });
  });
  data.students.forEach((s) => {
    items.push({
      type: "student",
      icon: "◉",
      title: s.name,
      detail: `${s.courseIds.length} curso(s) asignado(s)`,
      date: s.createdAt,
      href: "/admin/alumnos",
    });
  });
  return items.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);
}

export function formatPrice(amount) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);
}

export const STATUS_LABELS = {
  published: "Publicado",
  draft: "Borrador",
  archived: "Archivado",
  active: "Activo",
  blocked: "Bloqueado",
};

export function createBlock(type, overrides = {}) {
  const defaults = {
    heading: { text: "Nuevo título", color: "#c9a96e", size: "xl" },
    subheading: { text: "Subtítulo", color: "#e8d5b0", size: "lg" },
    paragraph: { text: "Escribe aquí...", color: "#f0ece4" },
    quote: { text: "Cita relevante para el alumno.", color: "#e8d5b0" },
    callout: { text: "💡 Información clave.", color: "#e8d5b0", bgColor: "rgba(201,169,110,0.12)" },
    alert: { text: "⚠️ Atención: revisa este protocolo antes de continuar.", variant: "warning" },
    image: { url: "", caption: "", alt: "" },
    gallery: { images: [] },
    video: { url: "", caption: "" },
    pdf: { url: "", name: "Documento.pdf", label: "Descargar PDF" },
    audio: { url: "", name: "Audio" },
    stl: { url: "", name: "modelo.stl", label: "Descargar STL" },
    file: { url: "", name: "Recurso", label: "Descargar" },
    divider: { style: "gold" },
    list: { items: ["Punto 1", "Punto 2"], color: "#f0ece4" },
    table: { headers: ["Columna A", "Columna B"], rows: [["Dato 1", "Dato 2"]] },
    emoji: { emoji: "🦷", size: "48" },
    accordion: { items: [{ title: "Sección 1", body: "Contenido..." }] },
    tabs: { items: [{ title: "Tab 1", body: "Contenido..." }] },
    button: { text: "Ver recurso", url: "#", style: "gold" },
  };
  return { id: uid("b"), type, align: "left", ...(defaults[type] || {}), ...overrides };
}

export function createAssignment() {
  return {
    id: uid("as"),
    title: "Tarea práctica",
    instructions: "Responde las preguntas siguientes.",
    dueDate: "",
    maxScore: 100,
    passScore: 60,
    allowFiles: true,
    fileTypes: ["pdf", "stl", "jpg", "png"],
    questions: [
      { id: uid("aq"), type: "text", text: "Escribe tu respuesta", points: 100, required: true, options: [], correct: 0 },
    ],
  };
}

export function normalizeAssignment(a) {
  if (!a) return null;
  const allowFiles = a.allowFiles !== false;
  let questions = Array.isArray(a.questions) ? a.questions : [];
  if (!questions.length && !allowFiles) {
    questions = [{ type: "text", text: "Escribe tu respuesta", points: 100, required: true, options: [], correct: 0 }];
  }
  questions = questions.map((q) => ({
    id: q.id || uid("aq"),
    type: q.type === "single" ? "single" : "text",
    text: q.text || "",
    points: Number(q.points) || 10,
    required: q.required !== false,
    options: Array.isArray(q.options) ? q.options : [],
    correct: Number(q.correct) || 0,
  }));
  return {
    id: a.id || uid("as"),
    title: a.title || "Tarea práctica",
    instructions: a.instructions || "Responde las preguntas siguientes.",
    dueDate: a.dueDate || "",
    maxScore: Number(a.maxScore) || 100,
    passScore: Number(a.passScore ?? 60),
    allowFiles: a.allowFiles !== false,
    fileTypes: a.fileTypes || ["pdf", "stl", "jpg", "png"],
    questions,
  };
}

export function scoreAssignmentAnswers(assignment, answers, files = []) {
  let autoEarned = 0;
  let autoMax = 0;
  let hasText = false;
  const hasFiles = (files || []).length > 0;
  (assignment.questions || []).forEach((q) => {
    if (q.type === "text") {
      if (answers[q.id]?.text?.trim()) hasText = true;
      return;
    }
    if (q.type === "single") {
      autoMax += q.points || 10;
      if (Number(answers[q.id]?.selected) === Number(q.correct)) autoEarned += q.points || 10;
    }
  });
  return { autoEarned, autoMax, hasText, hasFiles };
}

export function getSubmission(studentId, path) {
  return loadRaw().submissions.find((s) => s.studentId === studentId && s.path === path) || null;
}

export function getSubmissions(filter = {}) {
  let list = [...loadRaw().submissions];
  if (filter.status) list = list.filter((s) => s.status === filter.status);
  if (filter.courseId) list = list.filter((s) => s.courseId === filter.courseId);
  if (filter.studentId) list = list.filter((s) => s.studentId === filter.studentId);
  return list.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
}

export function submitAssignment({ studentId, courseId, path, assignment, itemTitle, studentName, answers, files = [] }) {
  const data = loadRaw();
  const submissionFiles = Array.isArray(files) ? files : [];
  const { autoEarned, autoMax, hasText, hasFiles } = scoreAssignmentAnswers(assignment, answers, submissionFiles);
  const textPoints = (assignment.questions || []).filter((q) => q.type === "text").reduce((s, q) => s + (q.points || 10), 0);
  const maxScore = assignment.maxScore || autoMax + textPoints;

  let status = "pending_review";
  let totalScore = autoEarned;

  if (!hasText && !hasFiles && autoMax > 0) {
    const pct = Math.round((autoEarned / autoMax) * 100);
    status = pct >= (assignment.passScore ?? 60) ? "graded" : "failed";
    totalScore = Math.round((autoEarned / autoMax) * maxScore);
  } else if (hasText || hasFiles) {
    status = "pending_review";
  } else if (!hasText && !hasFiles && (assignment.questions || []).every((q) => q.type === "text")) {
    status = "pending_review";
  }

  const idx = data.submissions.findIndex((s) => s.studentId === studentId && s.path === path);
  const row = {
    id: idx >= 0 ? data.submissions[idx].id : uid("sub"),
    studentId,
    courseId,
    path,
    assignmentId: assignment.id,
    kind: "assignment",
    itemTitle,
    studentName,
    answers,
    files: submissionFiles,
    autoScore: autoEarned,
    autoMax,
    manualScore: null,
    totalScore,
    maxScore,
    status,
    feedback: "",
    submittedAt: new Date().toISOString(),
    gradedAt: status === "graded" ? new Date().toISOString() : null,
  };
  if (idx >= 0) data.submissions[idx] = row;
  else data.submissions.push(row);

  if (status === "graded" || status === "pending_review") {
    const prog = data.progress.find((p) => p.studentId === studentId && p.path === path);
    const progRow = {
      completed: true,
      completedAt: row.submittedAt,
      submissionScore: status === "graded" ? totalScore : undefined,
      submissionId: row.id,
      pendingGrade: status === "pending_review",
    };
    if (prog) Object.assign(prog, progRow);
    else data.progress.push({ id: uid("p"), studentId, courseId, path, ...progRow });
  }

  saveRaw(data);
  return row;
}

export function findItemByPath(course, path) {
  if (!course || !path) return null;
  if (path.startsWith("course:")) {
    const id = path.split(":")[1];
    return course.items?.find((i) => i.id === id) || null;
  }
  if (path.startsWith("module:")) {
    const [, mid, iid] = path.split(":");
    return course.structure.find((m) => m.id === mid)?.items?.find((i) => i.id === iid) || null;
  }
  if (path.startsWith("topic:")) {
    const [, mid, tid, iid] = path.split(":");
    const topic = course.structure.find((m) => m.id === mid)?.topics.find((t) => t.id === tid);
    return topic?.items?.find((i) => i.id === iid) || null;
  }
  return null;
}

export function scoreExamAnswers(exam, answers) {
  let autoEarned = 0;
  let autoMax = 0;
  let textMax = 0;
  let hasText = false;

  (exam.questions || []).forEach((q) => {
    if (q.type === "text") {
      textMax += q.points || 10;
      if (answers[q.id]?.text?.trim()) hasText = true;
      return;
    }
    autoMax += q.points || 10;
    const ans = answers[q.id];
    if (q.type === "multi") {
      const correct = (Array.isArray(q.correct) ? q.correct : [q.correct]).map(Number).sort();
      const picked = (Array.isArray(ans?.selected) ? ans.selected : []).map(Number).sort();
      const ok = correct.length === picked.length && correct.every((v, i) => v === picked[i]);
      if (ok) autoEarned += q.points || 10;
    } else if (Number(ans?.selected) === Number(q.correct)) {
      autoEarned += q.points || 10;
    }
  });

  const maxScore = Number(exam.maxScore) || autoMax + textMax;
  const autoPercent = autoMax ? Math.round((autoEarned / autoMax) * 100) : 0;
  const overallPercent = maxScore ? Math.round(((autoEarned) / maxScore) * 100) : autoPercent;

  return { autoEarned, autoMax, textMax, maxScore, hasText, autoPercent, overallPercent };
}

export function submitExam({ studentId, courseId, path, exam, itemTitle, studentName, answers }) {
  const data = loadRaw();
  const prev = data.submissions.find((s) => s.studentId === studentId && s.path === path);
  const attemptCount = (prev?.attemptCount || 0) + 1;
  const { autoEarned, autoMax, textMax, maxScore, hasText, autoPercent, overallPercent } = scoreExamAnswers(exam, answers);

  let status = "pending_review";
  let totalScore = autoEarned;

  if (hasText) {
    status = "pending_review";
  } else if (autoMax > 0) {
    const pct = autoPercent;
    status = pct >= (exam.passScore ?? 70) ? "graded" : "failed";
    totalScore = Math.round((autoEarned / autoMax) * maxScore);
  } else {
    status = "pending_review";
  }

  const idx = data.submissions.findIndex((s) => s.studentId === studentId && s.path === path);
  const row = {
    id: idx >= 0 ? data.submissions[idx].id : uid("sub"),
    kind: "exam",
    studentId,
    courseId,
    path,
    assignmentId: exam.id,
    itemTitle,
    studentName,
    answers,
    files: [],
    autoScore: autoEarned,
    autoMax,
    manualScore: null,
    totalScore,
    maxScore,
    status,
    feedback: "",
    attemptCount,
    passScore: exam.passScore ?? 70,
    submittedAt: new Date().toISOString(),
    gradedAt: status === "graded" ? new Date().toISOString() : null,
  };
  if (idx >= 0) data.submissions[idx] = row;
  else data.submissions.push(row);

  if (status === "graded" || status === "pending_review") {
    const prog = data.progress.find((p) => p.studentId === studentId && p.path === path);
    const progRow = {
      completed: true,
      completedAt: row.submittedAt,
      submissionScore: status === "graded" ? totalScore : undefined,
      examScore: status === "graded" ? autoPercent : undefined,
      submissionId: row.id,
      pendingGrade: status === "pending_review",
    };
    if (prog) Object.assign(prog, progRow);
    else data.progress.push({ id: uid("p"), studentId, courseId, path, ...progRow });
  } else if (status === "failed") {
    const prog = data.progress.find((p) => p.studentId === studentId && p.path === path);
    if (prog) {
      prog.completed = false;
      delete prog.examScore;
      delete prog.completedAt;
    }
  }

  saveRaw(data);
  return row;
}

export function gradeSubmission(submissionId, manualScore, feedback) {
  const data = loadRaw();
  const sub = data.submissions.find((s) => s.id === submissionId);
  if (!sub) return null;
  sub.manualScore = Number(manualScore) || 0;
  sub.feedback = feedback || "";
  sub.totalScore = sub.autoScore + sub.manualScore;
  sub.status = "graded";
  sub.gradedAt = new Date().toISOString();

  const prog = data.progress.find((p) => p.studentId === sub.studentId && p.path === sub.path);
  const examPercent = sub.maxScore ? Math.round((sub.totalScore / sub.maxScore) * 100) : 0;
  const progRow = {
    completed: true,
    completedAt: sub.gradedAt,
    submissionScore: sub.totalScore,
    submissionId: sub.id,
    pendingGrade: false,
    ...(sub.kind === "exam" ? { examScore: examPercent } : {}),
  };
  if (prog) Object.assign(prog, progRow);
  else data.progress.push({ id: uid("p"), studentId: sub.studentId, courseId: sub.courseId, path: sub.path, ...progRow });

  saveRaw(data);
  return sub;
}

/** Mensajes alumno ↔ profesor */
export function getMessages({ studentId = null, courseId = null } = {}) {
  let rows = loadRaw().messages || [];
  if (studentId) rows = rows.filter((m) => m.studentId === studentId);
  if (courseId) rows = rows.filter((m) => m.courseId === courseId);
  return rows.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

export function sendMessage({ studentId, courseId = null, text, from = "student", senderName = "" }) {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  const platform = getPlatformSettings();
  if (from === "student" && !platform.communication.messagesEnabled) return null;
  const data = loadRaw();
  if (!data.messages) data.messages = [];
  const resolvedName =
    senderName ||
    (from === "teacher" ? platform.communication.teacherName : from === "student" ? "Alumno" : "");
  const msg = {
    id: uid("msg"),
    studentId,
    courseId,
    from,
    senderName: resolvedName,
    text: trimmed,
    read: from === "student",
    createdAt: new Date().toISOString(),
  };
  data.messages.push(msg);
  saveRaw(data);
  return msg;
}

export function markStudentMessagesRead(studentId) {
  const data = loadRaw();
  let changed = false;
  (data.messages || []).forEach((m) => {
    if (m.studentId === studentId && m.from === "teacher" && !m.read) {
      m.read = true;
      changed = true;
    }
  });
  if (changed) saveRaw(data);
}

export function markTeacherMessagesRead(studentId) {
  const data = loadRaw();
  let changed = false;
  (data.messages || []).forEach((m) => {
    if (m.studentId === studentId && m.from === "student" && !m.read) {
      m.read = true;
      changed = true;
    }
  });
  if (changed) saveRaw(data);
}

export function getUnreadMessageCount(studentId) {
  return (loadRaw().messages || []).filter(
    (m) => m.studentId === studentId && m.from === "teacher" && !m.read
  ).length;
}

export function getTeacherUnreadCount() {
  return (loadRaw().messages || []).filter((m) => m.from === "student" && !m.read).length;
}

export function getMessageThreads() {
  const map = new Map();
  (loadRaw().messages || []).forEach((m) => {
    if (!map.has(m.studentId)) {
      map.set(m.studentId, {
        studentId: m.studentId,
        student: getStudent(m.studentId),
        unread: 0,
        lastAt: m.createdAt,
        lastText: m.text,
        courseId: m.courseId,
      });
    }
    const t = map.get(m.studentId);
    if (new Date(m.createdAt) >= new Date(t.lastAt)) {
      t.lastAt = m.createdAt;
      t.lastText = m.text;
      t.courseId = m.courseId;
    }
    if (m.from === "student" && !m.read) t.unread += 1;
  });
  return [...map.values()].sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
}

export function getCommunityPosts(filter = {}) {
  let list = (loadRaw().communityPosts || []).map(normalizeCommunityPost);
  if (filter.courseId === "global") list = list.filter((p) => !p.courseId);
  else if (filter.courseId) list = list.filter((p) => p.courseId === filter.courseId);
  if (filter.published === true) list = list.filter((p) => p.published);
  if (filter.published === false) list = list.filter((p) => !p.published);
  return list.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

export function getCommunityPost(id) {
  return getCommunityPosts().find((p) => p.id === id) || null;
}

export function getCommunityStats() {
  const posts = getCommunityPosts();
  const courses = getCourses();
  const students = getStudents().filter((s) => s.status === "active");
  return {
    total: posts.length,
    published: posts.filter((p) => p.published).length,
    pinned: posts.filter((p) => p.pinned).length,
    global: posts.filter((p) => !p.courseId).length,
    reach: students.length,
    courses: courses.length,
  };
}

export function createCommunityPost(payload) {
  const data = loadRaw();
  if (!data.communityPosts) data.communityPosts = [];
  const post = normalizeCommunityPost({
    ...payload,
    id: uid("post"),
    authorName: payload.authorName || getPlatformSettings().communication.teacherName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  data.communityPosts.unshift(post);
  saveRaw(data);
  logActivity("community_post", post.courseId, post.title);
  return post;
}

export function saveCommunityPost(post) {
  const data = loadRaw();
  const normalized = normalizeCommunityPost({ ...post, updatedAt: new Date().toISOString() });
  const i = (data.communityPosts || []).findIndex((p) => p.id === normalized.id);
  if (i < 0) return null;
  data.communityPosts[i] = normalized;
  saveRaw(data);
  return normalized;
}

export function deleteCommunityPost(id) {
  const data = loadRaw();
  const before = (data.communityPosts || []).length;
  data.communityPosts = (data.communityPosts || []).filter((p) => p.id !== id);
  if (data.communityPosts.length === before) return false;
  saveRaw(data);
  return true;
}

function getSystemCommunityAnnouncements(courses) {
  return courses.flatMap((c) => {
    const items = [];
    if (c.settings?.certificateEnabled !== false && getPlatformSettings().learning.certificatesEnabled) {
      items.push({
        id: `sys-cert-${c.id}`,
        courseId: c.id,
        courseTitle: c.title,
        icon: "✦",
        title: "Certificado disponible al completar",
        text: `Completa el 100% de «${c.title}» para obtener tu certificado oficial.`,
        date: c.updatedAt || c.createdAt,
        pinned: false,
        isSystem: true,
      });
    }
    return items;
  });
}

export function getCommunityAnnouncements(studentId) {
  if (!getPlatformSettings().communication.communityEnabled) return [];
  const courses = getStudentCourses(studentId);
  const courseIds = new Set(courses.map((c) => c.id));
  const courseMap = Object.fromEntries(courses.map((c) => [c.id, c.title]));

  const adminPosts = getCommunityPosts({ published: true })
    .filter((p) => !p.courseId || courseIds.has(p.courseId))
    .map((p) => ({
      id: p.id,
      courseId: p.courseId,
      courseTitle: p.courseId ? courseMap[p.courseId] || "Curso" : getPlatformSettings().branding.academyName,
      icon: p.icon,
      title: p.title,
      text: p.text,
      date: p.createdAt,
      pinned: p.pinned,
      authorName: p.authorName,
      isAdmin: true,
    }));

  const system = getSystemCommunityAnnouncements(courses);

  return [...adminPosts, ...system].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.date) - new Date(a.date);
  });
}

export function getStudentCalendarEvents(studentId) {
  const events = [];
  const courses = getStudentCourses(studentId);

  courses.forEach((course) => {
    getCourseCurriculum(course).forEach((row) => {
      if (row.item.kind === "exam") {
        const sub = getSubmission(studentId, row.path);
        if (sub?.submittedAt) {
          events.push({
            id: `exam-sub-${row.path}`,
            date: sub.submittedAt,
            title: row.item.title,
            type: "examen",
            courseId: course.id,
            courseTitle: course.title,
            meta: sub.status === "graded" ? "Aprobado" : sub.status === "failed" ? "No aprobado" : "Enviado",
          });
        } else if (isCurriculumItemUnlocked(course, row, studentId)) {
          const due = new Date();
          due.setDate(due.getDate() + 14);
          events.push({
            id: `exam-due-${row.path}`,
            date: due.toISOString(),
            title: row.item.title,
            type: "deadline",
            courseId: course.id,
            courseTitle: course.title,
            meta: `Nota mínima ${row.item.passScore || 70}%`,
          });
        }
      }
      if (row.item.kind === "activity" && row.item.assignment) {
        const sub = getSubmission(studentId, row.path);
        if (sub?.submittedAt) {
          events.push({
            id: `act-${row.path}`,
            date: sub.submittedAt,
            title: row.item.title,
            type: "entrega",
            courseId: course.id,
            courseTitle: course.title,
            meta: sub.status === "pending_review" ? "Pendiente corrección" : sub.status,
          });
        }
      }
    });

    getStudentProgress(studentId, course.id)
      .filter((p) => p.completedAt)
      .forEach((p) => {
        const row = getCourseCurriculum(course).find((r) => r.path === p.path);
        events.push({
          id: `prog-${p.id}`,
          date: p.completedAt,
          title: row?.item?.title || "Lección completada",
          type: "progreso",
          courseId: course.id,
          courseTitle: course.title,
          meta: "Completado",
        });
      });

    events.push({
      id: `live-${course.id}`,
      date: new Date(Date.now() + 5 * 86400000).toISOString(),
      title: `Q&A con ${course.instructor}`,
      type: "live",
      courseId: course.id,
      courseTitle: course.title,
      meta: "Sesión en directo",
    });
  });

  return events.sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function getCourseCompletionDate(studentId, courseId) {
  const rows = getStudentProgress(studentId, courseId).filter((p) => p.completedAt);
  if (!rows.length) return null;
  return rows.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0].completedAt;
}

export function isCertificateEligible(studentId, courseId) {
  const platform = getPlatformSettings();
  if (!platform.learning.certificatesEnabled) return false;
  const course = getCourse(courseId);
  if (!course || course.settings?.certificateEnabled === false) return false;
  const prog = getStudentCourseProgress(studentId, courseId);
  return prog.percent >= 100;
}

/** Elimina el envío de examen para que el alumno pueda reintentar desde cero (acción admin). */
export function resetExamSubmission(studentId, path) {
  const data = loadRaw();
  const before = data.submissions.length;
  data.submissions = data.submissions.filter(
    (s) => !(s.studentId === studentId && s.path === path && s.kind === "exam")
  );
  if (data.submissions.length === before) return false;
  saveRaw(data);
  return true;
}

export function createQuiz() {
  return {
    id: uid("qz"),
    title: "Cuestionario",
    timeLimitMin: 15,
    maxAttempts: 3,
    passScore: 70,
    questions: [
      { id: uid("q"), type: "single", text: "¿Pregunta de ejemplo?", options: ["Opción A", "Opción B", "Opción C"], correct: 0, points: 10 },
    ],
  };
}

export function countLessons(course) {
  let n = 0;
  course.structure.forEach((m) =>
    m.topics.forEach((t) => {
      n += (t.items || []).filter((i) => i.kind === "lesson").length;
    })
  );
  return n;
}

export { emptyMod, emptyTopic, emptyLesson, normalizeItem };
