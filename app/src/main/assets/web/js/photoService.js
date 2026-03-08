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
    }
};
