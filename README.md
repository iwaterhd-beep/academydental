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

## Desplegar en Vercel

1. Entra en [vercel.com](https://vercel.com) e inicia sesión con GitHub.
2. **Add New → Project** e importa el repo `iwaterhd-beep/academydental`.
3. Deja la configuración por defecto:
   - **Framework Preset:** Other
   - **Build Command:** `npm run build` (o vacío)
   - **Output Directory:** `.` (raíz del proyecto)
   - **Install Command:** `npm install`
4. Pulsa **Deploy**.

La app es estática (HTML/CSS/JS). No hace falta base de datos en Vercel: los datos de demo viven en el `localStorage` de cada navegador.

### URLs en producción

| Ruta | Uso |
|------|-----|
| `/` | Login |
| `/admin/` | Panel admin |
| `/campus/` | Campus alumno |

### Credenciales demo

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | `cursos@admin.com` | `9999` |
| Alumno | `cursos@alumno.com` | `9999` |

### Reset alumno demo en producción

Abre `https://tu-dominio.vercel.app/?resetDemo=1` y vuelve a iniciar sesión como alumno.

## Panel admin

| Sección | Función |
|---------|---------|
| Dashboard | Métricas generales |
| Cursos | Listado + entrar al constructor |
| Alumnos | Matrículas y asignación |
| Progreso | % completado por alumno |
