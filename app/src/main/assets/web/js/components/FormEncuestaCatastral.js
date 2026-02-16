/**
 * Componente FormEncuestaCatastral - Vue 3
 * Formulario completo para la Encuesta Catastral Rural/Urbana
 * Basado en el modelo C# NI.INETER.Core.Models.EncuestaCatastral
 */

const FormEncuestaCatastral = {
    props: ['data', 'fotos', 'localizacion'],
    template: `
        <div class="form-container">
            <h2>🏡 Encuesta Catastral</h2>
            
            <!-- SECCIÓN 1: UBICACIÓN E IDENTIFICACIÓN -->
            <div class="section">
                <h3>📍 Ubicación y Datos Generales</h3>
                
                <div class="form-group">
                    <label :style="{color: errors.NombreFinca ? 'red' : 'inherit', fontWeight: errors.NombreFinca ? 'bold' : 'normal'}">Nombre de la Finca / Sitio *</label>
                    <input type="text" v-model="formData.NombreFinca" placeholder="Nombre conocido del lugar">
                </div>

                <div class="coords-grid">
                    <div class="form-group">
                        <label :style="{color: errors.Comarca ? 'red' : 'inherit', fontWeight: errors.Comarca ? 'bold' : 'normal'}">Comarca *</label>
                        <input type="text" v-model="formData.Comarca">
                    </div>
                    <div class="form-group">
                        <label :style="{color: errors.Barrio ? 'red' : 'inherit', fontWeight: errors.Barrio ? 'bold' : 'normal'}">Barrio / Caserío *</label>
                        <input type="text" v-model="formData.Barrio">
                    </div>
                </div>

                <div class="coords-grid">
                    <div class="form-group">
                        <label>Sector</label>
                        <input type="text" v-model="formData.Sector">
                    </div>
                    <div class="form-group">
                        <label>Manzana / Número de Lote</label>
                         <div style="display: flex; gap: 5px;">
                            <input type="text" v-model="formData.Manzana" placeholder="Mza" style="width: 50%;">
                            <input type="text" v-model="formData.NumeroLote" placeholder="Lote" style="width: 50%;">
                        </div>
                    </div>
                </div>
            </div>

            <!-- SECCIÓN 2: CARACTERÍSTICAS DEL PREDIO -->
            <div class="section">
                <h3>📝 Características del Predio</h3>

                <div class="coords-grid">
                    <div class="form-group">
                        <label :style="{color: errors.TipoEncuesta ? 'red' : 'inherit', fontWeight: errors.TipoEncuesta ? 'bold' : 'normal'}">Tipo de Encuesta *</label>
                        <select v-model.number="formData.TipoEncuesta">
                            <option :value="null" disabled selected>Seleccione...</option>
                            <option v-for="opt in catalogos.TipoDeEncuesta" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
                        </select>
                    </div>
                    <div class="form-group">
                         <label :style="{color: errors.TipoUso ? 'red' : 'inherit', fontWeight: errors.TipoUso ? 'bold' : 'normal'}">Uso del Predio *</label>
                        <select v-model.number="formData.TipoUso">
                            <option :value="null" disabled selected>Seleccione...</option>
                            <option v-for="opt in catalogos.TipoUso" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
                        </select>
                    </div>
                </div>

                <div class="coords-grid">
                    <div class="form-group">
                        <label :style="{color: errors.AreaEstimada ? 'red' : 'inherit', fontWeight: errors.AreaEstimada ? 'bold' : 'normal'}">Área Estimada *</label>
                        <input type="number" v-model.number="formData.AreaEstimada" min="0" step="0.01">
                    </div>
                    <div class="form-group">
                        <label :style="{color: errors.UnidadMedidaAreaEstimada ? 'red' : 'inherit', fontWeight: errors.UnidadMedidaAreaEstimada ? 'bold' : 'normal'}">Unidad de Medida *</label>
                        <select v-model.number="formData.UnidadMedidaAreaEstimada">
                             <option :value="null" disabled selected>Seleccione...</option>
                             <option v-for="opt in catalogos.UnidadMedida" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label>Descripción Adicional</label>
                    <textarea v-model="formData.Descripcion" rows="2"></textarea>
                </div>
            </div>

            <!-- SECCIÓN 3: DERECHO -->
            <div class="section">
                <h3>⚖️ Derecho sobre la Parcela</h3>
                
                <div class="coords-grid">
                    <div class="form-group">
                         <label :style="{color: errors.DerehoParcela ? 'red' : 'inherit', fontWeight: errors.DerehoParcela ? 'bold' : 'normal'}">Condición *</label>
                        <select v-model.number="formData.DerehoParcela">
                            <option :value="null" disabled selected>Seleccione...</option>
                            <option v-for="opt in catalogos.DerechoParcela" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Personas con igual derecho</label>
                        <input type="number" v-model.number="formData.NoPersonasSimilarDerecho" min="0">
                    </div>
                </div>
            </div>

            <!-- SECCIÓN 4: SERVIDUMBRES -->
            <div class="section">
                <h3>🚧 Servidumbres</h3>
                <div class="checkbox-group">
                     <!-- Servidumbre Agua -->
                     <label class="checkbox-container" :style="{color: errors.ServidumbreAgua ? 'red' : 'inherit', fontWeight: errors.ServidumbreAgua ? 'bold' : 'normal'}">
                        <input type="checkbox" v-model="formData.ServidumbreAgua">
                        <span class="checkmark"></span>
                        Servidumbre de Agua / Acueducto
                    </label>
                    <div v-if="formData.ServidumbreAgua" style="margin-left: 25px; margin-bottom: 10px; display: grid; grid-template-columns: repeat(2, 1fr);">
                         <label class="checkbox-container">
                            <input type="checkbox" v-model="formData.ServidumbreAguaEscritura">
                            <span class="checkmark"></span> Escritura
                        </label>
                        <label class="checkbox-container">
                            <input type="checkbox" v-model="formData.ServidumbreAguaJudicial">
                            <span class="checkmark"></span> Judicial
                        </label>
                        <label class="checkbox-container">
                             <input type="checkbox" v-model="formData.ServidumbreAguaAcuerdo">
                             <span class="checkmark"></span> Acuerdo
                        </label>
                        <label class="checkbox-container">
                             <input type="checkbox" v-model="formData.ServidumbreAguaOtro">
                             <span class="checkmark"></span> Otro
                        </label>
                    </div>

                    <!-- Servidumbre Pase -->
                    <label class="checkbox-container" :style="{color: errors.ServidumbrePase ? 'red' : 'inherit', fontWeight: errors.ServidumbrePase ? 'bold' : 'normal'}">
                        <input type="checkbox" v-model="formData.ServidumbrePase">
                        <span class="checkmark"></span>
                        Servidumbre de Paso / Tránsito
                    </label>
                    <div v-if="formData.ServidumbrePase" style="margin-left: 25px; margin-bottom: 10px; display: grid; grid-template-columns: repeat(2, 1fr);">
                         <label class="checkbox-container">
                            <input type="checkbox" v-model="formData.ServidumbrePaseEscritura">
                            <span class="checkmark"></span> Escritura
                        </label>
                         <label class="checkbox-container">
                            <input type="checkbox" v-model="formData.ServidumbrePaseJudicial">
                            <span class="checkmark"></span> Judicial
                        </label>
                         <label class="checkbox-container">
                            <input type="checkbox" v-model="formData.ServidumbrePaseAcuerdo">
                            <span class="checkmark"></span> Acuerdo
                        </label>
                         <label class="checkbox-container">
                            <input type="checkbox" v-model="formData.ServidumbrePaseOtro">
                            <span class="checkmark"></span> Otro
                        </label>
                    </div>

                    <!-- Servidumbre Otro -->
                    <label class="checkbox-container" :style="{color: errors.ServidumbreOtro ? 'red' : 'inherit', fontWeight: errors.ServidumbreOtro ? 'bold' : 'normal'}">
                        <input type="checkbox" v-model="formData.ServidumbreOtro">
                        <span class="checkmark"></span>
                        Otras Servidumbres
                    </label>
                     <div v-if="formData.ServidumbreOtro" style="margin-left: 25px; margin-bottom: 10px; display: grid; grid-template-columns: repeat(2, 1fr);">
                         <label class="checkbox-container">
                            <input type="checkbox" v-model="formData.ServidumbreOtroEscritura">
                            <span class="checkmark"></span> Escritura
                        </label>
                         <label class="checkbox-container">
                            <input type="checkbox" v-model="formData.ServidumbreOtroJudicial">
                            <span class="checkmark"></span> Judicial
                        </label>
                         <label class="checkbox-container">
                            <input type="checkbox" v-model="formData.ServidumbreOtroAcuerdo">
                            <span class="checkmark"></span> Acuerdo
                        </label>
                         <label class="checkbox-container">
                            <input type="checkbox" v-model="formData.ServidumbreOtroOtro">
                            <span class="checkmark"></span> Otro
                        </label>
                    </div>
                </div>
            </div>

             <!-- SECCIÓN 5: DOCUMENTOS -->
            <div class="section">
                <h3>📂 Documentación</h3>
                
                <div class="checkbox-group">
                    <label class="checkbox-container" :style="{color: errors.PresentaDocumentos ? 'red' : 'inherit', fontWeight: errors.PresentaDocumentos ? 'bold' : 'normal'}">
                        <input type="checkbox" v-model="formData.PresentaDocumentos">
                        <span class="checkmark"></span>
                        ¿Presenta Documentos?
                    </label>
                </div>

                <div v-if="formData.PresentaDocumentos" class="registral-details">
                    <div class="form-group">
                        <label :style="{color: errors.DocumentoCatalog ? 'red' : 'inherit', fontWeight: errors.DocumentoCatalog ? 'bold' : 'normal'}">Tipo de Documento</label>
                        <catalogo-selector
                            v-model="documentoWrapper"
                            catalog-name="Documentos"
                            label="Seleccionar documento..."
                            placeholder="Buscar documento..."
                        ></catalogo-selector>
                    </div>

                    <div class="form-group">
                        <label :style="{color: errors.AutorNotario ? 'red' : 'inherit', fontWeight: errors.AutorNotario ? 'bold' : 'normal'}">Autor / Notario</label>
                        <input type="text" v-model="formData.AutorNotario">
                    </div>

                    <div class="coords-grid">
                        <div class="form-group">
                            <label :style="{color: errors.FechaDocumento ? 'red' : 'inherit', fontWeight: errors.FechaDocumento ? 'bold' : 'normal'}">Fecha de Emisión</label>
                            <input type="date" v-model="formData.FechaDocumento">
                        </div>
                    </div>

                     <div class="coords-grid">
                        <div class="form-group">
                            <label :style="{color: errors.AreaTitulada ? 'red' : 'inherit', fontWeight: errors.AreaTitulada ? 'bold' : 'normal'}">Área Titulada</label>
                            <input type="number" v-model.number="formData.AreaTitulada" min="0" step="0.01">
                        </div>
                        <div class="form-group">
                            <label :style="{color: errors.UnidadMedidaAreaTitulada ? 'red' : 'inherit', fontWeight: errors.UnidadMedidaAreaTitulada ? 'bold' : 'normal'}">Unidad (Título)</label>
                            <select v-model.number="formData.UnidadMedidaAreaTitulada">
                                 <option :value="null" disabled selected>Seleccione...</option>
                                 <option v-for="opt in catalogos.UnidadMedida" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SECCIÓN 6: DATOS REGISTRALES -->
            <div class="section">
                <h3>📜 Datos Registrales</h3>
                
                <div class="checkbox-group">
                    <label class="checkbox-container" :style="{color: errors.TieneDatosRegistrales ? 'red' : 'inherit', fontWeight: errors.TieneDatosRegistrales ? 'bold' : 'normal'}">
                        <input type="checkbox" v-model="formData.TieneDatosRegistrales">
                        <span class="checkmark"></span>
                        ¿Tiene Datos Registrales?
                    </label>
                </div>

                <div v-if="formData.TieneDatosRegistrales" class="registral-details">
                    <div class="coords-grid">
                         <div class="form-group">
                            <label :style="{color: errors.FechaAdquisicion ? 'red' : 'inherit', fontWeight: errors.FechaAdquisicion ? 'bold' : 'normal'}">Fecha Adquisición</label>
                            <input type="date" v-model="formData.FechaAdquisicion">
                        </div>
                        <div class="form-group">
                            <label :style="{color: errors.FechaRegistro ? 'red' : 'inherit', fontWeight: errors.FechaRegistro ? 'bold' : 'normal'}">Fecha Registro</label>
                            <input type="date" v-model="formData.FechaRegistro">
                        </div>
                    </div>

                    <div class="coords-grid">
                        <div class="form-group">
                            <label :style="{color: errors.NoFinca ? 'red' : 'inherit', fontWeight: errors.NoFinca ? 'bold' : 'normal'}">No. Finca</label>
                            <input type="text" v-model="formData.NoFinca">
                        </div>
                        <div class="form-group">
                            <label :style="{color: errors.Tomo ? 'red' : 'inherit', fontWeight: errors.Tomo ? 'bold' : 'normal'}">Tomo</label>
                            <input type="text" v-model="formData.Tomo">
                        </div>
                    </div>

                    <div class="coords-grid">
                        <div class="form-group">
                            <label :style="{color: errors.Folio ? 'red' : 'inherit', fontWeight: errors.Folio ? 'bold' : 'normal'}">Folio</label>
                            <input type="text" v-model="formData.Folio">
                        </div>
                        <div class="form-group">
                            <label :style="{color: errors.Asiento ? 'red' : 'inherit', fontWeight: errors.Asiento ? 'bold' : 'normal'}">Asiento</label>
                            <input type="text" v-model="formData.Asiento">
                        </div>
                    </div>
                </div>
            </div>

             <!-- SECCIÓN 7: A FAVOR DE -->
             <div class="section">
                <h3>🤝 A Favor De (Terceros)</h3>
                 <div class="checkbox-group">
                    <label class="checkbox-container" :style="{color: errors.EsAFavorDe ? 'red' : 'inherit', fontWeight: errors.EsAFavorDe ? 'bold' : 'normal'}">
                        <input type="checkbox" v-model="formData.EsAFavorDe">
                        <span class="checkmark"></span>
                        ¿Es a favor de un tercero?
                    </label>
                </div>

                <div v-if="formData.EsAFavorDe" class="registral-details">
                     <div class="form-group">
                        <label :style="{color: errors.AFavorDe ? 'red' : 'inherit', fontWeight: errors.AFavorDe ? 'bold' : 'normal'}">Nombre del Tercero</label>
                        <input type="text" v-model="formData.AFavorDe" placeholder="Nombre completo">
                    </div>
                    <div class="form-group">
                        <label :style="{color: errors.RelacionConPoseedor ? 'red' : 'inherit', fontWeight: errors.RelacionConPoseedor ? 'bold' : 'normal'}">Relación / Parentesco con Poseedor</label>
                        <catalogo-selector
                            v-model="parentescoWrapper"
                            catalog-name="Parentescos"
                            label="Seleccionar parentesco..."
                            placeholder="Buscar..."
                        ></catalogo-selector>
                    </div>
                </div>
            </div>

            <!-- Fotografías -->
            <button type="button" class="btn btn-camera" @click="capturarFoto">
                📷 CAPTURAR FOTO
            </button>
            
            <!-- Lista de fotos capturadas -->
            <div v-if="fotos && fotos.length > 0" class="section">
                <h3>📸 Fotografías ({{ fotos.length }})</h3>
                <div class="photos-grid">
                    <div v-for="(foto, index) in fotos" :key="index" class="photo-item">
                        <img :src="foto.data || 'placeholder.jpg'" 
                             :alt="'Foto ' + (index + 1)"
                             class="photo-thumbnail">
                        <div class="photo-info">
                            <span class="photo-name">{{ foto.name }}</span>
                            <button type="button" 
                                    class="btn btn-delete" 
                                    @click="eliminarFoto(foto.name)"
                                    title="Eliminar foto">
                                🗑️
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="btn-group">
                <button type="button" class="btn btn-success" @click="save">
                    💾 GUARDAR
                </button>
                <button type="button" class="btn btn-secondary" @click="$emit('cancel')">
                    ↩️ VOLVER
                </button>
            </div>
        </div>
    `,
    setup(props, { emit }) {
        const formData = Vue.reactive({ ...props.data });
        const errors = Vue.reactive({});

        // Watch: Sincronizar campo Imagenes cuando cambian las fotos
        Vue.watch(() => props.fotos, (newFotos) => {
            if (newFotos) {
                const nombres = newFotos.map(f => f.name).join(',');
                formData.Imagenes = nombres;
                console.log('🔄 FormEncuestaCatastral: Campo Imagenes actualizado:', formData.Imagenes);
            }
        }, { deep: true });

        // Variables refs para nombres de catálogos seleccionados
        const documentoName = Vue.ref(formData.DocumentoCatalog ? '(ID: ' + formData.DocumentoCatalog + ')' : '');
        const parentescoName = Vue.ref(formData.RelacionConPoseedor ? '(ID: ' + formData.RelacionConPoseedor + ')' : '');

        // Manejo de fechas (ISO -> YYYY-MM-DD para input date)
        const dateFields = ['FechaDocumento', 'FechaAdquisicion', 'FechaRegistro'];
        dateFields.forEach(field => {
            if (formData[field] && typeof formData[field] === 'string' && formData[field].includes('T')) {
                formData[field] = formData[field].split('T')[0];
            }
        });

        // Wrappers para catalogo-selector
        const documentoWrapper = Vue.computed({
            get: () => ({ id: formData.DocumentoCatalog, name: documentoName.value }),
            set: (val) => {
                if (val) { formData.DocumentoCatalog = val.id; documentoName.value = val.name; }
                else { formData.DocumentoCatalog = 0; documentoName.value = ''; }
            }
        });

        const parentescoWrapper = Vue.computed({
            get: () => ({ id: formData.RelacionConPoseedor, name: parentescoName.value }),
            set: (val) => {
                if (val) { formData.RelacionConPoseedor = val.id; parentescoName.value = val.name; }
                else { formData.RelacionConPoseedor = 0; parentescoName.value = ''; }
            }
        });

        // Catálogos Locales (Hardcoded Enums)
        const catalogos = {
            TipoDeEncuesta: [
                { id: 1, name: 'Parcela Unificada' },
                { id: 2, name: 'Parcela Horizontal' }
            ],
            TipoUso: [
                { id: 1, name: 'Privado' },
                { id: 2, name: 'Público' }
            ],
            UnidadMedida: [
                { id: 1, name: 'Caballerías' },
                { id: 2, name: 'Hectáreas' },
                { id: 3, name: 'Metros Cuadrados' },
                { id: 4, name: 'Manzanas' },
                { id: 5, name: 'Sin Datos' },
                { id: 6, name: 'Varas Cuadradas' }
            ],
            DerechoParcela: [
                { id: 1, name: 'Propietario' },
                { id: 2, name: 'Poseedor' }
            ]
        };

        const save = () => {
            // Limpiar errores previos
            Object.keys(errors).forEach(key => delete errors[key]);

            const errorList = [];

            // Validaciones Obligatorias
            if (!formData.NombreFinca) { errors.NombreFinca = true; errorList.push('Nombre de Finca'); }
            if (!formData.Comarca) { errors.Comarca = true; errorList.push('Comarca'); }
            if (!formData.Barrio) { errors.Barrio = true; errorList.push('Barrio'); }
            if (formData.TipoEncuesta === null) { errors.TipoEncuesta = true; errorList.push('Tipo de Encuesta'); }
            // if (formData.TipoUso === null) { errors.TipoUso = true; errorList.push('Uso del Predio'); } // Opcional según lógica C#? Asumamos obligatorio
            if (formData.TipoUso === null) { errors.TipoUso = true; errorList.push('Uso del Predio'); }
            if (formData.AreaEstimada === null || formData.AreaEstimada === '') { errors.AreaEstimada = true; errorList.push('Área Estimada'); }
            if (formData.UnidadMedidaAreaEstimada === null) { errors.UnidadMedidaAreaEstimada = true; errorList.push('Unidad de Medida (Área)'); }
            if (formData.DerehoParcela === null) { errors.DerehoParcela = true; errorList.push('Condición (Derecho)'); }

            // Validaciones Condicionales

            // 1. Servidumbres
            if (formData.ServidumbreAgua) {
                if (!(formData.ServidumbreAguaEscritura || formData.ServidumbreAguaJudicial || formData.ServidumbreAguaAcuerdo || formData.ServidumbreAguaOtro)) {
                    errors.ServidumbreAgua = true;
                    errorList.push('Servidumbre Agua: Seleccione al menos un tipo (Escritura, Judicial, Acuerdo, Otro)');
                }
            }
            if (formData.ServidumbrePase) {
                if (!(formData.ServidumbrePaseEscritura || formData.ServidumbrePaseJudicial || formData.ServidumbrePaseAcuerdo || formData.ServidumbrePaseOtro)) {
                    errors.ServidumbrePase = true;
                    errorList.push('Servidumbre Paso: Seleccione al menos un tipo (Escritura, Judicial, Acuerdo, Otro)');
                }
            }
            if (formData.ServidumbreOtro) {
                if (!(formData.ServidumbreOtroEscritura || formData.ServidumbreOtroJudicial || formData.ServidumbreOtroAcuerdo || formData.ServidumbreOtroOtro)) {
                    errors.ServidumbreOtro = true;
                    errorList.push('Otras Servidumbres: Seleccione al menos un tipo (Escritura, Judicial, Acuerdo, Otro)');
                }
            }

            // 2. Documentos
            if (formData.PresentaDocumentos) {
                if (!formData.DocumentoCatalog) {
                    errors.DocumentoCatalog = true;
                    errorList.push('Tipo de Documento');
                }
                if (!formData.AutorNotario) {
                    errors.AutorNotario = true;
                    errorList.push('Autor / Notario');
                }
                if (!formData.FechaDocumento) {
                    errors.FechaDocumento = true;
                    errorList.push('Fecha Documento');
                }
                if (formData.AreaTitulada === null || formData.AreaTitulada === undefined || formData.AreaTitulada === '') {
                    errors.AreaTitulada = true;
                    errorList.push('Área Titulada');
                }
                if (!formData.UnidadMedidaAreaTitulada) {
                    errors.UnidadMedidaAreaTitulada = true;
                    errorList.push('Unidad de Medida (Área Titulada)');
                }

                if (!formData.DocumentoCatalog || !formData.AutorNotario || !formData.FechaDocumento || formData.AreaTitulada === null || !formData.UnidadMedidaAreaTitulada) {
                    errors.PresentaDocumentos = true;
                }
            }

            // 3. Datos Registrales
            if (formData.TieneDatosRegistrales) {
                if (!formData.FechaAdquisicion) {
                    errors.FechaAdquisicion = true;
                    errorList.push('Fecha Adquisición');
                }
                if (!formData.FechaRegistro) {
                    errors.FechaRegistro = true;
                    errorList.push('Fecha Registro');
                }
                if (!formData.NoFinca) {
                    errors.NoFinca = true;
                    errorList.push('No. Finca');
                }
                if (!formData.Tomo) {
                    errors.Tomo = true;
                    errorList.push('Tomo');
                }
                if (!formData.Folio) {
                    errors.Folio = true;
                    errorList.push('Folio');
                }
                if (!formData.Asiento) {
                    errors.Asiento = true;
                    errorList.push('Asiento');
                }

                if (!formData.FechaAdquisicion || !formData.FechaRegistro || !formData.NoFinca || !formData.Tomo || !formData.Folio || !formData.Asiento) {
                    errors.TieneDatosRegistrales = true;
                }
            }

            // 4. A Favor De
            if (formData.EsAFavorDe) {
                if (!formData.AFavorDe) {
                    errors.AFavorDe = true;
                    errorList.push('Nombre Beneficiario');
                }
                if (!formData.RelacionConPoseedor) {
                    errors.RelacionConPoseedor = true;
                    errorList.push('Relación con Poseedor');
                }

                if (!formData.AFavorDe || !formData.RelacionConPoseedor) {
                    errors.EsAFavorDe = true;
                }
            }

            if (errorList.length > 0) {
                const msg = '⚠️ Faltan datos obligatorios. Por favor, revise los campos marcados en rojo.';
                if (typeof Android !== 'undefined' && Android.showAlert) {
                    Android.showAlert(msg);
                } else {
                    alert(msg);
                }
                return;
            }

            emit('save', Vue.toRaw(formData));
        };

        const capturarFoto = () => {
            // El prefijo será la localización (Parcela)
            const prefijo = props.localizacion || 'ENCUESTA';

            if (typeof Android !== 'undefined' && typeof Android.Camera === 'function') {
                console.log("📸 FormEncuestaCatastral: Calling Camera with prefix:", prefijo);
                Android.Camera(prefijo);
            } else {
                emit('camera');
            }
        };

        const eliminarFoto = (filename) => {
            window.showConfirmModal({
                icon: '📷',
                title: '¿Eliminar foto?',
                message: 'Esta foto será eliminada permanentemente.',
                confirmText: 'Sí, eliminar',
                cancelText: 'Cancelar',
                onConfirm: () => {
                    if (typeof window.deletePhoto === 'function') {
                        window.deletePhoto(filename);
                    }
                }
            });
        };

        return {
            formData,
            errors,
            catalogos,
            documentoWrapper,
            parentescoWrapper,
            save,
            capturarFoto,
            eliminarFoto
        };
    }
};

// Registrar componente
window.app.component('form-encuesta-catastral', FormEncuestaCatastral);
