/**
 * syncService.js - Orquestación de persistencia y sincronización con el backend Android
 */

window.SyncService = {
    /**
     * Prepara y envía datos a Android para guardar
     * @param {Object} data - Modelo de datos actual (formData)
     * @param {Number} id - ID del registro (-1 para nuevo)
     * @param {Object} context - Objeto con refs reactivas (latLng, localProj, fechaActual, encuestador, idObject, localizacion)
     */
    saveData: function (data, id, context) {
        // Enriquecer con metadatos de sesión y espaciales
        data.Fecha = context.fechaActual;
        data.Encuestador = context.encuestador;
        data.IdObject = context.idObject;
        data.Localizacion = context.localizacion;

        // Coordenadas con PascalCase para compatibilidad legacy del motor C# en backend
        data.LatLng = {
            Lat: context.latLng.lat,
            Lng: context.latLng.lng
        };

        // CORRECCIÓN: Usar x e y del objeto reactivo localProj correctamente (Estandarización CADIC)
        data.LocalProj = {
            x: context.localProj.x,
            y: context.localProj.y
        };

        if (typeof Android !== 'undefined') {
            try {
                const jsonData = JSON.stringify(data);
                console.log('📡 Enviando JSON a guardar:', jsonData);
                const savedId = Android.sendData(id, jsonData);
                return savedId;
            } catch (error) {
                console.error('❌ Error guardando datos en Android:', error);
                throw error;
            }
        } else {
            console.log('💻 Modo Desarrollo: Datos guardados:', data);
            return id > 0 ? id : Date.now();
        }
    },

    /**
     * Elimina un registro físicamente en Android
     * @param {Number} id - ID del registro
     */
    deleteData: function (id) {
        if (typeof Android !== 'undefined') {
            Android.deleteData(id);
            return true;
        } else {
            console.log('💻 Modo Desarrollo: Registro eliminado ID:', id);
            return true;
        }
    }
};
