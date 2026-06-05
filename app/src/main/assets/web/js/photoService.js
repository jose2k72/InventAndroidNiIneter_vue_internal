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
                    ctx.formData.value.FotoFrente = filename;
                }
                ctx.tomandoFotoFrente.value = false;
                ctx.fotosNuevas.value.push({ ...fotoObj });
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
     * Manejador global para eliminar fotos (Lógica transaccional)
     * @param {String} filename - Nombre del archivo a eliminar
     * @param {Object} ctx - Contexto reactivo de la app
     */
    handleAndroidDelete: function (filename, ctx) {
        if (!ctx) return;

        try {
            const esNueva = ctx.fotosNuevas.value.some(f => f.name === filename);
            const esOriginal = ctx.fotosOriginales.value.some(f => f.name === filename);

            if (esNueva) {
                // Borrado físico inmediato para fotos nuevas no guardadas aún en el registro
                this.deletePhotosFromDisk([{ name: filename }]);
                const idx = ctx.fotosNuevas.value.findIndex(f => f.name === filename);
                if (idx > -1) ctx.fotosNuevas.value.splice(idx, 1);
            } else if (esOriginal) {
                // Marcado de borrado diferido para fotos que ya pertenecen al registro persistido
                const foto = ctx.fotosOriginales.value.find(f => f.name === filename);
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

        // 2. Limpiar estados de tracking
        ctx.fotosOriginales.value = [];
        ctx.fotosNuevas.value = [];
        ctx.fotosMarcadasBorrar.value = [];
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
