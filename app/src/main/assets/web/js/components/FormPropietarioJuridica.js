/**
 * Componente FormPropietarioJuridica - Vue 3
 * Formulario para el Propietario (Persona Jurídica) basado en PropietarioPersonaJuridica.cs
 */

const FormPropietarioJuridica = {
    props: ['data'],
    template: `
        <div class="form-container">
            <h2>🏢 Propietario (Persona Jurídica)</h2>
            
            <div class="section">
                <h3>🆔 Identificación y Razón Social</h3>
                
                <div class="coords-grid">
                    <div class="form-group">
                        <label :style="{color: errors.Identificacion ? 'red' : 'inherit', fontWeight: errors.Identificacion ? 'bold' : 'normal'}">No. RUC *</label>
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
            </div>

            <div class="section">
                <h3>📜 Registro Público</h3>
                
                <div class="form-group">
                    <label>Registrada En</label>
                    <input type="text" v-model="formData.RegistradaEn" placeholder="Ej: Registro Público de Managua">
                </div>

                <div class="form-group">
                    <label>Fecha de Registro</label>
                    <input type="date" v-model="formData.FechaRegistro">
                </div>
            </div>

            <div class="section">
                <h3>👥 Composición y Miembros</h3>
                
                <div class="coords-grid">
                    <div class="form-group">
                        <label>Número de Socios</label>
                        <input type="number" v-model.number="formData.NroSocios" min="0">
                    </div>
                    <div class="form-group">
                        <label>Número de Socias</label>
                        <input type="number" v-model.number="formData.NroSocias" min="0">
                    </div>
                </div>

                <div class="coords-grid">
                    <div class="form-group">
                        <label>Colectivo</label>
                        <input type="text" v-model="formData.Colectivo" placeholder="Ej: Grupo X">
                    </div>
                    <div class="form-group">
                        <label>Denominación</label>
                        <input type="text" v-model="formData.Denominacion" placeholder="Ej: Sucursal Norte">
                    </div>
                </div>

                <div class="form-group">
                    <label>Número total de Miembros</label>
                    <input type="number" v-model.number="formData.NroMiembros" min="0">
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

        const catalogos = {
            TipoPersonaJuridica: [
                { id: "1", nombre: "SOCIEDAD ANONIMA" },
                { id: "2", nombre: "SOCIEDAD COOPERATIVA" },
                { id: "3", nombre: "SOCIEDAD R LIMITADA" },
                { id: "4", nombre: "OTRAS" }
            ]
        };

        const save = () => {
            // Limpiar errores
            Object.keys(errors).forEach(key => delete errors[key]);
            const errorList = [];

            if (!formData.Identificacion?.trim()) {
                errors.Identificacion = true;
                errorList.push('No. RUC');
            }
            if (!formData.RazonSocial?.trim()) {
                errors.RazonSocial = true;
                errorList.push('Razón Social');
            }
            if (!formData.TipoPersonaJuridicaCatalog) {
                errors.TipoPersonaJuridicaCatalog = true;
                errorList.push('Tipo de Persona Jurídica');
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

        return {
            formData,
            errors,
            catalogos,
            save
        };
    }
};

// Registrar componente
window.app.component('form-propietario-juridica', FormPropietarioJuridica);
