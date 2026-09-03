/**
 * photoService.js - Gestión de fotos y su sincronización con Android
 */

window.PhotoService = {
    /**
     * Carga una lista de fotos desde el disco de Android
     * @param {String} imagenesCsv - Nombres de archivos separados por coma
     * @returns {Array} Array de objetos {name, data}
     */
    loadPhotosFromDisk: function (imagenesCsv) {
        if (!imagenesCsv) return [];

        const nombres = imagenesCsv.split(',').filter(f => f.trim());

        return nombres.map(nombre => {
            const base64 = (typeof Android !== 'undefined' && typeof Android.loadPhotoAsBase64 === 'function')
                ? Android.loadPhotoAsBase64(nombre.trim())
                : '';

            return {
                name: nombre.trim(),
                data: base64 ? `data:image/jpeg;base64,${base64}` : null
            };
        });
    },

    /**
     * Elimina físicamente archivos de fotos del disco de Android
     * @param {Array} fotosParaBorrar - Array de objetos que contienen la propiedad 'name'
     */
    deletePhotosFromDisk: function (fotosParaBorrar) {
        if (!fotosParaBorrar || fotosParaBorrar.length === 0) return;

        console.log(`🗑️ Eliminando ${fotosParaBorrar.length} fotos físicas...`);
        fotosParaBorrar.forEach(foto => {
            if (typeof Android !== 'undefined' && typeof Android.deletePhotoFile === 'function') {
                Android.deletePhotoFile(foto.name);
            }
        });
    },

    /**
     * Manejador global para fotos capturadas desde Android
     * @param {String} filename - Nombre del archivo
     * @param {String} base64Data - Datos en base64
     * @param {Object} ctx - Contexto reactivo de la app
     */
    handleAndroidPhoto: function (filename, base64Data, ctx) {
        console.log('📷 Procesando foto en PhotoService:', filename);
        if (!ctx) return;

        try {
            const fotoObj = {
                name: filename,
                data: base64Data ? `data:image/jpeg;base64,${base64Data}` : null
            };

            if (ctx.tomandoFotoFrente && ctx.tomandoFotoFrente.value) {
                // Asignar al campo FotoFrente
                if (ctx.formData.value) {
                    // Si la FotoFrente que se está reemplazando también se tomó en ESTA sesión
                    // (aún no guardada), su archivo se borra ya: ningún registro persistido la
                    // referencia, y commit() solo compara contra fotoFrenteOriginal, así que de
                    // lo contrario quedaría huérfana para siempre al guardar. La FotoFrente que
                    // venía de la BD nunca se toca aquí: eso lo decide commit().
                    const anterior = ctx.formData.value.FotoFrente;
                    if (anterior && anterior !== filename && ctx.fotosNuevas.value.some(f => f.name === anterior)) {
                        this.deletePhotosFromDisk([{ name: anterior }]);
                        const idxAnterior = ctx.fotosNuevas.value.findIndex(f => f.name === anterior);
                        if (idxAnterior > -1) ctx.fotosNuevas.value.splice(idxAnterior, 1);
                    }
                    ctx.formData.value.FotoFrente = filename;
                }
                ctx.tomandoFotoFrente.value = false;
                ctx.fotosNuevas.value.push({ ...fotoObj });
                // Cerrar el FileBrowser AHORA que la foto ya está asignada en formData.
                // Esto garantiza que el watcher de FormFicha se dispare con el valor correcto
                // y evita el race condition donde el componente se remontaba antes de tener la foto.
                if (typeof ctx.cancelFileBrowser === 'function') {
                    ctx.cancelFileBrowser();
                }
            } else {
                // Actualizar estado Vue general
                ctx.fotos.value.push(fotoObj);
                ctx.fotosNuevas.value.push({ ...fotoObj });

                // Sincronizar campo Imagenes en el modelo actual
                if (ctx.formData.value) {
                    ctx.formData.value.Imagenes = ctx.fotos.value.map(f => f.name).join(',');
                }
            }
        } catch (error) {
            console.error('❌ Error agregando foto en PhotoService:', error);
        }
    },

    /**
     * Promueve una foto ya existente en "Fotografías Adicionales" a Foto de Frente. La foto
     * sigue referenciada en Imagenes (queda visible en ambos lados, decisión explícita del
     * usuario -- eliminarla de uno de los dos lados es manual, con los botones normales). Misma
     * lógica de limpieza que la rama `tomandoFotoFrente` de handleAndroidPhoto: si la FotoFrente
     * que se reemplaza se tomó/importó en ESTA sesión (aún no guardada), se borra ya del disco
     * -- de lo contrario quedaría huérfana para siempre (nada la referenciaría ni en Imagenes ni
     * en FotoFrente). La FotoFrente que venía de la BD nunca se toca aquí: eso lo decide commit().
     * @param {String} filename - Nombre del archivo ya existente en Imagenes
     * @param {Object} ctx - Contexto reactivo de la app
     */
    usarComoFotoFrente: function (filename, ctx) {
        if (!ctx || !ctx.formData.value) return;
        const anterior = ctx.formData.value.FotoFrente;
        if (anterior && anterior !== filename && ctx.fotosNuevas.value.some(f => f.name === anterior)) {
            this.deletePhotosFromDisk([{ name: anterior }]);
            const idx = ctx.fotosNuevas.value.findIndex(f => f.name === anterior);
            if (idx > -1) ctx.fotosNuevas.value.splice(idx, 1);
        }
        ctx.formData.value.FotoFrente = filename;
    },

    /**
     * Manejador global para eliminar fotos (Lógica transaccional)
     * @param {String} filename - Nombre del archivo a eliminar
     * @param {Object} ctx - Contexto reactivo de la app
     */
    handleAndroidDelete: function (filename, ctx) {
        if (!ctx) return;

        try {
            const esNueva = ctx.fotosNuevas.value.some(f => f.name === filename);
            const esOriginal = ctx.fotosOriginales.value.some(f => f.name === filename);
            // Verificar si es la FotoFrente que vino de la DB (no vive en fotosOriginales
            // porque es un campo separado de Imagenes, necesita su propio tracking)
            const esFotoFrenteOriginal = ctx.fotoFrenteOriginal?.value && ctx.fotoFrenteOriginal.value === filename;

            if (esNueva) {
                // Borrado físico inmediato para fotos nuevas no guardadas aún en el registro
                this.deletePhotosFromDisk([{ name: filename }]);
                const idx = ctx.fotosNuevas.value.findIndex(f => f.name === filename);
                if (idx > -1) ctx.fotosNuevas.value.splice(idx, 1);
            } else if (esOriginal || esFotoFrenteOriginal) {
                // Marcado de borrado diferido para fotos que ya pertenecen al registro persistido
                // (incluyendo FotoFrente original que vive en campo separado, no en Imagenes)
                const nombre = esFotoFrenteOriginal ? filename : null;
                const foto = esOriginal
                    ? ctx.fotosOriginales.value.find(f => f.name === filename)
                    : { name: filename, data: null };
                if (foto) ctx.fotosMarcadasBorrar.value.push({ ...foto });
            }

            // Limpiar de FotoFrente si corresponde
            if (ctx.formData.value && ctx.formData.value.FotoFrente === filename) {
                ctx.formData.value.FotoFrente = '';
            }

            // Quitar de UI y actualizar modelo
            const idxUI = ctx.fotos.value.findIndex(f => f.name === filename);
            if (idxUI > -1) {
                ctx.fotos.value.splice(idxUI, 1);
                if (ctx.formData.value) {
                    ctx.formData.value.Imagenes = ctx.fotos.value.map(f => f.name).join(',');
                }
            }
        } catch (error) {
            console.error('❌ Error eliminando foto en PhotoService:', error);
        }
    },

    /**
     * Confirma los cambios realizados en las fotos (Borrado físico de marcadas)
     * @param {Object} ctx - Contexto reactivo de la app
     */
    commit: function (ctx) {
        if (!ctx) return;

        // 1. Eliminar físicamente lo que el usuario marcó para borrar
        if (ctx.fotosMarcadasBorrar.value.length > 0) {
            console.log(`📡 Confirmando borrado físico de ${ctx.fotosMarcadasBorrar.value.length} fotos...`);
            this.deletePhotosFromDisk(ctx.fotosMarcadasBorrar.value);
        }

        // 2. Si FotoFrente fue reemplazada en esta sesión, borrar el archivo anterior del disco
        // (la foto nueva ya quedó asignada en formData.FotoFrente; la vieja no está en fotosMarcadasBorrar
        // porque el sistema de reemplazo no pasa por eliminar-primero-luego-agregar)
        const fotoFrenteNueva = ctx.formData.value?.FotoFrente || '';
        const fotoFrenteVieja = ctx.fotoFrenteOriginal?.value || '';
        if (fotoFrenteVieja && fotoFrenteNueva && fotoFrenteNueva !== fotoFrenteVieja) {
            console.log(`💡 FotoFrente reemplazada: borrando archivo anterior '${fotoFrenteVieja}' del disco`);
            this.deletePhotosFromDisk([{ name: fotoFrenteVieja }]);
        }

        // 3. Limpiar estados de tracking
        ctx.fotosOriginales.value = [];
        ctx.fotosNuevas.value = [];
        ctx.fotosMarcadasBorrar.value = [];
        if (ctx.fotoFrenteOriginal) ctx.fotoFrenteOriginal.value = '';
    },

    /**
     * Revierte los cambios realizados (Borrado físico de fotos nuevas no guardadas)
     * @param {Object} ctx - Contexto reactivo de la app
     */
    rollback: function (ctx) {
        if (!ctx) return;

        // 1. Eliminar fotos nuevas que se tomaron pero no se guardaron
        if (ctx.fotosNuevas.value.length > 0) {
            console.log(`↩️ Revirtiendo tras cancelación: Borrando ${ctx.fotosNuevas.value.length} fotos nuevas...`);
            this.deletePhotosFromDisk(ctx.fotosNuevas.value);
        }

        // 2. Limpiar todo el estado de fotos
        ctx.fotos.value = [];
        ctx.fotosOriginales.value = [];
        ctx.fotosNuevas.value = [];
        ctx.fotosMarcadasBorrar.value = [];
    }
};
