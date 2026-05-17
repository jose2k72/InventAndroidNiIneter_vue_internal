/**
 * workflowService.js - Reglas de negocio y flujo de trabajo para INETER CADIC
 * Centraliza las validaciones de creación y límites de registros.
 */

window.WorkflowService = {
    /**
     * Valida si se permite la creación de un nuevo registro basado en el estado actual
     * @param {String} type - Tipo de registro a crear
     * @param {Array} listData - Lista de registros existentes en el predio
     * @param {Number} idObject - El ID geográfico del predio actual (opcional)
     * @returns {Object} { allowed: boolean, title: string, message: string, icon: string }
     */
    validateCreation: function (type, listData, idObject) {
        if (!listData) return { allowed: true };

        // 1. Mapeo de existencia
        const hasNatural = listData.some(item => item.Data?.Type === 'SujetoNatural');
        const hasJuridico = listData.some(item => item.Data?.Type === 'SujetoJuridico');
        const hasEntrevistado = listData.some(item => item.Data?.Type === 'Entrevistado');
        const hasFicha = listData.some(item => item.Data?.Type === 'Ficha');
        const hasFamiliares = listData.some(item => item.Data?.Type === 'Familiares');
        const hasNoEncuestado = listData.some(item => item.Data?.Type === 'NoEncuestado');
        const hasUnionPredio = listData.some(item => item.Data?.Type === 'UnionConPredio');

        // --- REGLAS DE EXCLUSIVIDAD TOTAL ---
        
        // 1. Si ya existe una excepción, no se permite agregar nada más
        if (hasNoEncuestado || hasUnionPredio) {
            return {
                allowed: false,
                icon: '🚫',
                title: 'Predio con restricción',
                message: 'Este predio ya cuenta con un registro de estado final (No Encuestado o Unión). No se permite agregar más información.'
            };
        }

        // 2. Si se intenta agregar una excepción pero ya hay datos normales, bloquear
        if ((type === 'NoEncuestado' || type === 'UnionConPredio') && listData.length > 0) {
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

            // 2. Analizar cada predio vecino para ver si tiene un ÚNICO cluster
            Object.keys(gruposPorPredio).forEach(loc => {
                const registros = gruposPorPredio[loc];
                if (registros.length === 0) return;

                // Agrupar registros por proximidad (3 metros)
                const clustersInNeighbor = [];
                registros.forEach(reg => {
                    const lat = reg.Latitud;
                    const lng = reg.Longitud;
                    
                    let foundCluster = clustersInNeighbor.find(c => {
                        // Cálculo de distancia simple (aproximado para 3m es suficiente)
                        const d = Math.sqrt(Math.pow(lat - c.lat, 2) + Math.pow(lng - c.lng, 2));
                        return d < 0.00003; // Aprox 3 metros en grados
                    });

                    if (!foundCluster) {
                        clustersInNeighbor.push({ lat, lng, count: 1 });
                    } else {
                        foundCluster.count++;
                    }
                });

                // REGLA DE ORO: Debe tener información y esta debe pertenecer a UN SOLO cluster
                if (clustersInNeighbor.length === 1) {
                    candidatosFinales.push({
                        localizacion: loc,
                        direccionRelativa: registros[0].DireccionRelativa || '?'
                    });
                } else {
                    console.log(`🚫 Predio ${loc} descartado por tener ${clustersInNeighbor.length} clusters.`);
                }
            });

            return candidatosFinales;
        } catch (e) {
            console.error('Error en getMasterCandidates:', e);
            return [];
        }
    }

};
