# WA Sender Pro 🚀

WA Sender Pro es una solución premium de envío masivo para WhatsApp, diseñada con una arquitectura moderna y escalable.

## 🌟 Características
- **Dashboard en Tiempo Real:** Estadísticas detalladas de tus campañas.
- **Gestión de Contactos:** CRM integrado con soporte para etiquetas y notas.
- **Importación Masiva:** Sube tus listas desde Excel (XLSX, CSV).
- **Motor de Envío Inteligente:** Delays personalizables y gestión de lotes para evitar bloqueos.
- **Seguridad:** Autenticación robusta y aislamiento de datos (RLS) con Supabase.

## 🛠️ Stack Tecnológico
- **Frontend:** HTML5, CSS3, JavaScript Vanilla (Modular).
- **Backend:** [Supabase](https://supabase.com/) (Auth, PostgreSQL, RLS).
- **Hosting:** [Vercel](https://vercel.com/).

## 🚀 Instalación y Despliegue

### 1. Configuración de Supabase
1. Crea un nuevo proyecto en Supabase.
2. Ejecuta el archivo `sql/schema.sql` en el SQL Editor para crear las tablas, índices y funciones.
3. Habilita los proveedores de autenticación necesarios (Email/Password).

### 2. Configuración del Proyecto
1. Clona este repositorio.
2. Abre `js/supabase-client.js`.
3. Reemplaza los campos `url` y `key` con tus credenciales de Supabase (las encuentras en Settings > API).

### 3. Despliegue en Vercel
1. Instala el CLI de Vercel o conecta tu repositorio de GitHub.
2. Ejecuta `vercel` o haz push a tu rama principal.

---
Desarrollado con ❤️ para automatización de marketing.
