/**
 * conversionService.js - Gestión de transformaciones entre tipos de registros.
 * Facilita la creación automática de Entrevistados desde Propietarios y viceversa.
 */

window.ConversionService = {
    /**
     * Crea un Entrevistado clonando datos de un Propietario Natural
     * @param {Object} propietarioObj - El objeto contenedor del propietario
     * @param {Object} context - Metadatos de auditoría y ubicación
     * @returns {Number|null} Nuevo ID asignado
     */
    propietarioAEntrevistado: function (propietarioObj, context) {
        if (!propietarioObj || !propietarioObj.Data) return null;

        const nuevo = ModelsFactory.createEntrevistado();

        // 1. Clonar datos personales y de residencia
        ClonadorService.clonarDatos(propietarioObj.Data, nuevo, ClonadorService.CAMPOS_COMUNES_PROPIETARIO_ENTREVISTADO);

        // 2. Ajustes específicos de Entrevistado
        nuevo.RelacionConParcelaCatalog = 1; // Propietario

        // 3. Ejecutar guardado silencioso (-1 para nuevo)
        return SyncService.saveData(nuevo, -1, context);
    },

    /**
     * Crea un Propietario Natural clonando datos de un Entrevistado
     * @param {Object} entrevistadoObj - El objeto contenedor del entrevistado
     * @param {Object} context - Metadatos de auditoría y ubicación
     * @returns {Number|null} Nuevo ID asignado
     */
    entrevistadoAPropietario: function (entrevistadoObj, context) {
        if (!entrevistadoObj || !entrevistadoObj.Data) return null;

        const nuevo = ModelsFactory.createSujetoNatural();

        // 1. Clonar datos personales y de residencia
        ClonadorService.clonarDatos(entrevistadoObj.Data, nuevo, ClonadorService.CAMPOS_COMUNES_PROPIETARIO_ENTREVISTADO);

        // 2. Ejecutar guardado silencioso (-1 para nuevo)
        return SyncService.saveData(nuevo, -1, context);
    }
};
