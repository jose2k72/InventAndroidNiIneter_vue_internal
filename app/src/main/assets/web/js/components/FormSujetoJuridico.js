/**
 * Componente FormPropietarioJuridica - Vue 3
 * Formulario para el Propietario (Persona Jurídica) basado en PropietarioPersonaJuridica.cs
 */

const FormSujetoJuridico = {
    props: ['data'],
    template: `
        <div class="form-container">
            <h2>🏢 Propietario Jurídico</h2>
            
            <div class="section">
                <h3>🆔 Identificación y Razón Social</h3>
                
                <div class="coords-grid">
                    <div class="form-group">
                        <label>No. RUC</label>
                        <input type="text" v-model="formData.Identificacion" placeholder="Ej: J0000000000000">
                    </div>
                    <div class="form-group">
                        <label :style="{color: errors.RazonSocial ? 'red' : 'inherit', fontWeight: errors.RazonSocial ? 'bold' : 'normal'}">Razón Social *</label>
                        <input type="text" v-model="formData.RazonSocial" placeholder="Nombre legal de la entidad">
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

            <div class="section">
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
                    </div>

                    <div class="form-group">
                        <label :style="{color: errors.FechaRegistro ? 'red' : 'inherit', fontWeight: errors.FechaRegistro ? 'bold' : 'normal'}">Fecha de Registro *</label>
                        <input type="date" v-model="formData.FechaRegistro">
                    </div>
                </div>
            </div>

            <div class="section">
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

        // Normalizar fecha para el input date (YYYY-MM-DD)
        if (formData.FechaRegistro) {
            formData.FechaRegistro = formData.FechaRegistro.split('T')[0];
        }

        // Catálogos reactivos (Se cargan dinámicamente de /data/)
        const catalogos = Vue.reactive({
            TipoPersonaJuridica: []
        });

        // Función para desacoplar catálogo
        const cargarCatalogos = async () => {
            const fileName = 'TipoPersonaJuridica.json';
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
                    catalogos.TipoPersonaJuridica = data.map(item => ({
                        ...item,
                        id: isNaN(parseInt(item.id)) ? item.id : parseInt(item.id)
                    }));
                }
            } catch (e) {
                console.error(`❌ Error al desacoplar catálogo ${fileName}:`, e);
            }
        };

        Vue.onMounted(() => {
            cargarCatalogos();
        });



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

        const save = () => {
            // Limpiar errores
            Object.keys(errors).forEach(key => delete errors[key]);
            const errorList = [];


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

        return {
            formData,
            errors,
            catalogos,
            totalMiembros,
            save
        };
    }
};

// Registrar componente
window.app.component('form-sujeto-juridico', FormSujetoJuridico);
