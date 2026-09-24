# Farmago

App móvil de salud y farmacia para encontrar farmacias con stock de medicamentos, escanear recetas médicas con IA y seguir tus tratamientos.

Construida con **Expo SDK 57**, **React Native**, **expo-router**, **NativeWind** y **Zustand**.

## Requisitos

- Node.js ≥ 20 (verificado con Node v25)
- npm
- [Expo Go](https://expo.dev/go) instalado en tu celular (Android o iPhone)
- El celular y tu computadora en la **misma red Wi-Fi**

> **Sobre Expo Go:** la app usa `google` como proveedor de mapa por defecto (`react-native-maps`), que funciona en Expo Go. El proveedor **Mapbox** (`@rnmapbox/maps`) requiere un development build, no corre en Expo Go.
> Sin API keys, el mapa muestra un placeholder pastel y el escaneo usa datos demo — podés validar todo el diseño sin configurar nada.

## Ejecutar la app en Expo Go

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Crear el archivo de entorno (opcional, la app funciona sin él):

   ```bash
   cp .env.example .env
   ```

3. Levantar el servidor de desarrollo:

   ```bash
   npx expo start
   ```

4. Escanear el **código QR** que aparece en la terminal con la app **Expo Go** (iOS: desde la cámara; Android: desde Expo Go).

   Si el QR no conecta (redes con aislamiento de cliente, como algunas Wi-Fi corporativas o públicas), usá túnel:

   ```bash
   npx expo start --tunnel
   ```

5. También podés presionar en la terminal:
   - `a` → abrir en un emulador de Android
   - `i` → abrir en el simulador de iOS (requiere Xcode)
   - `w` → abrir en el navegador

## Variables de entorno

Copiá `.env.example` a `.env` y completá lo que quieras activar:

| Variable | Descripción |
|---|---|
| `EXPO_PUBLIC_MAP_PROVIDER` | `google` (por defecto) o `mapbox` |
| `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` | Token público de Mapbox (requiere dev build) |
| `EXPO_PUBLIC_MAPBOX_STYLE_URL` | Style URL de Mapbox Studio |
| `ANDROID_MAPS_API_KEY` | API key del Maps SDK de Google (se inyecta al manifest Android en build) |
| `IOS_MAPS_API_KEY` | Opcional, solo si usás PROVIDER_GOOGLE en iOS |
| `EXPO_PUBLIC_GEMINI_API_KEY` | API key de Google AI Studio para el escaneo de recetas |
| `EXPO_PUBLIC_GEMINI_MODEL` | Modelo de Gemini, por defecto `gemini-2.5-flash` |

## Scripts

| Comando | Descripción |
|---|---|
| `npm start` | `npx expo start` |
| `npm run android` | Abrir en emulador Android |
| `npm run ios` | Abrir en simulador iOS |
| `npm run web` | Abrir en navegador |
| `npm run lint` | ESLint (`expo lint`) |

## Estructura del proyecto

```
src/
├── app/               # Rutas de expo-router (file-based routing)
│   ├── _layout.tsx    # Stack raíz + fuentes + splash
│   ├── index.tsx      # Mapa de farmacias con stock (/)
│   ├── escaneo.tsx    # Escaneo de recetas con Gemini (modal)
│   └── recetas/       # Historial y tratamientos
├── components/        # maps/, records/, ui/
├── constants/         # env, colores, estilo pastel del mapa
├── data/mock.ts       # Tipos y datos de ejemplo
├── services/gemini.ts # Integración con Gemini (REST)
├── store/             # Estado Zustand (tratamientos)
└── utils/             # Cálculo de dosis y duración
```

## Funcionalidades

- **Mapa de farmacias** — buscador de medicamentos y tarjeta de farmacia con stock
- **Escaneo de recetas con IA** — foto o galería → Gemini extrae medicamentos, dosis, frecuencia, duración, médico e institución
- **Historial de recetas** — tira de 7 días y filtros (todo / compradas / pasadas)
- **Tratamientos activos** — progreso de tomas con checkbox y duración estimada

## Licencia

[MIT](LICENSE)