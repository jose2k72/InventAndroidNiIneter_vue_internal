/**
 * workflowService.js - Reglas de negocio y flujo de trabajo para INETER CADIC
 * Centraliza las validaciones de creación y límites de registros.
 */

window.WorkflowService = {
    /**
     * Valida si se permite la creación de un nuevo registro basado en el estado actual
     * @param {String} type - Tipo de registro a crear
     * @param {Array} listData - Registros existentes en el GRUPO actual (agrupación dentro del predio)
     * @param {Number} idObject - El ID geográfico del predio actual (opcional)
     * @param {Array} listDataPredio - Registros de TODO el predio (todos los grupos), usado solo
     *                                 para las reglas de exclusividad de No Encuestado/Unión, que
     *                                 bloquean el predio completo, no solo el grupo actual.
     * @returns {Object} { allowed: boolean, title: string, message: string, icon: string }
     */
    validateCreation: function (type, listData, idObject, listDataPredio) {
        if (!listData) return { allowed: true };

        // Si no se provee el listado de todo el predio, se usa el del grupo como fallback
        // (compatibilidad hacia atrás; en la práctica app.js siempre lo provee).
        const listPredio = listDataPredio || listData;

        // 1. Mapeo de existencia (a nivel de GRUPO)
        const hasNatural = listData.some(item => item.Data?.Type === 'SujetoNatural');
        const hasJuridico = listData.some(item => item.Data?.Type === 'SujetoJuridico');
        const hasEntrevistado = listData.some(item => item.Data?.Type === 'Entrevistado');
        const hasFicha = listData.some(item => item.Data?.Type === 'Ficha');
        const hasFamiliares = listData.some(item => item.Data?.Type === 'Familiares');

        // Mapeo de existencia (a nivel de TODO EL PREDIO, para exclusividad No Encuestado/Unión)
        const hasNoEncuestado = listPredio.some(item => item.Data?.Type === 'NoEncuestado');
        const hasUnionPredio = listPredio.some(item => item.Data?.Type === 'UnionConPredio');

        // --- REGLAS DE EXCLUSIVIDAD TOTAL (a nivel de todo el predio) ---

        // 1. Si ya existe una excepción en CUALQUIER grupo del predio, no se permite agregar nada más
        if (hasNoEncuestado || hasUnionPredio) {
            return {
                allowed: false,
                icon: '🚫',
                title: 'Predio con restricción',
                message: 'Este predio ya cuenta con un registro de estado final (No Encuestado o Unión). No se permite agregar más información.'
            };
        }

        // 2. Si se intenta agregar una excepción pero el predio ya tiene datos normales (en cualquier grupo), bloquear
        if ((type === 'NoEncuestado' || type === 'UnionConPredio') && listPredio.length > 0) {
            return {
                allowed: false,
                icon: '🚫',
                title: 'Acción no permitida',
                message: 'No se puede marcar el predio como excepción si ya cuenta con información capturada (Encuesta, Propietario, etc.).'
            };
        }

        // 2b. Regla de Mutua Exclusión: Propietario Natural vs Jurídico
        if (type === 'SujetoJuridico' && hasNatural) {
            return {
                allowed: false,
                icon: '🚫',
                title: 'Tipo de Propietario incompatible',
                message: 'No se puede registrar un Propietario Jurídico si ya existe un Propietario Natural o Poseedor registrado en este predio.'
            };
        }

        if (type === 'SujetoNatural' && hasJuridico) {
            return {
                allowed: false,
                icon: '🚫',
                title: 'Tipo de Propietario incompatible',
                message: 'No se puede registrar un Propietario Natural o Poseedor si ya existe un Propietario Jurídico registrado en este predio.'
            };
        }

        // 3. Reglas por Tipo normalizados...

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
        }

        // REGLA: Unión con Predio (Englobamiento) - Validación Espacial Estricta

        if (type === 'UnionConPredio') {
            if (typeof Android !== 'undefined' && Android.getDataInAdjacentPolygons && idObject) {
                try {
                    const candidatos = this.getMasterCandidates(idObject);

                    if (candidatos.length === 0) {
                        return {
                            allowed: false,
                            icon: '🚫',
                            title: 'Unión no permitida',
                            message: 'No existen predios colindantes inmediatos que tengan información única registrada (exactamente un cluster).'
                        };
                    }
                } catch (e) {
                    console.error('Error validando colindancia:', e);
                }
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
    validateDeletion: function (type, listData, localizacionActual, idObject) {
        const hasEncuesta = listData.some(item => item.Data?.Type === 'Ficha');

        if (hasEncuesta && type === 'Entrevistado') {
            return {
                allowed: false,
                message: 'No puede eliminar al Entrevistado porque existe una Encuesta Catastral vinculada.'
            };
        }

        // Evitar dejar un predio Master sin Ficha o sin Unión si tiene predios dependientes unificados
        if ((type === 'Ficha' || type === 'UnionConPredio') && typeof Android !== 'undefined' && Android.getDataInAdjacentPolygons && idObject && localizacionActual) {
            try {
                const rawJson = Android.getDataInAdjacentPolygons(idObject);
                const adyacentes = JSON.parse(rawJson || "[]");
                const unidos = adyacentes.filter(item => 
                    item.Data?.Type === 'UnionConPredio' && 
                    item.Data?.LocalizacionMaster === localizacionActual
                );
                if (unidos.length > 0) {
                    const locsDependientes = [...new Set(unidos.map(item => item.LocalizacionPredio || item.Data?.Localizacion))];
                    const label = type === 'Ficha' ? 'la Encuesta Catastral (Ficha)' : 'la Unión con Predio';
                    return {
                        allowed: false,
                        message: `No se puede eliminar ${label}. Este predio es Master para la unificación de los siguientes predios: ${locsDependientes.join(', ')}.`
                    };
                }
            } catch (e) {
                console.error('Error al validar dependencias de unificación en delete:', e);
            }
        }

        return { allowed: true };
    },

    /**
     * Ejecuta lógica de borrado en cascada si aplica
     * @param {String} deletedType - Tipo de registro recién eliminado
     * @param {Array} listData - Lista reactiva de Vue
     * @returns {Number|null} ID del registro eliminado en cascada (si hubo)
     */
    executeCascadeDeletion: function (deletedType, listData, deletedId) {
        // Caso: Familiares dependen de Propietario Natural
        if (deletedType === 'SujetoNatural') {
            // Excluimos explícitamente el elemento que se está borrando para tener certeza absoluta (usando != para evitar fallos por tipo String vs Number)
            const stillHasNatural = listData.some(x => x.Data?.Type === 'SujetoNatural' && (deletedId === undefined || x.Id != deletedId));

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
    },

    /**
     * Obtiene los candidatos válidos para ser Predio Master
     * @param {Number} idObject 
     * @returns {Array} [{ localizacion, direccionRelativa }]
     */
    getMasterCandidates: function (idObject) {
        if (typeof Android === 'undefined' || !Android.getDataInAdjacentPolygons || !idObject) return [];

        try {
            const rawJson = Android.getDataInAdjacentPolygons(idObject);
            const adyacentes = JSON.parse(rawJson || "[]");

            // 1. Agrupar por localización del predio vecino
            const gruposPorPredio = {};
            adyacentes.forEach(item => {
                const loc = item.LocalizacionPredio;
                if (!gruposPorPredio[loc]) gruposPorPredio[loc] = [];
                gruposPorPredio[loc].push(item);
            });

            const candidatosFinales = [];

            // 2. Analizar cada predio vecino para ver si tiene una ÚNICA agrupación (GRUPO_ID)
            //    El conteo real de grupos (TotalGrupos) ya viene resuelto desde la BD
            //    (columna GRUPO_ID), sin necesidad de re-derivar clusters por distancia en JS.
            //    Esto también cubre automáticamente el caso de predios que son a su vez
            //    esclavos de otro Master: al tener únicamente un registro de Unión, su
            //    TotalGrupos es siempre 1.
            Object.keys(gruposPorPredio).forEach(loc => {
                const registros = gruposPorPredio[loc];
                if (registros.length === 0) return;

                // El predio colindante debe tener una Ficha o una Unión registrada (no estar "no catastrado")
                const tieneFichaOUnion = registros.some(r => r.Data?.Type === 'Ficha' || r.Data?.Type === 'UnionConPredio');
                if (!tieneFichaOUnion) {
                    console.log(`🚫 Predio ${loc} descartado por no tener una Ficha o Unión registrada.`);
                    return;
                }

                const totalGrupos = registros[0].TotalGrupos ?? 1;

                // REGLA DE ORO: Debe tener información y esta debe pertenecer a UNA SOLA agrupación
                if (totalGrupos === 1) {
                    candidatosFinales.push({
                        localizacion: loc,
                        direccionRelativa: registros[0].DireccionRelativa || '?'
                    });
                } else {
                    console.log(`🚫 Predio ${loc} descartado por tener ${totalGrupos} agrupaciones.`);
                }
            });

            return candidatosFinales;
        } catch (e) {
            console.error('Error en getMasterCandidates:', e);
            return [];
        }
    }

};
