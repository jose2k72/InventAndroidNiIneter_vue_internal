/**
 * Componente FormEntrevistado - Vue 3
 * Formulario para el Entrevistado basado en Entrevistado.cs y Person.cs
 */

const FormEntrevistado = {
    props: ['data'],
    template: `
        <div class="form-container">
            <h2>🎤 Entrevistado / Informante</h2>
            
            <div class="section">
                <h3>📋 Relación</h3>
                
                <div class="form-group">
                    <label :style="{color: errors.RelacionConParcela ? 'red' : 'inherit', fontWeight: errors.RelacionConParcela ? 'bold' : 'normal'}">Relación con la parcela *</label>
                    <select v-model.number="formData.RelacionConParcela">
                        <option :value="null" disabled selected>Seleccione...</option>
                        <option v-for="opt in catalogos.RelacionInformanteParcela" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
                    </select>
                </div>

                <div class="form-group">
                    <label :style="{color: errors.RelacionInformantePropietarioCatalog ? 'red' : 'inherit', fontWeight: errors.RelacionInformantePropietarioCatalog ? 'bold' : 'normal'}">Relación con el/la propietario(a) *</label>
                    <catalogo-selector
                        v-model="relacionPropietarioWrapper"
                        catalog-name="RelacionInformantePropietario"
                        label="Seleccionar relación..."
                        placeholder="Buscar relación..."
                    ></catalogo-selector>
                </div>
            </div>

            <div class="section">
                <h3>📝 Datos Personales</h3>
                
                <div class="coords-grid">
                    <div class="form-group">
                        <label :style="{color: errors.FirstName ? 'red' : 'inherit', fontWeight: errors.FirstName ? 'bold' : 'normal'}">Primer Nombre *</label>
                        <input type="text" v-model="formData.FirstName">
                    </div>
                    <div class="form-group">
                        <label>Segundo Nombre</label>
                        <input type="text" v-model="formData.SecondName">
                    </div>
                </div>

                <div class="coords-grid">
                    <div class="form-group">
                        <label :style="{color: errors.FirstSurName ? 'red' : 'inherit', fontWeight: errors.FirstSurName ? 'bold' : 'normal'}">Primer Apellido *</label>
                        <input type="text" v-model="formData.FirstSurName">
                    </div>
                    <div class="form-group">
                        <label>Segundo Apellido</label>
                        <input type="text" v-model="formData.SecondSurName">
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

        // Variables para nombres visuales (el modelo solo tiene IDs)
        // Inicialmente vacíos o con fallback al ID si ya existe dato
        const relacionPropietarioName = Vue.ref(formData.RelacionInformantePropietarioCatalog ? '(ID: ' + formData.RelacionInformantePropietarioCatalog + ')' : '');
        const profesionName = Vue.ref(formData.ProfessionCatalog ? '(ID: ' + formData.ProfessionCatalog + ')' : '');

        // Catálogos locales (Enums hardcoded para garantizar carga)
        const catalogos = {
            RelacionInformanteParcela: [
                { id: 1, name: 'Propietario(a)' },
                { id: 2, name: 'Poseedor(a)' },
                { id: 3, name: 'Representante' },
                { id: 4, name: 'Particular' },
                { id: 5, name: 'Otro' }
            ],
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

        // Computed Wrappers para CatalogoSelector (ID <-> {id, name})
        const relacionPropietarioWrapper = Vue.computed({
            get: () => ({
                id: formData.RelacionInformantePropietarioCatalog,
                name: relacionPropietarioName.value
            }),
            set: (val) => {
                if (val) {
                    formData.RelacionInformantePropietarioCatalog = val.id;
                    relacionPropietarioName.value = val.name;
                } else {
                    formData.RelacionInformantePropietarioCatalog = 0;
                    relacionPropietarioName.value = '';
                }
            }
        });

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

            if (formData.RelacionConParcela === null || formData.RelacionConParcela === undefined) {
                errors.RelacionConParcela = true;
                errorList.push('Relación con la parcela');
            }
            if (!formData.RelacionInformantePropietarioCatalog) {
                errors.RelacionInformantePropietarioCatalog = true;
                errorList.push('Relación con el propietario');
            }
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
            relacionPropietarioWrapper,
            profesionWrapper,
            save
        };
    }
};

// Registrar componente usando app global
window.app.component('form-entrevistado', FormEntrevistado);
