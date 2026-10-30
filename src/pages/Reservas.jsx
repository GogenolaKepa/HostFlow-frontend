import "../styles/reservas-listado.css";
import EstadoReserva from "../components/reservas/EstadoReserva";
import CargaPagina from "../components/CargaPagina";
import { usePermisos } from "../context/PermisosContext";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import api from "../services/api";
import { leerListaDetalle } from "../services/contratosOperativos";
import usePredeterminadosReserva from "../hooks/usePredeterminadosReserva";
import useCatalogosReserva from "../hooks/useCatalogosReserva";
import SelectorReserva from "../components/reservas/SelectorReserva";
import { formularioReservaVacio, payloadReserva, seleccionReservaValida,confirmacionReservaValida } from "../services/formularioReserva";
import ImportesReserva from '../components/reservas/ImportesReserva';
import { useConfirmarOperacion } from '../hooks/useConfirmarOperacion';
import {useMonedas} from '../context/MonedasContext';
import {useProtectorBorradores,useBorradorProtegido} from '../context/BorradoresContext';
import {acuerdoVacio,acuerdoFormulario,altaAcuerdoConfirmada} from '../services/acuerdosMonetarios';
import FormularioAcuerdo from '../components/reservas/FormularioAcuerdo';
const PanelAcuerdoReserva=lazy(()=>import('../components/reservas/PanelAcuerdoReserva'));

const FILTROS_INICIALES_RESERVAS = {
  busqueda: "",
  estado: "",
  canal: "",
  propiedad: "",
  fechaDesde: "",
  fechaHasta: "",
};

const INCIDENCIA_INICIAL = {
  tipo: "Check-in",
  titulo: "",
  descripcion: "",
  severidad: "Baja",
};

const OBSERVACION_INICIAL = {
  categoria: "General",
  observacion: "",
  fijada: false,
};

