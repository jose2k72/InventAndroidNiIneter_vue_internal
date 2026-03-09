/**
 * workflowService.js - Reglas de negocio y flujo de trabajo para INETER CADIC
 * Centraliza las validaciones de creación y límites de registros.
 */

window.WorkflowService = {
    /**
     * Valida si se permite la creación de un nuevo registro basado en el estado actual
     * @param {String} type - Tipo de registro a crear
     * @param {Array} listData - Lista de registros existentes en el predio
     * @returns {Object} { allowed: boolean, title: string, message: string, icon: string }
     */
    validateCreation: function (type, listData) {
        if (!listData) return { allowed: true };

        // 1. Mapeo de existencia
        const hasNatural = listData.some(item => item.Data?.Type === 'SujetoNatural');
        const hasEntrevistado = listData.some(item => item.Data?.Type === 'Entrevistado');
        const hasFicha = listData.some(item => item.Data?.Type === 'Ficha');
        const hasFamiliares = listData.some(item => item.Data?.Type === 'Familiares');

        // 2. Reglas por Tipo

        // REGLA: Entrevistado Único
        if (type === 'Entrevistado' && hasEntrevistado) {
            return {
                allowed: false,
                icon: '🚫',
                title: 'Límite alcanzado',
                message: 'Solo se puede registrar un (1) Entrevistado por predio.'
            };
        }

        // REGLA: Familiares dependen de Propietario Natural
        if (type === 'Familiares') {
            if (!hasNatural) {
                return {
                    allowed: false,
                    icon: '⚠️',
                    title: 'Acción requerida',
                    message: 'Solo se pueden agregar integrantes familiares si existe al menos un Propietario Natural registrado.'
                };
            }
            // Nota: Si ya existe, app.js redirige a edición, por lo que aquí se permite pasar el check
        }

        // REGLA: Encuesta Catastral (Ficha)
        if (type === 'Ficha') {
            // Límite de una por predio
            if (hasFicha) {
                return {
                    allowed: false,
                    icon: '🚫',
                    title: 'Límite alcanzado',
                    message: 'Solo se puede registrar una (1) Encuesta Catastral por predio.'
                };
            }

            // Dependencia de Entrevistado
            if (!hasEntrevistado) {
                return {
                    allowed: false,
                    icon: '⚠️',
                    title: 'Faltan datos',
                    message: 'Debe registrar primero un Entrevistado antes de realizar la encuesta.'
                };
            }
        }

        // Por defecto, permitir
        return { allowed: true };
    },

    /**
     * Valida si es permitido eliminar un registro
     * @param {String} type - Tipo de registro
     * @param {Array} listData - Lista completa de datos actuales
     * @returns {Object} { allowed: boolean, message: string }
     */
    validateDeletion: function (type, listData) {
        const hasEncuesta = listData.some(item => item.Data?.Type === 'Ficha');

        if (hasEncuesta && type === 'Entrevistado') {
            return {
                allowed: false,
                message: 'No puede eliminar al Entrevistado porque existe una Encuesta Catastral vinculada.'
            };
        }

        return { allowed: true };
    },

    /**
     * Ejecuta lógica de borrado en cascada si aplica
     * @param {String} deletedType - Tipo de registro recién eliminado
     * @param {Array} listData - Lista reactiva de Vue
     * @returns {Number|null} ID del registro eliminado en cascada (si hubo)
     */
    executeCascadeDeletion: function (deletedType, listData) {
        // Caso: Familiares dependen de Propietario Natural
        if (deletedType === 'SujetoNatural') {
            const stillHasNatural = listData.some(x => x.Data?.Type === 'SujetoNatural');

            if (!stillHasNatural) {
                const famIdx = listData.findIndex(x => x.Data?.Type === 'Familiares');
                if (famIdx !== -1) {
                    const famId = listData[famIdx].Id;
                    // Notificar al bridge para borrado físico
                    SyncService.deleteData(famId);
                    console.log('🗑️ Workflow: Borrado en cascada de Integrantes Familiares');
                    return famId;
                }
            }
        }
        return null;
    }
};
