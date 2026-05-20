import { requireStudent, logoutStudent, getStudentSessionId } from "../js/auth.js";
import { getStudent, getStudentCourses, getStudentCourseProgress, formatPrice } from "../js/data.js";

const studentId = requireStudent();
if (!studentId) throw new Error("unauthorized");

const student = getStudent(studentId);
document.getElementById("campusUser").textContent = student?.name || "Alumno";
document.getElementById("logoutBtn").onclick = logoutStudent;

const grid = document.getElementById("coursesGrid");
const courses = getStudentCourses(studentId);

grid.innerHTML = courses.length
  ? courses
      .map((c) => {
        const prog = getStudentCourseProgress(studentId, c.id);
        return `
      <article class="campus-course-card">
        <div class="campus-course-cover" style="background-image:url('${c.coverImage || ""}')"></div>
        <div class="campus-course-body">
          <p class="campus-course-tag">${c.category} · ${c.level}</p>
          <h3 class="campus-course-title">${c.title}</h3>
          <p class="admin-muted">${c.subtitle}</p>
          <div class="campus-progress">
            <div class="campus-progress-bar"><div class="campus-progress-fill" style="width:${prog.percent}%"></div></div>
            <div class="campus-progress-label"><span>${prog.completed} / ${prog.total} completados</span><span>${prog.percent}%</span></div>
          </div>
          <a href="/campus/curso?id=${c.id}" class="campus-btn campus-btn--gold">${prog.percent ? "Continuar" : "Empezar curso"}</a>
        </div>
      </article>`;
      })
      .join("")
  : `<p class="admin-muted">No tienes cursos asignados. Contacta con administración.</p>`;