function Reservas() {
  const comando = useConfirmarOperacion();
  const consultaDetalle = useRef(null);
  useEffect(() => () => consultaDetalle.current?.abort(), []);
  const tienePermiso = usePermisos();
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  // =========================================================
  // FILTROS DE RESERVAS
  // =========================================================

  const [filtros, setFiltros] = useState({
    ...FILTROS_INICIALES_RESERVAS,
  });

  const [mostrarFiltros, setMostrarFiltros] =
    useState(false);

  // =========================================================
  // NAVEGACIÓN DESDE OTROS MÓDULOS
  // =========================================================

  const [reservaDestacada, setReservaDestacada] =
    useState(null);

  // =========================================================
  // DETALLE DE RESERVA
  // =========================================================

  const [reservaDetalle, setReservaDetalle] =
    useState(null);

  const [eventosDetalle, setEventosDetalle] =
    useState([]);

  const [
    cargandoEventosDetalle,
    setCargandoEventosDetalle,
  ] = useState(false);

  const [
    errorEventosDetalle,
    setErrorEventosDetalle,
  ] = useState("");

  const [mensajesDetalle, setMensajesDetalle] =
    useState([]);

  const [
    cargandoMensajesDetalle,
    setCargandoMensajesDetalle,
  ] = useState(false);

  const [
    errorMensajesDetalle,
    setErrorMensajesDetalle,
  ] = useState("");

  const [
    nuevoMensajeDetalle,
    setNuevoMensajeDetalle,
  ] = useState("");

  const [
    enviandoMensajeDetalle,
    setEnviandoMensajeDetalle,
  ] = useState(false);

  const [incidenciasDetalle, setIncidenciasDetalle] =
    useState([]);

  const [
    cargandoIncidenciasDetalle,
    setCargandoIncidenciasDetalle,
  ] = useState(false);

  const [
    errorIncidenciasDetalle,
    setErrorIncidenciasDetalle,
  ] = useState("");

  const [
    mostrarFormularioIncidencia,
    setMostrarFormularioIncidencia,
  ] = useState(false);

  const [
    formularioIncidencia,
    setFormularioIncidencia,
  ] = useState({
    ...INCIDENCIA_INICIAL,
  });

  const [
    registrandoIncidencia,
    setRegistrandoIncidencia,
  ] = useState(false);

  const [
    incidenciaResolviendo,
    setIncidenciaResolviendo,
  ] = useState(null);

  const [
    resolucionIncidencia,
    setResolucionIncidencia,
  ] = useState("");

  const [
    idIncidenciaProcesando,
    setIdIncidenciaProcesando,
  ] = useState(null);

  const [
    observacionesDetalle,
    setObservacionesDetalle,
  ] = useState([]);

  const [
    cargandoObservacionesDetalle,
    setCargandoObservacionesDetalle,
  ] = useState(false);

  const [
    errorObservacionesDetalle,
    setErrorObservacionesDetalle,
  ] = useState("");

  const [
    mostrarFormularioObservacion,
    setMostrarFormularioObservacion,
  ] = useState(false);

  const [
    formularioObservacion,
    setFormularioObservacion,
  ] = useState({
    ...OBSERVACION_INICIAL,
  });

  const [
    observacionEditando,
    setObservacionEditando,
  ] = useState(null);

  const [
    guardandoObservacion,
    setGuardandoObservacion,
  ] = useState(false);

  const [
    idObservacionProcesando,
    setIdObservacionProcesando,
  ] = useState(null);

  // =========================================================
  // RESERVA MANUAL
  // =========================================================

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [reservaEditando, setReservaEditando] =
    useState(null);

  const [formulario, setFormulario] = useState(formularioReservaVacio);
  const catalogosReserva = useCatalogosReserva(mostrarFormulario);
  const envioReserva = useRef(false);
  const borradorManual=useRef(false);
  const [guardandoReserva, setGuardandoReserva] = useState(false);
  const {estado:monedas}=useMonedas(),{protector}=useProtectorBorradores();
  const [acuerdoNuevo,setAcuerdoNuevo]=useState(acuerdoVacio),[altaBloqueada,setAltaBloqueada]=useState(false);
  const confirmarAlta=useConfirmarOperacion();
  const catalogosListos = !catalogosReserva.propiedades.cargando && !catalogosReserva.huespedes.cargando &&
    !catalogosReserva.propiedades.error && !catalogosReserva.huespedes.error &&
    seleccionReservaValida(formulario.idPropiedad, catalogosReserva.propiedades.items) &&
    seleccionReservaValida(formulario.idHuesped, catalogosReserva.huespedes.items);

  const [formularioEdicion, setFormularioEdicion] =
    useState({
      fechaIngreso: "",
      horaIngreso: "",
      fechaEgreso: "",
      horaEgreso: "",
      estado: "",
      montoEstimado: "",
    });
  const predeterminadosReserva = usePredeterminadosReserva(mostrarFormulario, setFormulario);
  useBorradorProtegido(Boolean((mostrarFormulario&&(borradorManual.current||(monedas?.reservas&&JSON.stringify(acuerdoNuevo)!==JSON.stringify(acuerdoVacio()))))||(reservaEditando&&Object.keys(formularioEdicion).some(k=>String(formularioEdicion[k]??'')!==String(reservaEditando[k]??'')))),guardandoReserva);

  // =========================================================
  // AIRBNB
  // =========================================================

  const [reservaAirbnb, setReservaAirbnb] =
    useState(null);

  const [
    propuestaAirbnbVisualizando,
    setPropuestaAirbnbVisualizando,
  ] = useState(null);

  const [formularioAirbnb, setFormularioAirbnb] =
    useState({
      fechaIngreso: "",
      horaIngreso: "",
      fechaEgreso: "",
      horaEgreso: "",
      cantidadHuespedes: "",
      montoEstimado: "",
    });

  // =========================================================
  // BOOKING
  // =========================================================

  const [reservaBooking, setReservaBooking] =
    useState(null);

  const [accionBooking, setAccionBooking] =
    useState(null);

  const [
    operacionBookingVisualizando,
    setOperacionBookingVisualizando,
  ] = useState(null);

  const [
    formularioBookingEstadia,
    setFormularioBookingEstadia,
  ] = useState({
    fechaEgreso: "",
    horaEgreso: "",
    montoEstimado: "",
  });

  const [
    condonarCargosBooking,
    setCondonarCargosBooking,
  ] = useState(false);

  // =========================================================
  // CARGA INICIAL
  // =========================================================

  useEffect(() => {
    obtenerReservas();
  }, []);

  // =========================================================
  // UBICAR Y DESTACAR RESERVA RECIBIDA DESDE OTRO MÓDULO
  // =========================================================
  //
  // Dashboard / Huéspedes / Calendario guardan el ID de la
  // reserva en sessionStorage antes de abrir esta sección.
  // Cuando la lista termina de cargarse, buscamos esa fila,
  // hacemos scroll suave hasta ella y la destacamos unos
  // segundos. Después limpiamos el objetivo para que no vuelva
  // a resaltarse si el usuario entra normalmente a Reservas.
  //
  // =========================================================

  useEffect(() => {
    if (cargando || reservas.length === 0) {
      return undefined;
    }

    const reservaObjetivo =
      window.sessionStorage.getItem(
        "hostflowReservaObjetivo"
      );

    if (!reservaObjetivo) {
      return undefined;
    }

    const idReservaObjetivo =
      Number(reservaObjetivo);

    const existeReserva = reservas.some(
      (reserva) =>
        Number(reserva.idReserva) ===
        idReservaObjetivo
    );

    if (!existeReserva) {
      window.sessionStorage.removeItem(
        "hostflowReservaObjetivo"
      );

      return undefined;
    }

    setFiltros({
      ...FILTROS_INICIALES_RESERVAS,
    });

    setReservaDestacada(
      idReservaObjetivo
    );

    const temporizadorScroll =
      window.setTimeout(() => {
        const vistaMovil =
          window.matchMedia(
            "(max-width: 700px)"
          ).matches;

        const elemento =
          document.getElementById(
            vistaMovil
              ? `reserva-mobile-${idReservaObjetivo}`
              : `reserva-${idReservaObjetivo}`
          );

        if (elemento) {
          elemento.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 120);

    const temporizadorLimpieza =
      window.setTimeout(() => {
        setReservaDestacada(null);

        window.sessionStorage.removeItem(
          "hostflowReservaObjetivo"
        );
      }, 3500);

    return () => {
      window.clearTimeout(
        temporizadorScroll
      );

      window.clearTimeout(
        temporizadorLimpieza
      );
    };
  }, [cargando, reservas]);

  useEffect(() => {
    if (!reservaDetalle) {
      return undefined;
    }

    const overflowAnterior =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const manejarEscape = (e) => {
      if (e.key === "Escape"&&!e.defaultPrevented&&!document.querySelector('dialog[open]')) {
        protector.solicitar(()=>{consultaDetalle.current?.abort();consultaDetalle.current=null;setReservaDetalle(null);});
      }
    };

    window.addEventListener(
      "keydown",
      manejarEscape
    );

    return () => {
      document.body.style.overflow =
        overflowAnterior;

      window.removeEventListener(
        "keydown",
        manejarEscape
      );
    };
  }, [reservaDetalle,protector]);

  const obtenerReservas = async () => {
    try {
      const response =
        await api.get("/reservas");

      setReservas(
        response.data.reservas
      );
      return true;
    } catch {
      setError(
        "No se pudieron obtener las reservas."
      );
      return false;
    } finally {
      setCargando(false);
    }
  };

  // =========================================================
  // CERRAR PANELES
  // =========================================================

  const cerrarPanelesExternos = () => {
    setReservaAirbnb(null);
    setPropuestaAirbnbVisualizando(null);

    setReservaBooking(null);
    setAccionBooking(null);
    setOperacionBookingVisualizando(null);
  };

  // =========================================================
  // NUEVA RESERVA MANUAL
  // =========================================================

  const manejarCambio = (e) => {
    borradorManual.current=true;
    predeterminadosReserva.marcarCambio(e.target.name);
    const { name, value } = e.target;

    setFormulario((actual) => ({
      ...actual,
      [name]: value,
    }));
  };

  const crearReserva = async (e) => {
    e.preventDefault();
    if (envioReserva.current||altaBloqueada) return;

    setError("");
    setMensaje("");

    let datos;
    try {
      if (!catalogosListos) throw Error('Seleccioná una propiedad y un huésped disponibles antes de guardar.');
      datos = payloadReserva(formulario, catalogosReserva.propiedades.items, catalogosReserva.huespedes.items);
      if(monedas?.reservas){
        if(!monedas.acuerdosEscritura)throw Error('Los acuerdos están en modo de solo lectura. No se puede crear una nueva reserva monetaria.');
        datos.acuerdoMonetario=acuerdoFormulario(acuerdoNuevo);
      }
    } catch (error) {
      setError(error.message);
      return;
    }
    if(monedas?.reservas){confirmarAlta.solicitar({titulo:'Crear reserva y acuerdo',descripcion:`Se confirmarán la estadía y el importe contractual ${datos.acuerdoMonetario.moneda} ${datos.acuerdoMonetario.importe}. La cotización del check-in no se fija anticipadamente. No se registra un pago.`,ejecutar:()=>enviarReserva(datos)});return;}
    await enviarReserva(datos);
  };
  const enviarReserva = async datos => {
    if(envioReserva.current||altaBloqueada)return;
    try {
      envioReserva.current = true;
      setGuardandoReserva(true);
      const {data}=await api.post("/reservas", datos);
      if(!confirmacionReservaValida(data?.reserva,datos)){setAltaBloqueada(true);throw Error("No se recibió confirmación completa de la reserva. Recargá antes de reintentar.");}
      if(datos.acuerdoMonetario&&!altaAcuerdoConfirmada(data.reserva,datos.acuerdoMonetario,tienePermiso('reservas.importes'))){setAltaBloqueada(true);throw Error('No se recibió confirmación completa del acuerdo. Recargá antes de reintentar.');}

      setMensaje(
        "Reserva registrada correctamente."
      );
      predeterminadosReserva.reiniciar();

      setMostrarFormulario(false);
      borradorManual.current=false;

      setFormulario(formularioReservaVacio());
      setAcuerdoNuevo(acuerdoVacio());

      await obtenerReservas();
    } catch (error) {
      if(!error.response||error.response.status===409||error.response.status===428||error.response.status>=500)setAltaBloqueada(true);
      setError(
        error.response?.data?.mensaje ||
          error.message||"No se pudo registrar la reserva."
      );
    } finally {
      envioReserva.current = false;
      setGuardandoReserva(false);
    }
  };

  // =========================================================
  // EDICIÓN MANUAL
  // =========================================================

  const manejarCambioEdicion = (e) => {
    const { name, value } = e.target;

    setFormularioEdicion(actual=>({...actual,[name]:value}));
  };

  const abrirEdicion = (reserva) => protector.solicitar(() => {
    if(envioReserva.current||altaBloqueada)return;
    setError("");
    setMensaje("");

    setMostrarFormulario(false);

    cerrarPanelesExternos();

    setReservaEditando(reserva);

    setFormularioEdicion({
      fechaIngreso:
        reserva.fechaIngreso,

      horaIngreso:
        reserva.horaIngreso ||
        "",

      fechaEgreso:
        reserva.fechaEgreso,

      horaEgreso:
        reserva.horaEgreso ||
        "",

      estado:
        reserva.estado,

      montoEstimado:
        reserva.montoEstimado,
    });
  });

  const guardarEdicion = async e => {
    e.preventDefault();if(envioReserva.current||altaBloqueada)return;
    const id=reservaEditando.idReserva,datos={versionEdicion:reservaEditando.versionEdicion,fechaIngreso:formularioEdicion.fechaIngreso,horaIngreso:formularioEdicion.horaIngreso,
      fechaEgreso:formularioEdicion.fechaEgreso,horaEgreso:formularioEdicion.horaEgreso,
      ...(tienePermiso('reservas.estado')?{estado:formularioEdicion.estado}:{}),
      ...(tienePermiso('reservas.importes')?{montoEstimado:Number(formularioEdicion.montoEstimado)}:{})};
    envioReserva.current=true;setGuardandoReserva(true);setError('');setMensaje('');
    try{
      const {data}=await api.put('/reservas/'+id,datos);
      if(!confirmacionReservaValida(data?.reserva,datos,id)){setAltaBloqueada(true);throw Error('No se recibió confirmación completa de la edición. Recargá antes de reintentar.');}
      setMensaje('Reserva modificada correctamente.');setReservaEditando(null);await obtenerReservas();
    }catch(error){
      if(!error.response||error.response.status===409||error.response.status===428||error.response.status>=500)setAltaBloqueada(true);
      setError(error.response?.data?.mensaje||error.message||'No se pudo modificar la reserva.');
    }finally{envioReserva.current=false;setGuardandoReserva(false);}
  };
  const cancelarEdicion=()=>protector.solicitar(()=>{if(envioReserva.current)return;setReservaEditando(null);setError('');});

  // Cancelación lógica: la confirmación no se repite mientras haya un envío.
  const cancelarReserva=async idReserva=>{
    if(envioReserva.current||altaBloqueada)return;
    if(!confirm('¿Seguro que querés cancelar esta reserva?'))return;
    envioReserva.current=true;setGuardandoReserva(true);setError('');setMensaje('');
    try{
      const {data}=await api.patch('/reservas/'+idReserva+'/cancelar',{versionEdicion:reservas.find(r=>r.idReserva===idReserva)?.versionEdicion});
      if(!confirmacionReservaValida(data?.reserva,{estado:'Cancelada'},idReserva)){setAltaBloqueada(true);throw Error('No se recibió confirmación completa de la cancelación. Recargá antes de reintentar.');}
      setMensaje('Reserva cancelada correctamente.');await obtenerReservas();
    }catch(error){
      if(!error.response||error.response.status===409||error.response.status===428||error.response.status>=500)setAltaBloqueada(true);
      setError(error.response?.data?.mensaje||error.message||'No se pudo cancelar la reserva.');
    }finally{envioReserva.current=false;setGuardandoReserva(false);}
  };

  // =========================================================
  // AIRBNB - PROPONER CAMBIO
  // =========================================================

  const abrirPropuestaAirbnb = (
    reserva
  ) => {
    setMostrarFormulario(false);
    setReservaEditando(null);

    setReservaBooking(null);
    setAccionBooking(null);
    setOperacionBookingVisualizando(null);

    setPropuestaAirbnbVisualizando(null);

    setReservaAirbnb(reserva);

    setFormularioAirbnb({
      fechaIngreso:
        reserva.fechaIngreso,

      horaIngreso:
        reserva.horaIngreso || "00:00",

      fechaEgreso:
        reserva.fechaEgreso,

      horaEgreso:
        reserva.horaEgreso || "00:00",

      cantidadHuespedes:
        reserva.cantidadHuespedes,

      montoEstimado:
        reserva.montoEstimado,
    });

    setError("");
    setMensaje("");
  };

  const cerrarPropuestaAirbnb = () => {
    setReservaAirbnb(null);

    setFormularioAirbnb({
      fechaIngreso: "",
      horaIngreso: "",
      fechaEgreso: "",
      horaEgreso: "",
      cantidadHuespedes: "",
      montoEstimado: "",
    });
  };

  const cambiarFormularioAirbnb = (
    e
  ) => {
    const { name, value } = e.target;

    setFormularioAirbnb(
      (anterior) => ({
        ...anterior,
        [name]: value,
      })
    );
  };

  const enviarPropuestaAirbnb = async (
    e
  ) => {
    e.preventDefault();

    try {
      setError("");
      setMensaje("");

      const response = await api.post(
        `/reservas/${reservaAirbnb.idReserva}/airbnb/propuesta`,
        {
          fechaIngreso:
            formularioAirbnb.fechaIngreso,

          horaIngreso:
            formularioAirbnb.horaIngreso,

          fechaEgreso:
            formularioAirbnb.fechaEgreso,

          horaEgreso:
            formularioAirbnb.horaEgreso,

          cantidadHuespedes:
            Number(
              formularioAirbnb
                .cantidadHuespedes
            ),

          montoEstimado:
            Number(
              formularioAirbnb
                .montoEstimado
            ),
        }
      );

      setMensaje(
        `Propuesta enviada correctamente. Solicitud #${response.data.solicitud.idSolicitud} pendiente de respuesta de Airbnb.`
      );

      cerrarPropuestaAirbnb();

      await obtenerReservas();
    } catch (error) {
      setError(
        error.response?.data?.mensaje ||
          "No se pudo generar la propuesta de cambio."
      );
    }
  };

  // =========================================================
  // AIRBNB - PROPUESTA PENDIENTE
  // =========================================================

  const verPropuestaAirbnb = (
    reserva
  ) => {
    setMostrarFormulario(false);
    setReservaEditando(null);
    setReservaAirbnb(null);

    setReservaBooking(null);
    setAccionBooking(null);
    setOperacionBookingVisualizando(null);

    setPropuestaAirbnbVisualizando(
      reserva
    );

    setError("");
    setMensaje("");
  };

  const cerrarDetallePropuestaAirbnb =
    () => {
      setPropuestaAirbnbVisualizando(
        null
      );
    };

  const simularRespuestaAirbnb = async (
    respuesta
  ) => {
    if (
      !propuestaAirbnbVisualizando
        ?.solicitudAirbnbPendiente
    ) {
      return;
    }

    const idSolicitud =
      propuestaAirbnbVisualizando
        .solicitudAirbnbPendiente
        .idSolicitud;

    try {
      setError("");
      setMensaje("");

      const endpoint =
        respuesta === "aceptar"
          ? `/reservas/airbnb/solicitudes/${idSolicitud}/aceptar`
          : `/reservas/airbnb/solicitudes/${idSolicitud}/rechazar`;

      const response =
        await api.post(endpoint);

      if (
        respuesta === "aceptar"
      ) {
        setMensaje(
          "Simulación Airbnb: la propuesta fue aceptada y la reserva fue sincronizada."
        );
      } else {
        setMensaje(
          "Simulación Airbnb: la propuesta fue rechazada. La reserva original no fue modificada."
        );
      }

      setPropuestaAirbnbVisualizando(
        null
      );

      await obtenerReservas();

      if (
        response.data.advertencia
      ) {
        setError(
          response.data.advertencia
        );
      }
    } catch (error) {
      setError(
        error.response?.data?.mensaje ||
          "No se pudo procesar la respuesta simulada de Airbnb."
      );
    }
  };

  // =========================================================
  // BOOKING - ABRIR GESTIÓN
  // =========================================================

  const abrirGestionBooking = (
    reserva
  ) => {
    setMostrarFormulario(false);
    setReservaEditando(null);

    setReservaAirbnb(null);
    setPropuestaAirbnbVisualizando(null);

    setOperacionBookingVisualizando(null);

    setReservaBooking(reserva);
    setAccionBooking(null);

    setFormularioBookingEstadia({
      fechaEgreso:
        reserva.fechaEgreso,

      horaEgreso:
        reserva.horaEgreso || "00:00",

      montoEstimado:
        reserva.montoEstimado,
    });

    setCondonarCargosBooking(false);

    setError("");
    setMensaje("");
  };

  const cerrarGestionBooking = () => {
    setReservaBooking(null);
    setAccionBooking(null);

    setFormularioBookingEstadia({
      fechaEgreso: "",
      horaEgreso: "",
      montoEstimado: "",
    });

    setCondonarCargosBooking(false);
  };

  // =========================================================
  // BOOKING - CAMBIO DE ESTADÍA
  // =========================================================

  const seleccionarCambioEstadiaBooking =
    () => {
      if (!reservaBooking) {
        return;
      }

      setAccionBooking(
        "CAMBIO_ESTADIA"
      );

      setFormularioBookingEstadia({
        fechaEgreso:
          reservaBooking.fechaEgreso,

        horaEgreso:
          reservaBooking.horaEgreso || "00:00",

        montoEstimado:
          reservaBooking.montoEstimado,
      });
    };

  const cambiarFormularioBookingEstadia =
    (e) => {
      const { name, value } =
        e.target;

      setFormularioBookingEstadia(
        (anterior) => ({
          ...anterior,
          [name]: value,
        })
      );
    };

  const enviarCambioEstadiaBooking =
    async (e) => {
      e.preventDefault();

      if (!reservaBooking) {
        return;
      }

      try {
        setError("");
        setMensaje("");

        const response =
          await api.post(
            `/reservas/${reservaBooking.idReserva}/booking/estadia`,
            {
              fechaEgreso:
                formularioBookingEstadia
                  .fechaEgreso,

              horaEgreso:
                formularioBookingEstadia
                  .horaEgreso,

              montoEstimado:
                Number(
                  formularioBookingEstadia
                    .montoEstimado
                ),
            }
          );

        setMensaje(
          `Booking recibió la operación #${response.data.operacion.idOperacion}. El cambio quedó ${response.data.operacion.estado.toLowerCase()} y pendiente de sincronización.`
        );

        cerrarGestionBooking();

        await obtenerReservas();
      } catch (error) {
        setError(
          error.response?.data?.mensaje ||
            "No se pudo enviar el cambio a Booking."
        );
      }
    };

  // =========================================================
  // BOOKING - NO SHOW
  // =========================================================

  const seleccionarNoShowBooking = () => {
    setAccionBooking("NO_SHOW");
    setCondonarCargosBooking(false);
  };

  const enviarNoShowBooking = async (
    e
  ) => {
    e.preventDefault();

    if (!reservaBooking) {
      return;
    }

    const confirmar = confirm(
      "¿Seguro que querés reportar esta reserva como no-show en Booking?"
    );

    if (!confirmar) {
      return;
    }

    try {
      setError("");
      setMensaje("");

      const response =
        await api.post(
          `/reservas/${reservaBooking.idReserva}/booking/no-show`,
          {
            condonarCargos:
              condonarCargosBooking,
          }
        );

      setMensaje(
        `Reporte de no-show enviado a Booking. Operación #${response.data.operacion.idOperacion} pendiente de sincronización.`
      );

      cerrarGestionBooking();

      await obtenerReservas();
    } catch (error) {
      setError(
        error.response?.data?.mensaje ||
          "No se pudo reportar el no-show a Booking."
      );
    }
  };

  // =========================================================
  // BOOKING - OPERACIÓN PENDIENTE
  // =========================================================

  const verOperacionBooking = (
    reserva
  ) => {
    setMostrarFormulario(false);
    setReservaEditando(null);

    setReservaAirbnb(null);
    setPropuestaAirbnbVisualizando(null);

    setReservaBooking(null);
    setAccionBooking(null);

    setOperacionBookingVisualizando(
      reserva
    );

    setError("");
    setMensaje("");
  };

  const cerrarOperacionBooking = () => {
    setOperacionBookingVisualizando(
      null
    );
  };

  const simularSincronizacionBooking =
    async () => {
      const operacion =
        operacionBookingVisualizando
          ?.operacionBookingPendiente;

      if (!operacion) {
        return;
      }

      try {
        setError("");
        setMensaje("");

        const response =
          await api.post(
            `/reservas/booking/operaciones/${operacion.idOperacion}/sincronizar`
          );

        if (
          operacion.tipo ===
          "CAMBIO_ESTADIA"
        ) {
          setMensaje(
            "Simulación Booking: la operación fue procesada y la reserva quedó sincronizada con los nuevos datos."
          );
        } else if (
          operacion.tipo ===
          "NO_SHOW"
        ) {
          setMensaje(
            "Simulación Booking: el no-show fue procesado y la reserva quedó sincronizada."
          );
        } else {
          setMensaje(
            "Simulación Booking: operación sincronizada correctamente."
          );
        }

        setOperacionBookingVisualizando(
          null
        );

        await obtenerReservas();

        if (
          response.data.advertencia
        ) {
          setError(
            response.data.advertencia
          );
        }
      } catch (error) {
        setError(
          error.response?.data?.mensaje ||
            "No se pudo sincronizar la operación de Booking."
        );
      }
    };

  // =========================================================
  // ACCIONES SEGÚN BACKEND
  // =========================================================
  const formatearFecha = (fecha) => {
    if (!fecha) return "-";

    const [anio, mes, dia] = fecha.split("-");

    return `${dia}/${mes}/${anio.slice(-2)}`;
  };

  const tieneAccion = (
    reserva,
    accion
  ) => {
    return reserva.accionesDisponibles?.includes(
      accion
    );
  };

  const calcularNoches = (
    fechaIngreso,
    fechaEgreso
  ) => {
    if (
      !fechaIngreso ||
      !fechaEgreso
    ) {
      return 0;
    }

    const ingreso =
      new Date(
        `${fechaIngreso}T00:00:00`
      );

    const egreso =
      new Date(
        `${fechaEgreso}T00:00:00`
      );

    const diferencia =
      egreso.getTime() -
      ingreso.getTime();

    return Math.max(
      0,
      Math.round(
        diferencia /
          (1000 * 60 * 60 * 24)
      )
    );
  };

  const formatearMonto = (
    monto
  ) => {
    if(monto===null||monto===undefined||!Number.isFinite(Number(monto)))return 'Importe no informado';
    return Number(monto).toLocaleString('es-AR',{maximumFractionDigits:2})+' — moneda no declarada';
  };

  const abrirDetalleReserva = async (
    reserva
  ) => {
    consultaDetalle.current?.abort();
    const consulta = new AbortController();
    consultaDetalle.current = consulta;
    setMostrarFormulario(false);
    setReservaEditando(null);

    cerrarPanelesExternos();

    setReservaDetalle(
      reserva
    );

    setEventosDetalle([]);
    setErrorEventosDetalle("");
    setCargandoEventosDetalle(true);

    setMensajesDetalle([]);
    setErrorMensajesDetalle("");
    setCargandoMensajesDetalle(true);
    setNuevoMensajeDetalle("");
    setEnviandoMensajeDetalle(false);

    setIncidenciasDetalle([]);
    setErrorIncidenciasDetalle("");
    setCargandoIncidenciasDetalle(true);
    setMostrarFormularioIncidencia(false);
    setFormularioIncidencia({
      ...INCIDENCIA_INICIAL,
    });
    setRegistrandoIncidencia(false);
    setIncidenciaResolviendo(null);
    setResolucionIncidencia("");
    setIdIncidenciaProcesando(null);

    setObservacionesDetalle([]);
    setErrorObservacionesDetalle("");
    setCargandoObservacionesDetalle(true);
    setMostrarFormularioObservacion(false);
    setFormularioObservacion({
      ...OBSERVACION_INICIAL,
    });
    setObservacionEditando(null);
    setGuardandoObservacion(false);
    setIdObservacionProcesando(null);

    setError("");
    setMensaje("");

    const [
      resultadoEventos,
      resultadoMensajes,
      resultadoIncidencias,
      resultadoObservaciones,
    ] = await Promise.allSettled([
      api.get(
        `/reservas/${reserva.idReserva}/eventos`, { signal: consulta.signal }
      ).then(respuesta => leerListaDetalle(respuesta, 'eventos')),
      api.get(
        `/reservas/${reserva.idReserva}/mensajes`, { signal: consulta.signal }
      ).then(respuesta => leerListaDetalle(respuesta, 'mensajes')),
      api.get(
        `/reservas/${reserva.idReserva}/incidencias`, { signal: consulta.signal }
      ).then(respuesta => leerListaDetalle(respuesta, 'incidencias')),
      api.get(
        `/reservas/${reserva.idReserva}/observaciones`, { signal: consulta.signal }
      ).then(respuesta => leerListaDetalle(respuesta, 'observaciones')),
    ]);

    if (consulta.signal.aborted || consultaDetalle.current !== consulta) return;

    if (
      resultadoEventos.status ===
      "fulfilled"
    ) {
      setEventosDetalle(
        resultadoEventos.value
      );
    } else {
      setErrorEventosDetalle(
        resultadoEventos.reason
          ?.response?.data?.mensaje ||
          "No se pudo cargar el historial de la reserva."
      );
    }

    if (
      resultadoMensajes.status ===
      "fulfilled"
    ) {
      setMensajesDetalle(
        resultadoMensajes.value
      );
    } else {
      setErrorMensajesDetalle(
        resultadoMensajes.reason
          ?.response?.data?.mensaje ||
          "No se pudieron cargar los mensajes de la reserva."
      );
    }

    if (
      resultadoIncidencias.status ===
      "fulfilled"
    ) {
      setIncidenciasDetalle(
        resultadoIncidencias.value
      );
    } else {
      setErrorIncidenciasDetalle(
        resultadoIncidencias.reason
          ?.response?.data?.mensaje ||
          "No se pudieron cargar las incidencias de la reserva."
      );
    }

    if (
      resultadoObservaciones.status ===
      "fulfilled"
    ) {
      setObservacionesDetalle(
        resultadoObservaciones.value
      );
    } else {
      setErrorObservacionesDetalle(
        resultadoObservaciones.reason
          ?.response?.data?.mensaje ||
          "No se pudieron cargar las observaciones de la reserva."
      );
    }

    setCargandoEventosDetalle(false);
    setCargandoMensajesDetalle(false);
    setCargandoIncidenciasDetalle(false);
    setCargandoObservacionesDetalle(false);
  };

  const cerrarDetalleReserva = () => protector.solicitar(cerrarDetalleSinBorrador);
  const cerrarDetalleSinBorrador = () => {
    consultaDetalle.current?.abort();
    consultaDetalle.current = null;
    setReservaDetalle(null);

    setEventosDetalle([]);
    setErrorEventosDetalle("");
    setCargandoEventosDetalle(false);

    setMensajesDetalle([]);
    setErrorMensajesDetalle("");
    setCargandoMensajesDetalle(false);
    setNuevoMensajeDetalle("");
    setEnviandoMensajeDetalle(false);

    setIncidenciasDetalle([]);
    setErrorIncidenciasDetalle("");
    setCargandoIncidenciasDetalle(false);
    setMostrarFormularioIncidencia(false);
    setFormularioIncidencia({
      ...INCIDENCIA_INICIAL,
    });
    setRegistrandoIncidencia(false);
    setIncidenciaResolviendo(null);
    setResolucionIncidencia("");
    setIdIncidenciaProcesando(null);

    setObservacionesDetalle([]);
    setErrorObservacionesDetalle("");
    setCargandoObservacionesDetalle(false);
    setMostrarFormularioObservacion(false);
    setFormularioObservacion({
      ...OBSERVACION_INICIAL,
    });
    setObservacionEditando(null);
    setGuardandoObservacion(false);
    setIdObservacionProcesando(null);
  };

  const enviarMensajeDetalle = async (
    e
  ) => {
    e.preventDefault();

    if (
      !reservaDetalle ||
      enviandoMensajeDetalle
    ) {
      return;
    }

    const texto =
      nuevoMensajeDetalle.trim();

    if (!texto) {
      setErrorMensajesDetalle(
        "Escribí un mensaje antes de enviarlo."
      );

      return;
    }

    try {
      setEnviandoMensajeDetalle(true);
      setErrorMensajesDetalle("");

      const response =
        await api.post(
          `/reservas/${reservaDetalle.idReserva}/mensajes`,
          {
            mensaje:
              texto,
          }
        );

      if (
        response.data
          .mensajeReserva
      ) {
        setMensajesDetalle(
          (
            mensajesAnteriores
          ) => [
            ...mensajesAnteriores,
            response.data
              .mensajeReserva,
          ]
        );
      }

      setNuevoMensajeDetalle("");
    } catch (error) {
      setErrorMensajesDetalle(
        error.response?.data?.mensaje ||
          "No se pudo registrar el mensaje."
      );
    } finally {
      setEnviandoMensajeDetalle(false);
    }
  };

  const recargarEventosDetalle = async (
    idReserva
  ) => {
    try {
      const response =
        await api.get(
          `/reservas/${idReserva}/eventos`
        );

      setEventosDetalle(
        response.data.eventos || []
      );

      setErrorEventosDetalle("");
    } catch (error) {
      setErrorEventosDetalle(
        error.response?.data?.mensaje ||
          "No se pudo actualizar el historial de la reserva."
      );
    }
  };

  const registrarIncidenciaDetalle = async (
    e
  ) => {
    e.preventDefault();

    if (
      !reservaDetalle ||
      registrandoIncidencia
    ) {
      return;
    }

    const titulo =
      formularioIncidencia.titulo.trim();

    const descripcion =
      formularioIncidencia.descripcion.trim();

    if (!titulo) {
      setErrorIncidenciasDetalle(
        "Ingresá un título para la incidencia."
      );

      return;
    }

    if (!descripcion) {
      setErrorIncidenciasDetalle(
        "Ingresá una descripción para la incidencia."
      );

      return;
    }

    try {
      setRegistrandoIncidencia(true);
      setErrorIncidenciasDetalle("");

      const response =
        await api.post(
          `/reservas/${reservaDetalle.idReserva}/incidencias`,
          {
            tipo:
              formularioIncidencia.tipo,

            titulo,

            descripcion,

            severidad:
              formularioIncidencia.severidad,
          }
        );

      if (
        response.data.incidencia
      ) {
        setIncidenciasDetalle(
          (
            incidenciasAnteriores
          ) => [
            response.data.incidencia,
            ...incidenciasAnteriores,
          ]
        );
      }

      setFormularioIncidencia({
        ...INCIDENCIA_INICIAL,
      });

      setMostrarFormularioIncidencia(false);

      await recargarEventosDetalle(
        reservaDetalle.idReserva
      );
    } catch (error) {
      setErrorIncidenciasDetalle(
        error.response?.data?.mensaje ||
          "No se pudo registrar la incidencia."
      );
    } finally {
      setRegistrandoIncidencia(false);
    }
  };

  const pasarIncidenciaASeguimiento = async (
    incidencia
  ) => {
    if (
      !reservaDetalle ||
      idIncidenciaProcesando
    ) {
      return;
    }

    try {
      setIdIncidenciaProcesando(
        incidencia.idIncidenciaReserva
      );

      setErrorIncidenciasDetalle("");

      const response =
        await api.patch(
          `/reservas/${reservaDetalle.idReserva}/incidencias/${incidencia.idIncidenciaReserva}`,
          {
            estado:
              "En seguimiento",
          }
        );

      if (
        response.data.incidencia
      ) {
        setIncidenciasDetalle(
          (
            incidenciasAnteriores
          ) =>
            incidenciasAnteriores.map(
              (item) =>
                item.idIncidenciaReserva ===
                incidencia.idIncidenciaReserva
                  ? response.data
                      .incidencia
                  : item
            )
        );
      }

      await recargarEventosDetalle(
        reservaDetalle.idReserva
      );
    } catch (error) {
      setErrorIncidenciasDetalle(
        error.response?.data?.mensaje ||
          "No se pudo actualizar la incidencia."
      );
    } finally {
      setIdIncidenciaProcesando(null);
    }
  };

  const iniciarResolucionIncidencia = (
    incidencia
  ) => {
    setIncidenciaResolviendo(
      incidencia.idIncidenciaReserva
    );

    setResolucionIncidencia("");

    setErrorIncidenciasDetalle("");
  };

  const cancelarResolucionIncidencia = () => {
    setIncidenciaResolviendo(null);
    setResolucionIncidencia("");
  };

  const resolverIncidenciaDetalle = async (
    e,
    incidencia
  ) => {
    e.preventDefault();

    if (
      !reservaDetalle ||
      idIncidenciaProcesando
    ) {
      return;
    }

    const resolucion =
      resolucionIncidencia.trim();

    if (!resolucion) {
      setErrorIncidenciasDetalle(
        "Indicá cómo se resolvió la incidencia."
      );

      return;
    }

    try {
      setIdIncidenciaProcesando(
        incidencia.idIncidenciaReserva
      );

      setErrorIncidenciasDetalle("");

      const response =
        await api.post(
          `/reservas/${reservaDetalle.idReserva}/incidencias/${incidencia.idIncidenciaReserva}/resolver`,
          {
            resolucion,
          }
        );

      if (
        response.data.incidencia
      ) {
        setIncidenciasDetalle(
          (
            incidenciasAnteriores
          ) =>
            incidenciasAnteriores.map(
              (item) =>
                item.idIncidenciaReserva ===
                incidencia.idIncidenciaReserva
                  ? response.data
                      .incidencia
                  : item
            )
        );
      }

      setIncidenciaResolviendo(null);
      setResolucionIncidencia("");

      await recargarEventosDetalle(
        reservaDetalle.idReserva
      );
    } catch (error) {
      setErrorIncidenciasDetalle(
        error.response?.data?.mensaje ||
          "No se pudo resolver la incidencia."
      );
    } finally {
      setIdIncidenciaProcesando(null);
    }
  };

  const obtenerClaseSeveridadIncidencia = (
    severidad
  ) =>
    String(severidad || "")
      .trim()
      .toLowerCase();

  const ordenarObservaciones = (
    observaciones
  ) =>
    [...observaciones].sort(
      (a, b) => {
        if (
          Boolean(a.fijada) !==
          Boolean(b.fijada)
        ) {
          return a.fijada
            ? -1
            : 1;
        }

        return (
          new Date(
            b.fechaCreacion
          ).getTime() -
          new Date(
            a.fechaCreacion
          ).getTime()
        );
      }
    );

  const abrirNuevaObservacion = () => {
    setObservacionEditando(null);

    setFormularioObservacion({
      ...OBSERVACION_INICIAL,
    });

    setMostrarFormularioObservacion(true);

    setErrorObservacionesDetalle("");
  };

  const editarObservacionDetalle = (
    observacion
  ) => {
    setObservacionEditando(
      observacion
    );

    setFormularioObservacion({
      categoria:
        observacion.categoria,

      observacion:
        observacion.observacion,

      fijada:
        Boolean(
          observacion.fijada
        ),
    });

    setMostrarFormularioObservacion(true);

    setErrorObservacionesDetalle("");
  };

  const cancelarFormularioObservacion = () => {
    setMostrarFormularioObservacion(false);
    setObservacionEditando(null);

    setFormularioObservacion({
      ...OBSERVACION_INICIAL,
    });

    setErrorObservacionesDetalle("");
  };

  const guardarObservacionDetalle = async (
    e
  ) => {
    e.preventDefault();

    if (
      !reservaDetalle ||
      guardandoObservacion
    ) {
      return;
    }

    const texto =
      formularioObservacion.observacion.trim();

    if (!texto) {
      setErrorObservacionesDetalle(
        "Escribí una observación antes de guardarla."
      );

      return;
    }

    try {
      setGuardandoObservacion(true);
      setErrorObservacionesDetalle("");

      let response;

      if (observacionEditando) {
        response =
          await api.patch(
            `/reservas/${reservaDetalle.idReserva}/observaciones/${observacionEditando.idObservacionReserva}`,
            {
              categoria:
                formularioObservacion.categoria,

              observacion:
                texto,

              fijada:
                formularioObservacion.fijada,
            }
          );
      } else {
        response =
          await api.post(
            `/reservas/${reservaDetalle.idReserva}/observaciones`,
            {
              categoria:
                formularioObservacion.categoria,

              observacion:
                texto,

              fijada:
                formularioObservacion.fijada,
            }
          );
      }

      const observacionGuardada =
        response.data.observacion;

      if (observacionGuardada) {
        setObservacionesDetalle(
          (
            observacionesAnteriores
          ) => {
            const nuevas =
              observacionEditando
                ? observacionesAnteriores.map(
                    (item) =>
                      item.idObservacionReserva ===
                      observacionGuardada.idObservacionReserva
                        ? observacionGuardada
                        : item
                  )
                : [
                    observacionGuardada,
                    ...observacionesAnteriores,
                  ];

            return ordenarObservaciones(
              nuevas
            );
          }
        );
      }

      cancelarFormularioObservacion();
    } catch (error) {
      setErrorObservacionesDetalle(
        error.response?.data?.mensaje ||
          "No se pudo guardar la observación."
      );
    } finally {
      setGuardandoObservacion(false);
    }
  };

  const cambiarFijadaObservacionDetalle = async (
    observacion
  ) => {
    if (
      !reservaDetalle ||
      idObservacionProcesando
    ) {
      return;
    }

    try {
      setIdObservacionProcesando(
        observacion.idObservacionReserva
      );

      setErrorObservacionesDetalle("");

      const response =
        await api.patch(
          `/reservas/${reservaDetalle.idReserva}/observaciones/${observacion.idObservacionReserva}/fijar`,
          {
            fijada:
              !observacion.fijada,
          }
        );

      if (
        response.data.observacion
      ) {
        setObservacionesDetalle(
          (
            observacionesAnteriores
          ) =>
            ordenarObservaciones(
              observacionesAnteriores.map(
                (item) =>
                  item.idObservacionReserva ===
                  observacion.idObservacionReserva
                    ? response.data
                        .observacion
                    : item
              )
            )
        );
      }
    } catch (error) {
      setErrorObservacionesDetalle(
        error.response?.data?.mensaje ||
          "No se pudo cambiar el estado de la observación."
      );
    } finally {
      setIdObservacionProcesando(null);
    }
  };

  const eliminarObservacionDetalle = async (
    observacion
  ) => {
    if (
      !reservaDetalle ||
      idObservacionProcesando
    ) {
      return;
    }

    const confirmar =
      window.confirm(
        "¿Querés eliminar esta observación interna?"
      );

    if (!confirmar) {
      return;
    }

    try {
      setIdObservacionProcesando(
        observacion.idObservacionReserva
      );

      setErrorObservacionesDetalle("");

      await api.delete(
        `/reservas/${reservaDetalle.idReserva}/observaciones/${observacion.idObservacionReserva}`
      );

      setObservacionesDetalle(
        (
          observacionesAnteriores
        ) =>
          observacionesAnteriores.filter(
            (item) =>
              item.idObservacionReserva !==
              observacion.idObservacionReserva
          )
      );

      if (
        observacionEditando
          ?.idObservacionReserva ===
        observacion.idObservacionReserva
      ) {
        cancelarFormularioObservacion();
      }
    } catch (error) {
      setErrorObservacionesDetalle(
        error.response?.data?.mensaje ||
          "No se pudo eliminar la observación."
      );
    } finally {
      setIdObservacionProcesando(null);
    }
  };

  const formatearFechaHoraEvento = (
    fecha
  ) => {
    if (!fecha) {
      return "-";
    }

    const fechaEvento =
      new Date(fecha);

    if (
      Number.isNaN(
        fechaEvento.getTime()
      )
    ) {
      return "-";
    }

    return new Intl.DateTimeFormat(
      "es-AR",
      {
        timeZone:
          "America/Argentina/Buenos_Aires",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }
    ).format(fechaEvento);
  };

  const nombreCampoEvento = (
    campo
  ) => {
    const nombres = {
      fechaIngreso:
        "Ingreso",
      horaIngreso:
        "Hora de ingreso",
      fechaEgreso:
        "Egreso",
      horaEgreso:
        "Hora de egreso",
      estado:
        "Estado",
      montoEstimado:
        "Monto estimado",
      cantidadHuespedes:
        "Huéspedes",
    };

    return (
      nombres[campo] ||
      campo
    );
  };

  const obtenerClaseOrigenTimeline = (
    origen
  ) => {
    const valor =
      String(origen || "")
        .trim()
        .toLowerCase();

    if (valor === "airbnb") {
      return "airbnb";
    }

    if (valor === "booking") {
      return "booking";
    }

    if (valor === "manual") {
      return "manual";
    }

    if (valor === "sistema") {
      return "sistema";
    }

    return "hostflow";
  };

  const obtenerClaseEventoTimeline = (
    evento
  ) => {
    if (
      evento.tipo ===
      "CONFLICTO_DETECTADO"
    ) {
      return "conflicto";
    }

    if (
      evento.tipo ===
      "RESERVA_FINALIZADA"
    ) {
      return "finalizada";
    }

    if (
      evento.tipo ===
      "RESERVA_CANCELADA"
    ) {
      return "cancelada";
    }

    return obtenerClaseOrigenTimeline(
      evento.origen
    );
  };

  const formatearValorEvento = (
    campo,
    valor
  ) => {
    if (
      valor === null ||
      valor === undefined ||
      valor === ""
    ) {
      return "-";
    }

    if (
      campo === "montoEstimado"
    ) {
      return formatearMonto(
        valor
      );
    }

    if (
      campo === "horaIngreso" ||
      campo === "horaEgreso"
    ) {
      return `${String(valor)} hs`;
    }

    if (
      campo === "fechaIngreso" ||
      campo === "fechaEgreso"
    ) {
      return formatearFecha(
        String(valor).slice(
          0,
          10
        )
      );
    }

    return String(valor);
  };

  // =========================================================
  // FILTRADO DE RESERVAS
  // =========================================================

  const normalizarTexto = (valor) =>
    String(valor ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const cambiarFiltro = (e) => {
    const { name, value } = e.target;

    setFiltros((anteriores) => ({
      ...anteriores,
      [name]: value,
    }));
  };

  const limpiarFiltros = () => {
    setFiltros({
      ...FILTROS_INICIALES_RESERVAS,
    });
  };

  const propiedadesDisponibles = [
    ...new Set(
      reservas
        .map((reserva) => reserva.propiedad)
        .filter(Boolean)
    ),
  ].sort((a, b) =>
    a.localeCompare(b, "es")
  );

  const reservasFiltradas = reservas.filter(
    (reserva) => {
      const busqueda =
        normalizarTexto(
          filtros.busqueda
        );

      const valoresBusqueda = [
        reserva.idReserva,
        reserva.huesped,
        reserva.propiedad,
        reserva.canal,
        reserva.estado,
        reserva.idExterno,
      ];

      const coincideBusqueda =
        !busqueda ||
        valoresBusqueda.some((valor) =>
          normalizarTexto(
            valor
          ).includes(busqueda)
        );

      const coincideEstado =
        !filtros.estado ||
        reserva.estado ===
          filtros.estado;

      const coincideCanal =
        !filtros.canal ||
        reserva.canal ===
          filtros.canal;

      const coincidePropiedad =
        !filtros.propiedad ||
        reserva.propiedad ===
          filtros.propiedad;

      const fechaIngreso =
        String(
          reserva.fechaIngreso || ""
        ).slice(0, 10);

      const coincideFechaDesde =
        !filtros.fechaDesde ||
        (fechaIngreso &&
          fechaIngreso >=
            filtros.fechaDesde);

      const coincideFechaHasta =
        !filtros.fechaHasta ||
        (fechaIngreso &&
          fechaIngreso <=
            filtros.fechaHasta);

      return (
        coincideBusqueda &&
        coincideEstado &&
        coincideCanal &&
        coincidePropiedad &&
        coincideFechaDesde &&
        coincideFechaHasta
      );
    }
  )
    .sort(
      (
        reservaA,
        reservaB
      ) =>
        Number(
          reservaB.idReserva
        ) -
        Number(
          reservaA.idReserva
        )
    );

  const cantidadFiltrosActivos =
    Object.values(filtros).filter(
      (valor) =>
        String(valor).trim() !== ""
    ).length;

  // =========================================================
  // ABRIR CANAL ORIGINAL
  // =========================================================

  const abrirEnCanal = (
    reserva
  ) => {
    let url = null;

    if (
      reserva.canal === "Airbnb"
    ) {
      url =
        "https://www.airbnb.com/hosting";
    }

    if (
      reserva.canal === "Booking"
    ) {
      url =
        "https://admin.booking.com/";
    }

    if (!url) {
      return;
    }

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // =========================================================
  // CARGANDO
  // =========================================================

  if (cargando) {
    return (
      <CargaPagina variante="reservas" />
    );
  }

  // =========================================================
  // VISTA
  // =========================================================

  return (
    <section className="reservas-page">
      {comando.dialogo}
      {confirmarAlta.dialogo}
      {/* CABECERA */}

      <div className="section-header">
        <div>
          <h2>
            Gestión de reservas
          </h2>

          <p>
            Listado general de reservas
            registradas en HostFlow. Consultar no cambia estados. Las confirmadas
            con egreso anterior a hoy requieren Finalizar vencidas.
          </p>
        </div>

        <div className="reservas-header-actions">
          {tienePermiso('reservas.estado') && <button type="button" className="secondary-button"
            disabled={comando.ocupado} onClick={() => comando.solicitar({ titulo: 'Finalizar reservas vencidas',
              descripcion: 'Se finalizarán todas las reservas Confirmadas con egreso anterior a hoy en Buenos Aires, de cualquier canal. Se registrará su historial. No cancela ni elimina reservas.',
              ejecutar: async () => {
                setError(''); setMensaje('');
                try {
                  const { data } = await api.post('/reservas/finalizar-vencidas', { confirmar: true });
                  const recargado = await obtenerReservas();
                  setMensaje(`Reservas finalizadas: ${data.resultado.cantidadFinalizadas}.${recargado ? '' : ' El guardado se confirmó, pero falta recargar la lista.'}`);
                } catch (e) { setError(e.response?.data?.mensaje || 'No se pudo confirmar la finalización. Recargá antes de reintentar.'); }
              } })}>Finalizar vencidas</button>}
          <button
            type="button"
            className={`reservas-filter-toggle ${
              mostrarFiltros
                ? "reservas-filter-toggle--active"
                : ""
            }`}
            aria-expanded={mostrarFiltros}
            onClick={() => {
              setMostrarFiltros(
                !mostrarFiltros
              );

              setMostrarFormulario(false);
              setReservaEditando(null);

              cerrarPanelesExternos();

              setError("");
              setMensaje("");
            }}
          >
            <span
              className="reservas-filter-toggle-icon"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 5H20L14 12V18.2L10 20V12L4 5Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>

            <span>
              {mostrarFiltros
                ? "Filtros"
                : "Filtrar"}
            </span>

            {cantidadFiltrosActivos > 0 && (
              <span className="reservas-filter-toggle-count">
                {cantidadFiltrosActivos}
              </span>
            )}
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setMostrarFormulario(
                !mostrarFormulario
              );

              setMostrarFiltros(false);
              setReservaEditando(null);

              cerrarPanelesExternos();

              setError("");
              setMensaje("");
            }}
          >
            {mostrarFormulario
              ? "Cerrar formulario"
              : "Nueva reserva"}
          </button>
        </div>
      </div>

      {/* MENSAJES */}
      {guardandoReserva&&<p role="status">Guardando operación de reserva…</p>}
      {altaBloqueada&&<p role="alert">Recargá para comprobar el resultado antes de guardar otra vez. No se reenvía automáticamente.</p>}

      {mensaje && (
        <p className="success-message">
          {mensaje}
        </p>
      )}

      {error && (
        <p className="error">
          {error}
        </p>
      )}

      {/* =====================================================
          NUEVA RESERVA MANUAL
      ====================================================== */}

      {mostrarFormulario && (
        <form
          className="form-card"
          onSubmit={crearReserva}
        >
          <p className="settings-defaults-status" role="status">{predeterminadosReserva.estado}</p>
          <h3>
            Registrar nueva reserva
            manual
          </h3>

          <div className="form-grid">
            <SelectorReserva campo="idPropiedad" etiqueta="Propiedades" singular="una propiedad"
              catalogo={catalogosReserva.propiedades} valor={formulario.idPropiedad} onChange={manejarCambio}
              recargar={catalogosReserva.recargar} bloqueado={guardandoReserva} />
            <SelectorReserva campo="idHuesped" etiqueta="Huéspedes" singular="un huésped"
              catalogo={catalogosReserva.huespedes} valor={formulario.idHuesped} onChange={manejarCambio}
              recargar={catalogosReserva.recargar} bloqueado={guardandoReserva} />

            <div>
              <label>
                Canal
              </label>

              <input
                type="text"
                value="Manual"
                disabled
              />
            </div>

            <div>
              <label>
                Cantidad de huéspedes
              </label>

              <input
                type="number"
                name="cantidadHuespedes"
                min="1"
                required
                step="1"
                value={
                  formulario
                    .cantidadHuespedes
                }
                onChange={
                  manejarCambio
                }
              />
            </div>

            <div>
              <label>
                Fecha de ingreso
              </label>

              <input
                type="date"
                lang="es-AR"
                name="fechaIngreso"
                value={
                  formulario.fechaIngreso
                }
                onChange={
                  manejarCambio
                }
                required
              />
            </div>

            <div>
              <label>
                Hora de check-in
              </label>

              <input
                type="time"
                name="horaIngreso"
                step="60"
                value={
                  formulario.horaIngreso
                }
                onChange={
                  manejarCambio
                }
                required
              />
            </div>

            <div>
              <label>
                Fecha de egreso
              </label>

              <input
                type="date"
                lang="es-AR"
                name="fechaEgreso"
                value={
                  formulario.fechaEgreso
                }
                onChange={
                  manejarCambio
                }
                required
              />
            </div>

            <div>
              <label>
                Hora de check-out
              </label>

              <input
                type="time"
                name="horaEgreso"
                step="60"
                value={
                  formulario.horaEgreso
                }
                onChange={
                  manejarCambio
                }
                required
              />
            </div>

            <div>
              <label>
                Monto estimado
              </label>

              <input
                type="number"
                name="montoEstimado"
                min="0"
                step="0.01"
                required
                value={
                  formulario.montoEstimado
                }
                onChange={
                  manejarCambio
                }
              />
            </div>
          </div>

          {monedas?.reservas?<><FormularioAcuerdo valor={acuerdoNuevo} onChange={setAcuerdoNuevo} disabled={guardandoReserva||!monedas.acuerdosEscritura} prefijo="nuevo-acuerdo" />{!monedas.acuerdosEscritura&&<p role="status">Acuerdos en solo lectura. Guardar requiere activación autorizada.</p>}</>:<p className="settings-defaults-status">Acuerdos monetarios deshabilitados; el monto estimado no acredita moneda ni cotización contractual.</p>}
          <div className="form-actions">
            <button
              type="submit"
              className="primary-button"
              disabled={guardandoReserva || !catalogosListos||altaBloqueada||(monedas?.reservas&&!monedas.acuerdosEscritura)}
            >
              {guardandoReserva ? 'Guardando reserva…' : 'Guardar reserva'}
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                setMostrarFormulario(
                  false
                )
              }
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* =====================================================
          EDICIÓN MANUAL
      ====================================================== */}

      {reservaEditando && (
        <form
          className="form-card"
          onSubmit={
            guardarEdicion
          }
        >
          <h3>
            Modificar reserva #
            {
              reservaEditando.idReserva
            }
          </h3>

          <p>
            <strong>
              Huésped:
            </strong>{" "}
            {
              reservaEditando.huesped
            }
          </p>

          <p>
            <strong>
              Propiedad:
            </strong>{" "}
            {
              reservaEditando.propiedad
            }
          </p>

          <div className="form-grid">
            <div>
              <label>
                Fecha de ingreso
              </label>

              <input
                type="date"
                lang="es-AR"
                name="fechaIngreso"
                value={
                  formularioEdicion.fechaIngreso
                }
                disabled={reservaEditando.acuerdoMonetario?.estadoFijacion==='FIJADA'}
                onChange={
                  manejarCambioEdicion
                }
                required
              />
            </div>

            <div>
              <label>
                Hora de check-in
              </label>

              <input
                type="time"
                name="horaIngreso"
                step="60"
                value={
                  formularioEdicion.horaIngreso
                }
                disabled={reservaEditando.acuerdoMonetario?.estadoFijacion==='FIJADA'}
                onChange={
                  manejarCambioEdicion
                }
                required
              />
            </div>

            <div>
              <label>
                Fecha de egreso
              </label>

              <input
                type="date"
                lang="es-AR"
                name="fechaEgreso"
                value={
                  formularioEdicion.fechaEgreso
                }
                onChange={
                  manejarCambioEdicion
                }
                required
              />
            </div>

            <div>
              <label>
                Hora de check-out
              </label>

              <input
                type="time"
                name="horaEgreso"
                step="60"
                value={
                  formularioEdicion.horaEgreso
                }
                onChange={
                  manejarCambioEdicion
                }
                required
              />
            </div>

            <div>
              <label>
                Estado
              </label>

              <select
                disabled={!tienePermiso("reservas.estado")}
                name="estado"
                value={
                  formularioEdicion
                    .estado
                }
                onChange={
                  manejarCambioEdicion
                }
              >
                {formularioEdicion.estado && !['Pendiente','Confirmada','Cancelada','Finalizada'].includes(formularioEdicion.estado) &&
                  <option value={formularioEdicion.estado} disabled>{formularioEdicion.estado}</option>}
                <option value="Pendiente">
                  Pendiente
                </option>

                <option value="Confirmada">
                  Confirmada
                </option>

                <option value="Cancelada">
                  Cancelada
                </option>

                <option value="Finalizada">
                  Finalizada
                </option>
              </select>
            </div>

            <div>
              <label>
                Monto estimado
              </label>

              <input
                disabled={!tienePermiso("reservas.importes")}
                type="number"
                name="montoEstimado"
                min="0"
                step="0.01"
                value={
                  formularioEdicion
                    .montoEstimado
                }
                onChange={
                  manejarCambioEdicion
                }
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="primary-button"
              disabled={guardandoReserva||altaBloqueada}
            >
              {guardandoReserva?"Guardando cambios…":"Guardar cambios"}
            </button>

            <button
              type="button"
              className="secondary-button"
              disabled={guardandoReserva}
              onClick={
                cancelarEdicion
              }
            >
              Cancelar edición
            </button>
          </div>
        </form>
      )}

      {/* =====================================================
          AIRBNB - PROPONER CAMBIO
      ====================================================== */}

      {reservaAirbnb && (
        <form
          className="form-card"
          onSubmit={
            enviarPropuestaAirbnb
          }
        >
          <h3>
            Proponer cambio en
            Airbnb
          </h3>

          <p>
            <strong>
              Huésped:
            </strong>{" "}
            {
              reservaAirbnb.huesped
            }
          </p>

          <p>
            <strong>
              Propiedad:
            </strong>{" "}
            {
              reservaAirbnb.propiedad
            }
          </p>

          <p>
            La reserva original no se
            modificará hasta que Airbnb
            confirme la propuesta.
          </p>

          <div className="form-grid">
            <div>
              <label>
                Fecha de ingreso
              </label>

              <input
                type="date"
                lang="es-AR"
                name="fechaIngreso"
                value={
                  formularioAirbnb
                    .fechaIngreso
                }
                onChange={
                  cambiarFormularioAirbnb
                }
                required
              />
            </div>

            <div>
              <label>
                Hora de check-in
              </label>

              <input
                type="time"
                name="horaIngreso"
                value={
                  formularioAirbnb
                    .horaIngreso
                }
                onChange={
                  cambiarFormularioAirbnb
                }
                required
              />
            </div>

            <div>
              <label>
                Fecha de egreso
              </label>

              <input
                type="date"
                lang="es-AR"
                name="fechaEgreso"
                value={
                  formularioAirbnb
                    .fechaEgreso
                }
                onChange={
                  cambiarFormularioAirbnb
                }
                required
              />
            </div>

            <div>
              <label>
                Hora de check-out
              </label>

              <input
                type="time"
                name="horaEgreso"
                value={
                  formularioAirbnb
                    .horaEgreso
                }
                onChange={
                  cambiarFormularioAirbnb
                }
                required
              />
            </div>

            <div>
              <label>
                Cantidad de huéspedes
              </label>

              <input
                type="number"
                name="cantidadHuespedes"
                min="1"
                value={
                  formularioAirbnb
                    .cantidadHuespedes
                }
                onChange={
                  cambiarFormularioAirbnb
                }
                required
              />
            </div>

            <div>
              <label>
                Monto propuesto
              </label>

              <input
                type="number"
                name="montoEstimado"
                min="0"
                value={
                  formularioAirbnb
                    .montoEstimado
                }
                onChange={
                  cambiarFormularioAirbnb
                }
                required
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="primary-button"
            >
              Enviar propuesta
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={
                cerrarPropuestaAirbnb
              }
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* =====================================================
          AIRBNB - PROPUESTA PENDIENTE
      ====================================================== */}

      {propuestaAirbnbVisualizando &&
        propuestaAirbnbVisualizando
          .solicitudAirbnbPendiente && (
          <div className="form-card">
            <h3>
              Cambio pendiente en
              Airbnb
            </h3>

            <p>
              <strong>
                Huésped:
              </strong>{" "}
              {
                propuestaAirbnbVisualizando
                  .huesped
              }
            </p>

            <p>
              <strong>
                Propiedad:
              </strong>{" "}
              {
                propuestaAirbnbVisualizando
                  .propiedad
              }
            </p>

            <p>
              <strong>
                Solicitud:
              </strong>{" "}
              #
              {
                propuestaAirbnbVisualizando
                  .solicitudAirbnbPendiente
                  .idSolicitud
              }
            </p>

            <p>
              <strong>
                Estado:
              </strong>{" "}
              {
                propuestaAirbnbVisualizando
                  .solicitudAirbnbPendiente
                  .estado
              }
            </p>

            <div className="form-grid">
              <div>
                <label>
                  Ingreso actual
                </label>

                <input
                  type="date"
                  lang="es-AR"
                  value={
                    propuestaAirbnbVisualizando
                      .fechaIngreso
                  }
                  disabled
                />
              </div>

              <div>
                <label>
                  Ingreso propuesto
                </label>

                <input
                  type="date"
                  lang="es-AR"
                  value={
                    propuestaAirbnbVisualizando
                      .solicitudAirbnbPendiente
                      .cambiosSolicitados
                      .fechaIngreso
                  }
                  disabled
                />
              </div>

              <div>
                <label>
                  Hora ingreso actual
                </label>

                <input
                  type="time"
                  value={
                    propuestaAirbnbVisualizando
                      .horaIngreso || "00:00"
                  }
                  disabled
                />
              </div>

              <div>
                <label>
                  Hora ingreso propuesta
                </label>

                <input
                  type="time"
                  value={
                    propuestaAirbnbVisualizando
                      .solicitudAirbnbPendiente
                      .cambiosSolicitados
                      .horaIngreso || "00:00"
                  }
                  disabled
                />
              </div>

              <div>
                <label>
                  Egreso actual
                </label>

                <input
                  type="date"
                  lang="es-AR"
                  value={
                    propuestaAirbnbVisualizando
                      .fechaEgreso
                  }
                  disabled
                />
              </div>

              <div>
                <label>
                  Egreso propuesto
                </label>

                <input
                  type="date"
                  lang="es-AR"
                  value={
                    propuestaAirbnbVisualizando
                      .solicitudAirbnbPendiente
                      .cambiosSolicitados
                      .fechaEgreso
                  }
                  disabled
                />
              </div>

              <div>
                <label>
                  Hora egreso actual
                </label>

                <input
                  type="time"
                  value={
                    propuestaAirbnbVisualizando
                      .horaEgreso || "00:00"
                  }
                  disabled
                />
              </div>

              <div>
                <label>
                  Hora egreso propuesta
                </label>

                <input
                  type="time"
                  value={
                    propuestaAirbnbVisualizando
                      .solicitudAirbnbPendiente
                      .cambiosSolicitados
                      .horaEgreso || "00:00"
                  }
                  disabled
                />
              </div>

              <div>
                <label>
                  Huéspedes actuales
                </label>

                <input
                  type="number"
                  value={
                    propuestaAirbnbVisualizando
                      .cantidadHuespedes
                  }
                  disabled
                />
              </div>

              <div>
                <label>
                  Huéspedes propuestos
                </label>

                <input
                  type="number"
                  value={
                    propuestaAirbnbVisualizando
                      .solicitudAirbnbPendiente
                      .cambiosSolicitados
                      .cantidadHuespedes
                  }
                  disabled
                />
              </div>

              <div>
                <label>
                  Monto actual
                </label>

                <input
                  type="number"
                  value={
                    propuestaAirbnbVisualizando
                      .montoEstimado
                  }
                  disabled
                />
              </div>

              <div>
                <label>
                  Monto propuesto
                </label>

                <input
                  type="number"
                  value={
                    propuestaAirbnbVisualizando
                      .solicitudAirbnbPendiente
                      .cambiosSolicitados
                      .montoEstimado
                  }
                  disabled
                />
              </div>
            </div>

            <p>
              Airbnb todavía no confirmó
              ni rechazó este cambio. La
              reserva actual permanece sin
              modificaciones.
            </p>

            <p>
              <strong>
                Simulación de integración:
              </strong>{" "}
              estos botones representan
              la respuesta que en
              producción llegaría desde
              Airbnb.
            </p>

            <div className="form-actions">
              {tienePermiso("integraciones.gestionar") && (<button
                type="button"
                className="primary-button"
                onClick={() =>
                  simularRespuestaAirbnb(
                    "aceptar"
                  )
                }
              >
                Simular aceptación
                Airbnb
              </button>)}

              {tienePermiso("integraciones.gestionar") && (<button
                type="button"
                className="cancel-button"
                onClick={() =>
                  simularRespuestaAirbnb(
                    "rechazar"
                  )
                }
              >
                Simular rechazo Airbnb
              </button>)}

              <button
                type="button"
                className="secondary-button"
                onClick={
                  cerrarDetallePropuestaAirbnb
                }
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

      {/* =====================================================
          BOOKING - PANEL DE GESTIÓN
      ====================================================== */}

      {reservaBooking && (
        <div className="form-card">
          <h3>
            Gestionar reserva Booking
          </h3>

          <p>
            <strong>
              Huésped:
            </strong>{" "}
            {
              reservaBooking.huesped
            }
          </p>

          <p>
            <strong>
              Propiedad:
            </strong>{" "}
            {
              reservaBooking.propiedad
            }
          </p>

          <p>
            <strong>
              Identificador Booking:
            </strong>{" "}
            {reservaBooking.idExterno ||
              "Sin identificador externo"}
          </p>

          {!accionBooking && (
            <>
              <p>
                Seleccioná la operación
                que querés gestionar con
                Booking.
              </p>

              <div className="form-actions">
                <button
                  type="button"
                  className="channel-button"
                  onClick={
                    seleccionarCambioEstadiaBooking
                  }
                >
                  Cambiar estadía /
                  precio
                </button>

                <button
                  type="button"
                  className="cancel-button"
                  onClick={
                    seleccionarNoShowBooking
                  }
                >
                  Reportar no-show
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    cerrarGestionBooking
                  }
                >
                  Cerrar
                </button>
              </div>
            </>
          )}

          {/* BOOKING - CAMBIO ESTADÍA */}

          {accionBooking ===
            "CAMBIO_ESTADIA" && (
            <form
              onSubmit={
                enviarCambioEstadiaBooking
              }
            >
              <p>
                Booking conservará el
                check-in actual. HostFlow
                enviará el nuevo checkout
                y el nuevo precio.
              </p>

              <div className="form-grid">
                <div>
                  <label>
                    Ingreso actual
                  </label>

                  <input
                    type="date"
                    lang="es-AR"
                    value={
                      reservaBooking
                        .fechaIngreso
                    }
                    disabled
                  />
                </div>

                <div>
                  <label>
                    Hora ingreso actual
                  </label>

                  <input
                    type="time"
                    value={
                      reservaBooking
                        .horaIngreso || "00:00"
                    }
                    disabled
                  />
                </div>

                <div>
                  <label>
                    Egreso actual
                  </label>

                  <input
                    type="date"
                    lang="es-AR"
                    value={
                      reservaBooking
                        .fechaEgreso
                    }
                    disabled
                  />
                </div>

                <div>
                  <label>
                    Hora egreso actual
                  </label>

                  <input
                    type="time"
                    value={
                      reservaBooking
                        .horaEgreso || "00:00"
                    }
                    disabled
                  />
                </div>

                <div>
                  <label>
                    Nuevo egreso
                  </label>

                  <input
                    type="date"
                    lang="es-AR"
                    name="fechaEgreso"
                    value={
                      formularioBookingEstadia
                        .fechaEgreso
                    }
                    onChange={
                      cambiarFormularioBookingEstadia
                    }
                    required
                  />
                </div>

                <div>
                  <label>
                    Nueva hora de check-out
                  </label>

                  <input
                    type="time"
                    name="horaEgreso"
                    value={
                      formularioBookingEstadia
                        .horaEgreso
                    }
                    onChange={
                      cambiarFormularioBookingEstadia
                    }
                    required
                  />
                </div>

                <div>
                  <label>
                    Nuevo monto
                  </label>

                  <input
                    type="number"
                    min="0"
                    name="montoEstimado"
                    value={
                      formularioBookingEstadia
                        .montoEstimado
                    }
                    onChange={
                      cambiarFormularioBookingEstadia
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="primary-button"
                >
                  Enviar a Booking
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setAccionBooking(
                      null
                    )
                  }
                >
                  Volver
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    cerrarGestionBooking
                  }
                >
                  Cerrar
                </button>
              </div>
            </form>
          )}

          {/* BOOKING - NO SHOW */}

          {accionBooking ===
            "NO_SHOW" && (
            <form
              onSubmit={
                enviarNoShowBooking
              }
            >
              <p>
                Utilizá esta opción
                únicamente cuando el
                huésped no se haya
                presentado.
              </p>

              <div
                style={{
                  marginTop: "18px",
                  marginBottom: "20px",
                }}
              >
                <label>
                  <input
                    type="checkbox"
                    checked={
                      condonarCargosBooking
                    }
                    onChange={(e) =>
                      setCondonarCargosBooking(
                        e.target.checked
                      )
                    }
                    style={{
                      marginRight: "8px",
                    }}
                  />

                  Perdonar / condonar los
                  cargos al huésped
                </label>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="cancel-button"
                >
                  Enviar no-show a
                  Booking
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setAccionBooking(
                      null
                    )
                  }
                >
                  Volver
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    cerrarGestionBooking
                  }
                >
                  Cerrar
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* =====================================================
          BOOKING - OPERACIÓN PENDIENTE
      ====================================================== */}

      {operacionBookingVisualizando &&
        operacionBookingVisualizando
          .operacionBookingPendiente && (
          <div className="form-card">
            <h3>
              Operación pendiente en
              Booking
            </h3>

            <p>
              <strong>
                Huésped:
              </strong>{" "}
              {
                operacionBookingVisualizando
                  .huesped
              }
            </p>

            <p>
              <strong>
                Propiedad:
              </strong>{" "}
              {
                operacionBookingVisualizando
                  .propiedad
              }
            </p>

            <p>
              <strong>
                Operación:
              </strong>{" "}
              #
              {
                operacionBookingVisualizando
                  .operacionBookingPendiente
                  .idOperacion
              }
            </p>

            <p>
              <strong>
                Tipo:
              </strong>{" "}
              {
                operacionBookingVisualizando
                  .operacionBookingPendiente
                  .tipo
              }
            </p>

            <p>
              <strong>
                Estado:
              </strong>{" "}
              {
                operacionBookingVisualizando
                  .operacionBookingPendiente
                  .estado
              }
            </p>

            {operacionBookingVisualizando
              .operacionBookingPendiente
              .tipo ===
              "CAMBIO_ESTADIA" &&
              operacionBookingVisualizando
                .operacionBookingPendiente
                .cambiosSolicitados && (
                <div className="form-grid">
                  <div>
                    <label>
                      Ingreso actual
                    </label>

                    <input
                      type="date"
                      lang="es-AR"
                      value={
                        operacionBookingVisualizando
                          .fechaIngreso
                      }
                      disabled
                    />
                  </div>

                  <div>
                    <label>
                      Ingreso solicitado
                    </label>

                    <input
                      type="date"
                      lang="es-AR"
                      value={
                        operacionBookingVisualizando
                          .operacionBookingPendiente
                          .cambiosSolicitados
                          .fechaIngreso
                      }
                      disabled
                    />
                  </div>

                  <div>
                    <label>
                      Hora ingreso actual
                    </label>

                    <input
                      type="time"
                      value={
                        operacionBookingVisualizando
                          .horaIngreso || "00:00"
                      }
                      disabled
                    />
                  </div>

                  <div>
                    <label>
                      Hora ingreso solicitada
                    </label>

                    <input
                      type="time"
                      value={
                        operacionBookingVisualizando
                          .operacionBookingPendiente
                          .cambiosSolicitados
                          .horaIngreso || "00:00"
                      }
                      disabled
                    />
                  </div>

                  <div>
                    <label>
                      Egreso actual
                    </label>

                    <input
                      type="date"
                      lang="es-AR"
                      value={
                        operacionBookingVisualizando
                          .fechaEgreso
                      }
                      disabled
                    />
                  </div>

                  <div>
                    <label>
                      Egreso solicitado
                    </label>

                    <input
                      type="date"
                      lang="es-AR"
                      value={
                        operacionBookingVisualizando
                          .operacionBookingPendiente
                          .cambiosSolicitados
                          .fechaEgreso
                      }
                      disabled
                    />
                  </div>

                  <div>
                    <label>
                      Hora egreso actual
                    </label>

                    <input
                      type="time"
                      value={
                        operacionBookingVisualizando
                          .horaEgreso || "00:00"
                      }
                      disabled
                    />
                  </div>

                  <div>
                    <label>
                      Hora egreso solicitada
                    </label>

                    <input
                      type="time"
                      value={
                        operacionBookingVisualizando
                          .operacionBookingPendiente
                          .cambiosSolicitados
                          .horaEgreso || "00:00"
                      }
                      disabled
                    />
                  </div>

                  <div>
                    <label>
                      Monto actual
                    </label>

                    <input
                      type="number"
                      value={
                        operacionBookingVisualizando
                          .montoEstimado
                      }
                      disabled
                    />
                  </div>

                  <div>
                    <label>
                      Monto solicitado
                    </label>

                    <input
                      type="number"
                      value={
                        operacionBookingVisualizando
                          .operacionBookingPendiente
                          .cambiosSolicitados
                          .montoEstimado
                      }
                      disabled
                    />
                  </div>
                </div>
              )}

            {operacionBookingVisualizando
              .operacionBookingPendiente
              .tipo ===
              "NO_SHOW" && (
              <p>
                El reporte de no-show fue
                enviado a Booking. La
                reserva todavía permanece
                con su estado actual hasta
                que se complete la
                sincronización.
              </p>
            )}

            <p>
              Booking todavía no terminó
              de sincronizar esta
              operación. HostFlow mantiene
              los datos actuales hasta
              recibir la actualización del
              canal.
            </p>

            <p>
              <strong>
                Simulación de integración:
              </strong>{" "}
              el siguiente botón
              representa la posterior
              sincronización que en
              producción realizaríamos con
              Booking.
            </p>

            <div className="form-actions">
              {tienePermiso("integraciones.gestionar") && (<button
                type="button"
                className="primary-button"
                onClick={
                  simularSincronizacionBooking
                }
              >
                Simular sincronización
                Booking
              </button>)}

              <button
                type="button"
                className="secondary-button"
                onClick={
                  cerrarOperacionBooking
                }
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

      {/* =====================================================
          FILTROS
      ====================================================== */}

      {mostrarFiltros && (
        <section className="reservas-filter-card">
        <div className="reservas-filter-header">
          <div>
            <h3>Buscar y filtrar</h3>
            <p>
              Encontrá reservas por huésped,
              propiedad, estado, canal o fecha de ingreso.
            </p>
          </div>

          {cantidadFiltrosActivos > 0 && (
            <span className="reservas-filter-active-badge">
              {cantidadFiltrosActivos}{" "}
              {cantidadFiltrosActivos === 1
                ? "filtro activo"
                : "filtros activos"}
            </span>
          )}
        </div>

        <div className="reservas-filter-grid">
          <label className="reservas-filter-field reservas-filter-field--search">
            <span>Buscar</span>

            <input
              type="search"
              name="busqueda"
              value={filtros.busqueda}
              onChange={cambiarFiltro}
              placeholder="Huésped, propiedad, ID externo..."
            />
          </label>

          <label className="reservas-filter-field">
            <span>Estado</span>

            <select
              name="estado"
              value={filtros.estado}
              onChange={cambiarFiltro}
            >
              <option value="">Todos</option>
              <option value="Pendiente">
                Pendiente
              </option>
              <option value="Confirmada">
                Confirmada
              </option>
              <option value="Finalizada">
                Finalizada
              </option>
              <option value="Cancelada">
                Cancelada
              </option>
              <option value="No show">
                No show
              </option>
            </select>
          </label>

          <label className="reservas-filter-field">
            <span>Canal</span>

            <select
              name="canal"
              value={filtros.canal}
              onChange={cambiarFiltro}
            >
              <option value="">Todos</option>
              <option value="Manual">
                Manual
              </option>
              <option value="Airbnb">
                Airbnb
              </option>
              <option value="Booking">
                Booking
              </option>
            </select>
          </label>

          <label className="reservas-filter-field">
            <span>Propiedad</span>

            <select
              name="propiedad"
              value={filtros.propiedad}
              onChange={cambiarFiltro}
            >
              <option value="">
                Todas
              </option>

              {propiedadesDisponibles.map(
                (propiedad) => (
                  <option
                    key={propiedad}
                    value={propiedad}
                  >
                    {propiedad}
                  </option>
                )
              )}
            </select>
          </label>

          <label className="reservas-filter-field">
            <span>Ingreso desde</span>

            <input
              type="date"
              lang="es-AR"
              name="fechaDesde"
              value={filtros.fechaDesde}
              onChange={cambiarFiltro}
            />
          </label>

          <label className="reservas-filter-field">
            <span>Ingreso hasta</span>

            <input
              type="date"
              lang="es-AR"
              name="fechaHasta"
              value={filtros.fechaHasta}
              onChange={cambiarFiltro}
            />
          </label>
        </div>

        <div className="reservas-filter-footer">
          <p>
            Mostrando{" "}
            <strong>
              {reservasFiltradas.length}
            </strong>{" "}
            de{" "}
            <strong>
              {reservas.length}
            </strong>{" "}
            reservas
          </p>

          <button
            type="button"
            className="reservas-filter-clear"
            onClick={limpiarFiltros}
            disabled={
              cantidadFiltrosActivos === 0
            }
          >
            Limpiar filtros
          </button>
        </div>
        </section>
      )}

      {/* =====================================================
          TABLA
      ====================================================== */}

      <div className="table-card reservas-desktop-list">
        <table>
          <thead>
            <tr>
              <th>
                Huésped
              </th>

              <th>
                Propiedad
              </th>

              <th>
                Canal
              </th>

              <th>
                Ingreso
              </th>

              <th>
                Egreso
              </th>

              <th>
                Monto
              </th>

              <th>
                Estado
              </th>

              <th>
                Acciones
              </th>
            </tr>
          </thead>

          <tbody>
            {reservasFiltradas.map(
              (reserva) => (
                <tr
                  key={
                    reserva.idReserva
                  }
                  id={`reserva-${reserva.idReserva}`}
                  className={
                    Number(
                      reservaDestacada
                    ) ===
                    Number(
                      reserva.idReserva
                    )
                      ? "reserva-destacada"
                      : ""
                  }
                >
                  <td>
                    {
                      reserva.huesped
                    }
                  </td>

                  <td>
                    {
                      reserva.propiedad
                    }
                  </td>

                  <td>
                    {
                      reserva.canal
                    }
                  </td>

                  <td>
                    <div className="reservation-date-with-time">
                      <strong>
                        {formatearFecha(
                          reserva.fechaIngreso
                        )}
                      </strong>
                      <span>
                        {reserva.horaIngreso ||
                          "00:00"}{" "}
                        hs
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="reservation-date-with-time">
                      <strong>
                        {formatearFecha(
                          reserva.fechaEgreso
                        )}
                      </strong>
                      <span>
                        {reserva.horaEgreso ||
                          "00:00"}{" "}
                        hs
                      </span>
                    </div>
                  </td>

                  <td>
                    <ImportesReserva reserva={reserva} puedeVerImportes={tienePermiso('reservas.importes')} />
                  </td>

                  <td>
                    <EstadoReserva estado={reserva.estado} finalizacionPendiente={reserva.finalizacionPendiente} />

                  </td>

                  <td>
                    <div className="table-actions">
                      {/* DETALLE */}

                      {tieneAccion(
                        reserva,
                        "VER"
                      ) && (
                        <button
                          type="button"
                          className="detail-button"
                          onClick={() =>
                            abrirDetalleReserva(
                              reserva
                            )
                          }
                        >
                          Ver detalle
                        </button>
                      )}

                      {/* MANUAL */}

                      {tieneAccion(
                        reserva,
                        "EDITAR"
                      ) && (
                        <button
                          type="button"
                          className="edit-button" disabled={guardandoReserva||altaBloqueada}
                          onClick={() =>
                            abrirEdicion(
                              reserva
                            )
                          }
                        >
                          Editar
                        </button>
                      )}

                      {tieneAccion(
                        reserva,
                        "CANCELAR"
                      ) && (
                        <button
                          type="button"
                          className="cancel-button"
                          disabled={guardandoReserva||altaBloqueada}
                          onClick={() =>
                            cancelarReserva(
                              reserva.idReserva
                            )
                          }
                        >
                          Cancelar
                        </button>
                      )}

                      {/* AIRBNB */}

                      {tieneAccion(
                        reserva,
                        "PROPONER_CAMBIO"
                      ) && (
                        <button
                          type="button"
                          className="channel-button"
                          onClick={() =>
                            abrirPropuestaAirbnb(
                              reserva
                            )
                          }
                        >
                          Proponer cambio
                        </button>
                      )}

                      {tieneAccion(
                        reserva,
                        "VER_PROPUESTA_AIRBNB"
                      ) && (
                        <>
                          <span className="disabled-text">
                            Cambio pendiente
                          </span>

                          <button
                            type="button"
                            className="channel-button"
                            onClick={() =>
                              verPropuestaAirbnb(
                                reserva
                              )
                            }
                          >
                            Ver propuesta
                          </button>
                        </>
                      )}

                      {/* BOOKING */}

                      {tieneAccion(
                        reserva,
                        "GESTIONAR_BOOKING"
                      ) && (
                        <button
                          type="button"
                          className="channel-button"
                          onClick={() =>
                            abrirGestionBooking(
                              reserva
                            )
                          }
                        >
                          Gestionar
                        </button>
                      )}

                      {tieneAccion(
                        reserva,
                        "VER_OPERACION_BOOKING"
                      ) && (
                        <>
                          <span className="disabled-text">
                            Operación pendiente
                          </span>

                          <button
                            type="button"
                            className="channel-button"
                            onClick={() =>
                              verOperacionBooking(
                                reserva
                              )
                            }
                          >
                            Ver operación
                          </button>
                        </>
                      )}

                      {/* ABRIR CANAL */}

                      {tieneAccion(
                        reserva,
                        "ABRIR_EN_CANAL"
                      ) && (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            abrirEnCanal(
                              reserva
                            )
                          }
                        >
                          {
                            reserva.canal
                          }{" "}
                          ↗
                        </button>
                      )}

                    </div>
                  </td>
                </tr>
              )
            )}

            {reservasFiltradas.length === 0 && (
              <tr className="reservas-empty-row">
                <td colSpan="8">
                  <strong>
                    No encontramos reservas.
                  </strong>

                  <span>
                    No hay reservas que coincidan con los filtros seleccionados.
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* =====================================================
          LISTADO MÓVIL
      ====================================================== */}

      <div className="reservas-mobile-list">
        {reservasFiltradas.map(
          (reserva) => (
            <article
              key={`mobile-${reserva.idReserva}`}
              id={`reserva-mobile-${reserva.idReserva}`}
              className={`reservas-mobile-card ${
                Number(
                  reservaDestacada
                ) ===
                Number(
                  reserva.idReserva
                )
                  ? "reservas-mobile-card--highlighted"
                  : ""
              }`}
            >
              <div className="reservas-mobile-card-top">
                <div>
                  <span className="reservas-mobile-id">
                    Reserva #
                    {
                      reserva.idReserva
                    }
                  </span>

                  <h3>
                    {
                      reserva.huesped
                    }
                  </h3>

                  <p>
                    {
                      reserva.propiedad
                    }
                  </p>
                </div>

                <EstadoReserva estado={reserva.estado} finalizacionPendiente={reserva.finalizacionPendiente} />
              </div>

              <div className="reservas-mobile-stay">
                <div>
                  <span>
                    Ingreso
                  </span>

                  <strong>
                    {formatearFecha(
                      reserva.fechaIngreso
                    )}
                  </strong>
                  <small>
                    {reserva.horaIngreso ||
                      "00:00"}{" "}
                    hs
                  </small>
                </div>

                <span className="reservas-mobile-stay-arrow">
                  →
                </span>

                <div>
                  <span>
                    Egreso
                  </span>

                  <strong>
                    {formatearFecha(
                      reserva.fechaEgreso
                    )}
                  </strong>
                  <small>
                    {reserva.horaEgreso ||
                      "00:00"}{" "}
                    hs
                  </small>
                </div>
              </div>

              <div className="reservas-mobile-meta">
                <div>
                  <span>
                    Canal
                  </span>

                  <strong>
                    {
                      reserva.canal
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Monto
                  </span>

                  <strong>
                    <ImportesReserva reserva={reserva} puedeVerImportes={tienePermiso('reservas.importes')} />
                  </strong>
                </div>
              </div>

              <div className="reservas-mobile-actions">
                {tieneAccion(
                  reserva,
                  "VER"
                ) && (
                  <button
                    type="button"
                    className="detail-button"
                    onClick={() =>
                      abrirDetalleReserva(
                        reserva
                      )
                    }
                  >
                    Ver detalle
                  </button>
                )}

                {tieneAccion(
                  reserva,
                  "EDITAR"
                ) && (
                  <button
                    type="button"
                    className="edit-button" disabled={guardandoReserva||altaBloqueada}
                    onClick={() =>
                      abrirEdicion(
                        reserva
                      )
                    }
                  >
                    Editar
                  </button>
                )}

                {tieneAccion(
                  reserva,
                  "CANCELAR"
                ) && (
                  <button
                    type="button"
                    className="cancel-button"
                          disabled={guardandoReserva||altaBloqueada}
                    onClick={() =>
                      cancelarReserva(
                        reserva.idReserva
                      )
                    }
                  >
                    Cancelar
                  </button>
                )}

                {tieneAccion(
                  reserva,
                  "PROPONER_CAMBIO"
                ) && (
                  <button
                    type="button"
                    className="channel-button"
                    onClick={() =>
                      abrirPropuestaAirbnb(
                        reserva
                      )
                    }
                  >
                    Proponer cambio
                  </button>
                )}

                {tieneAccion(
                  reserva,
                  "VER_PROPUESTA_AIRBNB"
                ) && (
                  <>
                    <span className="reservas-mobile-pending">
                      Cambio pendiente
                    </span>

                    <button
                      type="button"
                      className="channel-button"
                      onClick={() =>
                        verPropuestaAirbnb(
                          reserva
                        )
                      }
                    >
                      Ver propuesta
                    </button>
                  </>
                )}

                {tieneAccion(
                  reserva,
                  "GESTIONAR_BOOKING"
                ) && (
                  <button
                    type="button"
                    className="channel-button"
                    onClick={() =>
                      abrirGestionBooking(
                        reserva
                      )
                    }
                  >
                    Gestionar Booking
                  </button>
                )}

                {tieneAccion(
                  reserva,
                  "VER_OPERACION_BOOKING"
                ) && (
                  <>
                    <span className="reservas-mobile-pending">
                      Operación pendiente
                    </span>

                    <button
                      type="button"
                      className="channel-button"
                      onClick={() =>
                        verOperacionBooking(
                          reserva
                        )
                      }
                    >
                      Ver operación
                    </button>
                  </>
                )}

                {tieneAccion(
                  reserva,
                  "ABRIR_EN_CANAL"
                ) && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      abrirEnCanal(
                        reserva
                      )
                    }
                  >
                    {
                      reserva.canal
                    }{" "}
                    ↗
                  </button>
                )}
              </div>
            </article>
          )
        )}

        {reservasFiltradas.length ===
          0 && (
          <div className="reservas-mobile-empty">
            <strong>
              No encontramos reservas.
            </strong>

            <span>
              No hay reservas que coincidan con los filtros seleccionados.
            </span>
          </div>
        )}
      </div>

      {/* =====================================================
          DETALLE DE RESERVA
      ====================================================== */}

      {reservaDetalle &&
        createPortal(
          <div
            className="reservation-detail-overlay"
            onMouseDown={(e) => {
              if (
                e.target ===
                e.currentTarget
              ) {
                cerrarDetalleReserva();
              }
            }}
          >
            <article
              className="reservation-detail-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="reservation-detail-title"
            >
              <header className="reservation-detail-header">
                <div>
                  <span className="reservation-detail-kicker">
                    RESERVA #{reservaDetalle.idReserva}
                  </span>

                  <h3 id="reservation-detail-title">
                    {reservaDetalle.huesped}
                  </h3>

                  <p>
                    {reservaDetalle.propiedad}
                    {" · "}
                    {reservaDetalle.canal}
                  </p>
                </div>

                <div className="reservation-detail-header-actions">
                  <span
                    className={`estado ${String(
                      reservaDetalle.estado
                    )
                      .toLowerCase()
                      .replace(/\s+/g, "-")}`}
                  >
                    {reservaDetalle.estado}
                  </span>

                  <button
                    type="button"
                    className="reservation-detail-close"
                    onClick={cerrarDetalleReserva}
                    aria-label="Cerrar detalle"
                  >
                    ×
                  </button>
                </div>
              </header>

              <div className="reservation-detail-period">
                <div>
                  <span>Ingreso</span>
                  <strong>
                    {formatearFecha(
                      reservaDetalle.fechaIngreso
                    )}
                  </strong>
                  <small className="reservation-detail-time">
                    {reservaDetalle.horaIngreso ||
                      "00:00"}{" "}
                    hs
                  </small>
                </div>

                <div className="reservation-detail-period-arrow">
                  ⟶
                </div>

                <div>
                  <span>Egreso</span>
                  <strong>
                    {formatearFecha(
                      reservaDetalle.fechaEgreso
                    )}
                  </strong>
                  <small className="reservation-detail-time">
                    {reservaDetalle.horaEgreso ||
                      "00:00"}{" "}
                    hs
                  </small>
                </div>

                <div className="reservation-detail-period-summary">
                  <strong>
                    {calcularNoches(
                      reservaDetalle.fechaIngreso,
                      reservaDetalle.fechaEgreso
                    )}
                  </strong>
                  <span>noches</span>
                </div>
              </div>

              <div className="reservation-detail-grid">
                <Suspense fallback={<p role="status">Cargando acuerdo monetario…</p>}><PanelAcuerdoReserva key={reservaDetalle.idReserva} reserva={reservaDetalle} onActualizado={async acuerdo=>{setReservaDetalle(actual=>actual?{...actual,acuerdoMonetario:acuerdo}:actual);await recargarEventosDetalle(reservaDetalle.idReserva);await obtenerReservas();}} /></Suspense>
                <section className="reservation-detail-card">
                  <div className="reservation-detail-card-title">
                    <span className="reservation-detail-icon">⌂</span>
                    <div>
                      <h4>Estadía</h4>
                      <p>
                        Información principal de la reserva.
                      </p>
                    </div>
                  </div>

                  <dl className="reservation-detail-list">
                    <div>
                      <dt>Propiedad</dt>
                      <dd>{reservaDetalle.propiedad}</dd>
                    </div>
                    <div>
                      <dt>Huésped</dt>
                      <dd>{reservaDetalle.huesped}</dd>
                    </div>
                    <div>
                      <dt>Huéspedes</dt>
                      <dd>{reservaDetalle.cantidadHuespedes}</dd>
                    </div>
                    <div>
                      <dt>Estado</dt>
                      <dd>{reservaDetalle.estado}</dd>
                    </div>
                  </dl>
                </section>

                <section className="reservation-detail-card">
                  <div className="reservation-detail-card-title">
                    <span className="reservation-detail-icon">$</span>
                    <div>
                      <h4>Información económica</h4>
                      <p>
                        Estimación de la estadía, separada del acuerdo contractual. No registra cobros.
                      </p>
                    </div>
                  </div>

                  <dl className="reservation-detail-list">
                    <div>
                      <dt>Monto estimado (no contractual)</dt>
                      <dd className="reservation-detail-money">
                        {formatearMonto(
                          reservaDetalle.montoEstimado
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Promedio por noche</dt>
                      <dd>
                        {calcularNoches(
                          reservaDetalle.fechaIngreso,
                          reservaDetalle.fechaEgreso
                        ) > 0
                          ? formatearMonto(
                              Number(
                                reservaDetalle.montoEstimado
                              ) /
                                calcularNoches(
                                  reservaDetalle.fechaIngreso,
                                  reservaDetalle.fechaEgreso
                                )
                            )
                          : "-"}
                      </dd>
                    </div>
                    <div>
                      <dt>Moneda</dt>
                      <dd>{['ARS','USD'].includes(reservaDetalle.monedaAcordada)?reservaDetalle.monedaAcordada:'No declarada'}</dd>
                    </div>
                    <div>
                      <dt>Tipo de gestión</dt>
                      <dd>{reservaDetalle.tipoGestion || "-"}</dd>
                    </div>
                  </dl>
                </section>

                <section className="reservation-detail-card reservation-detail-card--wide">
                  <div className="reservation-detail-card-title">
                    <span className="reservation-detail-icon">↗</span>
                    <div>
                      <h4>Canal e integración</h4>
                      <p>
                        Identificadores y estado de sincronización.
                      </p>
                    </div>
                  </div>

                  <dl className="reservation-detail-list reservation-detail-list--integration">
                    <div>
                      <dt>Canal</dt>
                      <dd>{reservaDetalle.canal}</dd>
                    </div>
                    <div>
                      <dt>ID externo</dt>
                      <dd>
                        {reservaDetalle.idExterno || "Reserva manual"}
                      </dd>
                    </div>
                    <div>
                      <dt>Sincronización</dt>
                      <dd>
                        {reservaDetalle.estadoSincronizacion || "-"}
                      </dd>
                    </div>
                    <div>
                      <dt>ID HostFlow</dt>
                      <dd>#{reservaDetalle.idReserva}</dd>
                    </div>
                  </dl>
                </section>

                <section className="reservation-detail-card reservation-detail-card--wide reservation-timeline-card">
                  <div className="reservation-detail-card-title">
                    <span className="reservation-detail-icon reservation-detail-icon--timeline">
                      ◷
                    </span>

                    <div>
                      <h4>Historial de la reserva</h4>
                      <p>
                        Eventos registrados por HostFlow durante el ciclo de vida de la reserva.
                      </p>
                    </div>
                  </div>

                  {cargandoEventosDetalle ? (
                    <div className="reservation-timeline-state">
                      Cargando historial...
                    </div>
                  ) : errorEventosDetalle ? (
                    <div className="reservation-timeline-state reservation-timeline-state--error">
                      {errorEventosDetalle}
                    </div>
                  ) : eventosDetalle.length === 0 ? (
                    <div className="reservation-timeline-empty">
                      <strong>
                        Todavía no hay eventos registrados.
                      </strong>

                      <span>
                        El historial se registra desde la incorporación del timeline en HostFlow.
                      </span>
                    </div>
                  ) : (
                    <div className="reservation-timeline">
                      {eventosDetalle.map(
                        (
                          evento,
                          indice
                        ) => {
                          const cambios =
                            evento.datosJson
                              ?.camposModificados ||
                            [];

                          return (
                            <article
                              className={`reservation-timeline-item reservation-timeline-item--${obtenerClaseEventoTimeline(
                                evento
                              )}`}
                              key={
                                evento.idEventoReserva
                              }
                            >
                              <div className="reservation-timeline-track">
                                <span className="reservation-timeline-dot" />

                                {indice <
                                  eventosDetalle.length -
                                    1 && (
                                  <span className="reservation-timeline-line" />
                                )}
                              </div>

                              <div className="reservation-timeline-content">
                                <div className="reservation-timeline-top">
                                  <div>
                                    <h5>
                                      {evento.titulo}
                                    </h5>

                                    {evento.descripcion && (
                                      <p>
                                        {evento.descripcion}
                                      </p>
                                    )}
                                  </div>

                                  <time>
                                    {formatearFechaHoraEvento(
                                      evento.fechaEvento
                                    )}
                                  </time>
                                </div>

                                <div className="reservation-timeline-meta">
                                  <span
                                    className={`reservation-timeline-origin reservation-timeline-origin--${obtenerClaseOrigenTimeline(
                                      evento.origen
                                    )}`}
                                  >
                                    {evento.origen}
                                  </span>

                                  <span className="reservation-timeline-type">
                                    {String(
                                      evento.tipo
                                    )
                                      .toLowerCase()
                                      .replace(
                                        /_/g,
                                        " "
                                      )}
                                  </span>
                                </div>

                                {(evento.tipo ===
                                  "RESERVA_CREADA" ||
                                  evento.tipo ===
                                    "RESERVA_RECIBIDA") &&
                                  evento.datosJson && (
                                    <div className="reservation-timeline-summary">
                                      <span>
                                        {evento.datosJson
                                          .propiedad ||
                                          reservaDetalle.propiedad}
                                      </span>

                                      <span>
                                        {evento.datosJson
                                          .cantidadHuespedes ||
                                          reservaDetalle.cantidadHuespedes}{" "}
                                        huésped
                                        {Number(
                                          evento.datosJson
                                            .cantidadHuespedes ||
                                            reservaDetalle.cantidadHuespedes
                                        ) === 1
                                          ? ""
                                          : "es"}
                                      </span>

                                      <span>
                                        {formatearMonto(
                                          evento.datosJson
                                            .montoEstimado ??
                                            reservaDetalle.montoEstimado
                                        )}
                                      </span>
                                    </div>
                                  )}

                                {evento.tipo ===
                                  "RESERVA_MODIFICADA" &&
                                  cambios.length >
                                    0 && (
                                    <div className="reservation-timeline-changes">
                                      {cambios.map(
                                        (
                                          campo
                                        ) => (
                                          <div
                                            key={
                                              campo
                                            }
                                          >
                                            <span>
                                              {nombreCampoEvento(
                                                campo
                                              )}
                                            </span>

                                            <strong>
                                              {formatearValorEvento(
                                                campo,
                                                evento
                                                  .datosJson
                                                  ?.antes
                                                  ?.[
                                                  campo
                                                ]
                                              )}
                                              <em>
                                                →
                                              </em>
                                              {formatearValorEvento(
                                                campo,
                                                evento
                                                  .datosJson
                                                  ?.despues
                                                  ?.[
                                                  campo
                                                ]
                                              )}
                                            </strong>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  )}

                                {(evento.tipo ===
                                  "RESERVA_CANCELADA" ||
                                  evento.tipo ===
                                    "RESERVA_FINALIZADA" ||
                                  evento.tipo ===
                                    "NO_SHOW_CONFIRMADO") &&
                                  evento.datosJson && (
                                    <div className="reservation-timeline-changes">
                                      <div>
                                        <span>
                                          Estado
                                        </span>

                                        <strong>
                                          {evento.datosJson
                                            .estadoAnterior ||
                                            "-"}
                                          <em>
                                            →
                                          </em>
                                          {evento.datosJson
                                            .estadoNuevo ||
                                            (evento.tipo ===
                                            "RESERVA_FINALIZADA"
                                              ? "Finalizada"
                                              : evento.tipo ===
                                                "NO_SHOW_CONFIRMADO"
                                              ? "No show"
                                              : "Cancelada")}
                                        </strong>
                                      </div>
                                    </div>
                                  )}

                                {evento.tipo ===
                                  "CONFLICTO_DETECTADO" &&
                                  evento.datosJson && (
                                    <div className="reservation-timeline-conflict">
                                      <div>
                                        <span>
                                          Período en conflicto
                                        </span>

                                        <strong>
                                          {formatearFecha(
                                            String(
                                              evento.datosJson
                                                .fechaIngreso ||
                                                ""
                                            ).slice(
                                              0,
                                              10
                                            )
                                          )}
                                          <em>
                                            →
                                          </em>
                                          {formatearFecha(
                                            String(
                                              evento.datosJson
                                                .fechaEgreso ||
                                                ""
                                            ).slice(
                                              0,
                                              10
                                            )
                                          )}
                                        </strong>
                                      </div>

                                      <div>
                                        <span>
                                          Canal
                                        </span>

                                        <strong>
                                          {evento.datosJson
                                            .canal ||
                                            "-"}
                                        </strong>
                                      </div>

                                      {evento.datosJson
                                        .contexto && (
                                        <div>
                                          <span>
                                            Detectado durante
                                          </span>

                                          <strong>
                                            {String(
                                              evento.datosJson
                                                .contexto
                                            )
                                              .toLowerCase()
                                              .replace(
                                                /_/g,
                                                " "
                                              )}
                                          </strong>
                                        </div>
                                      )}
                                    </div>
                                  )}
                              </div>
                            </article>
                          );
                        }
                      )}
                    </div>
                  )}
                </section>

                <section className="reservation-detail-card reservation-detail-card--wide reservation-messages-card">
                  <div className="reservation-detail-card-title reservation-messages-title">
                    <span className="reservation-detail-icon reservation-detail-icon--messages">
                      ✉
                    </span>

                    <div>
                      <h4>Mensajes</h4>
                      <p>
                        Conversación y comunicaciones asociadas a esta reserva.
                      </p>
                    </div>

                    <span className="reservation-messages-count">
                      {mensajesDetalle.length}
                    </span>
                  </div>

                  {cargandoMensajesDetalle ? (
                    <div className="reservation-messages-state">
                      Cargando mensajes...
                    </div>
                  ) : errorMensajesDetalle &&
                    mensajesDetalle.length === 0 ? (
                    <div className="reservation-messages-state reservation-messages-state--error">
                      {errorMensajesDetalle}
                    </div>
                  ) : (
                    <>
                      <div className="reservation-messages-list">
                        {mensajesDetalle.length === 0 ? (
                          <div className="reservation-messages-empty">
                            <strong>
                              Todavía no hay mensajes.
                            </strong>

                            <span>
                              Las comunicaciones que registres para esta reserva aparecerán acá.
                            </span>
                          </div>
                        ) : (
                          mensajesDetalle.map(
                            (
                              mensajeReserva
                            ) => {
                              const esSaliente =
                                mensajeReserva.direccion ===
                                "Saliente";

                              return (
                                <div
                                  className={`reservation-message-row ${
                                    esSaliente
                                      ? "reservation-message-row--outgoing"
                                      : "reservation-message-row--incoming"
                                  }`}
                                  key={
                                    mensajeReserva.idMensajeReserva
                                  }
                                >
                                  <div className="reservation-message-bubble">
                                    <div className="reservation-message-meta">
                                      <strong>
                                        {mensajeReserva.remitenteNombre ||
                                          (esSaliente
                                            ? "HostFlow"
                                            : reservaDetalle.huesped)}
                                      </strong>

                                      <span>
                                        {mensajeReserva.origen}
                                      </span>

                                      <time>
                                        {formatearFechaHoraEvento(
                                          mensajeReserva.fechaMensaje
                                        )}
                                      </time>
                                    </div>

                                    <p>
                                      {mensajeReserva.mensaje}
                                    </p>

                                    {esSaliente && (
                                      <div className="reservation-message-status">
                                        {mensajeReserva.estado}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            }
                          )
                        )}
                      </div>

                      {errorMensajesDetalle && (
                        <div className="reservation-messages-inline-error">
                          {errorMensajesDetalle}
                        </div>
                      )}

                      <form
                        className="reservation-message-composer"
                        onSubmit={
                          enviarMensajeDetalle
                        }
                      >
                        <label htmlFor="reservation-message-input">
                          Nuevo mensaje
                        </label>

                        <div className="reservation-message-composer-row">
                          <textarea
                            id="reservation-message-input"
                            value={
                              nuevoMensajeDetalle
                            }
                            onChange={(e) => {
                              setNuevoMensajeDetalle(
                                e.target.value
                              );

                              if (
                                errorMensajesDetalle
                              ) {
                                setErrorMensajesDetalle(
                                  ""
                                );
                              }
                            }}
                            placeholder={`Escribir mensaje para ${reservaDetalle.huesped}...`}
                            maxLength="2000"
                            rows="3"
                          />

                          <button
                            type="submit"
                            className="primary-button reservation-message-send"
                            disabled={
                              enviandoMensajeDetalle ||
                              !nuevoMensajeDetalle.trim()
                            }
                          >
                            {enviandoMensajeDetalle
                              ? "Enviando..."
                              : "Enviar mensaje"}
                          </button>
                        </div>

                        <div className="reservation-message-composer-note">
                          {reservaDetalle.canal ===
                          "Manual"
                            ? "El mensaje queda registrado como comunicación saliente de HostFlow."
                            : `Integración simulada con ${reservaDetalle.canal}: el mensaje queda registrado en HostFlow y no se envía a la plataforma real.`}
                        </div>
                      </form>
                    </>
                  )}
                </section>

                <section className="reservation-detail-card reservation-detail-card--wide reservation-incidents-card">
                  <div className="reservation-detail-card-title reservation-incidents-title">
                    <span className="reservation-detail-icon reservation-detail-icon--incidents">
                      !
                    </span>

                    <div>
                      <h4>Incidencias</h4>
                      <p>
                        Problemas y situaciones operativas registradas durante la estadía.
                      </p>
                    </div>

                    <div className="reservation-incidents-header-actions">
                      <span className="reservation-incidents-count">
                        {
                          incidenciasDetalle.filter(
                            (incidencia) =>
                              incidencia.estado !==
                              "Resuelta"
                          ).length
                        }{" "}
                        abiertas
                      </span>

                      <button
                        type="button"
                        className="reservation-incidents-add"
                        onClick={() => {
                          setMostrarFormularioIncidencia(
                            !mostrarFormularioIncidencia
                          );

                          setErrorIncidenciasDetalle("");
                        }}
                      >
                        {mostrarFormularioIncidencia
                          ? "Cancelar"
                          : "+ Registrar incidencia"}
                      </button>
                    </div>
                  </div>

                  {mostrarFormularioIncidencia && (
                    <form
                      className="reservation-incident-form"
                      onSubmit={
                        registrarIncidenciaDetalle
                      }
                    >
                      <div className="reservation-incident-form-grid">
                        <label>
                          <span>Tipo</span>

                          <select
                            value={
                              formularioIncidencia.tipo
                            }
                            onChange={(e) =>
                              setFormularioIncidencia(
                                (
                                  anterior
                                ) => ({
                                  ...anterior,
                                  tipo:
                                    e.target
                                      .value,
                                })
                              )
                            }
                          >
                            <option value="Check-in">
                              Check-in
                            </option>
                            <option value="Check-out">
                              Check-out
                            </option>
                            <option value="Mantenimiento">
                              Mantenimiento
                            </option>
                            <option value="Limpieza">
                              Limpieza
                            </option>
                            <option value="Daño">
                              Daño
                            </option>
                            <option value="Reclamo">
                              Reclamo
                            </option>
                            <option value="Llaves">
                              Llaves
                            </option>
                            <option value="Otro">
                              Otro
                            </option>
                          </select>
                        </label>

                        <label>
                          <span>Severidad</span>

                          <select
                            value={
                              formularioIncidencia.severidad
                            }
                            onChange={(e) =>
                              setFormularioIncidencia(
                                (
                                  anterior
                                ) => ({
                                  ...anterior,
                                  severidad:
                                    e.target
                                      .value,
                                })
                              )
                            }
                          >
                            <option value="Baja">
                              Baja
                            </option>
                            <option value="Media">
                              Media
                            </option>
                            <option value="Alta">
                              Alta
                            </option>
                            <option value="Critica">
                              Crítica
                            </option>
                          </select>
                        </label>

                        <label className="reservation-incident-form-title">
                          <span>Título</span>

                          <input
                            type="text"
                            value={
                              formularioIncidencia.titulo
                            }
                            onChange={(e) =>
                              setFormularioIncidencia(
                                (
                                  anterior
                                ) => ({
                                  ...anterior,
                                  titulo:
                                    e.target
                                      .value,
                                })
                              )
                            }
                            placeholder="Ej. Problema con el acceso"
                            maxLength="150"
                          />
                        </label>
                      </div>

                      <label className="reservation-incident-form-description">
                        <span>Descripción</span>

                        <textarea
                          value={
                            formularioIncidencia.descripcion
                          }
                          onChange={(e) =>
                            setFormularioIncidencia(
                              (
                                anterior
                              ) => ({
                                ...anterior,
                                descripcion:
                                  e.target
                                    .value,
                              })
                            )
                          }
                          placeholder="Describí qué ocurrió y cualquier dato útil para el seguimiento..."
                          rows="3"
                          maxLength="3000"
                        />
                      </label>

                      <div className="reservation-incident-form-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => {
                            setMostrarFormularioIncidencia(
                              false
                            );

                            setFormularioIncidencia({
                              ...INCIDENCIA_INICIAL,
                            });

                            setErrorIncidenciasDetalle(
                              ""
                            );
                          }}
                        >
                          Cancelar
                        </button>

                        <button
                          type="submit"
                          className="primary-button"
                          disabled={
                            registrandoIncidencia
                          }
                        >
                          {registrandoIncidencia
                            ? "Registrando..."
                            : "Registrar incidencia"}
                        </button>
                      </div>
                    </form>
                  )}

                  {errorIncidenciasDetalle && (
                    <div className="reservation-incidents-inline-error">
                      {errorIncidenciasDetalle}
                    </div>
                  )}

                  {cargandoIncidenciasDetalle ? (
                    <div className="reservation-incidents-state">
                      Cargando incidencias...
                    </div>
                  ) : incidenciasDetalle.length ===
                    0 ? (
                    <div className="reservation-incidents-empty">
                      <strong>
                        Sin incidencias registradas.
                      </strong>

                      <span>
                        Si ocurre algún problema durante la estadía, podés registrarlo acá.
                      </span>
                    </div>
                  ) : (
                    <div className="reservation-incidents-list">
                      {incidenciasDetalle.map(
                        (incidencia) => {
                          const estaResuelta =
                            incidencia.estado ===
                            "Resuelta";

                          const estaProcesando =
                            idIncidenciaProcesando ===
                            incidencia.idIncidenciaReserva;

                          return (
                            <article
                              className={`reservation-incident-item ${
                                estaResuelta
                                  ? "reservation-incident-item--resolved"
                                  : ""
                              }`}
                              key={
                                incidencia.idIncidenciaReserva
                              }
                            >
                              <div className="reservation-incident-top">
                                <div>
                                  <div className="reservation-incident-badges">
                                    <span
                                      className={`reservation-incident-severity reservation-incident-severity--${obtenerClaseSeveridadIncidencia(
                                        incidencia.severidad
                                      )}`}
                                    >
                                      {incidencia.severidad}
                                    </span>

                                    <span
                                      className={`reservation-incident-status ${
                                        estaResuelta
                                          ? "reservation-incident-status--resolved"
                                          : incidencia.estado ===
                                            "En seguimiento"
                                          ? "reservation-incident-status--tracking"
                                          : ""
                                      }`}
                                    >
                                      {incidencia.estado}
                                    </span>

                                    <span className="reservation-incident-type">
                                      {incidencia.tipo}
                                    </span>
                                  </div>

                                  <h5>
                                    {incidencia.titulo}
                                  </h5>
                                </div>

                                <time>
                                  {formatearFechaHoraEvento(
                                    incidencia.fechaIncidencia
                                  )}
                                </time>
                              </div>

                              <p className="reservation-incident-description">
                                {incidencia.descripcion}
                              </p>

                              {incidencia.resolucion && (
                                <div className="reservation-incident-resolution">
                                  <span>
                                    Resolución
                                  </span>

                                  <p>
                                    {incidencia.resolucion}
                                  </p>

                                  {incidencia.fechaResolucion && (
                                    <time>
                                      Resuelta el{" "}
                                      {formatearFechaHoraEvento(
                                        incidencia.fechaResolucion
                                      )}
                                    </time>
                                  )}
                                </div>
                              )}

                              {!estaResuelta && (
                                <div className="reservation-incident-actions">
                                  {incidencia.estado ===
                                    "Abierta" && (
                                    <button
                                      type="button"
                                      className="secondary-button"
                                      disabled={
                                        estaProcesando
                                      }
                                      onClick={() =>
                                        pasarIncidenciaASeguimiento(
                                          incidencia
                                        )
                                      }
                                    >
                                      {estaProcesando
                                        ? "Actualizando..."
                                        : "En seguimiento"}
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    className="reservation-incident-resolve-button"
                                    disabled={
                                      estaProcesando
                                    }
                                    onClick={() =>
                                      iniciarResolucionIncidencia(
                                        incidencia
                                      )
                                    }
                                  >
                                    Resolver
                                  </button>
                                </div>
                              )}

                              {incidenciaResolviendo ===
                                incidencia.idIncidenciaReserva &&
                                !estaResuelta && (
                                  <form
                                    className="reservation-incident-resolution-form"
                                    onSubmit={(e) =>
                                      resolverIncidenciaDetalle(
                                        e,
                                        incidencia
                                      )
                                    }
                                  >
                                    <label>
                                      <span>
                                        ¿Cómo se resolvió?
                                      </span>

                                      <textarea
                                        value={
                                          resolucionIncidencia
                                        }
                                        onChange={(e) =>
                                          setResolucionIncidencia(
                                            e.target
                                              .value
                                          )
                                        }
                                        placeholder="Ej. Se coordinó la entrega de una llave alternativa..."
                                        rows="3"
                                        maxLength="3000"
                                      />
                                    </label>

                                    <div>
                                      <button
                                        type="button"
                                        className="secondary-button"
                                        onClick={
                                          cancelarResolucionIncidencia
                                        }
                                      >
                                        Cancelar
                                      </button>

                                      <button
                                        type="submit"
                                        className="primary-button"
                                        disabled={
                                          estaProcesando
                                        }
                                      >
                                        {estaProcesando
                                          ? "Resolviendo..."
                                          : "Marcar como resuelta"}
                                      </button>
                                    </div>
                                  </form>
                                )}
                            </article>
                          );
                        }
                      )}
                    </div>
                  )}
                </section>

                <section className="reservation-detail-card reservation-detail-card--wide reservation-notes-card">
                  <div className="reservation-detail-card-title reservation-notes-title">
                    <span className="reservation-detail-icon reservation-detail-icon--notes">
                      ✎
                    </span>

                    <div>
                      <h4>Observaciones internas</h4>
                      <p>
                        Notas privadas para la gestión de esta reserva. No se muestran ni se envían al huésped.
                      </p>
                    </div>

                    <div className="reservation-notes-header-actions">
                      <span className="reservation-notes-count">
                        {observacionesDetalle.length}
                      </span>

                      <button
                        type="button"
                        className="reservation-notes-add"
                        onClick={() => {
                          if (
                            mostrarFormularioObservacion
                          ) {
                            cancelarFormularioObservacion();
                          } else {
                            abrirNuevaObservacion();
                          }
                        }}
                      >
                        {mostrarFormularioObservacion
                          ? "Cancelar"
                          : "+ Nueva observación"}
                      </button>
                    </div>
                  </div>

                  {mostrarFormularioObservacion && (
                    <form
                      className="reservation-note-form"
                      onSubmit={
                        guardarObservacionDetalle
                      }
                    >
                      <div className="reservation-note-form-top">
                        <label>
                          <span>Categoría</span>

                          <select
                            value={
                              formularioObservacion.categoria
                            }
                            onChange={(e) =>
                              setFormularioObservacion(
                                (
                                  anterior
                                ) => ({
                                  ...anterior,
                                  categoria:
                                    e.target
                                      .value,
                                })
                              )
                            }
                          >
                            <option value="General">
                              General
                            </option>
                            <option value="Check-in">
                              Check-in
                            </option>
                            <option value="Check-out">
                              Check-out
                            </option>
                            <option value="Cobro">
                              Cobro
                            </option>
                            <option value="Limpieza">
                              Limpieza
                            </option>
                            <option value="Mantenimiento">
                              Mantenimiento
                            </option>
                            <option value="Huesped">
                              Huésped
                            </option>
                            <option value="Otro">
                              Otro
                            </option>
                          </select>
                        </label>

                        {tienePermiso("observaciones.fijar") && (<label className="reservation-note-pin-control">
                          <input
                            type="checkbox"
                            checked={
                              formularioObservacion.fijada
                            }
                            onChange={(e) =>
                              setFormularioObservacion(
                                (
                                  anterior
                                ) => ({
                                  ...anterior,
                                  fijada:
                                    e.target
                                      .checked,
                                })
                              )
                            }
                          />

                          <span>
                            Fijar como importante
                          </span>
                        </label>)}
                      </div>

                      <label className="reservation-note-form-text">
                        <span>
                          Observación
                        </span>

                        <textarea
                          value={
                            formularioObservacion.observacion
                          }
                          onChange={(e) =>
                            setFormularioObservacion(
                              (
                                anterior
                              ) => ({
                                ...anterior,
                                observacion:
                                  e.target
                                    .value,
                              })
                            )
                          }
                          placeholder="Ej. Prefiere coordinar el check-in con anticipación..."
                          rows="3"
                          maxLength="3000"
                        />
                      </label>

                      <div className="reservation-note-form-footer">
                        <span>
                          {observacionEditando
                            ? "Editando observación"
                            : "Nota interna de HostFlow"}
                        </span>

                        <div>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={
                              cancelarFormularioObservacion
                            }
                          >
                            Cancelar
                          </button>

                          <button
                            type="submit"
                            className="primary-button"
                            disabled={
                              guardandoObservacion
                            }
                          >
                            {guardandoObservacion
                              ? "Guardando..."
                              : observacionEditando
                              ? "Guardar cambios"
                              : "Guardar observación"}
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  {errorObservacionesDetalle && (
                    <div className="reservation-notes-inline-error">
                      {errorObservacionesDetalle}
                    </div>
                  )}

                  {cargandoObservacionesDetalle ? (
                    <div className="reservation-notes-state">
                      Cargando observaciones...
                    </div>
                  ) : observacionesDetalle.length ===
                    0 ? (
                    <div className="reservation-notes-empty">
                      <strong>
                        Todavía no hay observaciones internas.
                      </strong>

                      <span>
                        Podés guardar recordatorios y datos operativos sin mezclarlos con los mensajes del huésped.
                      </span>
                    </div>
                  ) : (
                    <div className="reservation-notes-list">
                      {observacionesDetalle.map(
                        (observacion) => {
                          const procesando =
                            idObservacionProcesando ===
                            observacion.idObservacionReserva;

                          return (
                            <article
                              className={`reservation-note-item ${
                                observacion.fijada
                                  ? "reservation-note-item--pinned"
                                  : ""
                              }`}
                              key={
                                observacion.idObservacionReserva
                              }
                            >
                              <div className="reservation-note-top">
                                <div className="reservation-note-meta">
                                  {observacion.fijada && (
                                    <span className="reservation-note-pinned-badge">
                                      Fijada
                                    </span>
                                  )}

                                  <span className="reservation-note-category">
                                    {observacion.categoria}
                                  </span>
                                </div>

                                <time>
                                  {formatearFechaHoraEvento(
                                    observacion.fechaCreacion
                                  )}
                                </time>
                              </div>

                              <p className="reservation-note-text">
                                {observacion.observacion}
                              </p>

                              <div className="reservation-note-bottom">
                                <span>
                                  {observacion.autorNombre ||
                                    "HostFlow"}
                                </span>

                                <div className="reservation-note-actions">
                                  {tienePermiso("observaciones.fijar") && (<button
                                    type="button"
                                    disabled={
                                      procesando
                                    }
                                    onClick={() =>
                                      cambiarFijadaObservacionDetalle(
                                        observacion
                                      )
                                    }
                                  >
                                    {observacion.fijada
                                      ? "Desfijar"
                                      : "Fijar"}
                                  </button>)}

                                  {tienePermiso("observaciones.modificar") && (<button
                                    type="button"
                                    disabled={
                                      procesando
                                    }
                                    onClick={() =>
                                      editarObservacionDetalle(
                                        observacion
                                      )
                                    }
                                  >
                                    Editar
                                  </button>)}

                                  {tienePermiso("observaciones.eliminar") && (<button
                                    type="button"
                                    className="reservation-note-delete"
                                    disabled={
                                      procesando
                                    }
                                    onClick={() =>
                                      eliminarObservacionDetalle(
                                        observacion
                                      )
                                    }
                                  >
                                    {procesando
                                      ? "Procesando..."
                                      : "Eliminar"}
                                  </button>)}
                                </div>
                              </div>
                            </article>
                          );
                        }
                      )}
                    </div>
                  )}
                </section>
              </div>

              <footer className="reservation-detail-footer">
                <div className="reservation-detail-footer-note">
                  <strong>Registro operativo</strong>
                  <span>
                    Los eventos históricos anteriores a la incorporación del timeline no se reconstruyen artificialmente.
                  </span>
                </div>

                <div className="reservation-detail-footer-actions">
                  {tieneAccion(
                    reservaDetalle,
                    "ABRIR_EN_CANAL"
                  ) && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        abrirEnCanal(
                          reservaDetalle
                        )
                      }
                    >
                      {reservaDetalle.canal} ↗
                    </button>
                  )}

                  <button
                    type="button"
                    className="primary-button"
                    onClick={cerrarDetalleReserva}
                  >
                    Cerrar
                  </button>
                </div>
              </footer>
            </article>
          </div>,
          document.body
        )}

    </section>
  );
}

export default Reservas;
