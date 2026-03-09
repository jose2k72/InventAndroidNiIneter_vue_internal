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
    },

    /**
     * Manejador global para cargar datos existentes (modo edición desde marcador)
     * @param {Number} id - ID del registro
     * @param {String} jsonData - Datos en formato JSON string
     * @param {Object} ctx - Contexto reactivo de la app
     */
    handleLoadData: function (id, jsonData, ctx) {
        console.log('📝 Procesando carga de datos en SyncService - ID:', id);
        if (!ctx) return;

        try {
            const data = JSON.parse(jsonData);

            // Agregar a listData si no existe
            const existingIndex = ctx.listData.value.findIndex(item => item.Id === id);

            if (existingIndex === -1) {
                ctx.listData.value.push({
                    Id: id,
                    Data: data
                });
            }

            // Determinar el índice final para la edición
            const index = existingIndex !== -1 ? existingIndex : ctx.listData.value.length - 1;

            // Ejecutar actualización de vista con un pequeño delay para asegurar reactividad
            setTimeout(() => {
                if (typeof ctx.updateData === 'function') {
                    ctx.updateData(index);
                }
            }, 100);
        } catch (error) {
            console.error('❌ Error procesando carga de datos en SyncService:', error);
        }
    }
};
