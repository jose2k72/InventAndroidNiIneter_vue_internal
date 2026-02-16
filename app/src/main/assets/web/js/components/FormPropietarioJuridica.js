/**
 * Componente FormPropietarioJuridica - Vue 3
 * Formulario para el Propietario (Persona Jurídica)
 */

const FormPropietarioJuridica = {
    props: ['data'],
    template: `
        <div class="form-container">
            <h2>🏢 Propietario (Persona Jurídica)</h2>
            
            <div class="section">
                <h3>📝 Información General</h3>
                
                <div class="form-group">
                    <label :style="{color: errors.RazonSocial ? 'red' : 'inherit', fontWeight: errors.RazonSocial ? 'bold' : 'normal'}">Razón Social *</label>
                    <input type="text" v-model="formData.RazonSocial" placeholder="Nombre de la empresa o entidad">
                </div>

                <div class="form-group">
                    <label :style="{color: errors.TipoPersonaJuridica ? 'red' : 'inherit', fontWeight: errors.TipoPersonaJuridica ? 'bold' : 'normal'}">Tipo de Persona Jurídica *</label>
                    <select v-model.number="formData.TipoPersonaJuridica">
                        <option :value="null" disabled selected>Seleccione...</option>
                        <option v-for="opt in catalogos.TipoPersonaJuridica" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
                    </select>
                </div>
                
                <div class="coords-grid">
                    <div class="form-group">
                        <label>Colectivo</label>
                        <input type="text" v-model="formData.Colectivo">
                    </div>
                    <div class="form-group">
                        <label>Denominación</label>
                        <input type="text" v-model="formData.Denominacion">
                    </div>
                </div>
            </div>

            <div class="section">
                <h3>📜 Registro</h3>
                
                <div class="coords-grid">
                    <div class="form-group">
                        <label>Registrada En</label>
                        <input type="text" v-model="formData.RegistradaEn">
                    </div>
                    <div class="form-group">
                        <label>Fecha de Registro</label>
                        <input type="date" v-model="formData.FechaRegistro">
                    </div>
                </div>
            </div>

            <div class="section">
                <h3>👥 Composición</h3>
                
                <div class="coords-grid">
                    <div class="form-group">
                        <label>Número de Socios (Hombres)</label>
                        <input type="number" v-model.number="formData.NroSocios" min="0">
                    </div>
                    <div class="form-group">
                        <label>Número de Socias (Mujeres)</label>
                        <input type="number" v-model.number="formData.NroSocias" min="0">
                    </div>
                </div>
                
                 <div class="form-group">
                    <label>Número de Miembros</label>
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
        const formData = Vue.reactive({ ...props.data });
        const errors = Vue.reactive({});

        // Manejo de fecha (Vue necesita formato YYYY-MM-DD para input date)
        if (formData.FechaRegistro && formData.FechaRegistro.includes('T')) {
            formData.FechaRegistro = formData.FechaRegistro.split('T')[0];
        }

        const catalogos = {
            TipoPersonaJuridica: [
                { id: 1, name: 'Sociedad Anónima' },
                { id: 2, name: 'Sociedad Cooperativa' },
                { id: 3, name: 'Sociedad R. Limitada' },
                { id: 4, name: 'Otras' }
            ]
        };

        const save = () => {
            // Limpiar errores previos
            Object.keys(errors).forEach(key => delete errors[key]);

            const errorList = [];

            if (!formData.RazonSocial) {
                errors.RazonSocial = true;
                errorList.push('Razón Social');
            }
            if (formData.TipoPersonaJuridica === null || formData.TipoPersonaJuridica === undefined) {
                errors.TipoPersonaJuridica = true;
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
