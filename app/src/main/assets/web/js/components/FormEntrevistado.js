/**
 * Componente FormEntrevistado - Vue 3
 * Formulario para el Entrevistado basado en Person.cs y Entrevistado.cs de C#
 */

const FormEntrevistado = {
    props: ['data'],
    template: `
        <div class="form-container">
            <h2>🎤 Entrevistado / Informante</h2>

            <div class="btn-group" style="margin-bottom: 20px;">
                <button type="button" class="btn btn-success" @click="save">
                    💾 GUARDAR
                </button>
                <button type="button" class="btn btn-secondary" @click="$emit('cancel')">
                    ↩️ VOLVER
                </button>
            </div>

            <div class="section">
                <h3>📋 Relación</h3>
                
                <div class="coords-grid">
                    <div class="form-group">
                        <label :style="{color: errors.RelacionConParcelaCatalog ? 'red' : 'inherit', fontWeight: errors.RelacionConParcelaCatalog ? 'bold' : 'normal'}">Relación con la parcela *</label>
                        <select v-model.number="formData.RelacionConParcelaCatalog">
                            <option :value="null" disabled selected>Seleccione...</option>
                            <option v-for="opt in catalogos.RelacionInformanteParcela" :key="opt.id" :value="opt.id">{{ opt.nombre }}</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label :style="{color: errors.RelacionInformantePropietarioCatalog ? 'red' : 'inherit', fontWeight: errors.RelacionInformantePropietarioCatalog ? 'bold' : 'normal'}">Relación con el propietario *</label>
                        <!-- Selector que llama a la vista principal -->
                        <div class="selector-display" 
                             @click="formData.RelacionConParcelaCatalog !== 1 && pedirRelacionPropietarioGlobal()" 
                             :style="{
                                 borderColor: errors.RelacionInformantePropietarioCatalog ? '#d32f2f' : '#ccc',
                                 backgroundColor: formData.RelacionConParcelaCatalog === 1 ? '#f5f5f5' : 'white',
                                 opacity: formData.RelacionConParcelaCatalog === 1 ? 0.6 : 1,
                                 cursor: formData.RelacionConParcelaCatalog === 1 ? 'not-allowed' : 'pointer'
                             }">
                            <span v-if="formData.RelacionConParcelaCatalog === 1" style="color: #9e9e9e;">No aplica (es Propietario)</span>
                            <span v-else-if="relacionPropietarioName" style="color: #1565C0; font-weight: 600;">{{ relacionPropietarioName }}</span>
                            <span v-else style="color: #757575;">Seleccione relación...</span>
                            <span v-if="formData.RelacionConParcelaCatalog !== 1" style="color: #1976D2; font-size: 1.2rem;">🔍</span>
                        </div>
                    </div>
                </div>

                <!-- Especificar Relación (cuando es 'Otro' ID 5) -->
                <div v-if="formData.RelacionConParcelaCatalog == 5" class="form-group sub-section" style="margin-top: -10px; margin-bottom: 15px;">
                    <label :style="{color: errors.RelacionConParcelaOtroText ? 'red' : 'inherit', fontWeight: errors.RelacionConParcelaOtroText ? 'bold' : 'normal'}">Especificar Relación *</label>
                    <input type="text" v-model="formData.RelacionConParcelaOtroText" placeholder="Detalle la relación con la parcela...">
                </div>
            </div>

            <div class="section">
                <h3>🆔 Identificación</h3>
                
                <div class="coords-grid">
                    <div class="form-group">
                        <label :style="{color: errors.TipoIdentificacionCatalog ? 'red' : 'inherit', fontWeight: errors.TipoIdentificacionCatalog ? 'bold' : 'normal'}">Tipo de Identificación *</label>
                        <select v-model.number="formData.TipoIdentificacionCatalog">
                             <option :value="null" disabled selected>Seleccione...</option>
                             <option v-for="opt in catalogos.TipoIdentificacion" :key="opt.id" :value="opt.id">{{ opt.nombre }}</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label :style="{color: errors.Identificacion ? 'red' : 'inherit', fontWeight: errors.Identificacion ? 'bold' : 'normal'}">No. Identificación *</label>
                        <input type="text" v-model="formData.Identificacion" @blur="validarIdentificacion" :placeholder="placeholderIdentificacion">
                        <button type="button" class="ocr-btn" @click="scanField('Identificacion')" title="Escanear Identificación" style="margin-top: 6px;">
                            <div class="ocr-icon-container">
                                <span class="ocr-icon-doc">📄</span>
                                <span class="ocr-icon-search">🔍</span>
                            </div>
                        </button>
                        <small v-if="errors.IdentificacionMsg" style="color: #d32f2f; font-weight: bold; display: block; margin-top: 4px;">{{ errors.IdentificacionMsg }}</small>
                    </div>
                </div>

                <!-- Especificar Tipo Identificación (cuando es 'Otro' ID 6) -->
                <div v-if="formData.TipoIdentificacionCatalog == 6" class="form-group sub-section" style="margin-top: -10px; margin-bottom: 15px;">
                    <label :style="{color: errors.TipoIdentificacionOtroText ? 'red' : 'inherit', fontWeight: errors.TipoIdentificacionOtroText ? 'bold' : 'normal'}">Especifique Tipo de Identificación *</label>
                    <input type="text" v-model="formData.TipoIdentificacionOtroText" placeholder="Detalle el tipo de identificación...">
                </div>
            </div>

            <!-- Propietarios Catastrales Detectados en el Mapa -->
            <div class="section" v-if="formData.RelacionConParcelaCatalog === 1 && propietariosDisponibles.length > 0">
                <h3>👥 Propietarios Catastrales en Mapa</h3>
                <div style="margin-bottom: 12px; padding: 10px; background-color: #E3F2FD; border: 1px solid #90CAF9; border-radius: 8px; font-size: 0.9rem; color: #0D47A1;">
                    Se detectaron <strong>{{ propietariosDisponibles.length }}</strong> propietario(s) de tipo Persona Natural en el predio. Si alguno corresponde al entrevistado, selecciónelo para rellenar nombres y apellidos.
                </div>
                <div style="display: grid; gap: 10px; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));">
                    <div v-for="prop in propietariosDisponibles" :key="prop.id" 
                         style="background: white; border: 1px solid #BBDEFB; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                        <div>
                            <div style="font-weight: bold; color: #1976D2; font-size: 1rem; margin-bottom: 6px; display: flex; justify-content: space-between;">
                                <span>👤 {{ prop.nombre }}</span>
                                <span style="font-size: 0.75rem; background-color: #E8F5E9; color: #2E7D32; padding: 2px 6px; border-radius: 4px; font-weight: bold;">Natural</span>
                            </div>
                            <div style="font-size: 0.8rem; color: #555; margin-bottom: 8px; background: #F9F9F9; padding: 6px; border-radius: 4px;">
                                <strong>Llenado tentativo:</strong>
                                <div style="display: grid; grid-template-columns: auto 1fr; gap: 2px 6px; margin-top: 4px; padding-left: 6px; border-left: 2px solid #90CAF9;">
                                    <span style="color: #666;">Nombres:</span><strong>{{ previewNames(prop.nombre, prop.invertido).first }} {{ previewNames(prop.nombre, prop.invertido).second }}</strong>
                                    <span style="color: #666;">Apellidos:</span><strong>{{ previewNames(prop.nombre, prop.invertido).firstSur }} {{ previewNames(prop.nombre, prop.invertido).secondSur }}</strong>
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px; margin-top: 8px; border-top: 1px solid #F0F0F0; padding-top: 8px;">
                            <button type="button" @click="seleccionarPropietarioCatastral(prop)" 
                                    style="flex: 1; padding: 6px 12px; background-color: #1976D2; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.85rem;">
                                Seleccionar
                            </button>
                            <button type="button" @click="toggleInvertir(prop)" 
                                    style="padding: 6px 10px; background-color: #ECEFF1; color: #37474F; border: 1px solid #CFD8DC; border-radius: 4px; cursor: pointer; font-size: 0.8rem;"
                                    title="Invertir orden (Apellidos primero)">
                                🔄 Apellidos primero
                            </button>
                        </div>
                    </div>
                </div>
                <button type="button" @click="limpiarNombres()" 
                        style="margin-top: 12px; width: 100%; padding: 8px; background-color: #ECEFF1; color: #37474F; border: 1px solid #CFD8DC; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; gap: 6px;">
                    ❌ Descartar selección / Limpiar nombres
                </button>
            </div>

            <div class="section">
                <h3>📝 Datos Personales</h3>
                
                <div class="coords-grid">
                    <div class="form-group">
                        <label :style="{color: errors.FirstName ? 'red' : 'inherit', fontWeight: errors.FirstName ? 'bold' : 'normal'}">Primer Nombre *</label>
                        <input type="text" v-model="formData.FirstName" placeholder="Ej: Juan" @blur="validarNombre('FirstName')">
                        <button type="button" class="ocr-btn" @click="scanField('Entrevistado_Nombres')" title="Escanear Nombres" style="margin-top: 6px;">
                            <div class="ocr-icon-container">
                                <span class="ocr-icon-doc">📄</span>
                                <span class="ocr-icon-search">🔍</span>
                            </div>
                        </button>
                        <small v-if="errors.FirstNameMsg" style="color: #d32f2f; font-weight: bold; display: block; margin-top: 4px;">{{ errors.FirstNameMsg }}</small>
                    </div>
                    <div class="form-group">
                        <label :style="{color: errors.SecondName ? 'red' : 'inherit', fontWeight: errors.SecondName ? 'bold' : 'normal'}">Segundo Nombre</label>
                        <input type="text" v-model="formData.SecondName" placeholder="Ej: Antonio" @blur="validarNombre('SecondName')">
                        <small v-if="errors.SecondNameMsg" style="color: #d32f2f; font-weight: bold; display: block; margin-top: 4px;">{{ errors.SecondNameMsg }}</small>
                    </div>
                </div>

                <div class="coords-grid">
                    <div class="form-group">
                        <label :style="{color: errors.FirstSurName ? 'red' : 'inherit', fontWeight: errors.FirstSurName ? 'bold' : 'normal'}">Primer Apellido *</label>
                        <input type="text" v-model="formData.FirstSurName" placeholder="Ej: Pérez" @blur="validarNombre('FirstSurName')">
                        <button type="button" class="ocr-btn" @click="scanField('Entrevistado_Apellidos')" title="Escanear Apellidos" style="margin-top: 6px;">
                            <div class="ocr-icon-container">
                                <span class="ocr-icon-doc">📄</span>
                                <span class="ocr-icon-search">🔍</span>
                            </div>
                        </button>
                        <small v-if="errors.FirstSurNameMsg" style="color: #d32f2f; font-weight: bold; display: block; margin-top: 4px;">{{ errors.FirstSurNameMsg }}</small>
                    </div>
                    <div class="form-group">
                        <label :style="{color: errors.SecondSurName ? 'red' : 'inherit', fontWeight: errors.SecondSurName ? 'bold' : 'normal'}">Segundo Apellido</label>
                        <input type="text" v-model="formData.SecondSurName" placeholder="Ej: García" @blur="validarNombre('SecondSurName')">
                        <small v-if="errors.SecondSurNameMsg" style="color: #d32f2f; font-weight: bold; display: block; margin-top: 4px;">{{ errors.SecondSurNameMsg }}</small>
                    </div>
                </div>

                <div class="coords-grid">
                    <div class="form-group">
                        <label :style="{color: errors.GenderCatalog ? 'red' : 'inherit', fontWeight: errors.GenderCatalog ? 'bold' : 'normal'}">Género *</label>
                        <select v-model.number="formData.GenderCatalog">
                             <option :value="null" disabled selected>Seleccione...</option>
                             <option v-for="opt in catalogos.Generos" :key="opt.id" :value="opt.id">{{ opt.nombre }}</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label :style="{color: errors.Age ? 'red' : 'inherit', fontWeight: errors.Age ? 'bold' : 'normal'}">Edad *</label>
                        <input type="number" v-model.number="formData.Age" min="1" max="99" @blur="validarEdad">
                        <small v-if="errors.AgeMsg" style="color: #d32f2f; font-weight: bold; display: block; margin-top: 4px;">{{ errors.AgeMsg }}</small>
                    </div>
                </div>

                <div class="coords-grid">
                    <div class="form-group">
                        <label :style="{color: errors.CivilStateCatalog ? 'red' : 'inherit', fontWeight: errors.CivilStateCatalog ? 'bold' : 'normal'}">Estado Civil *</label>
                        <select v-model.number="formData.CivilStateCatalog">
                             <option :value="null" disabled selected>Seleccione...</option>
                             <option v-for="opt in catalogos.EstadoCivil" :key="opt.id" :value="opt.id">{{ opt.nombre }}</option>
                        </select>
                    </div>
                    <div class="form-group">
                       <label :style="{color: errors.ProfessionCatalog ? 'red' : 'inherit', fontWeight: errors.ProfessionCatalog ? 'bold' : 'normal'}">Profesión u Oficio *</label>
                       <!-- Selector que llama a la vista principal -->
                       <div class="selector-display" @click="pedirProfesionGlobal">
                           <span v-if="profesionName" style="color: #1565C0; font-weight: 600;">{{ profesionName }}</span>
                           <span v-else style="color: #757575;">Seleccione una profesión...</span>
                           <span style="color: #1976D2; font-size: 1.2rem;">🔍</span>
                       </div>
                    </div>
                </div>

                <!-- Especificar Profesión (cuando es 'Otro' ID 26) -->
                <div v-if="formData.ProfessionCatalog == 26" class="form-group sub-section" style="margin-top: -10px; margin-bottom: 15px;">
                    <label :style="{color: errors.ProfessionOtroText ? 'red' : 'inherit', fontWeight: errors.ProfessionOtroText ? 'bold' : 'normal'}">Especificar Profesión *</label>
                    <input type="text" v-model="formData.ProfessionOtroText" placeholder="Detalle la profesión u oficio...">
                </div>
            </div>

            <div class="section" v-if="formData.RelacionConParcelaCatalog === 1 || formData.RelacionConParcelaCatalog === 2">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                    <h3 style="margin: 0;">🏠 Residencia</h3>
                    <button type="button" class="btn-detect-dir" @click="detectarDireccion">
                        <span>🔍 Autodetectar Residencia</span>
                    </button>
                </div>

                <!-- Municipio: selector visual de dos niveles -->
                <div class="form-group">
                    <label :style="{color: errors.ResidenceMunicipioCatalog ? 'red' : 'inherit', fontWeight: errors.ResidenceMunicipioCatalog ? 'bold' : 'normal'}">Municipio de Residencia *</label>

                    <!-- Trigger para abrir el selector -->
                    <div class="selector-display" @click="pedirMunicipioGlobal" style="margin-bottom: 6px;">
                        <span v-if="muniDisplay" style="color: #1565C0; font-weight: 600;">Cambiar...</span>
                        <span v-else style="color: #757575;">Seleccione departamento / municipio...</span>
                        <span style="color: #1976D2; font-size: 1.2rem;">📍</span>
                    </div>

                    <!-- Visualización del departamento seleccionado (readonly) -->
                    <div v-if="deptoDisplay" style="
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        padding: 10px 12px;
                        background: #e3f2fd;
                        border: 1px solid #90caf9;
                        border-radius: 6px;
                        margin-bottom: 6px;
                        font-size: 14px;
                    ">
                        <span style="font-weight: bold; color: #1565C0; min-width: 32px;">{{ deptoDisplay.cod }}</span>
                        <span style="color: #333;">{{ deptoDisplay.nombre }}</span>
                    </div>

                    <!-- Visualización del municipio seleccionado (readonly) -->
                    <div v-if="muniDisplay" style="
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        padding: 10px 12px;
                        background: #e8f5e9;
                        border: 1px solid #a5d6a7;
                        border-radius: 6px;
                        font-size: 14px;
                    ">
                        <span style="font-weight: bold; color: #2e7d32; min-width: 32px;">{{ muniDisplay.cod }}</span>
                        <span style="color: #333;">{{ muniDisplay.nombre }}</span>
                    </div>
                </div>

                <!-- Caserío en una sola línea -->
                <div class="form-group">
                    <label :style="{color: errors.ResidenceCaserio ? 'red' : 'inherit', fontWeight: errors.ResidenceCaserio ? 'bold' : 'normal'}">Caserío</label>
                    <input type="text" v-model="formData.ResidenceCaserio">
                </div>

                <!-- Barrio/Comarca en una sola línea -->
                <div class="form-group">
                    <label :style="{color: errors.ResidenceBarrioComarca ? 'red' : 'inherit', fontWeight: errors.ResidenceBarrioComarca ? 'bold' : 'normal'}">Barrio/Comarca</label>
                    <input type="text" v-model="formData.ResidenceBarrioComarca">
                </div>

                <div class="form-group">
                    <label :style="{color: errors.ResidenceDireccion ? 'red' : 'inherit', fontWeight: errors.ResidenceDireccion ? 'bold' : 'normal'}">Dirección exacta *</label>
                    <textarea v-model="formData.ResidenceDireccion" rows="2"></textarea>
                </div>
            </div>

            <!-- Firma del Entrevistado -->
            <div class="section">
                <h3 :style="{color: (errors.Firma || errors.RazonNoFirma) ? 'red' : 'inherit'}">✍️ Firma del Entrevistado</h3>

                <!-- Toggle: ¿puede / va a firmar? -->
                <div class="form-group checkbox-group" style="margin-bottom: 14px;">
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-weight: bold;">
                        <input type="checkbox" v-model="formData.ConFirma" style="width: 18px; height: 18px; cursor: pointer;">
                        <span>✏️ El entrevistado puede / va a firmar</span>
                    </label>
                </div>

                <!-- Rama 1: ConFirma = true → Canvas de firma -->
                <div v-if="formData.ConFirma !== false">
                    <div style="margin-bottom: 12px; font-size: 0.9rem; color: #555;">
                        Por favor, dibuje la firma del entrevistado en el recuadro a continuación.
                    </div>

                    <!-- Si ya hay una firma guardada y no estamos editándola -->
                    <div v-if="formData.FirmaBase64 && !mostrarCanvasFirma" 
                         style="display: flex; flex-direction: column; align-items: center; gap: 10px; background: #F9F9F9; padding: 15px; border: 1px solid #E0E0E0; border-radius: 8px;">
                        <img :src="formData.FirmaBase64" alt="Firma registrada" style="max-width: 100%; height: auto; max-height: 150px; background: white; border: 1px solid #CCC; border-radius: 4px; box-shadow: inset 0 0 5px rgba(0,0,0,0.1);" />
                        <button type="button" @click="activarEdicionFirma" 
                                style="padding: 8px 16px; background-color: #6200EE; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 6px;">
                            🔄 Volver a Firmar
                        </button>
                    </div>

                    <!-- Si no hay firma o si el usuario quiere volver a firmar -->
                    <div v-else style="display: flex; flex-direction: column; gap: 10px;">
                        <div style="position: relative; width: 100%; max-width: 100%; margin: 0 auto;">
                            <canvas ref="canvasFirma" 
                                    style="border: 2px dashed #90CAF9; border-radius: 8px; background-color: #F5F5F5; cursor: crosshair; display: block; width: 100%; height: 300px; box-sizing: border-box;"
                                    @touchstart="onTouchStart"
                                    @touchmove="onTouchMove"
                                    @touchend="onTouchEnd"
                                    @mousedown="onMouseDown"
                                    @mousemove="onMouseMove"
                                    @mouseup="onMouseUp"
                                    @mouseleave="onMouseUp"></canvas>
                            <div v-if="!firmaDibujada" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #9E9E9E; font-size: 0.9rem; pointer-events: none; text-align: center;">
                                ✏️ Firme aquí
                            </div>
                        </div>

                        <div style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; margin-top: 5px;">
                            <button type="button" @click="limpiarCanvasFirma" 
                                    style="padding: 8px 16px; background-color: #ECEFF1; color: #37474F; border: 1px solid #CFD8DC; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 6px;">
                                🧹 Limpiar
                            </button>
                            <button type="button" @click="guardarFirmaDibujada" 
                                    style="padding: 8px 16px; background-color: #4CAF50; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 6px;">
                                ✔️ Confirmar Firma
                            </button>
                            <button v-if="formData.FirmaBase64" type="button" @click="cancelarEdicionFirma" 
                                    style="padding: 8px 16px; background-color: #78909C; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.85rem;">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Rama 2: ConFirma = false → Razón de no firma -->
                <div v-else>
                    <div class="form-group">
                        <label :style="{color: errors.RazonNoFirma ? 'red' : 'inherit', fontWeight: errors.RazonNoFirma ? 'bold' : 'normal'}">Razón de no firma *</label>
                        <select v-model="formData.RazonNoFirma">
                            <option value="" disabled>Seleccione una razón...</option>
                            <option value="NQF">No quiso firmar</option>
                            <option value="NSF">No sabe firmar</option>
                            <option value="IFF">Impedimento físico de firma</option>
                            <option value="OTRO">Otro</option>
                        </select>
                    </div>
                    <!-- Patrón "Otro": campo de texto libre -->
                    <div v-if="formData.RazonNoFirma === 'OTRO'" class="form-group sub-section" style="margin-top: -10px; margin-bottom: 15px;">
                        <label :style="{color: errors.RazonNoFirmaOtro ? 'red' : 'inherit', fontWeight: errors.RazonNoFirmaOtro ? 'bold' : 'normal'}">Especifique la razón *</label>
                        <input type="text" v-model="formData.RazonNoFirmaOtro" placeholder="Detalle el motivo...">
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
        // IMPORTANTE: No usar spread — necesitamos el mismo objeto de app.js para que
        // los cambios del callback (desde SelectCatalog) persistan al recrear el componente.
        const formData = Vue.reactive(props.data);
        const errors = Vue.reactive({});

        // Firma Digital Canvas Refs
        const canvasFirma = Vue.ref(null);
        const mostrarCanvasFirma = Vue.ref(!formData.FirmaBase64);
        const firmaDibujada = Vue.ref(false);

        // Variables para nombres visuales de Municipio
        // Los _helper persisten en formData (que es el objeto de app.js)
        const deptoDisplay = Vue.ref(
            formData._DeptoNombre
                ? { cod: formData._CodDepto, nombre: formData._DeptoNombre }
                : null
        );
        const muniDisplay = Vue.ref(
            formData._MuniNombre
                ? { cod: formData.ResidenceMunicipioCatalog ? String(formData.ResidenceMunicipioCatalog).slice(-2) : '', nombre: formData._MuniNombre }
                : null
        );

        // Llamada al selector de municipio (dos niveles)
        const pedirMunicipioGlobal = () => {
            if (typeof vueAppContext !== 'undefined' && typeof vueAppContext.openMunicipio === 'function') {
                vueAppContext.openMunicipio({
                    onSelect: (resultado) => {
                        // DTO: código completo del municipio
                        formData.ResidenceMunicipioCatalog = resultado.codMuni;
                        // Helpers UI: persisten en el objeto de app.js
                        formData._CodDepto = resultado.codDepto;
                        formData._DeptoNombre = resultado.departamento;
                        formData._MuniNombre = resultado.municipio;
                        // Actualizar visualización local
                        deptoDisplay.value = { cod: resultado.codDepto, nombre: resultado.departamento };
                        muniDisplay.value = { cod: resultado.codMuni.slice(-2), nombre: resultado.municipio };
                    }
                });
            } else {
                console.error('❌ vueAppContext.openMunicipio no encontrado.');
            }
        };

        // Nombre visual de profesión (helper UI que persiste en formData)
        const profesionName = Vue.ref(formData._ProfessionName || '');
        const relacionPropietarioName = Vue.ref(formData._RelacionPropietarioName || '');

        // Llamada a la app global usando el contexto global asegurado vueAppContext
        // Catálogos reactivos (Se cargan dinámicamente de /data/)
        const catalogos = Vue.reactive({
            RelacionInformanteParcela: [],
            TipoIdentificacion: [],
            Generos: [],
            EstadoCivil: []
        });

        // Función centralizada para desacoplar catálogos del código
        const cargarCatalogos = async () => {
            const mapeo = {
                RelacionInformanteParcela: 'RelacionInformanteParcela.json',
                TipoIdentificacion: 'TipoIdentificacion.json',
                Generos: 'Genero.json',
                EstadoCivil: 'EstadoCivil.json'
            };

            for (const [key, fileName] of Object.entries(mapeo)) {
                try {
                    let data = null;
                    // Intentar vía Bridge Android (Offline)
                    if (window.Android && window.Android.loadCatalogJson) {
                        const str = window.Android.loadCatalogJson(fileName);
                        if (str) data = JSON.parse(str);
                    }
                    // Fallback a Fetch (Desarrollo / Navegador)
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

        const propietariosDisponibles = Vue.ref([]);

        const esEmpresa = (nombre) => {
            const raw = nombre.toUpperCase();
            const palabrasClave = [
                '\\bS\\.?A\\.?\\b', '\\bLTDA\\b', '\\bLIMITADA\\b', '\\bC\\.?A\\.?\\b',
                '\\bS\\.?R\\.?L\\.?\\b', '\\bINC\\b', '\\bCORP\\b', '\\bCOOPERATIVA\\b',
                '\\bASOCIACION\\b', '\\bFUNDACION\\b', '\\bMINISTERIO\\b', '\\bALCALDIA\\b',
                '\\bEMPRESA\\b', '\\bCONSORCIO\\b', '\\bINVERSIONES\\b', '\\bS\\.?A\\.?U\\.?\\b',
                '\\bINSTITUTO\\b', '\\bASOC\\b', '\\bSOCIEDAD\\b', '\\bESTADO\\b',
                '\\bGOBIERNO\\b', '\\bIGLESIA\\b', '\\bPROYECTO\\b', '\\bS\\.?F\\.?\\b'
            ];
            const regex = new RegExp(palabrasClave.join('|'), 'i');
            return regex.test(raw);
        };

        const parseNombreCompleto = (fullName, invertido = false) => {
            let raw = fullName.trim().toUpperCase();
            let parts = raw.split(/\s+/).filter(p => p.length > 0);
            
            let firstName = '';
            let secondName = '';
            let firstSurName = '';
            let secondSurName = '';

            if (parts.length === 1) {
                firstName = parts[0];
            } else if (parts.length === 2) {
                if (invertido) {
                    firstSurName = parts[0];
                    firstName = parts[1];
                } else {
                    firstName = parts[0];
                    firstSurName = parts[1];
                }
            } else {
                if (invertido) {
                    firstSurName = parts[0];
                    secondSurName = parts[1];
                    firstName = parts[2];
                    if (parts.length > 3) {
                        secondName = parts.slice(3).join(' ');
                    }
                } else {
                    firstName = parts[0];
                    secondSurName = parts[parts.length - 1];
                    firstSurName = parts[parts.length - 2];
                    if (parts.length > 3) {
                        secondName = parts.slice(1, parts.length - 2).join(' ');
                    }
                }
            }
            return { first: firstName, second: secondName, firstSur: firstSurName, secondSur: secondSurName };
        };

        const previewNames = (nombre, invertido) => {
            return parseNombreCompleto(nombre, invertido);
        };

        const toggleInvertir = (prop) => {
            prop.invertido = !prop.invertido;
            propietariosDisponibles.value = [...propietariosDisponibles.value];
        };

        const seleccionarPropietarioCatastral = (prop) => {
            const parsed = parseNombreCompleto(prop.nombre, prop.invertido);
            
            formData.FirstName = parsed.first;
            formData.SecondName = parsed.second;
            formData.FirstSurName = parsed.firstSur;
            formData.SecondSurName = parsed.secondSur;

            delete errors.FirstName;
            delete errors.FirstNameMsg;
            delete errors.SecondName;
            delete errors.SecondNameMsg;
            delete errors.FirstSurName;
            delete errors.FirstSurNameMsg;
            delete errors.SecondSurName;
            delete errors.SecondSurNameMsg;

            if (typeof Android !== 'undefined' && Android.showToast) {
                Android.showToast('✅ Nombres y apellidos copiados.');
            }
        };

        const limpiarNombres = () => {
            formData.FirstName = '';
            formData.SecondName = '';
            formData.FirstSurName = '';
            formData.SecondSurName = '';

            delete errors.FirstName;
            delete errors.FirstNameMsg;
            delete errors.SecondName;
            delete errors.SecondNameMsg;
            delete errors.FirstSurName;
            delete errors.FirstSurNameMsg;
            delete errors.SecondSurName;
            delete errors.SecondSurNameMsg;

            if (typeof Android !== 'undefined' && Android.showToast) {
                Android.showToast('ℹ️ Campos de nombres limpiados.');
            }
        };

        const cargarPropietariosCatastrales = () => {
            const predioId = (typeof Android !== 'undefined' && Android.getIdObject) ? Android.getIdObject() : null;
            if (!predioId) {
                propietariosDisponibles.value = [];
                return;
            }
            if (typeof Android !== 'undefined' && Android.getPropietariosDelPredio) {
                try {
                    const rawJson = Android.getPropietariosDelPredio(predioId);
                    const allOwners = JSON.parse(rawJson || '[]');
                    // Para Entrevistado, descartar lo que suene a empresa
                    propietariosDisponibles.value = allOwners
                        .filter(o => o.nombre && !esEmpresa(o.nombre))
                        .map(o => ({ ...o, invertido: false }));
                } catch(e) {
                    console.error("Error al cargar propietarios", e);
                    propietariosDisponibles.value = [];
                }
            } else {
                // Mock para navegador/pruebas
                propietariosDisponibles.value = [
                    { id: 990, nombre: "BRUNILDA ROBLES ARTOLA", invertido: false },
                    { id: 991, nombre: "ALCALDIA DE MANAGUA", invertido: false },
                    { id: 992, nombre: "JOSE MARTIN MENDOZA PEREZ", invertido: false }
                ].filter(o => !esEmpresa(o.nombre));
            }
        };

        let ctx = null;
        let isDrawing = false;
        let lastX = 0;
        let lastY = 0;

        const initCanvas = () => {
            const canvas = canvasFirma.value;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height || 200;
            
            ctx = canvas.getContext('2d');
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        };

        Vue.watch(mostrarCanvasFirma, (val) => {
            if (val) {
                Vue.nextTick(() => {
                    initCanvas();
                });
            }
        });

        const getTouchPos = (touchEvent) => {
            const canvas = canvasFirma.value;
            if (!canvas) return { x: 0, y: 0 };
            const rect = canvas.getBoundingClientRect();
            const touch = touchEvent.touches[0];
            return {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            };
        };

        const onTouchStart = (e) => {
            e.preventDefault();
            if (!ctx) initCanvas();
            isDrawing = true;
            const pos = getTouchPos(e);
            lastX = pos.x;
            lastY = pos.y;
            firmaDibujada.value = true;
        };

        const onTouchMove = (e) => {
            e.preventDefault();
            if (!isDrawing) return;
            const pos = getTouchPos(e);
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            lastX = pos.x;
            lastY = pos.y;
        };

        const onTouchEnd = () => {
            isDrawing = false;
        };

        const getMousePos = (mouseEvent) => {
            const canvas = canvasFirma.value;
            if (!canvas) return { x: 0, y: 0 };
            const rect = canvas.getBoundingClientRect();
            return {
                x: mouseEvent.clientX - rect.left,
                y: mouseEvent.clientY - rect.top
            };
        };

        const onMouseDown = (e) => {
            if (!ctx) initCanvas();
            isDrawing = true;
            const pos = getMousePos(e);
            lastX = pos.x;
            lastY = pos.y;
            firmaDibujada.value = true;
        };

        const onMouseMove = (e) => {
            if (!isDrawing) return;
            const pos = getMousePos(e);
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            lastX = pos.x;
            lastY = pos.y;
        };

        const onMouseUp = () => {
            isDrawing = false;
        };

        const limpiarCanvasFirma = () => {
            const canvas = canvasFirma.value;
            if (canvas && ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                firmaDibujada.value = false;
            }
        };

        const guardarFirmaDibujada = () => {
            const canvas = canvasFirma.value;
            if (!canvas || !firmaDibujada.value) {
                if (typeof Android !== 'undefined' && Android.showAlert) {
                    Android.showAlert('⚠️ Debe dibujar una firma antes de confirmar.');
                } else {
                    alert('⚠️ Debe dibujar una firma antes de confirmar.');
                }
                return;
            }
            const dataUrl = canvas.toDataURL('image/png');
            formData.FirmaBase64 = dataUrl;
            mostrarCanvasFirma.value = false;
            delete errors.Firma;
            if (typeof Android !== 'undefined' && Android.showToast) {
                Android.showToast('✅ Firma confirmada.');
            }
        };

        const activarEdicionFirma = () => {
            mostrarCanvasFirma.value = true;
            firmaDibujada.value = false;
            Vue.nextTick(() => {
                initCanvas();
            });
        };

        const cancelarEdicionFirma = () => {
            mostrarCanvasFirma.value = false;
        };

        // Cargar en el momento del montaje
        Vue.onMounted(() => {
            cargarCatalogos();
            if (formData.RelacionConParcelaCatalog === 1) {
                cargarPropietariosCatastrales();
            }
            if (mostrarCanvasFirma.value) {
                Vue.nextTick(() => {
                    initCanvas();
                });
            }
        });

        // Escuchar cambios en Relación con la parcela
        Vue.watch(() => formData.RelacionConParcelaCatalog, (newVal) => {
            if (newVal === 1) { // 1 = Propietario(a)
                formData.RelacionInformantePropietarioCatalog = 0;
                formData._RelacionPropietarioName = '';
                relacionPropietarioName.value = '';
                delete errors.RelacionInformantePropietarioCatalog;
                cargarPropietariosCatastrales();
            }
            
            // Si NO es Propietario (1) ni Poseedor (2), se limpian los campos de residencia
            if (newVal !== 1 && newVal !== 2) {
                formData.ResidenceMunicipioCatalog = null;
                formData._CodDepto = null;
                formData._DeptoNombre = null;
                formData._MuniNombre = null;
                formData.ResidenceCaserio = '';
                formData.ResidenceBarrioComarca = '';
                formData.ResidenceDireccion = '';
                deptoDisplay.value = null;
                muniDisplay.value = null;
                delete errors.ResidenceMunicipioCatalog;
                delete errors.ResidenceCaserio;
                delete errors.ResidenceBarrioComarca;
                delete errors.ResidenceDireccion;
            }
            if (newVal !== 5) {
                formData.RelacionConParcelaOtroText = '';
                delete errors.RelacionConParcelaOtroText;
            }
        });

        // Limpiar "Otro" si se cambia el tipo de identificación y revalidar
        Vue.watch(() => formData.TipoIdentificacionCatalog, (newVal) => {
            if (newVal != 6) {
                formData.TipoIdentificacionOtroText = '';
                delete errors.TipoIdentificacionOtroText;
            }
            if (formData.Identificacion?.trim()) {
                validarIdentificacion();
            }
        });

        Vue.watch(() => formData.Identificacion, (newVal, oldVal) => {
            if (errors.IdentificacionMsg && newVal !== oldVal?.toUpperCase()) {
                delete errors.Identificacion;
                delete errors.IdentificacionMsg;
            }
        });

        // Al cambiar ConFirma: limpiar datos de la rama que se abandona
        Vue.watch(() => formData.ConFirma, (newVal) => {
            if (newVal) {
                // Activada la firma → limpiar razón de no firma
                formData.RazonNoFirma = '';
                formData.RazonNoFirmaOtro = '';
                delete errors.RazonNoFirma;
                delete errors.RazonNoFirmaOtro;
                mostrarCanvasFirma.value = !formData.FirmaBase64;
            } else {
                // Desactivada la firma → limpiar firma capturada y resetear canvas
                formData.FirmaBase64 = '';
                mostrarCanvasFirma.value = true;
                firmaDibujada.value = false;
                delete errors.Firma;
            }
        });

        const placeholderIdentificacion = Vue.computed(() => {
            const tipo = formData.TipoIdentificacionCatalog;
            if (tipo == 1) return 'Ej: 000-000000-0000A'; // Cédula
            if (tipo == 2) return 'Ej: 000000000000 (Solo números)'; // Residencia
            if (tipo == 4) return 'Ej: A0000000000000'; // RUC
            return 'Escriba su identificación...'; // Pasaporte, Notario, Otro
        });

        const validarIdentificacion = () => {
            if (!formData.Identificacion?.trim()) {
                delete errors.IdentificacionMsg;
                return true; 
            }

            const tipo = formData.TipoIdentificacionCatalog;
            // Auto-conversión a mayúsculas
            let valor = formData.Identificacion.trim().toUpperCase();
            formData.Identificacion = valor;

            let esValido = true;
            let mensaje = '';

            if (!tipo) return true; 

            if (tipo == 1) { 
                // Cédula: Quitar guiones temporales y evaluar
                const valorSinGuiones = valor.replace(/-/g, '');
                if (/^\d{13}[A-Z]$/.test(valorSinGuiones)) {
                    esValido = true;
                    // Auto-formatear poniendo los guiones
                    formData.Identificacion = valorSinGuiones.replace(/^(\d{3})(\d{6})(\d{4}[A-Z])$/, '$1-$2-$3');
                } else {
                    esValido = false;
                    mensaje = 'Cédula inválida (14 caracteres alfanuméricos requeridos)';
                }
            } else if (tipo == 2) { 
                // Residencia: 12 números exactos
                esValido = /^\d{12}$/.test(valor); 
                mensaje = 'Residencia inválida (Debe tener exactamente 12 números)';
            } else if (tipo == 4) { 
                // RUC: 1 Letra + 13 dígitos
                esValido = /^[A-Z]\d{13}$/.test(valor); 
                mensaje = 'RUC inválido (1 letra seguida de 13 números)';
            } else { 
                // Otros
                esValido = /^[A-Z0-9\-]+$/.test(valor);
                mensaje = 'Formato inválido (Solo letras y números)';
            }

            if (!esValido) {
                errors.Identificacion = true;
                errors.IdentificacionMsg = mensaje;
            } else {
                delete errors.Identificacion;
                delete errors.IdentificacionMsg;
            }
            return esValido;
        };

        Vue.watch(() => formData.FirstName, (newVal, oldVal) => { if (errors.FirstNameMsg && newVal !== oldVal?.toUpperCase()) { delete errors.FirstName; delete errors.FirstNameMsg; } });
        Vue.watch(() => formData.SecondName, (newVal, oldVal) => { if (errors.SecondNameMsg && newVal !== oldVal?.toUpperCase()) { delete errors.SecondName; delete errors.SecondNameMsg; } });
        Vue.watch(() => formData.FirstSurName, (newVal, oldVal) => { if (errors.FirstSurNameMsg && newVal !== oldVal?.toUpperCase()) { delete errors.FirstSurName; delete errors.FirstSurNameMsg; } });
        Vue.watch(() => formData.SecondSurName, (newVal, oldVal) => { if (errors.SecondSurNameMsg && newVal !== oldVal?.toUpperCase()) { delete errors.SecondSurName; delete errors.SecondSurNameMsg; } });
        Vue.watch(() => formData.Age, () => { if (errors.AgeMsg) { delete errors.Age; delete errors.AgeMsg; } });

        const validarEdad = () => {
            if (formData.Age === null || formData.Age === undefined || formData.Age === '') {
                delete errors.AgeMsg;
                return true; 
            }
            if (formData.Age <= 0 || formData.Age > 99) {
                errors.Age = true;
                errors.AgeMsg = 'Debe ser > 0 y máx 2 dígitos';
                return false;
            } else {
                delete errors.Age;
                delete errors.AgeMsg;
                return true;
            }
        };

        const validarNombre = (campo) => {
            let valor = formData[campo];
            if (!valor?.trim()) {
                delete errors[campo + 'Msg'];
                return true; 
            }
            
            valor = valor.trim().toUpperCase();
            formData[campo] = valor;

            const regex = /^[A-ZÁÉÍÓÚÑ\s]+$/;
            if (!regex.test(valor)) {
                errors[campo] = true;
                errors[campo + 'Msg'] = 'Formato inválido (Solo letras)';
                return false;
            } else {
                delete errors[campo];
                delete errors[campo + 'Msg'];
                return true;
            }
        };

        const pedirRelacionPropietarioGlobal = () => {
            if (typeof vueAppContext !== 'undefined' && typeof vueAppContext.openCatalog === 'function') {
                vueAppContext.openCatalog({
                    catalogName: 'RelacionInformantePropietario',
                    label: 'Buscar Relación...',
                    placeholder: 'Nombre o ID...',
                    onSelect: (val) => {
                        formData.RelacionInformantePropietarioCatalog = parseInt(val.id);    // <- numérico
                        formData._RelacionPropietarioName = val.name;
                        relacionPropietarioName.value = val.name;
                    }
                });
            } else {
                console.error("❌ Contexto global vueAppContext.openCatalog no encontrado.");
            }
        };

        // Llamada a la app global usando el contexto global asegurado vueAppContext
        const pedirProfesionGlobal = () => {
            if (typeof vueAppContext !== 'undefined' && typeof vueAppContext.openCatalog === 'function') {
                vueAppContext.openCatalog({
                    catalogName: 'Profesion',
                    label: 'Buscar Profesión...',
                    placeholder: 'Nombre o ID...',
                    onSelect: (val) => {
                        const id = parseInt(val.id);
                        formData.ProfessionCatalog = id;
                        formData._ProfessionName = val.name;
                        profesionName.value = val.name;

                        // Limpiar "Otro" si ya no es el ID 26 (Otro)
                        if (id !== 26) {
                            formData.ProfessionOtroText = '';
                            delete errors.ProfessionOtroText;
                        }
                    }
                });
            } else {
                console.error("❌ Contexto global vueAppContext.openCatalog no encontrado.");
            }
        };

        const save = () => {
            // Limpiar errores previos
            Object.keys(errors).forEach(key => delete errors[key]);

            const errorList = [];

            if (!formData.RelacionConParcelaCatalog) {
                errors.RelacionConParcelaCatalog = true;
                errorList.push('Relación con la parcela');
            }
            if (formData.RelacionConParcelaCatalog == 5 && !formData.RelacionConParcelaOtroText?.trim()) {
                errors.RelacionConParcelaOtroText = true;
                errorList.push('Especificar Relación con la parcela');
            }
            // Solo validar relación con propietario si el informante NO es el propietario de la parcela
            if (formData.RelacionConParcelaCatalog !== 1 && !formData.RelacionInformantePropietarioCatalog) {
                errors.RelacionInformantePropietarioCatalog = true;
                errorList.push('Relación con el propietario');
            }
            if (!formData.TipoIdentificacionCatalog) {
                errors.TipoIdentificacionCatalog = true;
                errorList.push('Tipo de Identificación');
            }
            if (formData.TipoIdentificacionCatalog == 6 && !formData.TipoIdentificacionOtroText?.trim()) {
                errors.TipoIdentificacionOtroText = true;
                errorList.push('Especificar Tipo de Identificación');
            }
            if (!formData.Identificacion?.trim()) {
                errors.Identificacion = true;
                errorList.push('No. Identificación');
            } else if (!validarIdentificacion()) {
                errorList.push('Formato de Identificación Inválido');
            }
            if (!formData.FirstName?.trim()) {
                errors.FirstName = true;
                errorList.push('Primer Nombre');
            } else if (!validarNombre('FirstName')) {
                errorList.push('Formato Primer Nombre');
            }
            if (formData.SecondName?.trim() && !validarNombre('SecondName')) {
                errorList.push('Formato Segundo Nombre');
            }
            if (!formData.FirstSurName?.trim()) {
                errors.FirstSurName = true;
                errorList.push('Primer Apellido');
            } else if (!validarNombre('FirstSurName')) {
                errorList.push('Formato Primer Apellido');
            }
            if (formData.SecondSurName?.trim() && !validarNombre('SecondSurName')) {
                errorList.push('Formato Segundo Apellido');
            }
            if (!formData.GenderCatalog) {
                errors.GenderCatalog = true;
                errorList.push('Género');
            }
            if (formData.Age === null || formData.Age === undefined || formData.Age === '') {
                errors.Age = true;
                errorList.push('Edad');
            } else if (!validarEdad()) {
                errorList.push('Edad Inválida');
            }
            if (!formData.CivilStateCatalog) {
                errors.CivilStateCatalog = true;
                errorList.push('Estado Civil');
            }
            if (!formData.ProfessionCatalog) {
                errors.ProfessionCatalog = true;
                errorList.push('Profesión');
            }
            if (formData.ProfessionCatalog == 26 && !formData.ProfessionOtroText?.trim()) {
                errors.ProfessionOtroText = true;
                errorList.push('Especificar Profesión');
            }
            if (formData.RelacionConParcelaCatalog === 1 || formData.RelacionConParcelaCatalog === 2) {
                if (!formData.ResidenceMunicipioCatalog) {
                    errors.ResidenceMunicipioCatalog = true;
                    errorList.push('Municipio (ID catalog)');
                }
                if (!formData.ResidenceDireccion?.trim()) {
                    errors.ResidenceDireccion = true;
                    errorList.push('Dirección');
                }
            }

            // Validar firma del entrevistado (condicional según ConFirma)
            if (formData.ConFirma !== false) {
                if (!formData.FirmaBase64) {
                    errors.Firma = true;
                    errorList.push('Firma del Entrevistado');
                }
            } else {
                if (!formData.RazonNoFirma) {
                    errors.RazonNoFirma = true;
                    errorList.push('Razón de no firma');
                }
                if (formData.RazonNoFirma === 'OTRO' && !formData.RazonNoFirmaOtro?.trim()) {
                    errors.RazonNoFirmaOtro = true;
                    errorList.push('Especificar razón de no firma');
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

        const dirMap = {
            'N': 'Norte', 'S': 'Sur', 'E': 'Este', 'O': 'Oeste',
            'NE': 'Noreste', 'NO': 'Noroeste', 'SE': 'Sureste', 'SO': 'Suroeste'
        };

        const copiarResidencia = (d) => {
            if (d.Direccion) formData.ResidenceDireccion = d.Direccion;
            if (d.Caserio) formData.ResidenceCaserio = d.Caserio;
            if (d.BarrioComarca) formData.ResidenceBarrioComarca = d.BarrioComarca;
            if (d.MunicipioCatalog) {
                formData.ResidenceMunicipioCatalog = d.MunicipioCatalog;
                formData._CodDepto = d._CodDepto || null;
                formData._DeptoNombre = d._DeptoNombre || null;
                formData._MuniNombre = d._MuniNombre || null;
                
                deptoDisplay.value = d._DeptoNombre ? { cod: d._CodDepto || '', nombre: d._DeptoNombre } : null;
                muniDisplay.value = d._MuniNombre ? { cod: String(d.MunicipioCatalog).slice(-2), nombre: d._MuniNombre } : null;
            }
        };

        const detectarDireccion = () => {
            const targetIdObject = (typeof Android !== 'undefined' && Android.getIdObject) 
                ? Android.getIdObject() 
                : (typeof vueAppContext !== 'undefined' && vueAppContext.listData ? vueAppContext.listData.value.find(item => item.Data?.Type === 'Ficha')?.Data?.IdObject : null);

            if (typeof Android !== 'undefined' && Android.getDataInAdjacentPolygons && targetIdObject) {
                try {
                    const rawJson = Android.getDataInAdjacentPolygons(targetIdObject);
                    const adyacentes = JSON.parse(rawJson || "[]");
                    
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
                            copiarResidencia(fichasVecinas[idx].data);
                            const overlay = document.querySelector('.confirm-modal-overlay');
                            if (overlay) overlay.remove();
                            delete window._tempSelectFicha;
                            Android.showAlert('✅ Dirección de residencia copiada.');
                        };

                        window.showConfirmModal({
                            icon: '🔍',
                            title: 'Elegir Ficha Vecina Colindante',
                            message: listHtml,
                            confirmText: '',
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

        const scanField = (fieldName) => emit('ocr-scan', fieldName);
        Vue.onMounted(() => {
            if (typeof vueAppContext !== 'undefined') {
                vueAppContext.validarIdentificacion = validarIdentificacion;
            }
        });

        Vue.onUnmounted(() => {
            if (typeof vueAppContext !== 'undefined' && vueAppContext.validarIdentificacion === validarIdentificacion) {
                delete vueAppContext.validarIdentificacion;
            }
        });

        return {
            formData,
            errors,
            catalogos,
            scanField,
            relacionPropietarioName,
            pedirRelacionPropietarioGlobal,
            profesionName,
            pedirProfesionGlobal,
            deptoDisplay,
            muniDisplay,
            pedirMunicipioGlobal,
            placeholderIdentificacion,
            validarIdentificacion,
            validarNombre,
            validarEdad,
            save,
            detectarDireccion,
            propietariosDisponibles,
            previewNames,
            toggleInvertir,
            seleccionarPropietarioCatastral,
            limpiarNombres,
            canvasFirma,
            mostrarCanvasFirma,
            firmaDibujada,
            onTouchStart,
            onTouchMove,
            onTouchEnd,
            onMouseDown,
            onMouseMove,
            onMouseUp,
            limpiarCanvasFirma,
            guardarFirmaDibujada,
            activarEdicionFirma,
            cancelarEdicionFirma
        };
    }
};

// Registrar componente
window.app.component('form-entrevistado', FormEntrevistado);
