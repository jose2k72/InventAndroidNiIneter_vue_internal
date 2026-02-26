/**
 * CatalogoSelectorTwoLevels.js
 * Selector a pantalla completa de dos niveles: Departamento → Municipio.
 * El catálogo se carga desde DepartamentosMunicipios.json.
 * Emite @select con { codMuni, municipio, codDepto, departamento }
 * Emite @cancel para cerrar sin selección.
 * Usa solo estilos inline para máxima compatibilidad con Android WebView.
 */

const CatalogoSelectorTwoLevels = {
    emits: ['cancel', 'select'],
    template: `
        <div style="
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            background: #f0f0f0;
            font-family: sans-serif;
        ">
            <!-- ═══ TÍTULO ═══ -->
            <div style="
                flex-shrink: 0;
                background: #1565C0;
                color: #fff;
                font-size: 17px;
                font-weight: 600;
                text-align: center;
                padding: 16px;
                letter-spacing: 0.3px;
            ">SELECCIONAR MUNICIPIO</div>

            <!-- ═══ CUERPO: DOS LISTAS SCROLLEABLES ═══ -->
            <div style="
                flex: 1;
                min-height: 0;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                gap: 0;
            ">
                <!-- ── DEPARTAMENTOS (mitad superior) ── -->
                <div style="flex: 1; min-height: 0; display: flex; flex-direction: column; background: #fff; border-bottom: 2px solid #1565C0;">
                    <div style="
                        flex-shrink: 0;
                        background: #e3f2fd;
                        color: #0d47a1;
                        font-weight: 700;
                        font-size: 13px;
                        padding: 8px 14px;
                        letter-spacing: 0.5px;
                        text-transform: uppercase;
                        border-bottom: 1px solid #bbdefb;
                    ">DEPARTAMENTOS</div>

                    <div v-if="cargando" style="padding: 30px; text-align: center; color: #777;">⏳ Cargando...</div>

                    <div v-else style="flex: 1; min-height: 0; overflow-y: scroll; -webkit-overflow-scrolling: touch;">
                        <div
                            v-for="depto in departamentos"
                            :key="depto.CodDepto"
                            @click="seleccionarDepto(depto)"
                            :style="{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '14px 14px',
                                borderBottom: '1px solid #f0f0f0',
                                background: deptoSeleccionado && deptoSeleccionado.CodDepto === depto.CodDepto ? '#e3f2fd' : '#fff',
                                color: deptoSeleccionado && deptoSeleccionado.CodDepto === depto.CodDepto ? '#0d47a1' : '#333',
                                fontWeight: deptoSeleccionado && deptoSeleccionado.CodDepto === depto.CodDepto ? 'bold' : 'normal',
                                cursor: 'pointer',
                                WebkitTapHighlightColor: 'rgba(21,101,192,0.08)',
                                userSelect: 'none',
                                WebkitUserSelect: 'none',
                                minHeight: '48px',
                                boxSizing: 'border-box'
                            }"
                        >
                            <span style="
                                display: inline-block;
                                min-width: 32px;
                                font-weight: bold;
                                font-size: 14px;
                                color: #1565C0;
                                margin-right: 10px;
                            ">{{ depto.CodDepto }}</span>
                            <span style="font-size: 15px; flex: 1;">{{ depto.Departamento }}</span>
                            <span v-if="deptoSeleccionado && deptoSeleccionado.CodDepto === depto.CodDepto"
                                  style="color: #1565C0; font-size: 18px; font-weight: bold;">›</span>
                        </div>
                    </div>
                </div>

                <!-- ── MUNICIPIOS (mitad inferior) ── -->
                <div style="flex: 1; min-height: 0; display: flex; flex-direction: column; background: #fff;">
                    <div style="
                        flex-shrink: 0;
                        background: #e8f5e9;
                        color: #1b5e20;
                        font-weight: 700;
                        font-size: 13px;
                        padding: 8px 14px;
                        letter-spacing: 0.5px;
                        text-transform: uppercase;
                        border-bottom: 1px solid #c8e6c9;
                    ">
                        MUNICIPIOS<span v-if="deptoSeleccionado"> — {{ deptoSeleccionado.Departamento }}</span>
                    </div>

                    <div v-if="!deptoSeleccionado" style="padding: 30px; text-align: center; color: #999; font-size: 14px;">
                        ← Seleccione un departamento
                    </div>

                    <div v-else style="flex: 1; min-height: 0; overflow-y: scroll; -webkit-overflow-scrolling: touch;">
                        <div
                            v-for="muni in deptoSeleccionado.Municipios"
                            :key="muni.CodMuni"
                            @click="seleccionarMuni(muni)"
                            :style="{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '14px 14px',
                                borderBottom: '1px solid #f0f0f0',
                                background: muniSeleccionado && muniSeleccionado.CodMuni === muni.CodMuni ? '#e8f5e9' : '#fff',
                                color: muniSeleccionado && muniSeleccionado.CodMuni === muni.CodMuni ? '#1b5e20' : '#333',
                                fontWeight: muniSeleccionado && muniSeleccionado.CodMuni === muni.CodMuni ? 'bold' : 'normal',
                                cursor: 'pointer',
                                WebkitTapHighlightColor: 'rgba(27,94,32,0.08)',
                                userSelect: 'none',
                                WebkitUserSelect: 'none',
                                minHeight: '48px',
                                boxSizing: 'border-box'
                            }"
                        >
                            <span style="
                                display: inline-block;
                                min-width: 32px;
                                font-weight: bold;
                                font-size: 14px;
                                color: #2e7d32;
                                margin-right: 10px;
                            ">{{ muni.CodMuni.slice(-2) }}</span>
                            <span style="font-size: 15px; flex: 1;">{{ muni.Municipio }}</span>
                            <span v-if="muniSeleccionado && muniSeleccionado.CodMuni === muni.CodMuni"
                                  style="color: #2e7d32; font-size: 20px; font-weight: bold;">✓</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ═══ FOOTER BOTONES ═══ -->
            <div style="
                flex-shrink: 0;
                display: flex;
                gap: 14px;
                padding: 14px 16px 18px 16px;
                background: #fff;
                border-top: 2px solid #ddd;
                box-shadow: 0 -3px 10px rgba(0,0,0,0.08);
            ">
                <button
                    @click="$emit('cancel')"
                    style="
                        flex: 1;
                        padding: 16px 0;
                        font-size: 15px;
                        font-weight: bold;
                        border-radius: 8px;
                        border: 1px solid #bdbdbd;
                        background: #eeeeee;
                        color: #424242;
                        cursor: pointer;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        -webkit-appearance: none;
                    "
                >CANCELAR</button>

                <button
                    @click="aceptar"
                    :disabled="!muniSeleccionado"
                    :style="{
                        flex: '1',
                        padding: '16px 0',
                        fontSize: '15px',
                        fontWeight: 'bold',
                        borderRadius: '8px',
                        border: 'none',
                        background: muniSeleccionado ? '#1565C0' : '#bbdefb',
                        color: '#fff',
                        cursor: muniSeleccionado ? 'pointer' : 'not-allowed',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        WebkitAppearance: 'none'
                    }"
                >ACEPTAR</button>
            </div>
        </div>
    `,
    setup(props, { emit }) {
        const departamentos = Vue.ref([]);
        const cargando = Vue.ref(false);
        const deptoSeleccionado = Vue.ref(null);
        const muniSeleccionado = Vue.ref(null);

        // ── Carga del JSON ──────────────────────────────────────────────────
        const cargar = async () => {
            cargando.value = true;
            const fname = 'DepartamentosMunicipios.json';
            try {
                let data = null;
                if (window.Android && window.Android.loadCatalogJson) {
                    const str = window.Android.loadCatalogJson(fname);
                    if (str) data = JSON.parse(str);
                }
                if (!data) {
                    const r = await fetch('data/' + fname);
                    if (r.ok) data = await r.json();
                }
                if (data) {
                    departamentos.value = data;
                } else {
                    console.error('[SelectorTwoLevels] No se pudo cargar:', fname);
                }
            } catch (e) {
                console.error('[SelectorTwoLevels] Error:', e);
            } finally {
                cargando.value = false;
            }
        };

        // ── Acciones ────────────────────────────────────────────────────────
        const seleccionarDepto = (depto) => {
            deptoSeleccionado.value = depto;
            // Limpiar municipio si cambia de departamento
            muniSeleccionado.value = null;
        };

        const seleccionarMuni = (muni) => {
            muniSeleccionado.value = muni;
        };

        const aceptar = () => {
            if (muniSeleccionado.value && deptoSeleccionado.value) {
                emit('select', {
                    codMuni: muniSeleccionado.value.CodMuni,
                    municipio: muniSeleccionado.value.Municipio,
                    codDepto: deptoSeleccionado.value.CodDepto,
                    departamento: deptoSeleccionado.value.Departamento
                });
            }
        };

        // ── Ciclo de vida ───────────────────────────────────────────────────
        Vue.onMounted(() => {
            cargar();
        });

        return {
            departamentos,
            cargando,
            deptoSeleccionado,
            muniSeleccionado,
            seleccionarDepto,
            seleccionarMuni,
            aceptar
        };
    }
};

window.app.component('catalogo-selector-two-levels', CatalogoSelectorTwoLevels);
