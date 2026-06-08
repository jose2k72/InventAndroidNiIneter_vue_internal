/**
 * Componente FormFicha - Vue 3
 * Formulario para la Ficha (Encuesta Catastral) basado en Ficha.cs
 */

const FormFicha = {
    props: ['data', 'fotos', 'localizacion'],
    template: `
        <div class="form-container">
            <h2>🏡 Encuesta Catastral</h2>
            
            <div class="btn-group" style="margin-bottom: 20px;">
                <button type="button" class="btn btn-success" @click="save">
                    💾 GUARDAR
                </button>
                <button type="button" class="btn btn-secondary" @click="$emit('cancel')">
                    ↩️ VOLVER
                </button>
            </div>
            
            <!-- SECCIÓN 1: UBICACIÓN E IDENTIFICACIÓN -->
            <div class="section">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                    <h3 style="margin: 0;">📍 Ubicación y Datos Generales</h3>
                    <button type="button" class="btn-detect-dir" @click="detectarDireccion">
                        <span>🔍 Autodetectar Dirección</span>
                    </button>
                </div>
                
                <div v-if="formData.NoEncuesta" class="id-display-box">
                    <span class="label">ID Encuesta:</span>
                    <span class="value">{{ formData.NoEncuesta }}</span>
                </div>
                
                <!-- Municipio: esquema de FormPropietarioNatural -->
                <div id="MunicipioCatalog" class="form-group">
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
                    <label>Nombre de la Finca / Sitio</label>
                    <input type="text" v-model="formData.NombreFinca" placeholder="Ej: Finca La Esperanza">
                </div>

                <div class="form-group">
                    <label :style="{color: errors.Direccion ? 'red' : 'inherit', fontWeight: errors.Direccion ? 'bold' : 'normal'}">Dirección de la Parcela *</label>
                    <textarea id="Direccion" v-model="formData.Direccion" rows="2" placeholder="Dirección exacta o descripción del lugar"></textarea>
                </div>

                <div class="coords-grid">
                    <div class="form-group">
                        <label :style="{color: errors.Caserio ? 'red' : 'inherit', fontWeight: errors.Caserio ? 'bold' : 'normal'}">Caserío</label>
                        <input type="text" v-model="formData.Caserio" placeholder="Ej: El Corozo">
                    </div>
                    <div class="form-group">
                        <label :style="{color: errors.BarrioComarca ? 'red' : 'inherit', fontWeight: errors.BarrioComarca ? 'bold' : 'normal'}">Barrio/Comarca</label>
                        <input type="text" v-model="formData.BarrioComarca" placeholder="Ej: San José">
                    </div>
                </div>

                <div class="coords-grid">
                    <div class="form-group">
                        <label>Parcela Catastrada</label>
                        <input type="text" v-model="formData.ParcelaCatastrada" readonly style="background-color: #f5f5f5;">
                    </div>
                </div>

                <div class="coords-grid">
                    <div class="form-group">
                        <label>Parcela Segregada</label>
                        <input type="text" v-model="formData.ParcelaSegregada" readonly style="background-color: #f5f5f5;">
                    </div>
                    <div class="form-group">
                        <label>Manzana / Lote</label>
                        <div style="display: flex; gap: 5px;">
                            <input type="text" v-model="formData.Manzana" placeholder="Mza" style="width: 40%; background-color: #f5f5f5;" readonly>
                            <input type="text" v-model="formData.NumeroLote" placeholder="Lote" style="width: 60%; background-color: #f5f5f5;" readonly>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SECCIÓN 2: DATOS DEL INMUEBLE Y USO -->
            <div class="section">
                <h3>📝 Datos del Inmueble y Uso</h3>
                
                <div class="form-group">
                    <label :style="{color: errors.TipoEncuestaCatalog ? 'red' : 'inherit', fontWeight: errors.TipoEncuestaCatalog ? 'bold' : 'normal'}">Tipo de Encuesta *</label>
                    <select id="TipoEncuestaCatalog" v-model.number="formData.TipoEncuestaCatalog">
                        <option :value="null" disabled selected>Seleccione...</option>
                        <option v-for="opt in catalogos.TipoEncuesta" :key="opt.id" :value="opt.id">{{ opt.nombre }}</option>
                    </select>
                </div>

                <div class="form-group">
                    <label :style="{color: errors.TipoUsoCatalog ? 'red' : 'inherit', fontWeight: errors.TipoUsoCatalog ? 'bold' : 'normal'}">Uso del Predio *</label>
                    <select id="TipoUsoCatalog" v-model.number="formData.TipoUsoCatalog">
                        <option :value="null" disabled selected>Seleccione...</option>
                        <option v-for="opt in catalogos.TipoUso" :key="opt.id" :value="opt.id">{{ opt.nombre }}</option>
                    </select>
                </div>

                <div class="form-group">
                    <label :style="{color: errors.DescripcionUsoCatalog ? 'red' : 'inherit', fontWeight: errors.DescripcionUsoCatalog ? 'bold' : 'normal'}">Descripción del Uso *</label>
                    <div id="DescripcionUsoCatalog" class="selector-display" @click="pedirDescripcionUsoGlobal" :style="{borderColor: errors.DescripcionUsoCatalog ? '#d32f2f' : '#ccc'}">
                        <span v-if="descripcionUsoName" style="color: #1565C0; font-weight: 600;">{{ descripcionUsoName }}</span>
                        <span v-else style="color: #757575;">Seleccione descripción...</span>
                        <span style="color: #1976D2; font-size: 1.2rem;">🔍</span>
                    </div>
                </div>

                <div v-if="formData.DescripcionUsoCatalog === 5" class="form-group sub-section">
                    <label :style="{color: errors.DescripcionUsoOtroText ? 'red' : 'inherit'}">Especifique Uso Mixto *</label>
                    <textarea id="DescripcionUsoOtroText" v-model="formData.DescripcionUsoOtroText" rows="3" placeholder="Detalle los múltiples usos de la parcela..."></textarea>
                </div>

                <div class="form-group">
                    <label :style="{color: errors.OrigenTierraCatalog ? 'red' : 'inherit', fontWeight: errors.OrigenTierraCatalog ? 'bold' : 'normal'}">Origen de la Tierra *</label>
                    <div id="OrigenTierraCatalog" class="selector-display" @click="pedirOrigenTierraGlobal">
                        <span v-if="origenTierraName" style="color: #1565C0; font-weight: 600;">{{ origenTierraName }}</span>
                        <span v-else style="color: #757575;">Seleccione origen...</span>
                        <span style="color: #1976D2; font-size: 1.2rem;">🔍</span>
                    </div>
                </div>

                <!-- Especificar Origen si es "Otros" (ID 1) -->
                <div v-if="formData.OrigenTierraCatalog === 1" class="form-group sub-section">
                    <label :style="{color: errors.OrigenTierraOtroText ? 'red' : 'inherit', fontWeight: errors.OrigenTierraOtroText ? 'bold' : 'normal'}">Especifique Origen *</label>
                    <input id="OrigenTierraOtroText" type="text" v-model="formData.OrigenTierraOtroText" placeholder="Detalle el origen de la tierra...">
                </div>

                <div class="form-group">
                    <label :style="{color: errors.ResenaHistorica ? 'red' : 'inherit', fontWeight: errors.ResenaHistorica ? 'bold' : 'normal'}">Reseña Histórica *</label>
                    <textarea id="ResenaHistorica" v-model="formData.ResenaHistorica" rows="9" placeholder="Documentación histórica del predio..."></textarea>
                </div>

                <div class="coords-grid">
                    <div class="form-group">
                        <label :style="{color: errors.AreaEstimada ? 'red' : 'inherit', fontWeight: errors.AreaEstimada ? 'bold' : 'normal'}">Área Estimada *</label>
                        <input type="number" v-model.number="areaDisplay" step="0.01" :readonly="formData._isFromMap" :style="{backgroundColor: formData._isFromMap ? '#f5f5f5' : 'white'}">
                    </div>
                    <div class="form-group">
                        <label :style="{color: errors.UnidadMedidaAreaEstimadaCatalog ? 'red' : 'inherit', fontWeight: errors.UnidadMedidaAreaEstimadaCatalog ? 'bold' : 'normal'}">Unidad *</label>
                        <select id="UnidadMedidaAreaEstimadaCatalog" v-model.number="formData.UnidadMedidaAreaEstimadaCatalog" :disabled="formData._isFromMap" :style="{backgroundColor: formData._isFromMap ? '#f5f5f5' : 'white'}">
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

            <!-- SECCIÓN 4: DATOS REGISTRALES -->
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
                            <label :style="{color: errors.FechaAdquisicion ? 'red' : 'inherit', fontWeight: errors.FechaAdquisicion ? 'bold' : 'normal'}">Fecha Adquisición</label>
                            <input 
                                type="text" 
                                inputmode="numeric" 
                                placeholder="DD/MM/AAAA" 
                                v-model="fechaAdquisicionUI"
                                @input="fechaAdquisicionUI = formatAsDate(fechaAdquisicionUI)"
                            >
                            <button type="button" class="ocr-btn" @click="scanField('FechaAdquisicion')" title="Escanear Fecha Adquisición" style="margin-top: 6px;">
                                <div class="ocr-icon-container">
                                    <span class="ocr-icon-doc">📄</span>
                                    <span class="ocr-icon-search">🔍</span>
                                </div>
                            </button>
                        </div>
                        <div class="form-group">
                            <label :style="{color: errors.FechaRegistro ? 'red' : 'inherit', fontWeight: errors.FechaRegistro ? 'bold' : 'normal'}">Fecha Registro</label>
                            <input 
                                type="text" 
                                inputmode="numeric" 
                                placeholder="DD/MM/AAAA" 
                                v-model="fechaRegistroUI"
                                @input="fechaRegistroUI = formatAsDate(fechaRegistroUI)"
                            >
                            <button type="button" class="ocr-btn" @click="scanField('FechaRegistro')" title="Escanear Fecha Registro" style="margin-top: 6px;">
                                <div class="ocr-icon-container">
                                    <span class="ocr-icon-doc">📄</span>
                                    <span class="ocr-icon-search">🔍</span>
                                </div>
                            </button>
                        </div>
                    </div>
                    <div class="coords-grid">
                        <div class="form-group">
                            <label :style="{color: errors.NoFinca_NAP ? 'red' : 'inherit', fontWeight: errors.NoFinca_NAP ? 'bold' : 'normal'}">No. Finca / NAP *</label>
                            <input id="NoFinca_NAP" type="text" v-model="formData.NoFinca_NAP">
                            <button type="button" class="ocr-btn" @click="scanField('NoFinca_NAP')" title="Escanear No. Finca" style="margin-top: 6px;">
                                <div class="ocr-icon-container">
                                    <span class="ocr-icon-doc">📄</span>
                                    <span class="ocr-icon-search">🔍</span>
                                </div>
                            </button>
                        </div>
                        <div class="form-group">
                            <label :style="{color: errors.Tomo ? 'red' : 'inherit', fontWeight: errors.Tomo ? 'bold' : 'normal'}">Tomo</label>
                            <input id="Tomo" type="text" v-model="formData.Tomo">
                            <button type="button" class="ocr-btn" @click="scanField('Tomo')" title="Escanear Tomo" style="margin-top: 6px;">
                                <div class="ocr-icon-container">
                                    <span class="ocr-icon-doc">📄</span>
                                    <span class="ocr-icon-search">🔍</span>
                                </div>
                            </button>
                        </div>
                    </div>
                    <div class="coords-grid">
                        <div class="form-group">
                            <label :style="{color: errors.Folio ? 'red' : 'inherit', fontWeight: errors.Folio ? 'bold' : 'normal'}">Folio</label>
                            <input id="Folio" type="text" v-model="formData.Folio">
                            <button type="button" class="ocr-btn" @click="scanField('Folio')" title="Escanear Folio" style="margin-top: 6px;">
                                <div class="ocr-icon-container">
                                    <span class="ocr-icon-doc">📄</span>
                                    <span class="ocr-icon-search">🔍</span>
                                </div>
                            </button>
                        </div>
                        <div class="form-group">
                            <label :style="{color: errors.Asiento ? 'red' : 'inherit', fontWeight: errors.Asiento ? 'bold' : 'normal'}">Asiento</label>
                            <input id="Asiento" type="text" v-model="formData.Asiento">
                            <button type="button" class="ocr-btn" @click="scanField('Asiento')" title="Escanear Asiento" style="margin-top: 6px;">
                                <div class="ocr-icon-container">
                                    <span class="ocr-icon-doc">📄</span>
                                    <span class="ocr-icon-search">🔍</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SECCIÓN 5: DOCUMENTOS -->
            <div id="Documentos" class="section">
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
                            <input 
                                type="text" 
                                inputmode="numeric" 
                                placeholder="DD/MM/AAAA" 
                                v-model="doc._FechaDocumentoUI"
                                @input="onDocFechaInput(doc)"
                                :style="{borderColor: (errors['Doc' + index + '_Fecha']) ? '#d32f2f' : '#ccc'}"
                            >
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
                            <label :style="{color: errors.AreaTitulada ? 'red' : 'inherit', fontWeight: errors.AreaTitulada ? 'bold' : 'normal'}">Área Titulada</label>
                            <input type="number" v-model.number="formData.AreaTitulada" step="0.01">
                        </div>
                        <div class="form-group">
                            <label :style="{color: errors.UnidadMedidaAreaTituladaCatalog ? 'red' : 'inherit', fontWeight: errors.UnidadMedidaAreaTituladaCatalog ? 'bold' : 'normal'}">Unidad (Título)</label>
                            <select v-model.number="formData.UnidadMedidaAreaTituladaCatalog">
                                 <option :value="null" disabled selected>Seleccione...</option>
                                 <option v-for="opt in catalogos.UnidadMedida" :key="opt.id" :value="opt.id">{{ opt.nombre }}</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SECCIÓN 6: CONFLICTOS -->
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
                        <div id="ClaseConflictoCatalog" class="selector-display" @click="pedirClaseConflictoGlobal" :style="{borderColor: errors.ClaseConflictoCatalog ? '#d32f2f' : '#ccc'}">
                            <span v-if="conflictoName" style="color: #1565C0; font-weight: 600;">{{ conflictoName }}</span>
                            <span v-else style="color: #757575;">Seleccione clase...</span>
                            <span style="color: #1976D2; font-size: 1.2rem;">🔍</span>
                        </div>
                    </div>

                    <div v-if="formData.ClaseConflictoCatalog === 13" class="form-group" style="margin-top: 10px;">
                        <label :style="{color: errors.ClaseConflictoOtroText ? 'red' : 'inherit', fontWeight: errors.ClaseConflictoOtroText ? 'bold' : 'normal'}">Especifique otro conflicto *</label>
                        <input id="ClaseConflictoOtroText" type="text" v-model="formData.ClaseConflictoOtroText" :style="{borderColor: errors.ClaseConflictoOtroText ? '#d32f2f' : '#ccc'}" placeholder="Describa el conflicto...">
                    </div>

                    <!-- Vía de Gestión de Conflictos (Obligatoria si hay conflicto) -->
                    <div class="form-group" style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #ccc;">
                        <label :style="{color: errors.GestionConflictoCatalog ? 'red' : 'inherit', fontWeight: errors.GestionConflictoCatalog ? 'bold' : 'normal'}">Vía de Gestión de Conflictos *</label>
                        <div id="GestionConflictoCatalog" class="selector-display" @click="pedirGestionConflictoGlobal" :style="{borderColor: errors.GestionConflictoCatalog ? '#d32f2f' : '#ccc'}">
                            <span v-if="gestionConflictoName" style="color: #1565C0; font-weight: 600;">{{ gestionConflictoName }}</span>
                            <span v-else style="color: #757575;">Seleccione vía de gestión...</span>
                            <span style="color: #1976D2; font-size: 1.2rem;">🔍</span>
                        </div>
                    </div>

                    <div v-if="formData.GestionConflictoCatalog === 6" class="form-group" style="margin-top: 10px;">
                        <label :style="{color: errors.GestionConflictoOtroText ? 'red' : 'inherit', fontWeight: errors.GestionConflictoOtroText ? 'bold' : 'normal'}">Especifique otra gestión *</label>
                        <input id="GestionConflictoOtroText" type="text" v-model="formData.GestionConflictoOtroText" :style="{borderColor: errors.GestionConflictoOtroText ? '#d32f2f' : '#ccc'}" placeholder="Describa la vía de gestión...">
                    </div>
                </div>
            </div>

            <!-- SECCIÓN 7: OBSERVACIONES -->
            <div class="section">
                <h3>📝 Observaciones</h3>
                <div class="form-group">
                    <label>Observaciones Generales</label>
                    <textarea v-model="formData.ObservacionesGenerales" rows="9" placeholder="Observaciones adicionales, notas o comentarios del encuestador acerca de la parcela..."></textarea>
                </div>
            </div>

            <!-- Foto del Frente del Predio (Obligatoria) -->
            <div id="FotoFrente" class="section" style="border: 2px dashed #1565C0; border-radius: 8px; padding: 15px; background-color: #fafdff;">
                <h3 :style="{color: errors.FotoFrente ? 'red' : '#1565C0'}">📸 Foto del Frente del Predio *</h3>
                
                <div v-if="fotoFrenteBase64" class="photo-item" style="max-width: 250px; margin: 0 auto 10px auto;">
                    <img :src="fotoFrenteBase64" class="photo-thumbnail" style="width: 100%; max-height: 180px; object-fit: cover; border-radius: 8px;">
                    <div class="photo-info" style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
                        <span class="photo-name" style="font-size: 0.8em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px;">{{ formData.FotoFrente }}</span>
                        <button type="button" class="btn-delete" @click="eliminarFotoFrente">🗑️</button>
                    </div>
                </div>
                <div v-else style="text-align: center; padding: 15px; border: 1px dashed #ccc; border-radius: 6px; margin-bottom: 10px; background-color: #fff;">
                    <span style="color: #d32f2f; font-size: 0.85rem; font-weight: 500;">⚠️ Se requiere capturar la foto del frente.</span>
                </div>
                <button type="button" class="btn btn-camera" style="width: 100%; background-color: #1565C0; color: white;" @click="capturarFotoFrente">
                    📷 CAPTURAR FOTO FRENTE *
                </button>
            </div>

            <!-- Fotografías Adicionales -->
            <div class="section">
                <h3>📸 Fotografías Adicionales ({{ fotosGenerales.length }})</h3>
                <button type="button" class="btn btn-camera" style="width: 100%; margin-bottom: 10px;" @click="capturarFoto">
                    📷 CAPTURAR FOTO ADICIONAL
                </button>
                <div v-if="fotosGenerales.length > 0" class="photos-grid">
                    <div v-for="(foto, index) in fotosGenerales" :key="index" class="photo-item">
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

        // --- Lógica de Generación de ID (NoEncuesta) ---
        const generarNoEncuesta = () => {
            try {
                if (typeof Android !== 'undefined' && Android.getSiguienteConsecutivo) {
                    const lat = formData.LatLng?.Lat || 0;
                    const lng = formData.LatLng?.Lng || 0;
                    const next = formData.Consecutivo || Android.getSiguienteConsecutivo(lat, lng);
                    formData.Consecutivo = next;

                    const muni = String(formData.MunicipioCatalog || '0000').padStart(4, '0');
                    const sector = String(formData.IdSector || '000').padStart(3, '0');
                    const lote = String(formData.NumeroLote || '000').padStart(3, '0');
                    const loc = (formData.Localizacion || 'SIN_LOC').replace(/\s+/g, '_').toUpperCase();
                    const cons = String(next).padStart(3, '0');


                    formData.NoEncuesta = `${muni}_${sector}_${lote}_${loc}_${cons}`;
                    
                    // Inicializar valores automáticos para la vista
                    formData.ParcelaCatastrada = formData.Localizacion || '';
                    formData.ParcelaSegregada = cons;

                    console.log('🆔 ID Ficha actualizado:', formData.NoEncuesta);
                }
            } catch (e) { console.error('❌ Error al generar NoEncuesta:', e); }
        };

        Vue.onMounted(async () => {
            if (!formData.NoEncuesta) generarNoEncuesta();
            cargarCatalogos();
        });

        // Autorecalculo si cambian datos base en registro nuevo
        Vue.watch(() => [formData.MunicipioCatalog, formData.IdSector, formData.NumeroLote, formData.Localizacion], () => {
            if (formData.Consecutivo) generarNoEncuesta();
        });

        // Limpieza de errores al escribir
        Vue.watch(() => formData.Direccion, (val) => { if (val?.trim()) delete errors.Direccion; });
        Vue.watch(() => formData.FotoFrente, (val) => { if (val && val !== 'null' && val !== 'undefined' && val.trim()) delete errors.FotoFrente; });
        Vue.watch(() => formData.DescripcionUsoCatalog, (val) => { if (val) delete errors.DescripcionUsoCatalog; });
        Vue.watch(() => formData.DescripcionUsoOtroText, (val) => { if (val?.trim()) delete errors.DescripcionUsoOtroText; });
        Vue.watch(() => formData.OrigenTierraCatalog, (val) => { if (val) delete errors.OrigenTierraCatalog; });
        Vue.watch(() => formData.OrigenTierraOtroText, (val) => { if (val?.trim()) delete errors.OrigenTierraOtroText; });
        Vue.watch(() => formData.ResenaHistorica, (val) => { if (val?.trim()) delete errors.ResenaHistorica; });

        // Limpieza de errores de Datos Registrales
        Vue.watch(() => formData.NoFinca_NAP, (val) => { if (val?.trim()) delete errors.NoFinca_NAP; });

        // --- inicialización ---
        if (!formData.Documentos) formData.Documentos = [];

        // --- Helpers Visuales (Computed) ---
        const deptoDisplay = Vue.computed(() => {
            if (formData._DeptoNombre) return { cod: formData._CodDepto || '', nombre: formData._DeptoNombre };
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
                return formData._isFromMap ? parseFloat(val).toFixed(2) : val;
            },
            set: (val) => { formData.AreaEstimada = val; }
        });

        // Resolución automática de nombres al cambiar el ID del Municipio
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
                        if (jsonStr) { processData(JSON.parse(jsonStr)); return; }
                    } catch (e) { console.error('Error Bridge:', e); }
                }
                fetch(`data/${filename}`).then(r => r.json()).then(processData).catch(err => console.error('Error Fetch:', err));
            }
        }, { immediate: true });

        // --- Manejo de Limpieza (Watchers) ---
        Vue.watch(() => formData.PresentaDocumentos, (newVal) => {
            if (!newVal) {
                formData.Documentos = [];
                formData.AreaTitulada = null;
                formData.UnidadMedidaAreaTituladaCatalog = null;
                Object.keys(errors).forEach(k => { if (k.startsWith('Doc') || k.includes('AreaTitulada')) delete errors[k]; });
            }
        });

        Vue.watch(() => formData.TieneDatosRegistrales, (newVal) => {
            if (!newVal) {
                formData.FechaAdquisicion = null; formData.FechaRegistro = null;
                formData.NoFinca_NAP = ''; formData.Tomo = ''; formData.Folio = ''; formData.Asiento = '';
                ['FechaAdquisicion', 'FechaRegistro', 'NoFinca_NAP', 'Tomo', 'Folio', 'Asiento'].forEach(k => delete errors[k]);
            }
        });

        Vue.watch(() => formData.TieneConflicto, (newVal) => {
            if (!newVal) {
                formData.ClaseConflictoCatalog = null; formData.ClaseConflictoOtroText = '';
                formData.GestionConflictoCatalog = null; formData.GestionConflictoOtroText = '';
                ['ClaseConflictoCatalog', 'ClaseConflictoOtroText', 'GestionConflictoCatalog', 'GestionConflictoOtroText'].forEach(k => delete errors[k]);
            }
        });

        // Limpieza de campos "Otro"
        Vue.watch(() => formData.DescripcionUsoCatalog, (val) => { if (val !== 5) formData.DescripcionUsoOtroText = ''; });
        Vue.watch(() => formData.OrigenTierraCatalog, (val) => { if (val !== 1) formData.OrigenTierraOtroText = ''; });
        Vue.watch(() => formData.ClaseConflictoCatalog, (val) => { if (val !== 13) formData.ClaseConflictoOtroText = ''; });
        Vue.watch(() => formData.GestionConflictoCatalog, (val) => { if (val !== 6) formData.GestionConflictoOtroText = ''; });
        Vue.watch(() => formData.ServidumbreAguaCatalog, (val) => { if (val !== 4) formData.ServidumbreAguaOtroText = ''; });
        Vue.watch(() => formData.ServidumbrePaseCatalog, (val) => { if (val !== 4) formData.ServidumbrePaseOtroText = ''; });
        Vue.watch(() => formData.ServidumbreOtroCatalog, (val) => { if (val !== 4) formData.ServidumbreOtroOtroText = ''; });

        const descripcionUsoName = Vue.ref(formData._DescripcionUsoName || '');
        const conflictoName = Vue.ref(formData._ConflictoName || '');
        const origenTierraName = Vue.ref(formData._OrigenTierraName || '');
        const gestionConflictoName = Vue.ref(formData._GestionConflictoName || '');

        // Normalización de fechas para inputs y UI
        const fechaAdquisicionUI = Vue.ref('');
        const fechaRegistroUI = Vue.ref('');

        const dateFields = ['FechaAdquisicion', 'FechaRegistro'];
        dateFields.forEach(f => { 
            if (formData[f]) {
                const cleanDate = formData[f].split('T')[0];
                formData[f] = cleanDate;
                const parts = cleanDate.split('-');
                if (parts.length === 3) {
                    if (f === 'FechaAdquisicion') fechaAdquisicionUI.value = `${parts[2]}/${parts[1]}/${parts[0]}`;
                    if (f === 'FechaRegistro') fechaRegistroUI.value = `${parts[2]}/${parts[1]}/${parts[0]}`;
                }
            }
        });

        formData.Documentos.forEach(doc => { 
            if (doc.FechaDocumento) {
                const cleanDate = doc.FechaDocumento.split('T')[0];
                doc.FechaDocumento = cleanDate;
                const parts = cleanDate.split('-');
                if (parts.length === 3) {
                    doc._FechaDocumentoUI = `${parts[2]}/${parts[1]}/${parts[0]}`;
                }
            } else {
                doc._FechaDocumentoUI = '';
            }
        });

        // Formateador de máscara de fecha automática al escribir dígitos
        const formatAsDate = (val) => {
            if (!val) return '';
            let clean = val.replace(/\D/g, '');
            if (clean.length > 8) clean = clean.substring(0, 8);
            if (clean.length > 4) {
                return `${clean.substring(0, 2)}/${clean.substring(2, 4)}/${clean.substring(4)}`;
            } else if (clean.length > 2) {
                return `${clean.substring(0, 2)}/${clean.substring(2)}`;
            }
            return clean;
        };

        // Rellenar fecha actual
        const setFechaAdquisicionToday = () => {
            const today = new Date();
            const y = today.getFullYear();
            const m = String(today.getMonth() + 1).padStart(2, '0');
            const d = String(today.getDate()).padStart(2, '0');
            fechaAdquisicionUI.value = `${d}/${m}/${y}`;
            formData.FechaAdquisicion = `${y}-${m}-${d}`;
        };

        const setFechaRegistroToday = () => {
            const today = new Date();
            const y = today.getFullYear();
            const m = String(today.getMonth() + 1).padStart(2, '0');
            const d = String(today.getDate()).padStart(2, '0');
            fechaRegistroUI.value = `${d}/${m}/${y}`;
            formData.FechaRegistro = `${y}-${m}-${d}`;
        };

        const onDocFechaInput = (doc) => {
            doc._FechaDocumentoUI = formatAsDate(doc._FechaDocumentoUI);
            const val = doc._FechaDocumentoUI;
            if (!val) {
                doc.FechaDocumento = null;
                return;
            }
            const parts = val.split('/');
            if (parts.length === 3) {
                const d = parts[0].padStart(2, '0');
                const m = parts[1].padStart(2, '0');
                const y = parts[2];
                if (y.length === 4) {
                    doc.FechaDocumento = `${y}-${m}-${d}`;
                    return;
                }
            }
            doc.FechaDocumento = null;
        };

        const setDocFechaToday = (doc) => {
            const today = new Date();
            const y = today.getFullYear();
            const m = String(today.getMonth() + 1).padStart(2, '0');
            const d = String(today.getDate()).padStart(2, '0');
            doc._FechaDocumentoUI = `${d}/${m}/${y}`;
            doc.FechaDocumento = `${y}-${m}-${d}`;
        };

        // Sincronizar UI (DD/MM/YYYY) -> Modelo (YYYY-MM-DD)
        Vue.watch(() => fechaAdquisicionUI.value, (newVal) => {
            delete errors.FechaAdquisicion;
            if (!newVal) {
                formData.FechaAdquisicion = null;
                return;
            }
            const parts = newVal.split('/');
            if (parts.length === 3) {
                const d = parts[0].padStart(2, '0');
                const m = parts[1].padStart(2, '0');
                const y = parts[2];
                if (y.length === 4) {
                    formData.FechaAdquisicion = `${y}-${m}-${d}`;
                    return;
                }
            }
            formData.FechaAdquisicion = null;
        });

        Vue.watch(() => fechaRegistroUI.value, (newVal) => {
            delete errors.FechaRegistro;
            if (!newVal) {
                formData.FechaRegistro = null;
                return;
            }
            const parts = newVal.split('/');
            if (parts.length === 3) {
                const d = parts[0].padStart(2, '0');
                const m = parts[1].padStart(2, '0');
                const y = parts[2];
                if (y.length === 4) {
                    formData.FechaRegistro = `${y}-${m}-${d}`;
                    return;
                }
            }
            formData.FechaRegistro = null;
        });

        // Sincronizar Modelo -> UI
        Vue.watch(() => formData.FechaAdquisicion, (newVal) => {
            if (!newVal) {
                fechaAdquisicionUI.value = '';
                return;
            }
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(newVal)) {
                fechaAdquisicionUI.value = newVal;
                return;
            }
            const parts = newVal.split('-');
            if (parts.length === 3) {
                fechaAdquisicionUI.value = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
        });

        Vue.watch(() => formData.FechaRegistro, (newVal) => {
            if (!newVal) {
                fechaRegistroUI.value = '';
                return;
            }
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(newVal)) {
                fechaRegistroUI.value = newVal;
                return;
            }
            const parts = newVal.split('-');
            if (parts.length === 3) {
                fechaRegistroUI.value = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
        });

        // Catálogos reactivos (Se cargan dinámicamente de /data/)
        const catalogos = Vue.reactive({
            TipoEncuesta: [],
            TipoUso: [],
            UnidadMedida: [],
            Servidumbre: []
        });

        // Función centralizada para desacoplar catálogos del código
        const cargarCatalogos = async () => {
            const mapeo = {
                TipoEncuesta: 'TipoEncuesta.json',
                TipoUso: 'TipoUso.json',
                UnidadMedida: 'UnidadMedida.json',
                Servidumbre: 'Servidumbre.json'
            };

            for (const [key, fileName] of Object.entries(mapeo)) {
                try {
                    let data = null;
                    if (window.Android && window.Android.loadCatalogJson) {
                        const str = window.Android.loadCatalogJson(fileName);
                        if (str) data = JSON.parse(str);
                    }
                    if (!data) {
                        const response = await fetch('data/' + fileName);
                        if (response.ok) data = await response.json();
                    }

                    if (data) {
                        // Inyectar y normalizar IDs numéricos para v-model.number
                        catalogos[key] = data.map(item => ({
                            ...item,
                            id: isNaN(parseInt(item.id)) ? item.id : parseInt(item.id)
                        }));
                    }
                } catch (e) {
                    console.error(`❌ Error al desacoplar catálogo ${fileName}:`, e);
                }
            }
        };

        // --- Acciones de UI ---
        const pedirMunicipioGlobal = () => {
            if (typeof vueAppContext !== 'undefined') {
                vueAppContext.openMunicipio({
                    onSelect: (res) => {
                        formData.MunicipioCatalog = res.codMuni; // String
                        formData._CodDepto = res.codDepto;
                        formData._DeptoNombre = res.departamento;
                        formData._MuniNombre = res.municipio;
                    }
                });
            }
        };

        const pedirClaseConflictoGlobal = () => {
            if (typeof vueAppContext !== 'undefined') {
                vueAppContext.openCatalog({
                    catalogName: 'ClaseConflicto', label: 'Clase de Conflicto...',
                    onSelect: (val) => {
                        formData.ClaseConflictoCatalog = parseInt(val.id);
                        formData._ConflictoName = val.name; conflictoName.value = val.name;
                    }
                });
            }
        };

        const pedirDescripcionUsoGlobal = () => {
            if (typeof vueAppContext !== 'undefined') {
                vueAppContext.openCatalog({
                    catalogName: 'UsoParcela', label: 'Descripción del Uso...',
                    onSelect: (val) => {
                        const parsedId = parseInt(val.id);
                        formData.DescripcionUsoCatalog = parsedId;
                        formData._DescripcionUsoName = val.name; descripcionUsoName.value = val.name;
                        if (parsedId !== 5) {
                            formData.DescripcionUsoOtroText = '';
                        }
                    }
                });
            }
        };

        const pedirOrigenTierraGlobal = () => {
            if (typeof vueAppContext !== 'undefined') {
                vueAppContext.openCatalog({
                    catalogName: 'OrigenTierra', label: 'Origen de la Tierra...',
                    onSelect: (val) => {
                        formData.OrigenTierraCatalog = parseInt(val.id);
                        formData._OrigenTierraName = val.name; origenTierraName.value = val.name;
                    }
                });
            }
        };

        const pedirGestionConflictoGlobal = () => {
            if (typeof vueAppContext !== 'undefined') {
                vueAppContext.openCatalog({
                    catalogName: 'GestionConflicto', label: 'Vía de Gestión de Conflictos...',
                    onSelect: (val) => {
                        formData.GestionConflictoCatalog = parseInt(val.id);
                        formData._GestionConflictoName = val.name; gestionConflictoName.value = val.name;
                    }
                });
            }
        };

        const pedirDocumentoGlobal = (index) => {
            if (typeof vueAppContext !== 'undefined') {
                vueAppContext.openCatalog({
                    catalogName: 'Documento-Mod', label: 'Tipo de Documento...',
                    onSelect: (val) => {
                        formData.Documentos[index].DocumentoCatalog = parseInt(val.id);
                        formData.Documentos[index]._DocumentoName = val.name;
                    }
                });
            }
        };

        const agregarDocumento = () => { formData.Documentos.push({ DocumentoCatalog: 0, AutorNotario: '', FechaDocumento: null, _DocumentoName: '', _FechaDocumentoUI: '' }); };
        const quitarDocumento = (index) => { formData.Documentos.splice(index, 1); };
        const fotoFrenteBase64 = Vue.ref('');

        const cargarFotoFrente = () => {
            if (formData.FotoFrente && typeof Android !== 'undefined' && typeof Android.loadPhotoAsBase64 === 'function') {
                const b64 = Android.loadPhotoAsBase64(formData.FotoFrente);
                if (b64) {
                    fotoFrenteBase64.value = 'data:image/jpeg;base64,' + b64;
                } else {
                    fotoFrenteBase64.value = '';
                }
            } else {
                fotoFrenteBase64.value = '';
            }
        };

        Vue.watch(() => formData.FotoFrente, cargarFotoFrente, { immediate: true });

        const fotosGenerales = Vue.computed(() => {
            if (!props.fotos) return [];
            return props.fotos.filter(f => f.name !== formData.FotoFrente);
        });

        const capturarFotoFrente = () => emit('camera-frente');

        const eliminarFotoFrente = () => {
            if (typeof window.showConfirmModal === 'function') {
                window.showConfirmModal({
                    icon: '📷',
                    title: '¿Eliminar foto del frente?',
                    message: 'Esta foto será eliminada físicamente.',
                    confirmText: 'Sí, eliminar',
                    cancelText: 'Cancelar',
                    onConfirm: () => {
                        if (typeof Android !== 'undefined' && typeof Android.deletePhotoFile === 'function') {
                            Android.deletePhotoFile(formData.FotoFrente);
                        }
                        if (window.deletePhoto) {
                            window.deletePhoto(formData.FotoFrente);
                        } else {
                            formData.FotoFrente = '';
                        }
                    }
                });
            } else {
                if (confirm('¿Desea eliminar la foto del frente?')) {
                    if (typeof Android !== 'undefined' && typeof Android.deletePhotoFile === 'function') {
                        Android.deletePhotoFile(formData.FotoFrente);
                    }
                    if (window.deletePhoto) {
                        window.deletePhoto(formData.FotoFrente);
                    } else {
                        formData.FotoFrente = '';
                    }
                }
            }
        };

        const capturarFoto = () => emit('camera');
        const verFoto = (foto) => { if (typeof Android !== 'undefined' && Android.showPhoto) Android.showPhoto(foto.name); };
        const eliminarFoto = (filename) => { if (window.deletePhoto) window.deletePhoto(filename); };

        const validate = () => {
            Object.keys(errors).forEach(k => delete errors[k]);
            let isValid = true;
            if (!formData.MunicipioCatalog) { errors.MunicipioCatalog = true; isValid = false; }

            if (!formData.Direccion?.trim()) { errors.Direccion = true; isValid = false; }
            if (!formData.FotoFrente || formData.FotoFrente === 'null' || formData.FotoFrente === 'undefined' || !formData.FotoFrente.trim()) { errors.FotoFrente = true; isValid = false; }
            if (!formData.TipoEncuestaCatalog) { errors.TipoEncuestaCatalog = true; isValid = false; }
            if (!formData.TipoUsoCatalog) { errors.TipoUsoCatalog = true; isValid = false; }
            if (!formData.DescripcionUsoCatalog) { errors.DescripcionUsoCatalog = true; isValid = false; }
            if (formData.DescripcionUsoCatalog === 5 && !formData.DescripcionUsoOtroText?.trim()) { errors.DescripcionUsoOtroText = true; isValid = false; }
            if (!formData.OrigenTierraCatalog) { errors.OrigenTierraCatalog = true; isValid = false; }
            if (formData.OrigenTierraCatalog === 1 && !formData.OrigenTierraOtroText?.trim()) { errors.OrigenTierraOtroText = true; isValid = false; }
            if (!formData.ResenaHistorica?.trim()) { errors.ResenaHistorica = true; isValid = false; }
            if (!formData.UnidadMedidaAreaEstimadaCatalog) { errors.UnidadMedidaAreaEstimadaCatalog = true; isValid = false; }
            if (formData.PresentaDocumentos) {
                if (!formData.Documentos?.length) { errors.Documentos = true; isValid = false; }
                else {
                    formData.Documentos.forEach((doc, idx) => {
                        if (!doc.DocumentoCatalog) errors['Doc' + idx + '_Catalog'] = true;
                        if (!doc.AutorNotario?.trim()) errors['Doc' + idx + '_Autor'] = true;
                        if (!doc.FechaDocumento) errors['Doc' + idx + '_Fecha'] = true;
                    });
                    if (Object.keys(errors).some(k => k.startsWith('Doc'))) isValid = false;
                }
                // El área titulada es opcional, pero si se pone debe tener unidad y ser >= 0
                const areaInput = formData.AreaTitulada;
                const hasAreaVal = areaInput !== null && areaInput !== undefined && areaInput !== '';
                if (hasAreaVal) {
                    if (areaInput < 0) { errors.AreaTitulada = true; isValid = false; }
                    if (!formData.UnidadMedidaAreaTituladaCatalog) { errors.UnidadMedidaAreaTituladaCatalog = true; isValid = false; }
                }
            }
            if (formData.TieneDatosRegistrales) {
                if (!formData.NoFinca_NAP?.trim()) {
                    errors.NoFinca_NAP = true;
                    isValid = false;
                }
            }
            if (formData.TieneConflicto) {
                if (!formData.ClaseConflictoCatalog) { errors.ClaseConflictoCatalog = true; isValid = false; }
                if (formData.ClaseConflictoCatalog === 13 && !formData.ClaseConflictoOtroText?.trim()) { errors.ClaseConflictoOtroText = true; isValid = false; }
                if (!formData.GestionConflictoCatalog) { errors.GestionConflictoCatalog = true; isValid = false; }
                if (formData.GestionConflictoCatalog === 6 && !formData.GestionConflictoOtroText?.trim()) { errors.GestionConflictoOtroText = true; isValid = false; }
            }
            return isValid;
        };

        const dirMap = {
            'N': 'Norte', 'S': 'Sur', 'E': 'Este', 'O': 'Oeste',
            'NE': 'Noreste', 'NO': 'Noroeste', 'SE': 'Sureste', 'SO': 'Suroeste'
        };

        const copiarDireccion = (d) => {
            if (d.Direccion) formData.Direccion = d.Direccion;
            if (d.Caserio) formData.Caserio = d.Caserio;
            if (d.BarrioComarca) formData.BarrioComarca = d.BarrioComarca;
            if (d.NombreFinca) formData.NombreFinca = d.NombreFinca;
        };

        const detectarDireccion = () => {
            if (typeof Android !== 'undefined' && Android.getDataInAdjacentPolygons && formData.IdObject) {
                try {
                    const rawJson = Android.getDataInAdjacentPolygons(formData.IdObject);
                    const adyacentes = JSON.parse(rawJson || "[]");
                    
                    // Filtrar y mapear las fichas vecinales reteniendo su localización y dirección relativa
                    const fichasVecinas = adyacentes
                        .filter(item => {
                            const d = item.Data;
                            return d && d.Type === 'Ficha' && (d.Direccion?.trim() || d.Caserio?.trim() || d.BarrioComarca?.trim());
                        })
                        .map(item => ({
                            data: item.Data,
                            localizacion: item.LocalizacionPredio,
                            direccionRelativa: item.DireccionRelativa
                        }));
                    
                    if (fichasVecinas.length === 0) {
                        Android.showAlert('⚠️ No se encontraron encuestas colindantes con datos de dirección.');
                    } else {
                        // Construir lista con contexto geográfico
                        let listHtml = '<div class="detect-options-list">';
                        fichasVecinas.forEach((item, idx) => {
                            const d = item.data;
                            const dirFriendly = dirMap[item.direccionRelativa] || item.direccionRelativa;
                            const desc = `${d.Direccion || ''} (${d.Caserio || ''} - ${d.BarrioComarca || ''})`.trim();
                            
                            listHtml += `
                                <button type="button" class="detect-option-item" onclick="window._tempSelectFicha(${idx})">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                        <strong style="color: #6200EE; font-size: 0.95rem;">📍 Al ${dirFriendly} (${item.localizacion})</strong>
                                    </div>
                                    <span style="font-size: 0.85em; color: #444; line-height: 1.4; white-space: normal; display: block;">
                                        ${d.NombreFinca ? `<strong>Finca:</strong> ${d.NombreFinca}<br>` : ''}
                                        ${desc}
                                    </span>
                                </button>
                            `;
                        });
                        listHtml += '</div>';

                        window._tempSelectFicha = (idx) => {
                            copiarDireccion(fichasVecinas[idx].data);
                            const overlay = document.querySelector('.confirm-modal-overlay');
                            if (overlay) overlay.remove();
                            delete window._tempSelectFicha;
                            Android.showAlert('✅ Dirección copiada.');
                        };

                        window.showConfirmModal({
                            icon: '🔍',
                            title: 'Elegir Ficha Vecina Colindante',
                            message: listHtml,
                            confirmText: '', // Ocultado por CSS
                            cancelText: 'Cancelar',
                            onCancel: () => {
                                delete window._tempSelectFicha;
                            }
                        });
                    }
                } catch (e) {
                    console.error('Error al autodetectar dirección:', e);
                }
            } else {
                alert('La detección de dirección solo está disponible en la tablet con datos colindantes.');
            }
        };

        const save = () => {
            if (validate()) emit('save', JSON.parse(JSON.stringify(formData)));
            else {
                if (typeof Android !== 'undefined' && Android.showToast) Android.showToast('⚠️ Faltan datos marcados en rojo.');
                
                // Orden de campos para posicionar el scroll en el primer error visible
                const errorOrder = [
                    'MunicipioCatalog', 'Direccion', 'TipoEncuestaCatalog', 'TipoUsoCatalog', 
                    'DescripcionUsoCatalog', 'DescripcionUsoOtroText', 'OrigenTierraCatalog', 
                    'OrigenTierraOtroText', 'ResenaHistorica', 'UnidadMedidaAreaEstimadaCatalog',
                    'Documentos', 'NoFinca_NAP', 'ClaseConflictoCatalog', 'ClaseConflictoOtroText', 
                    'GestionConflictoCatalog', 'GestionConflictoOtroText', 'FotoFrente'
                ];

                const firstErrorKey = errorOrder.find(key => {
                    if (key === 'Documentos') {
                        return errors.Documentos || Object.keys(errors).some(k => k.startsWith('Doc'));
                    }
                    return errors[key];
                });

                if (firstErrorKey) {
                    const el = document.getElementById(firstErrorKey);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        if (el.focus && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA')) {
                            el.focus();
                        }
                        return;
                    }
                }

                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        };

        const scanField = (fieldName) => emit('ocr-scan', fieldName);

        return {
            formData, errors, catalogos, muniDisplay, deptoDisplay, areaDisplay, origenTierraName, conflictoName, gestionConflictoName, descripcionUsoName,
            pedirMunicipioGlobal, pedirDescripcionUsoGlobal, pedirClaseConflictoGlobal, pedirOrigenTierraGlobal, pedirGestionConflictoGlobal, pedirDocumentoGlobal,
            agregarDocumento, quitarDocumento, capturarFoto, verFoto, eliminarFoto, save, detectarDireccion, scanField,
            fotoFrenteBase64, fotosGenerales, capturarFotoFrente, eliminarFotoFrente,
            fechaAdquisicionUI, fechaRegistroUI, formatAsDate, setFechaAdquisicionToday, setFechaRegistroToday, onDocFechaInput, setDocFechaToday
        };
    }
};

window.app.component('form-ficha', FormFicha);

// Inyección dinámica de estilos para el botón de detección de dirección y el listado modal
const styleFicha = document.createElement('style');
styleFicha.innerHTML = `
    .btn-detect-dir {
        background-color: #f3e5f5;
        color: #6200EE;
        border: 1px solid #6200EE;
        border-radius: 8px;
        padding: 6px 12px;
        font-size: 0.85rem;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 5px;
    }
    .btn-detect-dir:hover {
        background-color: #6200EE;
        color: white;
    }
    .detect-options-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 15px;
        max-height: 250px;
        overflow-y: auto;
        padding-right: 5px;
    }
    .detect-option-item {
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        padding: 10px 12px;
        text-align: left;
        cursor: pointer;
        width: 100%;
        transition: all 0.2s ease;
        display: block;
    }
    .detect-option-item:hover {
        border-color: #6200EE;
        background-color: #f3e5f5;
    }
    /* Ocultar el botón "Confirmar" predeterminado cuando se muestra esta lista */
    .confirm-modal-message:has(.detect-options-list) + .confirm-modal-buttons #modal-confirm {
        display: none !important;
    }
    .confirm-modal-message:has(.detect-options-list) + .confirm-modal-buttons {
        justify-content: center !important;
    }
`;
document.head.appendChild(styleFicha);
