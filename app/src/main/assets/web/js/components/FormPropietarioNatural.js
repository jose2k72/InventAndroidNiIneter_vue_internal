/**
 * Componente FormPropietarioNatural - Vue 3
 * Formulario para el Propietario (Persona Natural) basado en Person.cs de C#
 */

const FormPropietarioNatural = {
    props: ['data'],
    template: `
        <div class="form-container">
            <h2>👤 Propietario (Persona Natural)</h2>
            
            <div class="section">
                <h3>📝 Datos Personales</h3>
                
                <div class="coords-grid">
                    <div class="form-group">
                        <label :style="{color: errors.FirstName ? 'red' : 'inherit', fontWeight: errors.FirstName ? 'bold' : 'normal'}">Primer Nombre *</label>
                        <input type="text" v-model="formData.FirstName" placeholder="Ej: Juan">
                    </div>
                    <div class="form-group">
                        <label>Segundo Nombre</label>
                        <input type="text" v-model="formData.SecondName" placeholder="Ej: Antonio">
                    </div>
                </div>

                <div class="coords-grid">
                    <div class="form-group">
                        <label :style="{color: errors.FirstSurName ? 'red' : 'inherit', fontWeight: errors.FirstSurName ? 'bold' : 'normal'}">Primer Apellido *</label>
                        <input type="text" v-model="formData.FirstSurName" placeholder="Ej: Pérez">
                    </div>
                    <div class="form-group">
                        <label>Segundo Apellido</label>
                        <input type="text" v-model="formData.SecondSurName" placeholder="Ej: García">
                    </div>
                </div>

                <div class="coords-grid">
                    <div class="form-group">
                        <label :style="{color: errors.Gender ? 'red' : 'inherit', fontWeight: errors.Gender ? 'bold' : 'normal'}">Género *</label>
                        <select v-model.number="formData.Gender">
                             <option :value="null" disabled selected>Seleccione...</option>
                             <option v-for="opt in catalogos.Generos" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label :style="{color: errors.Age ? 'red' : 'inherit', fontWeight: errors.Age ? 'bold' : 'normal'}">Edad *</label>
                        <input type="number" v-model.number="formData.Age" min="0">
                    </div>
                </div>

                <div class="coords-grid">
                    <div class="form-group">
                        <label :style="{color: errors.CivilState ? 'red' : 'inherit', fontWeight: errors.CivilState ? 'bold' : 'normal'}">Estado Civil *</label>
                        <select v-model.number="formData.CivilState">
                             <option :value="null" disabled selected>Seleccione...</option>
                             <option v-for="opt in catalogos.EstadoCivil" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
                        </select>
                    </div>
                    <div class="form-group">
                       <label :style="{color: errors.ProfessionCatalog ? 'red' : 'inherit', fontWeight: errors.ProfessionCatalog ? 'bold' : 'normal'}">Profesión u Oficio *</label>
                        <catalogo-selector
                            v-model="profesionWrapper"
                            catalog-name="Profesiones"
                            label="Seleccionar profesión..."
                            placeholder="Buscar profesión..."
                        ></catalogo-selector>
                    </div>
                </div>
            </div>

            <div class="section">
                <h3>🏠 Residencia</h3>
                
                <div class="coords-grid">
                    <div class="form-group">
                         <label :style="{color: errors.ResidenceDepartamento ? 'red' : 'inherit', fontWeight: errors.ResidenceDepartamento ? 'bold' : 'normal'}">Departamento *</label>
                        <input type="text" v-model="formData.ResidenceDepartamento">
                    </div>
                    <div class="form-group">
                        <label :style="{color: errors.ResidenceComarca ? 'red' : 'inherit', fontWeight: errors.ResidenceComarca ? 'bold' : 'normal'}">Comarca *</label>
                        <input type="text" v-model="formData.ResidenceComarca">
                    </div>
                </div>
                
                 <div class="form-group">
                    <label :style="{color: errors.ResidenceBarrio ? 'red' : 'inherit', fontWeight: errors.ResidenceBarrio ? 'bold' : 'normal'}">Barrio / Caserío *</label>
                    <input type="text" v-model="formData.ResidenceBarrio">
                </div>

                <div class="form-group">
                    <label :style="{color: errors.ResidenceDireccion ? 'red' : 'inherit', fontWeight: errors.ResidenceDireccion ? 'bold' : 'normal'}">Dirección exacta *</label>
                    <textarea v-model="formData.ResidenceDireccion" rows="2"></textarea>
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

        // Variables para nombres visuales
        const profesionName = Vue.ref(formData.ProfessionCatalog ? '(ID: ' + formData.ProfessionCatalog + ')' : '');

        // Catálogos locales
        const catalogos = {
            Generos: [
                { id: 0, name: 'Masculino' },
                { id: 1, name: 'Femenino' }
            ],
            EstadoCivil: [
                { id: 1, name: 'Soltero(a)' },
                { id: 2, name: 'Casado(a)' },
                { id: 3, name: 'Unión de Hecho' }
            ]
        };

        const profesionWrapper = Vue.computed({
            get: () => ({
                id: formData.ProfessionCatalog,
                name: profesionName.value
            }),
            set: (val) => {
                if (val) {
                    formData.ProfessionCatalog = val.id;
                    profesionName.value = val.name;
                } else {
                    formData.ProfessionCatalog = 0;
                    profesionName.value = '';
                }
            }
        });

        const save = () => {
            // Limpiar errores previos
            Object.keys(errors).forEach(key => delete errors[key]);

            const errorList = [];

            if (!formData.FirstName) {
                errors.FirstName = true;
                errorList.push('Primer Nombre');
            }
            if (!formData.FirstSurName) {
                errors.FirstSurName = true;
                errorList.push('Primer Apellido');
            }
            if (formData.Gender === null || formData.Gender === undefined) {
                errors.Gender = true;
                errorList.push('Género');
            }
            if (formData.Age === null || formData.Age === undefined || formData.Age === '') {
                errors.Age = true;
                errorList.push('Edad');
            }
            if (formData.CivilState === null || formData.CivilState === undefined) {
                errors.CivilState = true;
                errorList.push('Estado Civil');
            }
            if (!formData.ProfessionCatalog) {
                errors.ProfessionCatalog = true;
                errorList.push('Profesión');
            }
            if (!formData.ResidenceDepartamento) {
                errors.ResidenceDepartamento = true;
                errorList.push('Departamento');
            }
            if (!formData.ResidenceComarca) {
                errors.ResidenceComarca = true;
                errorList.push('Comarca');
            }
            if (!formData.ResidenceBarrio) {
                errors.ResidenceBarrio = true;
                errorList.push('Barrio');
            }
            if (!formData.ResidenceDireccion) {
                errors.ResidenceDireccion = true;
                errorList.push('Dirección');
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
            profesionWrapper,
            save
        };
    }
};

// Registrar componente
window.app.component('form-propietario-natural', FormPropietarioNatural);
