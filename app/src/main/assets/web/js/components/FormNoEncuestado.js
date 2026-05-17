/**
 * Componente FormNoEncuestado - Vue 3
 * Formulario para registros donde no se pudo realizar la encuesta
 */

const FormNoEncuestado = {
    props: ['data'],
    template: `
        <div class="form-container">
            <h2>🚫 Predio No Encuestado</h2>
            
            <div class="btn-group" style="margin-bottom: 20px;">
                <button type="button" class="btn btn-success" @click="save">
                    💾 GUARDAR REGISTRO
                </button>
                <button type="button" class="btn btn-secondary" @click="$emit('cancel')">
                    ↩️ VOLVER
                </button>
            </div>
            
            <div class="section glass-card">
                <h3>📝 Registro de Visita</h3>
                
                <div class="form-group">
                    <label>Fecha de Visita</label>
                    <input type="date" v-model="formData.Fecha" readonly style="background-color: #f5f5f5;">
                </div>

                <div class="form-group">
                    <label :style="{color: errors.Descripcion ? 'red' : 'inherit', fontWeight: errors.Descripcion ? 'bold' : 'normal'}">Motivo / Descripción *</label>
                    <textarea 
                        v-model="formData.Descripcion" 
                        rows="8" 
                        placeholder="Escriba aquí los motivos por los cuales no se pudo realizar la encuesta (Rechazo del propietario, casa deshabitada, lote baldío, etc.)..."
                        :style="{borderColor: errors.Descripcion ? '#d32f2f' : '#ccc'}"></textarea>
                    <small v-if="errors.Descripcion" style="color: #d32f2f;">Este campo es obligatorio para documentar la visita.</small>
                </div>
            </div>

            <div class="section">
                <h3>📍 Ubicación de Referencia</h3>
                <div class="display-box" style="background: #e3f2fd; border-color: #bbdefb;">
                    <span style="font-weight: bold; color: #1565C0;">Dirección/Localización:</span><br>
                    <span>{{ formData.Localizacion || 'No capturada' }}</span>
                </div>
            </div>

            <div class="btn-group">
                <button type="button" class="btn btn-success" @click="save">
                    💾 GUARDAR REGISTRO
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

        // Normalizar fecha si es necesario
        if (formData.Fecha) {
            formData.Fecha = formData.Fecha.split('T')[0];
        }

        const save = () => {
            // Limpiar errores
            Object.keys(errors).forEach(key => delete errors[key]);

            if (!formData.Descripcion?.trim()) {
                errors.Descripcion = true;
                const msg = '⚠️ Por favor, detalle el motivo por el cual no se pudo realizar la encuesta.';
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
            save
        };
    }
};

// Registrar componente
window.app.component('form-no-encuestado', FormNoEncuestado);
