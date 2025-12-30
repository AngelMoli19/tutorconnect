# 🖼️ Fondos Personalizados para TutorConnect

Esta carpeta contiene las imágenes de fondo para las páginas de autenticación (Login, Recuperar Contraseña, Reset Password).

## 📁 Estructura

```
backgrounds/
├── README.md           ← Este archivo
├── default-login.jpg   ← Imagen por defecto (colócala aquí)
└── [tus imágenes]      ← Agrega tus propias imágenes
```

## 🎨 Cómo Cambiar la Imagen de Fondo

### Opción 1: Usar una imagen de esta carpeta

1. **Coloca tu imagen** en esta carpeta: `frontend/public/backgrounds/`
   - Nombre recomendado: `default-login.jpg` (sobrescribir la existente)
   - O usa cualquier nombre: `mi-fondo.jpg`, `bosque.png`, etc.

2. **Actualiza el CSS** en `frontend/src/index.css`:

   Busca la línea **76** donde dice:
   ```css
   --login-background-image: url('/backgrounds/default-login.jpg');
   ```

   Cámbiala por tu imagen:
   ```css
   --login-background-image: url('/backgrounds/mi-fondo.jpg');
   ```

3. **Listo!** Guarda y recarga la página.

---

### Opción 2: Usar una imagen externa (URL)

Si quieres usar una imagen de internet:

```css
--login-background-image: url('https://ejemplo.com/mi-imagen.jpg');
```

---

## ⚙️ Ajustes Adicionales

### Controlar la oscuridad del overlay

En la misma sección del archivo `index.css`, línea **77**:

```css
--login-overlay-opacity: 0.4;  /* Valores: 0.0 (claro) - 1.0 (oscuro) */
```

- `0.0` = Sin overlay (imagen totalmente visible)
- `0.3` = Overlay ligero
- **`0.4`** = Por defecto (balance)
- `0.6` = Overlay oscuro
- `1.0` = Completamente negro

---

## 📏 Especificaciones Técnicas

### Formatos soportados:
- ✅ `.jpg` / `.jpeg`
- ✅ `.png`
- ✅ `.webp`
- ✅ `.svg`

### Tamaños recomendados:
- **Resolución mínima:** 1920x1080 px (Full HD)
- **Resolución óptima:** 2560x1440 px (2K) o superior
- **Peso:** Menor a 2 MB (optimiza con herramientas como TinyPNG)

### Estilo recomendado:
- ✅ Fondos con profundidad (bosques, paisajes, abstractos)
- ✅ Colores oscuros o con tonos fríos/cálidos balanceados
- ✅ Sin texto ni elementos que distraigan
- ⚠️ Evita fondos muy claros (el texto es blanco)
- ⚠️ Evita fondos con mucho detalle en el centro

---

## 🎯 Ejemplos de Configuración

### Fondo oscuro (overlay bajo)
```css
--login-background-image: url('/backgrounds/bosque-oscuro.jpg');
--login-overlay-opacity: 0.2;  /* Menos overlay porque ya es oscuro */
```

### Fondo claro (overlay alto)
```css
--login-background-image: url('/backgrounds/cielo-claro.jpg');
--login-overlay-opacity: 0.7;  /* Más overlay para legibilidad */
```

### Fondo abstracto (overlay medio)
```css
--login-background-image: url('/backgrounds/gradiente-azul.jpg');
--login-overlay-opacity: 0.4;  /* Balance perfecto */
```

---

## 🔄 Cambios en tiempo real

Si usas el servidor de desarrollo (`npm run dev`), los cambios en el CSS se aplicarán automáticamente al guardar el archivo.

---

## 🆘 Solución de Problemas

### ❌ La imagen no se muestra

1. **Verifica la ruta:**
   - La imagen DEBE estar en: `frontend/public/backgrounds/`
   - La ruta en CSS debe ser: `/backgrounds/nombre-archivo.jpg`
   - ⚠️ NO uses: `./backgrounds/` ni `../backgrounds/`

2. **Verifica el nombre del archivo:**
   - Coincide exactamente (mayúsculas/minúsculas)
   - Incluye la extensión (.jpg, .png, etc.)

3. **Recarga el navegador:**
   - Presiona `Ctrl + F5` (Windows) o `Cmd + Shift + R` (Mac)
   - Borra la caché del navegador si es necesario

### ❌ El texto no se lee bien

- Aumenta el `--login-overlay-opacity` a 0.6 o más
- Usa una imagen más oscura
- Aplica blur a la imagen antes de usarla

---

## 💡 Tips para Fondos Profesionales

1. **Sitios para descargar imágenes gratuitas:**
   - [Unsplash](https://unsplash.com/) - Paisajes, naturaleza
   - [Pexels](https://pexels.com/) - Variedad general
   - [Pixabay](https://pixabay.com/) - Abstractos

2. **Optimizar imágenes:**
   - [TinyPNG](https://tinypng.com/) - Reduce peso sin perder calidad
   - [Squoosh](https://squoosh.app/) - Conversor y optimizador

3. **Crear gradientes personalizados:**
   - [Mesh Gradients](https://meshgradient.com/)
   - [Cool Backgrounds](https://coolbackgrounds.io/)

---

## 📞 Soporte

Si necesitas ayuda adicional, consulta la documentación principal en `frontend/README.md` o `README.md` en la raíz del proyecto.

**¡Disfruta personalizando TutorConnect!** 🚀
