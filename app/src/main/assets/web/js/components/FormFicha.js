/**
 * Componente FormFicha - Vue 3
 * Formulario para la Ficha (Encuesta Catastral) basado en Ficha.cs
 */

const FormFicha = {
    props: ['data', 'fotos', 'localizacion'],
    template: `
        <div class="form-container">
            <h2>🏡 Encuesta Catastral</h2>
            
            <!-- SECCIÓN 1: UBICACIÓN E IDENTIFICACIÓN -->
            <div class="section">
                <h3>📍 Ubicación y Datos Generales</h3>
                
                <div v-if="formData.NoEncuesta" class="id-display-box">
                    <span class="label">ID Encuesta:</span>
                    <span class="value">{{ formData.NoEncuesta }}</span>
                </div>
                
                <!-- Municipio: esquema de FormPropietarioNatural -->
                <div class="form-group">
                    <label :style="{color: errors.MunicipioCatalog ? 'red' : 'inherit', fontWeight: errors.MunicipioCatalog ? 'bold' : 'normal'}">Municipio *</label>
                    
                    <!-- Trigger para abrir el selector (solo si no viene del mapa) -->
                    <div v-if="!formData._isFromMap" class="selector-display" @click="pedirMunicipioGlobal">
                        <span v-if="muniDisplay" class="selected-text">Cambiar...</span>
                        <span v-else class="placeholder-text">Seleccione departamento / municipio...</span>
                        <span class="selector-icon">📍</span>
                    </div>

                    <!-- Visualización del departamento -->
                    <div v-if="deptoDisplay" class="display-box display-box-depto">
                        <span class="cod">{{ deptoDisplay.cod }}</span>
                        <span>{{ deptoDisplay.nombre }}</span>
                    </div>

                    <!-- Visualización del municipio -->
                    <div v-if="muniDisplay" class="display-box display-box-muni">
                        <span class="cod">{{ muniDisplay.cod }}</span>
                        <span>{{ muniDisplay.nombre }}</span>
                    </div>
                </div>

                <div class="form-group">
                    <label :style="{color: errors.NombreFinca ? 'red' : 'inherit', fontWeight: errors.NombreFinca ? 'bold' : 'normal'}">Nombre de la Finca / Sitio *</label>
                    <input type="text" v-model="formData.NombreFinca" placeholder="Ej: Finca La Esperanza">
                </div>

                <div class="form-group">
                    <label>Dirección de la Parcela</label>
                    <textarea v-model="formData.Direccion" rows="2" placeholder="Dirección exacta o descripción del lugar"></textarea>
                </div>

                <div class="coords-grid">
                    <div class="form-group">
                        <label>Comarca/Caserío</label>
                        <input type="text" v-model="formData.Cacerio" placeholder="Ej: El Corozo">
                    </div>
                    <div class="form-group">
                        <label>Barrio</label>
                        <input type="text" v-model="formData.Barrio" placeholder="Ej: San José">
                    </div>
                </div>

                <div class="coords-grid">
                    <div class="form-group">
                        <label>Parcela Catastrada</label>
                        <input type="text" v-model="formData.ParcelaCatastrada">
                    </div>
                </div>

                <div class="coords-grid">
                    <div class="form-group">
                        <label>Parcela Segregada</label>
                        <input type="text" v-model="formData.ParcelaSegregada">
                    </div>
                    <div class="form-group">
                        <label>Manzana / Lote</label>
                        <div style="display: flex; gap: 5px;">
                            <input type="text" v-model="formData.Manzana" placeholder="Mza" style="width: 40%;">
                            <input type="text" v-model="formData.NumeroLote" placeholder="Lote" style="width: 60%;">
                        </div>
                    </div>
                </div>
            </div>

            <!-- SECCIÓN 2: DATOS DEL INMUEBLE Y USO -->
            <div class="section">
                <h3>📝 Datos del Inmueble y Uso</h3>
                
                <div class="form-group">
                    <label :style="{color: errors.TipoEncuestaCatalog ? 'red' : 'inherit', fontWeight: errors.TipoEncuestaCatalog ? 'bold' : 'normal'}">Tipo de Encuesta *</label>
                    <select v-model.number="formData.TipoEncuestaCatalog">
                        <option :value="null" disabled selected>Seleccione...</option>
                        <option v-for="opt in catalogos.TipoEncuesta" :key="opt.id" :value="opt.id">{{ opt.nombre }}</option>
                    </select>
                </div>

                <div class="form-group">
                    <label :style="{color: errors.TipoUsoCatalog ? 'red' : 'inherit', fontWeight: errors.TipoUsoCatalog ? 'bold' : 'normal'}">Uso del Predio *</label>
                    <select v-model.number="formData.TipoUsoCatalog">
                        <option :value="null" disabled selected>Seleccione...</option>
                        <option v-for="opt in catalogos.TipoUso" :key="opt.id" :value="opt.id">{{ opt.nombre }}</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Descripción del Uso</label>
                    <textarea v-model="formData.Descripcion" rows="2"></textarea>
                </div>

                <div class="form-group">
                    <label :style="{color: errors.OrigenTierraCatalog ? 'red' : 'inherit', fontWeight: errors.OrigenTierraCatalog ? 'bold' : 'normal'}">Origen de la Tierra</label>
                    <div class="selector-display" @click="pedirOrigenTierraGlobal" :style="{borderColor: errors.OrigenTierraCatalog ? '#d32f2f' : '#ccc'}">
                        <span v-if="origenTierraName" style="color: #1565C0; font-weight: 600;">{{ origenTierraName }}</span>
                        <span v-else style="color: #757575;">Seleccione origen...</span>
                        <span style="color: #1976D2; font-size: 1.2rem;">🔍</span>
                    </div>
                </div>

                <!-- Especificar Origen si es "Otros" (ID 1) -->
                <div v-if="formData.OrigenTierraCatalog === 1" class="form-group sub-section">
                    <label :style="{color: errors.OrigenTierraOtroText ? 'red' : 'inherit'}">Especifique Origen *</label>
                    <input type="text" v-model="formData.OrigenTierraOtroText" placeholder="Detalle el origen de la tierra...">
                </div>

                <div class="form-group">
                    <label>Reseña Histórica</label>
                    <textarea v-model="formData.ResenaHistorica" rows="4" placeholder="Documentación histórica del predio..."></textarea>
                </div>

                <div class="coords-grid">
                    <div class="form-group">
                        <label :style="{color: errors.AreaEstimada ? 'red' : 'inherit', fontWeight: errors.AreaEstimada ? 'bold' : 'normal'}">Área Estimada *</label>
                        <input type="number" v-model.number="areaDisplay" step="0.01" :readonly="formData._isFromMap" :style="{backgroundColor: formData._isFromMap ? '#f5f5f5' : 'white'}">
                    </div>
                    <div class="form-group">
                        <label :style="{color: errors.UnidadMedidaAreaEstimadaCatalog ? 'red' : 'inherit', fontWeight: errors.UnidadMedidaAreaEstimadaCatalog ? 'bold' : 'normal'}">Unidad *</label>
                        <select v-model.number="formData.UnidadMedidaAreaEstimadaCatalog" :disabled="formData._isFromMap" :style="{backgroundColor: formData._isFromMap ? '#f5f5f5' : 'white'}">
                             <option :value="null" disabled selected>Seleccione...</option>
                             <option v-for="opt in catalogos.UnidadMedida" :key="opt.id" :value="opt.id">{{ opt.nombre }}</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- SECCIÓN 3: SERVIDUMBRES -->
            <div class="section">
                <h3>🚧 Servidumbres (Opcional)</h3>
                
                <div class="form-group">
                    <label>Servidumbre de Agua</label>
                    <select v-model.number="formData.ServidumbreAguaCatalog">
                        <option :value="null">Ninguna / Seleccione...</option>
                        <option v-for="opt in catalogos.Servidumbre" :key="opt.id" :value="parseInt(opt.id)">{{ opt.nombre }}</option>
                    </select>
                </div>
                <!-- Especificar Agua -->
                <div v-if="formData.ServidumbreAguaCatalog === 4" class="form-group sub-section">
                    <label :style="{color: errors.ServidumbreAguaOtroText ? 'red' : 'inherit'}">Especificar Agua *</label>
                    <input type="text" v-model="formData.ServidumbreAguaOtroText" placeholder="Detalle la servidumbre de agua...">
                </div>

                <div class="form-group">
                    <label>Servidumbre de Pase</label>
                    <select v-model.number="formData.ServidumbrePaseCatalog">
                        <option :value="null">Ninguna / Seleccione...</option>
                        <option v-for="opt in catalogos.Servidumbre" :key="opt.id" :value="parseInt(opt.id)">{{ opt.nombre }}</option>
                    </select>
                </div>
                <!-- Especificar Pase -->
                <div v-if="formData.ServidumbrePaseCatalog === 4" class="form-group sub-section">
                    <label :style="{color: errors.ServidumbrePaseOtroText ? 'red' : 'inherit'}">Especificar Pase *</label>
                    <input type="text" v-model="formData.ServidumbrePaseOtroText" placeholder="Detalle la servidumbre de pase...">
                </div>

                <div class="form-group">
                    <label>Otra Servidumbre</label>
                    <select v-model.number="formData.ServidumbreOtroCatalog">
                        <option :value="null">Ninguna / Seleccione...</option>
                        <option v-for="opt in catalogos.Servidumbre" :key="opt.id" :value="parseInt(opt.id)">{{ opt.nombre }}</option>
                    </select>
                </div>
                <!-- Especificar Otro -->
                <div v-if="formData.ServidumbreOtroCatalog === 4" class="form-group sub-section">
                    <label :style="{color: errors.ServidumbreOtroOtroText ? 'red' : 'inherit'}">Especificar Otro *</label>
                    <input type="text" v-model="formData.ServidumbreOtroOtroText" placeholder="Detalle la otra servidumbre...">
                </div>
            </div>

            <!-- SECCIÓN 4: DERECHO -->
            <div class="section">
                <h3>⚖️ Derecho sobre la Parcela</h3>
                
                <div class="coords-grid">
                    <div class="form-group">
                        <label :style="{color: errors.DerehoParcelaCatalog ? 'red' : 'inherit', fontWeight: errors.DerehoParcelaCatalog ? 'bold' : 'normal'}">Derecho Parcelario *</label>
                        <select v-model.number="formData.DerehoParcelaCatalog">
                            <option :value="null" disabled selected>Seleccione...</option>
                            <option v-for="opt in catalogos.TipoDerecho" :key="opt.id" :value="opt.id">{{ opt.nombre }}</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label :style="{color: errors.NoPersonasSimilarDerecho ? 'red' : 'inherit', fontWeight: errors.NoPersonasSimilarDerecho ? 'bold' : 'normal'}">Número de personas derecho similar *</label>
                        <input type="number" v-model.number="formData.NoPersonasSimilarDerecho" min="1" :style="{borderColor: errors.NoPersonasSimilarDerecho ? 'red' : '#ccc'}">
                    </div>
                </div>
            </div>

            <!-- SECCIÓN 5: DATOS REGISTRALES -->
            <div class="section">
                <h3>📜 Datos Registrales</h3>
                <div class="form-group checkbox-group">
                    <label class="checkbox-container">
                        <input type="checkbox" v-model="formData.TieneDatosRegistrales">
                        <span class="checkmark"></span>
                        ¿Tiene Datos Registrales?
                    </label>
                </div>
                <div v-if="formData.TieneDatosRegistrales">
                    <div class="coords-grid">
                        <div class="form-group">
                            <label :style="{color: errors.FechaAdquisicion ? 'red' : 'inherit', fontWeight: errors.FechaAdquisicion ? 'bold' : 'normal'}">Fecha Adquisición *</label>
                            <input type="date" v-model="formData.FechaAdquisicion">
                        </div>
                        <div class="form-group">
                            <label :style="{color: errors.FechaRegistro ? 'red' : 'inherit', fontWeight: errors.FechaRegistro ? 'bold' : 'normal'}">Fecha Registro *</label>
                            <input type="date" v-model="formData.FechaRegistro">
                        </div>
                    </div>
                    <div class="coords-grid">
                        <div class="form-group">
                            <label :style="{color: errors.NoFinca ? 'red' : 'inherit', fontWeight: errors.NoFinca ? 'bold' : 'normal'}">No. Finca *</label>
                            <input type="text" v-model="formData.NoFinca">
                        </div>
                        <div class="form-group">
                            <label :style="{color: errors.Tomo ? 'red' : 'inherit', fontWeight: errors.Tomo ? 'bold' : 'normal'}">Tomo *</label>
                            <input type="text" v-model="formData.Tomo">
                        </div>
                    </div>
                    <div class="coords-grid">
                        <div class="form-group">
                            <label :style="{color: errors.Folio ? 'red' : 'inherit', fontWeight: errors.Folio ? 'bold' : 'normal'}">Folio *</label>
                            <input type="text" v-model="formData.Folio">
                        </div>
                        <div class="form-group">
                            <label :style="{color: errors.Asiento ? 'red' : 'inherit', fontWeight: errors.Asiento ? 'bold' : 'normal'}">Asiento *</label>
                            <input type="text" v-model="formData.Asiento">
                        </div>
                    </div>
                </div>
            </div>

            <!-- SECCIÓN 6: DOCUMENTOS -->
            <div class="section">
                <h3>📂 Documentos</h3>
                
                <div class="form-group checkbox-group">
                    <label class="checkbox-container">
                        <input type="checkbox" v-model="formData.PresentaDocumentos">
                        <span class="checkmark"></span>
                        ¿Presenta Documentos?
                    </label>
                </div>

                <div v-if="formData.PresentaDocumentos">
                    <div v-for="(doc, index) in formData.Documentos" :key="index" class="document-item">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <h4 style="margin: 0; color: #1565C0;">Documento #{{ index + 1 }}</h4>
                            <button class="btn-delete" @click="quitarDocumento(index)">🗑️</button>
                        </div>
                        
                        <div class="form-group">
                            <label :style="{color: (errors['Doc' + index + '_Catalog']) ? 'red' : 'inherit', fontWeight: (errors['Doc' + index + '_Catalog']) ? 'bold' : 'normal'}">Tipo de Documento *</label>
                            <div class="selector-display" @click="pedirDocumentoGlobal(index)" :style="{borderColor: (errors['Doc' + index + '_Catalog']) ? '#d32f2f' : '#ccc'}">
                                <span v-if="doc._DocumentoName" style="color: #1565C0; font-weight: 600;">{{ doc._DocumentoName }}</span>
                                <span v-else style="color: #757575;">Seleccione un documento...</span>
                                <span style="color: #1976D2; font-size: 1.2rem;">🔍</span>
                            </div>
                        </div>

                        <div class="form-group">
                            <label :style="{color: (errors['Doc' + index + '_Autor']) ? 'red' : 'inherit', fontWeight: (errors['Doc' + index + '_Autor']) ? 'bold' : 'normal'}">Autor o Notario *</label>
                            <input type="text" v-model="doc.AutorNotario" :style="{borderColor: (errors['Doc' + index + '_Autor']) ? '#d32f2f' : '#ccc'}">
                        </div>

                        <div class="form-group">
                            <label :style="{color: (errors['Doc' + index + '_Fecha']) ? 'red' : 'inherit', fontWeight: (errors['Doc' + index + '_Fecha']) ? 'bold' : 'normal'}">Fecha de Documento *</label>
                            <input type="date" v-model="doc.FechaDocumento" :style="{borderColor: (errors['Doc' + index + '_Fecha']) ? '#d32f2f' : '#ccc'}">
                        </div>
                    </div>
                    
                    <button class="btn btn-secondary" style="width: 100%; margin-top: 10px;" @click="agregarDocumento">
                        ➕ AGREGAR DOCUMENTO
                    </button>

                    <!-- Aviso visual de falta de documentos -->
                    <div v-if="errors.Documentos" style="color: #d32f2f; background: #ffebee; padding: 8px 12px; border-radius: 4px; margin-top: 10px; font-size: 13px; font-weight: bold; border-left: 4px solid #d32f2f;">
                        ⚠️ Debe agregar al menos un documento a la lista.
                    </div>

                    <div class="coords-grid" style="margin-top: 15px;">
                        <div class="form-group">
                            <label :style="{color: errors.AreaTitulada ? 'red' : 'inherit', fontWeight: errors.AreaTitulada ? 'bold' : 'normal'}">Área Titulada *</label>
                            <input type="number" v-model.number="formData.AreaTitulada" step="0.01">
                        </div>
                        <div class="form-group">
                            <label :style="{color: errors.UnidadMedidaAreaTituladaCatalog ? 'red' : 'inherit', fontWeight: errors.UnidadMedidaAreaTituladaCatalog ? 'bold' : 'normal'}">Unidad (Título) *</label>
                            <select v-model.number="formData.UnidadMedidaAreaTituladaCatalog">
                                 <option :value="null" disabled selected>Seleccione...</option>
                                 <option v-for="opt in catalogos.UnidadMedida" :key="opt.id" :value="opt.id">{{ opt.nombre }}</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SECCIÓN 7: A FAVOR DE -->
            <div class="section">
                <h3>🤝 A Favor De (Terceros)</h3>
                <div class="form-group checkbox-group">
                    <label class="checkbox-container">
                        <input type="checkbox" v-model="formData.EsAFavorDe">
                        <span class="checkmark"></span>
                        ¿Es a favor de un tercero?
                    </label>
                </div>
                <div v-if="formData.EsAFavorDe">
                    <div class="form-group">
                        <label :style="{color: errors.AFavorDe ? 'red' : 'inherit', fontWeight: errors.AFavorDe ? 'bold' : 'normal'}">Nombre del Tercero *</label>
                        <input type="text" v-model="formData.AFavorDe">
                    </div>
                    <div class="form-group">
                        <label :style="{color: errors.RelacionConPoseedorCatalog ? 'red' : 'inherit', fontWeight: errors.RelacionConPoseedorCatalog ? 'bold' : 'normal'}">Parentesco / Relación *</label>
                        <div class="selector-display" @click="pedirParentescoGlobal" :style="{borderColor: errors.RelacionConPoseedorCatalog ? '#d32f2f' : '#ccc'}">
                            <span v-if="parentescoName" style="color: #1565C0; font-weight: 600;">{{ parentescoName }}</span>
                            <span v-else style="color: #757575;">Seleccione parentesco...</span>
                            <span style="color: #1976D2; font-size: 1.2rem;">🔍</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- SECCIÓN 8: CONFLICTOS -->
            <div class="section">
                <h3>⚠️ Conflictos</h3>
                <div class="form-group checkbox-group">
                    <label class="checkbox-container">
                        <input type="checkbox" v-model="formData.TieneConflicto">
                        <span class="checkmark"></span>
                        ¿Tiene Conflicto?
                    </label>
                </div>
                
                <div v-if="formData.TieneConflicto">
                    <div class="form-group">
                        <label :style="{color: errors.ClaseConflictoCatalog ? 'red' : 'inherit', fontWeight: errors.ClaseConflictoCatalog ? 'bold' : 'normal'}">Clase de Conflicto *</label>
                        <div class="selector-display" @click="pedirClaseConflictoGlobal" :style="{borderColor: errors.ClaseConflictoCatalog ? '#d32f2f' : '#ccc'}">
                            <span v-if="conflictoName" style="color: #1565C0; font-weight: 600;">{{ conflictoName }}</span>
                            <span v-else style="color: #757575;">Seleccione clase...</span>
                            <span style="color: #1976D2; font-size: 1.2rem;">🔍</span>
                        </div>
                    </div>

                    <div v-if="formData.ClaseConflictoCatalog === 13" class="form-group" style="margin-top: 10px;">
                        <label :style="{color: errors.ClaseConflictoOtroText ? 'red' : 'inherit', fontWeight: errors.ClaseConflictoOtroText ? 'bold' : 'normal'}">Especifique otro conflicto *</label>
                        <input type="text" v-model="formData.ClaseConflictoOtroText" :style="{borderColor: errors.ClaseConflictoOtroText ? '#d32f2f' : '#ccc'}" placeholder="Describa el conflicto...">
                    </div>

                    <!-- Vía de Gestión de Conflictos -->
                    <div class="form-group checkbox-group" style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #ccc;">
                        <label class="checkbox-container">
                            <input type="checkbox" v-model="formData.TieneGestionConflicto">
                            <span class="checkmark"></span>
                            ¿Tiene Vía de Gestión de Conflicto?
                        </label>
                    </div>

                    <div v-if="formData.TieneGestionConflicto">
                        <div class="form-group">
                            <label :style="{color: errors.GestionConflictoCatalog ? 'red' : 'inherit', fontWeight: errors.GestionConflictoCatalog ? 'bold' : 'normal'}">Vía de Gestión de Conflictos *</label>
                            <div class="selector-display" @click="pedirGestionConflictoGlobal" :style="{borderColor: errors.GestionConflictoCatalog ? '#d32f2f' : '#ccc'}">
                                <span v-if="gestionConflictoName" style="color: #1565C0; font-weight: 600;">{{ gestionConflictoName }}</span>
                                <span v-else style="color: #757575;">Seleccione vía de gestión...</span>
                                <span style="color: #1976D2; font-size: 1.2rem;">🔍</span>
                            </div>
                        </div>

                        <div v-if="formData.GestionConflictoCatalog === 6" class="form-group" style="margin-top: 10px;">
                            <label :style="{color: errors.GestionConflictoOtroText ? 'red' : 'inherit', fontWeight: errors.GestionConflictoOtroText ? 'bold' : 'normal'}">Especifique otra gestión *</label>
                            <input type="text" v-model="formData.GestionConflictoOtroText" :style="{borderColor: errors.GestionConflictoOtroText ? '#d32f2f' : '#ccc'}" placeholder="Describa la vía de gestión...">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Fotografías -->
            <div class="section">
                <h3>📸 Fotografías ({{ fotos.length }})</h3>
                <button type="button" class="btn btn-camera" style="width: 100%; margin-bottom: 10px;" @click="capturarFoto">
                    📷 CAPTURAR FOTO
                </button>
                <div v-if="fotos.length > 0" class="photos-grid">
                    <div v-for="(foto, index) in fotos" :key="index" class="photo-item">
                        <img :src="foto.data" class="photo-thumbnail" @click="verFoto(foto)">
                        <div class="photo-info">
                            <span class="photo-name">{{ foto.name }}</span>
                            <button type="button" class="btn-delete" @click="eliminarFoto(foto.name)">🗑️</button>
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
        const formData = Vue.reactive(props.data);
        const errors = Vue.reactive({});

        Vue.onMounted(async () => {
            // Solo calcular si es un registro NUEVO (sin NoEncuesta)
            if (!formData.NoEncuesta) {
                console.log('🏗️ Calculando ID de Ficha exclusivo...');
                try {
                    if (typeof Android !== 'undefined' && Android.getSiguienteConsecutivo) {
                        const lat = formData.LatLng?.Lat || 0;
                        const lng = formData.LatLng?.Lng || 0;

                        // Llamada al Bridge para obtener el consecutivo geográfico
                        const next = Android.getSiguienteConsecutivo(lat, lng);
                        formData.Consecutivo = next;

                        // Formatear el ID: Muni(4)_Sector(3)_Localizacion_Consecutivo(3)
                        const muni = String(formData.MunicipioCatalog || '0000').padStart(4, '0');
                        const sector = String(formData.IdSector || '000').padStart(3, '0');
                        const loc = formData.Localizacion || 'SIN_LOC';
                        const cons = String(next).padStart(3, '0');

                        // El campo NoEncuesta es inmutable una vez generado aquí
                        formData.NoEncuesta = `${muni}_${sector}_${loc}_${cons}`;
                        console.log('✅ ID Generado:', formData.NoEncuesta);
                    }
                } catch (e) {
                    console.error('❌ Error al generar NoEncuesta:', e);
                }
            }
        });

        // Inicializar lista de documentos si no existe
        if (!formData.Documentos) {
            formData.Documentos = [];
        }

        // --- Helpers Visuales ---
        const deptoDisplay = Vue.computed(() => {
            if (formData._DeptoNombre) {
                return { cod: formData._CodDepto || '', nombre: formData._DeptoNombre };
            }
            if (formData.MunicipioCatalog) {
                const codDepto = String(formData.MunicipioCatalog).padStart(4, '0').slice(0, 2);
                return { cod: codDepto, nombre: '...' };
            }
            return null;
        });

        const muniDisplay = Vue.computed(() => {
            if (formData._MuniNombre) {
                const codFull = String(formData.MunicipioCatalog || '');
                const codMuni = codFull.length >= 2 ? codFull.slice(-2) : codFull;
                return { cod: codMuni, nombre: formData._MuniNombre };
            }
            if (formData.MunicipioCatalog) {
                const codMuni = String(formData.MunicipioCatalog).slice(-2);
                return { cod: codMuni, nombre: 'Cargando...' };
            }
            return null;
        });

        const areaDisplay = Vue.computed({
            get: () => {
                const val = formData.AreaEstimada;
                if (val === null || val === undefined || val === '') return '';
                if (formData._isFromMap) {
                    return parseFloat(val).toFixed(2);
                }
                return val;
            },
            set: (val) => {
                formData.AreaEstimada = val;
            }
        });

        // Resolución automática de nombres al cambiar el ID
        Vue.watch(() => formData.MunicipioCatalog, (newVal) => {
            if (newVal) {
                const idStr = String(newVal).padStart(4, '0');
                const filename = 'DepartamentosMunicipios.json';

                const processData = (data) => {
                    for (const depto of data) {
                        const muni = depto.Municipios.find(m => m.CodMuni === idStr);
                        if (muni) {
                            formData._CodDepto = depto.CodDepto;
                            formData._DeptoNombre = depto.Departamento;
                            formData._MuniNombre = muni.Municipio;
                            break;
                        }
                    }
                };

                if (window.Android && window.Android.loadCatalogJson) {
                    try {
                        const jsonStr = window.Android.loadCatalogJson(filename);
                        if (jsonStr) {
                            processData(JSON.parse(jsonStr));
                            return;
                        }
                    } catch (e) { console.error('Error Bridge:', e); }
                }

                fetch(`data/${filename}`)
                    .then(r => r.json())
                    .then(processData)
                    .catch(err => console.error('Error Fetch:', err));
            }
        }, { immediate: true });

        // Limpiar documentos al desmarcar
        Vue.watch(() => formData.PresentaDocumentos, (newVal) => {
            if (!newVal) {
                formData.Documentos = [];
                formData.AreaTitulada = null;
                formData.UnidadMedidaAreaTituladaCatalog = null;
                delete errors.Documentos;
                delete errors.AreaTitulada;
                delete errors.UnidadMedidaAreaTituladaCatalog;
                Object.keys(errors).forEach(k => {
                    if (k.startsWith('Doc')) delete errors[k];
                });
            }
        });

        // Limpiar datos registrales
        Vue.watch(() => formData.TieneDatosRegistrales, (newVal) => {
            if (!newVal) {
                formData.FechaAdquisicion = null;
                formData.FechaRegistro = null;
                formData.NoFinca = '';
                formData.Tomo = '';
                formData.Folio = '';
                formData.Asiento = '';
                delete errors.FechaAdquisicion;
                delete errors.FechaRegistro;
                delete errors.NoFinca;
                delete errors.Tomo;
                delete errors.Folio;
                delete errors.Asiento;
            }
        });

        // Limpiar "A Favor De"
        Vue.watch(() => formData.EsAFavorDe, (newVal) => {
            if (!newVal) {
                formData.AFavorDe = '';
                formData.RelacionConPoseedorCatalog = 0;
                formData._ParentescoName = '';
                parentescoName.value = '';
                delete errors.AFavorDe;
                delete errors.RelacionConPoseedorCatalog;
            }
        });

        // Watchers para errores
        Vue.watch(() => formData.AFavorDe, (val) => { if (val?.trim()) delete errors.AFavorDe; });
        Vue.watch(() => formData.RelacionConPoseedorCatalog, (val) => { if (val) delete errors.RelacionConPoseedorCatalog; });
        Vue.watch(() => formData.FechaAdquisicion, (val) => { if (val) delete errors.FechaAdquisicion; });
        Vue.watch(() => formData.FechaRegistro, (val) => { if (val) delete errors.FechaRegistro; });
        Vue.watch(() => formData.NoFinca, (val) => { if (val?.trim()) delete errors.NoFinca; });
        Vue.watch(() => formData.Tomo, (val) => { if (val?.trim()) delete errors.Tomo; });
        Vue.watch(() => formData.Folio, (val) => { if (val?.trim()) delete errors.Folio; });
        Vue.watch(() => formData.Asiento, (val) => { if (val?.trim()) delete errors.Asiento; });

        Vue.watch(() => formData.ClaseConflictoCatalog, (val) => {
            if (val) delete errors.ClaseConflictoCatalog;
            if (val !== 13) {
                formData.ClaseConflictoOtroText = '';
                delete errors.ClaseConflictoOtroText;
            }
        });
        Vue.watch(() => formData.ClaseConflictoOtroText, (val) => { if (val?.trim()) delete errors.ClaseConflictoOtroText; });

        Vue.watch(() => formData.OrigenTierraCatalog, (val) => {
            if (val) delete errors.OrigenTierraCatalog;
            if (val !== 1) {
                formData.OrigenTierraOtroText = '';
                delete errors.OrigenTierraOtroText;
            }
        });
        Vue.watch(() => formData.OrigenTierraOtroText, (val) => { if (val?.trim()) delete errors.OrigenTierraOtroText; });

        // Limpiar conflictos al desmarcar
        Vue.watch(() => formData.TieneConflicto, (newVal) => {
            if (!newVal) {
                formData.ClaseConflictoCatalog = null;
                formData.ClaseConflictoOtroText = '';
                formData._ConflictoName = '';
                conflictoName.value = '';
                formData.TieneGestionConflicto = false;
                formData.GestionConflictoCatalog = null;
                formData.GestionConflictoOtroText = '';
                formData._GestionConflictoName = '';
                gestionConflictoName.value = '';
                delete errors.ClaseConflictoCatalog;
                delete errors.ClaseConflictoOtroText;
                delete errors.TieneGestionConflicto;
                delete errors.GestionConflictoCatalog;
                delete errors.GestionConflictoOtroText;
            }
        });

        Vue.watch(() => formData.TieneGestionConflicto, (newVal) => {
            if (!newVal) {
                formData.GestionConflictoCatalog = null;
                formData.GestionConflictoOtroText = '';
                formData._GestionConflictoName = '';
                gestionConflictoName.value = '';
                delete errors.GestionConflictoCatalog;
                delete errors.GestionConflictoOtroText;
            }
        });

        Vue.watch(() => formData.GestionConflictoCatalog, (val) => {
            if (val) delete errors.GestionConflictoCatalog;
            if (val !== 6) {
                formData.GestionConflictoOtroText = '';
                delete errors.GestionConflictoOtroText;
            }
        });
        Vue.watch(() => formData.GestionConflictoOtroText, (val) => { if (val?.trim()) delete errors.GestionConflictoOtroText; });

        const parentescoName = Vue.ref(formData._ParentescoName || '');
        const conflictoName = Vue.ref(formData._ConflictoName || '');
        const origenTierraName = Vue.ref(formData._OrigenTierraName || '');
        const gestionConflictoName = Vue.ref(formData._GestionConflictoName || '');

        // Normalizar fechas
        formData.Documentos.forEach(doc => {
            if (doc.FechaDocumento) doc.FechaDocumento = doc.FechaDocumento.split('T')[0];
        });
        const dateFields = ['FechaAdquisicion', 'FechaRegistro'];
        dateFields.forEach(f => {
            if (formData[f]) formData[f] = formData[f].split('T')[0];
        });

        const catalogos = {
            TipoEncuesta: [{ id: 1, nombre: 'Parcela Unificada' }, { id: 2, nombre: 'Parcela Horizontal' }],
            TipoUso: [{ id: 1, nombre: 'Privado' }, { id: 2, nombre: 'Público' }],
            UnidadMedida: [
                { id: 1, nombre: 'Caballerías' }, { id: 2, nombre: 'Hectáreas' },
                { id: 3, nombre: 'Metros Cuadrados' }, { id: 4, nombre: 'Manzanas' },
                { id: 5, nombre: 'Sin Datos' }, { id: 6, nombre: 'Varas Cuadradas' }
            ],
            TipoDerecho: [{ id: 1, nombre: 'Propietario' }, { id: 2, nombre: 'Poseedor' }],
            Servidumbre: [
                { id: 1, nombre: 'Acuerdo Verbal' },
                { id: 2, nombre: 'Escritura Publica' },
                { id: 3, nombre: 'Sentencia Judicial' },
                { id: 4, nombre: 'Otro' }
            ]
        };

        // Selectores Globales
        const pedirMunicipioGlobal = () => {
            if (typeof vueAppContext !== 'undefined') {
                vueAppContext.openMunicipio({
                    onSelect: (res) => {
                        formData.MunicipioCatalog = parseInt(res.codMuni);
                        formData._CodDepto = res.codDepto;
                        formData._DeptoNombre = res.departamento;
                        formData._MuniNombre = res.municipio;
                    }
                });
            }
        };

        const pedirParentescoGlobal = () => {
            if (typeof vueAppContext !== 'undefined') {
                vueAppContext.openCatalog({
                    catalogName: 'Parentesco',
                    label: 'Buscar Parentesco...',
                    onSelect: (val) => {
                        formData.RelacionConPoseedorCatalog = parseInt(val.id);
                        formData._ParentescoName = val.name;
                        parentescoName.value = val.name;
                    }
                });
            }
        };

        const pedirClaseConflictoGlobal = () => {
            if (typeof vueAppContext !== 'undefined') {
                vueAppContext.openCatalog({
                    catalogName: 'ClaseConflicto',
                    label: 'Clase de Conflicto...',
                    onSelect: (val) => {
                        formData.ClaseConflictoCatalog = parseInt(val.id);
                        formData._ConflictoName = val.name;
                        conflictoName.value = val.name;
                    }
                });
            }
        };

        const pedirOrigenTierraGlobal = () => {
            if (typeof vueAppContext !== 'undefined') {
                vueAppContext.openCatalog({
                    catalogName: 'OrigenTierra',
                    label: 'Origen de la Tierra...',
                    onSelect: (val) => {
                        formData.OrigenTierraCatalog = parseInt(val.id);
                        formData._OrigenTierraName = val.name;
                        origenTierraName.value = val.name;
                    }
                });
            }
        };

        const pedirGestionConflictoGlobal = () => {
            if (typeof vueAppContext !== 'undefined') {
                vueAppContext.openCatalog({
                    catalogName: 'GestionConflicto',
                    label: 'Vía de Gestión de Conflictos...',
                    onSelect: (val) => {
                        formData.GestionConflictoCatalog = parseInt(val.id);
                        formData._GestionConflictoName = val.name;
                        gestionConflictoName.value = val.name;
                    }
                });
            }
        };

        const pedirDocumentoGlobal = (index) => {
            if (typeof vueAppContext !== 'undefined') {
                vueAppContext.openCatalog({
                    catalogName: 'Documento',
                    label: 'Tipo de Documento...',
                    onSelect: (val) => {
                        formData.Documentos[index].DocumentoCatalog = parseInt(val.id);
                        formData.Documentos[index]._DocumentoName = val.name;
                    }
                });
            }
        };

        const agregarDocumento = () => {
            formData.Documentos.push({
                DocumentoCatalog: 0,
                AutorNotario: '',
                FechaDocumento: null,
                _DocumentoName: ''
            });
        };

        const quitarDocumento = (index) => {
            formData.Documentos.splice(index, 1);
        };

        const capturarFoto = () => {
            emit('camera');
        };

        const verFoto = (foto) => {
            if (typeof Android !== 'undefined' && Android.showPhoto) {
                Android.showPhoto(foto.name);
            }
        };

        const eliminarFoto = (filename) => {
            if (window.deletePhoto) {
                window.deletePhoto(filename);
            }
        };

        const validate = () => {
            let isValid = true;
            Object.keys(errors).forEach(k => delete errors[k]);

            if (!formData.MunicipioCatalog) { errors.MunicipioCatalog = true; isValid = false; }
            if (!formData.NombreFinca?.trim()) { errors.NombreFinca = true; isValid = false; }
            if (!formData.TipoEncuestaCatalog) { errors.TipoEncuestaCatalog = true; isValid = false; }
            if (!formData.TipoUsoCatalog) { errors.TipoUsoCatalog = true; isValid = false; }
            if (!formData.UnidadMedidaAreaEstimadaCatalog) { errors.UnidadMedidaAreaEstimadaCatalog = true; isValid = false; }
            if (!formData.DerehoParcelaCatalog) { errors.DerehoParcelaCatalog = true; isValid = false; }

            if (formData.PresentaDocumentos) {
                if (!formData.Documentos || formData.Documentos.length === 0) {
                    errors.Documentos = true;
                    isValid = false;
                } else {
                    formData.Documentos.forEach((doc, idx) => {
                        if (!doc.DocumentoCatalog) { errors['Doc' + idx + '_Catalog'] = true; isValid = false; }
                        if (!doc.AutorNotario?.trim()) { errors['Doc' + idx + '_Autor'] = true; isValid = false; }
                        if (!doc.FechaDocumento) { errors['Doc' + idx + '_Fecha'] = true; isValid = false; }
                    });
                }
                if (!formData.AreaTitulada) { errors.AreaTitulada = true; isValid = false; }
                if (!formData.UnidadMedidaAreaTituladaCatalog) { errors.UnidadMedidaAreaTituladaCatalog = true; isValid = false; }
            }

            if (formData.TieneDatosRegistrales) {
                if (!formData.FechaAdquisicion) { errors.FechaAdquisicion = true; isValid = false; }
                if (!formData.FechaRegistro) { errors.FechaRegistro = true; isValid = false; }
                if (!formData.NoFinca?.trim()) { errors.NoFinca = true; isValid = false; }
                if (!formData.Tomo?.trim()) { errors.Tomo = true; isValid = false; }
                if (!formData.Folio?.trim()) { errors.Folio = true; isValid = false; }
                if (!formData.Asiento?.trim()) { errors.Asiento = true; isValid = false; }
            }

            if (formData.EsAFavorDe) {
                if (!formData.AFavorDe?.trim()) { errors.AFavorDe = true; isValid = false; }
                if (!formData.RelacionConPoseedorCatalog) { errors.RelacionConPoseedorCatalog = true; isValid = false; }
            }

            if (formData.TieneConflicto) {
                if (!formData.ClaseConflictoCatalog) { errors.ClaseConflictoCatalog = true; isValid = false; }
                if (formData.ClaseConflictoCatalog === 13 && !formData.ClaseConflictoOtroText?.trim()) {
                    errors.ClaseConflictoOtroText = true;
                    isValid = false;
                }
                if (formData.TieneGestionConflicto) {
                    if (!formData.GestionConflictoCatalog) { errors.GestionConflictoCatalog = true; isValid = false; }
                    if (formData.GestionConflictoCatalog === 6 && !formData.GestionConflictoOtroText?.trim()) {
                        errors.GestionConflictoOtroText = true;
                        isValid = false;
                    }
                }
            }

            return isValid;
        };

        const save = () => {
            if (validate()) {
                emit('save', JSON.parse(JSON.stringify(formData)));
            } else {
                if (typeof Android !== 'undefined' && Android.showToast) {
                    Android.showToast('Por favor, complete los campos obligatorios marcados en rojo.');
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        };

        return {
            formData,
            errors,
            catalogos,
            muniDisplay,
            deptoDisplay,
            areaDisplay,
            parentescoName,
            conflictoName,
            origenTierraName,
            gestionConflictoName,
            pedirMunicipioGlobal,
            pedirParentescoGlobal,
            pedirClaseConflictoGlobal,
            pedirOrigenTierraGlobal,
            pedirGestionConflictoGlobal,
            pedirDocumentoGlobal,
            agregarDocumento,
            quitarDocumento,
            capturarFoto,
            verFoto,
            eliminarFoto,
            save
        };
    }
};

window.app.component('form-ficha', FormFicha);
