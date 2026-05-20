# Vallodental Academy

Plataforma HTML con login admin y **constructor visual de cursos** tipo Notion/Kajabi.

## Arrancar

```bash
npm install
npm run dev
```

- Login: http://localhost:3000
- Admin: http://localhost:3000/admin/
- **Constructor de cursos**: http://localhost:3000/admin/curso-editor.html?new=1

## Acceso admin

| Email | Contraseña |
|-------|------------|
| `cursos@admin.com` | `9999` |

## Constructor de cursos

Editor visual premium con:

- **3 paneles**: estructura (árbol) · editor · vista previa en vivo
- **Autoguardado** cada ~2 segundos
- **Curso → Módulos → Temas → Lecciones**
- **Bloques**: títulos, texto con color, emojis, imágenes, galerías, vídeo, PDF, STL, audio, listas, tablas, acordeones, tabs, alertas, botones
- **Drag & drop** para reordenar bloques
- **Tareas** con fecha límite y subida de archivos
- **Tests** con preguntas test, tiempo límite e intentos
- **Desbloqueo** progresivo, por fecha o manual
- **Duplicar** cursos y lecciones
- Portada, banner, trailer, categoría, nivel, instructor, etiquetas

Datos en `localStorage` (preparado para migrar a Supabase).

## Panel admin

| Sección | Función |
|---------|---------|
| Dashboard | Métricas generales |
| Cursos | Listado + entrar al constructor |
| Alumnos | Matrículas y asignación |
| Progreso | % completado por alumno |
