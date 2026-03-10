# Salesianos FC — Frontend

Aplicación web para la gestión del equipo de fútbol amateur Salesianos FC.

## Stack

- **React** 19
- **TypeScript**
- **Vite** 7
- **TailwindCSS** 4
- **React Router** 7
- **Lucide React** (iconos)
- **Mapbox GL** (selector de ubicación en torneos, opcional)

## Requisitos

- Node.js 18+
- npm o pnpm

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/NoahSPA/salesianos_frontend.git
cd salesianos_frontend

# Dependencias
npm install

# Variables de entorno: copiar plantilla y editar
copy .env.example .env   # Windows
# cp .env.example .env   # Linux/macOS
# Editar .env con VITE_API_BASE (URL del backend) y opcionalmente VITE_MAPBOX_TOKEN
```

## Ejecución

```bash
# Desarrollo (con hot reload)
npm run dev

# Build de producción
npm run build

# Vista previa del build
npm run preview
```

Por defecto el dev server corre en http://localhost:5173 y usa el backend en `http://localhost:8000` si no se define `VITE_API_BASE`.

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `VITE_API_BASE` | URL base de la API (ej. `http://localhost:8000`) |
| `VITE_MAPBOX_TOKEN` | Token de Mapbox para el selector de ubicación en torneos (opcional) |

Todas las variables deben tener el prefijo `VITE_` para exponerse al cliente. Ver `.env.example`.

## Estructura

- `src/app/` — configuración de API, router, estilos base
- `src/components/` — componentes reutilizables
- `src/pages/` — páginas/vistas
- `src/hooks/` — hooks personalizados
- `src/services/` — llamadas a la API

## Backend

Este frontend consume la API del proyecto [salesianos_backend](https://github.com/NoahSPA/salesianos_backend). Arranca el backend y configura `VITE_API_BASE` para apuntar a su URL.

## Seguridad

- No subir `.env` ni tokens al repositorio.
- En producción, usar HTTPS y orígenes permitidos en CORS del backend.
