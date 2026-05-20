import { getSampleCourseRaw, getDemoStudentRaw, SAMPLE_COURSE_ID, DEMO_STUDENT_EMAIL } from "./sample-course.js";

const STORAGE_KEY = "vallodental_academy_data";
const DATA_VERSION = 3;

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
        dataVersion: DATA_VERSION,
      });
      saveRaw(data);
      return data;
    }
    const parsed = JSON.parse(raw);
    const data = {
      courses: (parsed.courses || []).map(normalizeCourse),
      students: parsed.students || [],
      progress: parsed.progress || [],
      activityLogs: parsed.activityLogs || [],
      submissions: parsed.submissions || [],
      dataVersion: parsed.dataVersion || 0,
    };
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
  return saveStudent({
    id: uid("s"),
    name: payload.name,
    email: payload.email,
    status: payload.status || "active",
    courseIds: payload.courseIds || [],
    createdAt: new Date().toISOString(),
  });
}

export function deleteStudent(id) {
  const data = loadRaw();
  data.students = data.students.filter((s) => s.id !== id);
  data.progress = data.progress.filter((p) => p.studentId !== id);
  saveRaw(data);
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
  const questions = (a.questions?.length ? a.questions : [
    { type: "text", text: "Escribe tu respuesta", points: 100, required: true, options: [], correct: 0 },
  ]).map((q) => ({
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

export function scoreAssignmentAnswers(assignment, answers) {
  let autoEarned = 0;
  let autoMax = 0;
  let hasText = false;
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
  return { autoEarned, autoMax, hasText };
}

export function getSubmission(studentId, path) {
  return loadRaw().submissions.find((s) => s.studentId === studentId && s.path === path) || null;
}

export function getSubmissions(filter = {}) {
  let list = [...loadRaw().submissions];
  if (filter.status) list = list.filter((s) => s.status === filter.status);
  if (filter.courseId) list = list.filter((s) => s.courseId === filter.courseId);
  return list.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
}

export function submitAssignment({ studentId, courseId, path, assignment, itemTitle, studentName, answers }) {
  const data = loadRaw();
  const { autoEarned, autoMax, hasText } = scoreAssignmentAnswers(assignment, answers);
  const textPoints = (assignment.questions || []).filter((q) => q.type === "text").reduce((s, q) => s + (q.points || 10), 0);
  const maxScore = assignment.maxScore || autoMax + textPoints;

  let status = "pending_review";
  let totalScore = autoEarned;

  if (!hasText && autoMax > 0) {
    const pct = Math.round((autoEarned / autoMax) * 100);
    status = pct >= (assignment.passScore ?? 60) ? "graded" : "failed";
    totalScore = Math.round((autoEarned / autoMax) * maxScore);
  } else if (!hasText && (assignment.questions || []).every((q) => q.type === "text")) {
    status = "pending_review";
  } else if (hasText) {
    status = "pending_review";
  }

  const idx = data.submissions.findIndex((s) => s.studentId === studentId && s.path === path);
  const row = {
    id: idx >= 0 ? data.submissions[idx].id : uid("sub"),
    studentId,
    courseId,
    path,
    assignmentId: assignment.id,
    itemTitle,
    studentName,
    answers,
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

  if (status === "graded") {
    const prog = data.progress.find((p) => p.studentId === studentId && p.path === path);
    const progRow = {
      completed: true,
      completedAt: row.gradedAt,
      submissionScore: totalScore,
      submissionId: row.id,
    };
    if (prog) Object.assign(prog, progRow);
    else data.progress.push({ id: uid("p"), studentId, courseId, path, ...progRow });
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
  const progRow = {
    completed: true,
    completedAt: sub.gradedAt,
    submissionScore: sub.totalScore,
    submissionId: sub.id,
  };
  if (prog) Object.assign(prog, progRow);
  else data.progress.push({ id: uid("p"), studentId: sub.studentId, courseId: sub.courseId, path: sub.path, ...progRow });

  saveRaw(data);
  return sub;
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
