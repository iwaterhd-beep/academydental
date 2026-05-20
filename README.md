# Vallodental Academy

Plataforma HTML con login admin y **constructor visual de cursos** tipo Notion/Kajabi.

**Producción:** https://academydental.vercel.app

## Arrancar en local

```bash
npm install
npm run dev
```

- Login: http://localhost:3000
- Admin: http://localhost:3000/admin/
- Campus alumno: http://localhost:3000/campus/
- Constructor: http://localhost:3000/admin/curso-editor?new=1

## Acceso demo

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | `cursos@admin.com` | `9999` |
| Alumno | `cursos@alumno.com` | `9999` |

## Desplegar en Vercel

Repo: [github.com/iwaterhd-beep/academydental](https://github.com/iwaterhd-beep/academydental)

| Campo | Valor |
|-------|--------|
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

Panel: [vercel.com/iwaterhd-beeps-projects/academydental](https://vercel.com/iwaterhd-beeps-projects/academydental)

### Dominio propio

1. Vercel → proyecto **academydental** → **Settings → Domains**
2. Añade tu dominio (ej. `cursos.vallodental.com`)
3. Configura el DNS según indique Vercel (registro CNAME o A)

### Reset alumno demo (producción)

- URL: `https://academydental.vercel.app/?resetDemo=1`
- Admin → **Configuración → Avanzado → Reiniciar alumno demo**
- Campus → **Ajustes → Reiniciar mi progreso**

## Datos

Los datos viven en **`localStorage`** del navegador (demo / prototipo). Cada dispositivo tiene su copia.

En **Admin → Configuración → Avanzado** puedes:

- Exportar / importar backup JSON
- Restaurar curso demo
- Reiniciar alumno demo

Preparado para migrar a Supabase en el futuro.

## Constructor de cursos

- **3 paneles**: estructura · editor · vista previa
- **Autoguardado** cada ~2 s
- **Curso → Módulos → Temas → Lecciones / Actividades / Exámenes**
- Bloques tipo Notion, drag & drop, tareas con archivos, tests, desbloqueo progresivo

## Panel admin

| Sección | Función |
|---------|---------|
| Dashboard | Métricas y actividad |
| Cursos | Listado + constructor |
| Alumnos | Matrículas, reinicio de progreso |
| Correcciones | Revisar entregas |
| Mensajes | Chat con alumnos |
| Comunidad | Anuncios |
| Pagos / Certificados / Streaming | Gestión (demo) |
| Configuración | Marca, acceso, backups |

## Campus alumno

Dashboard premium, reproductor de curso, tareas, calendario, certificados PDF, mensajes, modo claro/oscuro.
