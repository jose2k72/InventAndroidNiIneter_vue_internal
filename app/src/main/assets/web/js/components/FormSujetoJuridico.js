/**
 * Componente FormPropietarioJuridica - Vue 3
 * Formulario para el Propietario (Persona Jurídica) basado en PropietarioPersonaJuridica.cs
 */

const FormSujetoJuridico = {
    props: ['data'],
    template: `
        <div class="form-container">
            <h2>🏢 Sujeto Jurídico (Propietario / Poseedor)</h2>
            
            <div class="btn-group" style="margin-bottom: 20px;">
                <button type="button" class="btn btn-success" @click="save">
                    💾 GUARDAR
                </button>
                <button type="button" class="btn btn-secondary" @click="$emit('cancel')">
                    ↩️ VOLVER
                </button>
            </div>

            <!-- Propietarios Catastrales Jurídicos Detectados en el Mapa -->
            <div class="section" v-if="propietariosDisponibles.length > 0 && formData.DerehoParcelaCatalog === 1">
                <h3>🏢 Empresas Propietarias en Mapa</h3>
                <div style="margin-bottom: 12px; padding: 10px; background-color: #E3F2FD; border: 1px solid #90CAF9; border-radius: 8px; font-size: 0.9rem; color: #0D47A1;">
                    Se detectaron <strong>{{ propietariosDisponibles.length }}</strong> entidad(es)/empresa(s) en el predio. Si alguna corresponde al propietario actual, selecciónela para rellenar la Razón Social.
                </div>
                <div style="display: grid; gap: 10px; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));">
                    <div v-for="prop in propietariosDisponibles" :key="prop.id" 
                         style="background: white; border: 1px solid #BBDEFB; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                        <div>
                            <div style="font-weight: bold; color: #0D47A1; font-size: 1.05rem; margin-bottom: 6px; display: flex; justify-content: space-between;">
                                <span>🏢 {{ prop.nombre }}</span>
                                <span style="font-size: 0.75rem; background-color: #E3F2FD; color: #0D47A1; padding: 2px 6px; border-radius: 4px; font-weight: bold;">Empresa</span>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px; margin-top: 8px; border-top: 1px solid #F0F0F0; padding-top: 8px;">
                            <button type="button" @click="seleccionarPropietarioCatastral(prop)" 
                                    style="flex: 1; padding: 6px 12px; background-color: #0D47A1; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.85rem;">
                                Seleccionar Razón Social
                            </button>
                        </div>
                    </div>
                </div>
                <button type="button" @click="descartarPropietarioCatastral()" 
                        style="margin-top: 12px; width: 100%; padding: 8px; background-color: #ECEFF1; color: #37474F; border: 1px solid #CFD8DC; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; gap: 6px;">
                    ❌ Descartar selección / Limpiar Razón Social
                </button>
            </div>

            <div class="section">
                <h3>⚖️ Derecho sobre la Parcela</h3>
                <div class="form-group">
                    <label :style="{color: errors.DerehoParcelaCatalog ? 'red' : 'inherit', fontWeight: errors.DerehoParcelaCatalog ? 'bold' : 'normal'}">Derecho Parcelario *</label>
                    <select v-model.number="formData.DerehoParcelaCatalog">
                        <option :value="null" disabled>Seleccione...</option>
                        <option v-for="opt in catalogos.TipoDerecho" :key="opt.id" :value="opt.id">{{ opt.nombre }}</option>
                    </select>
                </div>
            </div>

            <div class="section">
                <h3>🆔 Identificación y Razón Social</h3>
                
                <div class="coords-grid">
                    <div class="form-group">
                        <label :style="{color: errors.Identificacion ? 'red' : 'inherit', fontWeight: errors.Identificacion ? 'bold' : 'normal'}">No. RUC</label>
                        <input type="text" v-model="formData.Identificacion" placeholder="Ej: J0000000000000" @blur="validarIdentificacion">
                        <button type="button" class="ocr-btn" @click="scanField('Identificacion')" title="Escanear RUC" style="margin-top: 6px;">
                            <div class="ocr-icon-container">
                                <span class="ocr-icon-doc">📄</span>
                                <span class="ocr-icon-search">🔍</span>
                            </div>
                        </button>
                        <small v-if="errors.IdentificacionMsg" style="color: #d32f2f; font-weight: bold; display: block; margin-top: 4px;">{{ errors.IdentificacionMsg }}</small>
                    </div>
                    <div class="form-group">
                        <label :style="{color: errors.RazonSocial ? 'red' : 'inherit', fontWeight: errors.RazonSocial ? 'bold' : 'normal'}">Razón Social *</label>
                        <input type="text" v-model="formData.RazonSocial" placeholder="Nombre legal de la entidad">
                        <button type="button" class="ocr-btn" @click="scanField('RazonSocial')" title="Escanear Razón Social" style="margin-top: 6px;">
                            <div class="ocr-icon-container">
                                <span class="ocr-icon-doc">📄</span>
                                <span class="ocr-icon-search">🔍</span>
                            </div>
                        </button>
                    </div>
                </div>

                    <div class="form-group">
                        <label :style="{color: errors.TipoPersonaJuridicaCatalog ? 'red' : 'inherit', fontWeight: errors.TipoPersonaJuridicaCatalog ? 'bold' : 'normal'}">Tipo de Persona Jurídica *</label>
                        <select v-model.number="formData.TipoPersonaJuridicaCatalog">
                            <option :value="null" disabled selected>Seleccione...</option>
                            <option v-for="opt in catalogos.TipoPersonaJuridica" :key="opt.id" :value="parseInt(opt.id)">{{ opt.nombre }}</option>
                        </select>
                    </div>

                    <!-- Especificar Otro Tipo de Persona Jurídica (ID 4) -->
                    <div v-if="formData.TipoPersonaJuridicaCatalog === 4" class="form-group sub-section" style="margin-top: -10px; margin-bottom: 15px;">
                        <label :style="{color: errors.TipoPersonaJuridicaOtroText ? 'red' : 'inherit', fontWeight: errors.TipoPersonaJuridicaOtroText ? 'bold' : 'normal'}">Especifique Tipo de Persona Jurídica *</label>
                        <input type="text" v-model="formData.TipoPersonaJuridicaOtroText" placeholder="Detalle el tipo de entidad...">
                    </div>
                </div>

            <div class="section" v-if="formData.DerehoParcelaCatalog === 1">
                <h3>📜 Registro Público</h3>
                
                <div class="form-group checkbox-group">
                    <label class="checkbox-container">
                        <input type="checkbox" v-model="formData.MuestraDatosRegistrales">
                        <span class="checkmark"></span>
                        Muestra datos de registro
                    </label>
                </div>

                <div v-if="formData.MuestraDatosRegistrales">
                    <div class="form-group">
                        <label :style="{color: errors.RegistradaEn ? 'red' : 'inherit', fontWeight: errors.RegistradaEn ? 'bold' : 'normal'}">Registrada En *</label>
                        <input type="text" v-model="formData.RegistradaEn" placeholder="Ej: Registro Público de Managua">
                        <button type="button" class="ocr-btn" @click="scanField('RegistradaEn')" title="Escanear Registrada En" style="margin-top: 6px;">
                            <div class="ocr-icon-container">
                                <span class="ocr-icon-doc">📄</span>
                                <span class="ocr-icon-search">🔍</span>
                            </div>
                        </button>
                    </div>

                    <div class="form-group">
                        <label :style="{color: errors.FechaRegistro ? 'red' : 'inherit', fontWeight: errors.FechaRegistro ? 'bold' : 'normal'}">Fecha de Registro *</label>
                        <input 
                            type="text" 
                            inputmode="numeric" 
                            placeholder="DD/MM/AAAA" 
                            v-model="fechaRegistroUI"
                            @input="fechaRegistroUI = formatAsDate(fechaRegistroUI)"
                        >
                        <button type="button" class="ocr-btn" @click="scanField('FechaRegistro')" title="Escanear Fecha de Registro" style="margin-top: 6px;">
                            <div class="ocr-icon-container">
                                <span class="ocr-icon-doc">📄</span>
                                <span class="ocr-icon-search">🔍</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            <div class="section" v-if="formData.DerehoParcelaCatalog === 1">
                <h3>👥 Composición y Miembros</h3>
                
                <div class="form-group checkbox-group">
                    <label class="checkbox-container">
                        <input type="checkbox" v-model="formData.MuestraDatosDeMiembros">
                        <span class="checkmark"></span>
                        Muestra datos de sus miembros
                    </label>
                </div>

                <div v-if="formData.MuestraDatosDeMiembros">
                    <div class="coords-grid">
                        <div class="form-group">
                            <label :style="{color: errors.SeccionMiembros ? 'red' : 'inherit', fontWeight: errors.SeccionMiembros ? 'bold' : 'normal'}">Número de Socios</label>
                            <input type="number" v-model.number="formData.NroSocios" min="0">
                        </div>
                        <div class="form-group">
                            <label :style="{color: errors.SeccionMiembros ? 'red' : 'inherit', fontWeight: errors.SeccionMiembros ? 'bold' : 'normal'}">Número de Socias</label>
                            <input type="number" v-model.number="formData.NroSocias" min="0">
                        </div>
                    </div>

                    <div class="form-group">
                        <label :style="{color: errors.SeccionMiembros ? 'red' : 'inherit', fontWeight: errors.SeccionMiembros ? 'bold' : 'normal'}">Denominación</label>
                        <input type="text" v-model="formData.Denominacion" placeholder="Ej: Sucursal Norte o Casa Matriz">
                    </div>

                    <div class="form-group">
                        <label>Número total de Miembros</label>
                        <input type="number" :value="totalMiembros" readonly style="background-color: #f5f5f5; color: #1565C0; font-weight: bold;">
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
        // IMPORTANTE: Referencia directa para mantener reactividad global
        const formData = Vue.reactive(props.data);
        const errors = Vue.reactive({});

        // Normalizar fecha y configurar representación en la UI (DD/MM/YYYY)
        const fechaRegistroUI = Vue.ref('');
        if (formData.FechaRegistro) {
            const cleanDate = formData.FechaRegistro.split('T')[0];
            formData.FechaRegistro = cleanDate;
            const parts = cleanDate.split('-');
            if (parts.length === 3) {
                fechaRegistroUI.value = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
        }

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
        const setFechaRegistroToday = () => {
            const today = new Date();
            const y = today.getFullYear();
            const m = String(today.getMonth() + 1).padStart(2, '0');
            const d = String(today.getDate()).padStart(2, '0');
            fechaRegistroUI.value = `${d}/${m}/${y}`;
            formData.FechaRegistro = `${y}-${m}-${d}`;
        };

        // Sincronizar UI (DD/MM/YYYY) -> Modelo (YYYY-MM-DD)
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
            TipoPersonaJuridica: [],
            TipoDerecho: []
        });

        // Función para desacoplar catálogos
        const cargarCatalogos = async () => {
            const mapeo = {
                TipoPersonaJuridica: 'TipoPersonaJuridica.json',
                TipoDerecho: 'TipoDerecho.json'
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

        const seleccionarPropietarioCatastral = (prop) => {
            formData.RazonSocial = prop.nombre;
            delete errors.RazonSocial;
            if (typeof Android !== 'undefined' && Android.showToast) {
                Android.showToast('✅ Razón Social copiada.');
            }
        };

        const descartarPropietarioCatastral = () => {
            formData.RazonSocial = '';
            delete errors.RazonSocial;
            if (typeof Android !== 'undefined' && Android.showToast) {
                Android.showToast('ℹ️ Razón Social limpiada.');
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
                    // Para Jurídico, solo mostrar lo que sea empresa
                    propietariosDisponibles.value = allOwners.filter(o => o.nombre && esEmpresa(o.nombre));
                } catch(e) {
                    console.error("Error al cargar propietarios", e);
                    propietariosDisponibles.value = [];
                }
            } else {
                // Mock para navegador/pruebas
                propietariosDisponibles.value = [
                    { id: 990, nombre: "BRUNILDA ROBLES ARTOLA" },
                    { id: 991, nombre: "ALCALDIA DE MANAGUA" },
                    { id: 992, nombre: "JOSE MARTIN MENDOZA PEREZ" }
                ].filter(o => esEmpresa(o.nombre));
            }
        };
        // Cálculo automático del total de miembros
        const totalMiembros = Vue.computed(() => {
            const socios = parseInt(formData.NroSocios) || 0;
            const socias = parseInt(formData.NroSocias) || 0;
            return socios + socias;
        });

        // Sincronizar el total al modelo para la salva
        Vue.watchEffect(() => {
            formData.NroMiembros = totalMiembros.value;
        });

        // Limpieza de errores al escribir
        Vue.watch(() => formData.RazonSocial, () => delete errors.RazonSocial);
        Vue.watch(() => formData.RegistradaEn, () => delete errors.RegistradaEn);
        Vue.watch(() => formData.FechaRegistro, () => delete errors.FechaRegistro);

        // Limpieza de campos al desmarcar secciones opcionales
        Vue.watch(() => formData.MuestraDatosRegistrales, (val) => {
            if (!val) {
                formData.RegistradaEn = '';
                formData.FechaRegistro = null;
                delete errors.RegistradaEn;
                delete errors.FechaRegistro;
            }
        });

        Vue.watch(() => formData.MuestraDatosDeMiembros, (val) => {
            if (!val) {
                formData.NroSocios = 0;
                formData.NroSocias = 0;
                formData.Denominacion = '';
                delete errors.SeccionMiembros;
            }
        });

        // Limpieza de errores al interactuar
        Vue.watch(() => [formData.NroSocios, formData.NroSocias, formData.Denominacion], () => {
            if (formData.MuestraDatosDeMiembros) delete errors.SeccionMiembros;
        });

        // Limpiar "Otro" si se cambia el tipo de persona jurídica
        Vue.watch(() => formData.TipoPersonaJuridicaCatalog, (newVal) => {
            if (newVal !== 4) {
                formData.TipoPersonaJuridicaOtroText = '';
                delete errors.TipoPersonaJuridicaOtroText;
            }
        });

        // Ocultar secciones registrales y de miembros si el derecho no es Propietario (ID 1)
        Vue.watch(() => formData.DerehoParcelaCatalog, (newVal) => {
            if (newVal !== 1) {
                formData.MuestraDatosRegistrales = false;
                formData.RegistradaEn = '';
                formData.FechaRegistro = null;
                fechaRegistroUI.value = '';
                formData.MuestraDatosDeMiembros = false;
                formData.NroSocios = 0;
                formData.NroSocias = 0;
                formData.Denominacion = '';
                delete errors.RegistradaEn;
                delete errors.FechaRegistro;
                delete errors.SeccionMiembros;
            }
        });

        Vue.onMounted(() => {
            cargarCatalogos();
            cargarPropietariosCatastrales();
            if (typeof vueAppContext !== 'undefined') {
                vueAppContext.validarIdentificacion = validarIdentificacion;
            }
        });

        Vue.onUnmounted(() => {
            if (typeof vueAppContext !== 'undefined' && vueAppContext.validarIdentificacion === validarIdentificacion) {
                delete vueAppContext.validarIdentificacion;
            }
        });

        const validarIdentificacion = () => {
            if (!formData.Identificacion?.trim()) {
                delete errors.IdentificacionMsg;
                delete errors.Identificacion;
                return true;
            }
            let valor = formData.Identificacion.trim().toUpperCase();
            formData.Identificacion = valor;

            // RUC format: 1 letter followed by 12 digits
            const esValido = /^[A-Z]\d{12}$/.test(valor);
            if (!esValido) {
                errors.Identificacion = true;
                errors.IdentificacionMsg = 'RUC inválido (1 letra seguida de 12 números)';
            } else {
                delete errors.Identificacion;
                delete errors.IdentificacionMsg;
            }
            return esValido;
        };

        Vue.watch(() => formData.Identificacion, () => {
            if (errors.Identificacion) {
                validarIdentificacion();
            }
        });

        const save = () => {
            // Limpiar errores
            Object.keys(errors).forEach(key => delete errors[key]);
            const errorList = [];

            if (formData.Identificacion?.trim() && !validarIdentificacion()) {
                errorList.push('No. RUC');
            }


            if (!formData.DerehoParcelaCatalog) {
                errors.DerehoParcelaCatalog = true;
                errorList.push('Derecho Parcelario');
            }

            if (!formData.RazonSocial?.trim()) {
                errors.RazonSocial = true;
                errorList.push('Razón Social');
            }
            if (!formData.TipoPersonaJuridicaCatalog) {
                errors.TipoPersonaJuridicaCatalog = true;
                errorList.push('Tipo de Persona Jurídica');
            }
            if (formData.TipoPersonaJuridicaCatalog === 4 && !formData.TipoPersonaJuridicaOtroText?.trim()) {
                errors.TipoPersonaJuridicaOtroText = true;
                errorList.push('Especificar Tipo de Persona Jurídica');
            }

            // Registro Público (Opcional pero todos obligatorios si se marca)
            if (formData.MuestraDatosRegistrales) {
                if (!formData.RegistradaEn?.trim()) {
                    errors.RegistradaEn = true;
                    errorList.push('Registrada En');
                }
                if (!formData.FechaRegistro) {
                    errors.FechaRegistro = true;
                    errorList.push('Fecha de Registro');
                }
            }

            // Composición y Miembros (Opcional pero validada si se marca)
            if (formData.MuestraDatosDeMiembros) {
                const socios = parseInt(formData.NroSocios) || 0;
                const socias = parseInt(formData.NroSocias) || 0;
                const denom = formData.Denominacion?.trim();

                // Al menos uno debe tener contenido o valor > 0
                if (socios <= 0 && socias <= 0 && !denom) {
                    errors.SeccionMiembros = true;
                    errorList.push('Composición y Miembros (Debe rellenar al menos un campo)');
                }
            }

            if (errorList.length > 0) {
                const msg = '⚠️ Faltan datos obligatorios o inválidos. Revise los campos marcados en rojo.';
                if (typeof Android !== 'undefined' && Android.showAlert) {
                    Android.showAlert(msg);
                } else {
                    alert(msg);
                }
                return;
            }

            emit('save', Vue.toRaw(formData));
        };
        const scanField = (fieldName) => emit('ocr-scan', fieldName);

        return {
            formData,
            errors,
            catalogos,
            scanField,
            totalMiembros,
            fechaRegistroUI,
            formatAsDate,
            setFechaRegistroToday,
            save,
            propietariosDisponibles,
            seleccionarPropietarioCatastral,
            descartarPropietarioCatastral,
            validarIdentificacion
        };
    }
};

// Registrar componente
window.app.component('form-sujeto-juridico', FormSujetoJuridico);
