/**
 * conversionService.js - Gestión de transformaciones entre tipos de registros.
 * Facilita la creación automática de Entrevistados desde Propietarios y viceversa.
 */

window.ConversionService = {
    /**
     * Crea un Entrevistado clonando datos de un Propietario Natural o Poseedor
     * @param {Object} propietarioObj - El objeto contenedor del propietario
     * @param {Object} context - Metadatos de auditoría y ubicación
     * @returns {Number|null} Nuevo ID asignado
     */
    propietarioAEntrevistado: function (propietarioObj, context) {
        if (!propietarioObj || !propietarioObj.Data) return null;

        const origen = propietarioObj.Data;
        const nuevo = ModelsFactory.createEntrevistado();

        // 1. Clonar datos personales y de residencia (Campos base de Person)
        ClonadorService.clonarDatos(origen, nuevo, ClonadorService.CAMPOS_COMUNES_PROPIETARIO_ENTREVISTADO);

        // 2. Mapeo Inteligente de Roles (Derecho -> Relación Informante)
        // Derecho 1 (Propietario) -> Relación 1 (Propietario)
        // Derecho 2 (Poseedor) -> Relación 2 (Poseedor)
        nuevo.RelacionConParcelaCatalog = (origen.DerehoParcelaCatalog === 2) ? 2 : 1;

        // 3. Regla de Higiene: Solo copiar relación si es Poseedor
        if (nuevo.RelacionConParcelaCatalog === 2) {
            nuevo.RelacionInformantePropietarioCatalog = origen.RelacionConPropietarioCatalog || 0;
            nuevo._RelacionPropietarioName = origen._RelacionPropietarioName || '';
        } else {
            nuevo.RelacionInformantePropietarioCatalog = 0;
            nuevo._RelacionPropietarioName = '';
        }

        // 4. Ejecutar guardado silencioso (-1 para nuevo)
        return SyncService.saveData(nuevo, -1, context);
    },

    /**
     * Crea un Propietario Natural o Poseedor clonando datos de un Entrevistado
     * @param {Object} entrevistadoObj - El objeto contenedor del entrevistado
     * @param {Object} context - Metadatos de auditoría y ubicación
     * @returns {Number|null} Nuevo ID asignado
     */
    entrevistadoAPropietario: function (entrevistadoObj, context) {
        if (!entrevistadoObj || !entrevistadoObj.Data) return null;

        const origen = entrevistadoObj.Data;
        const nuevo = ModelsFactory.createSujetoNatural();

        // 1. Clonar datos personales y de residencia (Campos base de Person)
        ClonadorService.clonarDatos(origen, nuevo, ClonadorService.CAMPOS_COMUNES_PROPIETARIO_ENTREVISTADO);

        // 2. Mapeo inteligente (Relación Informante -> Derecho)
        // Si el informante es Propietario (1) -> Destino Propietario (1)
        // Cualquier otro rol (2-Poseedor, 3-Representante, etc) -> Destino Poseedor (2)
        nuevo.DerehoParcelaCatalog = (origen.RelacionConParcelaCatalog === 1) ? 1 : 2;
        nuevo.NoPersonasSimilarDerecho = 1; // Valor inicial lógico

        // 3. Regla de Higiene: Solo copiar relación si el destino es Poseedor
        if (nuevo.DerehoParcelaCatalog === 2) {
            nuevo.RelacionConPropietarioCatalog = origen.RelacionInformantePropietarioCatalog || 0;
            nuevo._RelacionPropietarioName = origen._RelacionPropietarioName || '';
        } else {
            nuevo.RelacionConPropietarioCatalog = 0;
            nuevo._RelacionPropietarioName = '';
        }

        // 4. Ejecutar guardado silencioso (-1 para nuevo)
        return SyncService.saveData(nuevo, -1, context);
    }
};
