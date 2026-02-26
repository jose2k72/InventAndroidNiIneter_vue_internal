/**
 * CatalogoSelectorGrande.js
 * Componente de selección de catálogos grandes a pantalla completa.
 * Diseño: Título + Buscador arriba | Lista scrolleable central | Botones fijos abajo.
 * Usa únicamente estilos inline para máxima confiabilidad en Android WebView.
 */

const CatalogoSelectorGrande = {
    props: {
        catalogName: { type: String, required: true },
        label: { type: String, default: 'Seleccionar...' },
        placeholder: { type: String, default: 'Buscar...' }
    },
    emits: ['cancel', 'select'],
    template: `
        <div style="
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            background: #f5f5f5;
            font-family: sans-serif;
        ">
            <!-- ═══ CABECERA (tamaño fijo, no encoge) ═══ -->
            <div style="flex-shrink: 0; background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">

                <!-- Barra de título -->
                <div style="
                    background: #1565C0;
                    color: #fff;
                    font-size: 17px;
                    font-weight: 600;
                    text-align: center;
                    padding: 16px;
                    letter-spacing: 0.3px;
                ">{{ catalogName }}</div>

                <!-- Campo de búsqueda -->
                <div style="padding: 12px 16px;">
                    <input
                        type="text"
                        v-model="terminoBusqueda"
                        :placeholder="placeholder"
                        ref="inputRef"
                        style="
                            display: block;
                            width: 100%;
                            padding: 14px 16px;
                            font-size: 17px;
                            border: 2px solid #ccc;
                            border-radius: 10px;
                            box-sizing: border-box;
                            background: #fafafa;
                            outline: none;
                            -webkit-appearance: none;
                        "
                    >
                </div>
            </div>

            <!-- ═══ LISTA SCROLLEABLE (ocupa TODO el espacio sobrante) ═══ -->
            <div
                ref="listaRef"
                style="
                    flex: 1;
                    min-height: 0;
                    overflow-y: scroll;
                    overflow-x: hidden;
                    -webkit-overflow-scrolling: touch;
                    padding: 10px 14px 10px 14px;
                    background: #f0f0f0;
                "
            >
                <!-- Estado: cargando -->
                <div v-if="cargando" style="text-align:center; padding: 40px 20px; color: #777; font-size: 16px;">
                    ⏳ Cargando...
                </div>

                <!-- Estado: sin resultados -->
                <div v-else-if="filtrados.length === 0" style="text-align:center; padding: 40px 20px; color: #777; font-size: 16px;">
                    Sin resultados para "{{ terminoBusqueda }}"
                </div>

                <!-- Items de la lista -->
                <div
                    v-for="item in paginados"
                    :key="item.id"
                    @click="seleccionar(item)"
                    :style="{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 14px',
                        marginBottom: '6px',
                        background: seleccion && seleccion.id === item.id ? '#e3f2fd' : '#fff',
                        border: seleccion && seleccion.id === item.id ? '2px solid #1565C0' : '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '15px',
                        color: seleccion && seleccion.id === item.id ? '#0d47a1' : '#333',
                        fontWeight: seleccion && seleccion.id === item.id ? 'bold' : 'normal',
                        cursor: 'pointer',
                        WebkitTapHighlightColor: 'rgba(21,101,192,0.1)',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        minHeight: '52px',
                        boxSizing: 'border-box'
                    }"
                >
                    <span>{{ item.nombre }}</span>
                    <span v-if="seleccion && seleccion.id === item.id"
                          style="color: #1565C0; font-size: 20px; font-weight: bold; margin-left: 8px;">✓</span>
                </div>

                <!-- Trigger de carga progresiva (Intersection Observer) -->
                <div v-if="hayMas" ref="triggerRef" style="height: 1px; width: 100%;"></div>
            </div>

            <!-- ═══ FOOTER BOTONES (tamaño fijo, siempre visible) ═══ -->
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
                    :disabled="!seleccion"
                    :style="{
                        flex: '1',
                        padding: '16px 0',
                        fontSize: '15px',
                        fontWeight: 'bold',
                        borderRadius: '8px',
                        border: 'none',
                        background: seleccion ? '#1565C0' : '#bbdefb',
                        color: '#fff',
                        cursor: seleccion ? 'pointer' : 'not-allowed',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        WebkitAppearance: 'none'
                    }"
                >ACEPTAR</button>
            </div>
        </div>
    `,
    setup(props, { emit }) {
        const terminoBusqueda = Vue.ref('');
        const todos = Vue.ref([]);
        const cargando = Vue.ref(false);
        const seleccion = Vue.ref(null);
        const visibles = Vue.ref(35);

        const listaRef = Vue.ref(null);
        const inputRef = Vue.ref(null);
        const triggerRef = Vue.ref(null);
        let observer = null;

        // ── Carga del catálogo ──────────────────────────────────────────────
        const cargar = async () => {
            if (todos.value.length > 0) return;
            cargando.value = true;
            const fname = props.catalogName + '.json';
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
                    todos.value = data.map(i => ({
                        id: String(i.id),
                        nombre: i.nombre || i.name || '(sin nombre)'
                    }));
                } else {
                    console.error('[CatalogoSelectorGrande] No se pudo cargar:', fname);
                }
            } catch (e) {
                console.error('[CatalogoSelectorGrande] Error:', e);
            } finally {
                cargando.value = false;
            }
        };

        // ── Computed ────────────────────────────────────────────────────────
        const filtrados = Vue.computed(() => {
            const q = terminoBusqueda.value.toLowerCase().trim();
            if (!q) return todos.value;
            return todos.value.filter(i =>
                i.nombre.toLowerCase().includes(q) || i.id.includes(q)
            );
        });

        const paginados = Vue.computed(() =>
            filtrados.value.slice(0, visibles.value)
        );

        const hayMas = Vue.computed(() =>
            filtrados.value.length > visibles.value
        );

        // ── Acciones del usuario ────────────────────────────────────────────
        const seleccionar = (item) => {
            seleccion.value = item;
        };

        const aceptar = () => {
            if (seleccion.value) {
                emit('select', { id: seleccion.value.id, name: seleccion.value.nombre });
            }
        };

        // ── Scroll infinito con IntersectionObserver ────────────────────────
        const conectarObserver = () => {
            if (observer) observer.disconnect();
            if (!triggerRef.value || !listaRef.value) return;
            observer = new IntersectionObserver(
                (entries) => { if (entries[0].isIntersecting) visibles.value += 30; },
                { root: listaRef.value, rootMargin: '150px' }
            );
            observer.observe(triggerRef.value);
        };

        // ── Watchers ────────────────────────────────────────────────────────
        Vue.watch(terminoBusqueda, () => {
            visibles.value = 35;
            if (listaRef.value) listaRef.value.scrollTop = 0;
            Vue.nextTick(conectarObserver);
        });

        Vue.watch(hayMas, (v) => {
            if (v) Vue.nextTick(conectarObserver);
            else if (observer) observer.disconnect();
        });

        // ── Ciclo de vida ───────────────────────────────────────────────────
        Vue.onMounted(() => {
            cargar();
            Vue.nextTick(() => {
                conectarObserver();
                if (inputRef.value) inputRef.value.focus();
            });
        });

        Vue.onUnmounted(() => {
            if (observer) observer.disconnect();
        });

        return {
            terminoBusqueda,
            cargando,
            filtrados,
            paginados,
            hayMas,
            seleccion,
            listaRef,
            inputRef,
            triggerRef,
            seleccionar,
            aceptar
        };
    }
};

window.app.component('catalogo-selector-grande', CatalogoSelectorGrande);
