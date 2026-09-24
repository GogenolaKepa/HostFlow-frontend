import {
  useEffect,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import api from "../services/api";

function Propiedades() {
  // =========================================================
  // ESTADOS GENERALES
  // =========================================================

  const [
    canalPublicando,
    setCanalPublicando,
  ] = useState(null);

  const [
    canalSincronizando,
    setCanalSincronizando,
  ] = useState(null);

  const [
    propiedades,
    setPropiedades,
  ] = useState([]);

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    cargandoDetalle,
    setCargandoDetalle,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    mensaje,
    setMensaje,
  ] = useState("");

  const [
    mostrarFormulario,
    setMostrarFormulario,
  ] = useState(false);

  const [
    idPropiedadEditando,
    setIdPropiedadEditando,
  ] = useState(null);

  const [
    propiedadSeleccionada,
    setPropiedadSeleccionada,
  ] = useState(null);

  // =========================================================
  // GALERÍA
  // =========================================================

  const [
    imagenes,
    setImagenes,
  ] = useState([]);

  const [
    imagenesEliminadas,
    setImagenesEliminadas,
  ] = useState([]);

  const [
    mostrarImagenesEliminadas,
    setMostrarImagenesEliminadas,
  ] = useState(false);

  const [
    cargandoImagenes,
    setCargandoImagenes,
  ] = useState(false);

  const [
    mostrarFormularioImagen,
    setMostrarFormularioImagen,
  ] = useState(false);

  const [
    imagenProcesando,
    setImagenProcesando,
  ] = useState(null);

  const [
    metodoAgregarImagen,
    setMetodoAgregarImagen,
  ] = useState(
    "dispositivo"
  );

  const [
    archivosImagen,
    setArchivosImagen,
  ] = useState([]);

  const [
    imagenPrevisualizando,
    setImagenPrevisualizando,
  ] = useState(null);

  const formularioImagenInicial = {
    urlImagen: "",
    descripcion: "",
  };

  const [
    formularioImagen,
    setFormularioImagen,
  ] = useState(
    formularioImagenInicial
  );

  // =========================================================
  // FORMULARIO PROPIEDAD
  // =========================================================

  const formularioInicial = {
    nombre: "",
    tipo: "Departamento",
    direccion: "",
    ciudad: "",
    provincia: "",
    capacidadMaxima: "2",
    precioBase: "50000",
    estado: "Activa",
  };

  const [
    formulario,
    setFormulario,
  ] = useState(
    formularioInicial
  );

  // =========================================================
  // INICIO
  // =========================================================

  useEffect(() => {
    obtenerPropiedades();
  }, []);

  useEffect(() => {
    if (!imagenPrevisualizando) {
      return undefined;
    }

    const cerrarConEscape = (e) => {
      if (e.key === "Escape") {
        setImagenPrevisualizando(null);
      }
    };

    const overflowAnterior =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    window.addEventListener(
      "keydown",
      cerrarConEscape
    );

    return () => {
      window.removeEventListener(
        "keydown",
        cerrarConEscape
      );

      document.body.style.overflow =
        overflowAnterior;
    };
  }, [imagenPrevisualizando]);

  // =========================================================
  // OBTENER PROPIEDADES
  // =========================================================

  const obtenerPropiedades =
    async () => {
      try {
        setError("");

        const response =
          await api.get(
            "/propiedades"
          );

        setPropiedades(
          response.data.propiedades
        );
      } catch (error) {
        setError(
          "No se pudieron obtener las propiedades."
        );
      } finally {
        setCargando(false);
      }
    };

  // =========================================================
  // OBTENER GALERÍA
  // =========================================================

  const obtenerImagenes =
    async (
      idPropiedad
    ) => {
      try {
        setCargandoImagenes(
          true
        );

        const [
          activasResponse,
          todasResponse,
        ] =
          await Promise.all([
            api.get(
              `/propiedades/${idPropiedad}/imagenes`
            ),

            api.get(
              `/propiedades/${idPropiedad}/imagenes/todas`
            ),
          ]);

        setImagenes(
          activasResponse.data
            .imagenes || []
        );

        const todas =
          todasResponse.data
            .imagenes || [];

        setImagenesEliminadas(
          todas.filter(
            (imagen) =>
              imagen.estado !==
              "Activa"
          )
        );
      } catch (error) {
        setError(
          error.response?.data
            ?.mensaje ||
            "No se pudo obtener la galería de imágenes."
        );
      } finally {
        setCargandoImagenes(
          false
        );
      }
    };

  // =========================================================
  // RECARGAR DETALLE + GALERÍA
  // =========================================================

  const recargarDetallePropiedad =
    async (
      idPropiedad
    ) => {
      const [
        detalleResponse,
        imagenesResponse,
        todasImagenesResponse,
      ] =
        await Promise.all([
          api.get(
            `/propiedades/${idPropiedad}`
          ),

          api.get(
            `/propiedades/${idPropiedad}/imagenes`
          ),

          api.get(
            `/propiedades/${idPropiedad}/imagenes/todas`
          ),
        ]);

      setPropiedadSeleccionada(
        detalleResponse.data
          .propiedad
      );

      setImagenes(
        imagenesResponse.data
          .imagenes || []
      );

      const todas =
        todasImagenesResponse.data
          .imagenes || [];

      setImagenesEliminadas(
        todas.filter(
          (imagen) =>
            imagen.estado !==
            "Activa"
        )
      );

      /*
       * También refrescamos el listado.
       *
       * Esto hace que si cambia la portada,
       * al volver a Propiedades ya aparezca
       * la nueva imagen principal.
       */
      await obtenerPropiedades();
    };

  // =========================================================
  // VER DETALLE
  // =========================================================

  const verDetallePropiedad =
    async (
      idPropiedad
    ) => {
      try {
        setError("");
        setMensaje("");
        setCargandoDetalle(
          true
        );

        const response =
          await api.get(
            `/propiedades/${idPropiedad}`
          );

        setPropiedadSeleccionada(
          response.data.propiedad
        );

        setMostrarFormulario(
          false
        );

        setIdPropiedadEditando(
          null
        );

        setMostrarFormularioImagen(
          false
        );

        setFormularioImagen(
          formularioImagenInicial
        );

        setMetodoAgregarImagen(
          "dispositivo"
        );

        setArchivosImagen([]);

        setMostrarImagenesEliminadas(
          false
        );

        await obtenerImagenes(
          idPropiedad
        );

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      } catch (error) {
        setError(
          error.response?.data
            ?.mensaje ||
            "No se pudo obtener el detalle de la propiedad."
        );
      } finally {
        setCargandoDetalle(
          false
        );
      }
    };

  const volverAPropiedades =
    () => {
      setPropiedadSeleccionada(
        null
      );

      setImagenes([]);

      setImagenesEliminadas([]);

      setMostrarImagenesEliminadas(
        false
      );

      setMostrarFormularioImagen(
        false
      );

      setFormularioImagen(
        formularioImagenInicial
      );

      setMetodoAgregarImagen(
        "dispositivo"
      );

      setArchivosImagen([]);

      setError("");
      setMensaje("");
    };

  // =========================================================
  // FORMULARIO PROPIEDAD
  // =========================================================

  const manejarCambio =
    (
      e
    ) => {
      const {
        name,
        value,
      } = e.target;

      setFormulario(
        (
          anterior
        ) => ({
          ...anterior,
          [name]: value,
        })
      );
    };

  const limpiarFormulario =
    () => {
      setFormulario(
        formularioInicial
      );

      setIdPropiedadEditando(
        null
      );

      setMostrarFormulario(
        false
      );
    };

  const abrirFormularioNuevaPropiedad =
    () => {
      setMensaje("");
      setError("");

      setPropiedadSeleccionada(
        null
      );

      setIdPropiedadEditando(
        null
      );

      setFormulario(
        formularioInicial
      );

      setMostrarFormulario(
        true
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    };

  // =========================================================
  // EDITAR PROPIEDAD
  // =========================================================

  const editarPropiedad =
    (
      propiedad
    ) => {
      setMensaje("");
      setError("");

      setPropiedadSeleccionada(
        null
      );

      setImagenes([]);

      setMostrarFormularioImagen(
        false
      );

      setMetodoAgregarImagen(
        "dispositivo"
      );

      setArchivosImagen([]);

      setIdPropiedadEditando(
        propiedad.idPropiedad
      );

      setFormulario({
        nombre:
          propiedad.nombre ||
          "",

        tipo:
          propiedad.tipo ||
          "Departamento",

        direccion:
          propiedad.direccion ||
          "",

        ciudad:
          propiedad.ciudad ||
          "",

        provincia:
          propiedad.provincia ||
          "",

        capacidadMaxima:
          String(
            propiedad
              .capacidadMaxima ||
              1
          ),

        precioBase:
          String(
            propiedad.precioBase ||
              ""
          ),

        estado:
          propiedad.estado ===
          "En mantenimiento"
            ? "Mantenimiento"
            : propiedad.estado ||
              "Activa",
      });

      setMostrarFormulario(
        true
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    };

  // =========================================================
  // GUARDAR PROPIEDAD
  // =========================================================

  const guardarPropiedad =
    async (
      e
    ) => {
      e.preventDefault();

      setError("");
      setMensaje("");

      const datosPropiedad = {
        nombre:
          formulario.nombre.trim(),

        tipo:
          formulario.tipo,

        direccion:
          formulario.direccion.trim(),

        ciudad:
          formulario.ciudad.trim(),

        provincia:
          formulario.provincia.trim(),

        capacidadMaxima:
          Number(
            formulario
              .capacidadMaxima
          ),

        precioBase:
          Number(
            formulario
              .precioBase
          ),

        estado:
          formulario.estado,
      };

      try {
        if (
          idPropiedadEditando
        ) {
          await api.put(
            `/propiedades/${idPropiedadEditando}`,
            datosPropiedad
          );

          setMensaje(
            "Propiedad modificada correctamente."
          );
        } else {
          await api.post(
            "/propiedades",
            datosPropiedad
          );

          setMensaje(
            "Propiedad registrada correctamente."
          );
        }

        limpiarFormulario();

        await obtenerPropiedades();
      } catch (error) {
        setError(
          error.response?.data
            ?.mensaje ||
            "No se pudo guardar la propiedad."
        );
      }
    };

  // =========================================================
  // FORMULARIO IMAGEN
  // =========================================================

  const manejarCambioImagen =
    (
      e
    ) => {
      const {
        name,
        value,
      } = e.target;

      setFormularioImagen(
        (
          anterior
        ) => ({
          ...anterior,
          [name]: value,
        })
      );
    };

  const abrirFormularioImagen =
    () => {
      setError("");
      setMensaje("");

      setFormularioImagen(
        formularioImagenInicial
      );

      setMetodoAgregarImagen(
        "dispositivo"
      );

      setArchivosImagen([]);

      setMostrarFormularioImagen(
        true
      );
    };

  const cancelarFormularioImagen =
    () => {
      setFormularioImagen(
        formularioImagenInicial
      );

      setMetodoAgregarImagen(
        "dispositivo"
      );

      setArchivosImagen([]);

      setMostrarFormularioImagen(
        false
      );
    };

  const cambiarMetodoAgregarImagen =
    (
      metodo
    ) => {
      setError("");
      setMensaje("");

      setMetodoAgregarImagen(
        metodo
      );

      setFormularioImagen(
        formularioImagenInicial
      );

      setArchivosImagen([]);
    };

  const manejarSeleccionArchivosImagen =
    (
      e
    ) => {
      const archivos =
        Array.from(
          e.target.files ||
            []
        );

      if (
        archivos.length >
        20
      ) {
        setArchivosImagen([]);

        e.target.value =
          "";

        setError(
          "Podés seleccionar hasta 20 imágenes por vez."
        );

        return;
      }

      const tiposPermitidos = [
        "image/jpeg",
        "image/png",
        "image/webp",
      ];

      const archivoNoPermitido =
        archivos.find(
          (archivo) =>
            !tiposPermitidos.includes(
              archivo.type
            )
        );

      if (
        archivoNoPermitido
      ) {
        setArchivosImagen([]);

        e.target.value =
          "";

        setError(
          `El archivo "${archivoNoPermitido.name}" no es válido. Solo se permiten JPG, PNG o WEBP.`
        );

        return;
      }

      const tamanioMaximo =
        8 * 1024 * 1024;

      const archivoMuyGrande =
        archivos.find(
          (archivo) =>
            archivo.size >
            tamanioMaximo
        );

      if (
        archivoMuyGrande
      ) {
        setArchivosImagen([]);

        e.target.value =
          "";

        setError(
          `El archivo "${archivoMuyGrande.name}" supera el máximo de 8 MB.`
        );

        return;
      }

      setError("");

      setArchivosImagen(
        archivos
      );
    };

  // =========================================================
  // AGREGAR IMAGEN MEDIANTE URL
  // =========================================================

  const agregarImagen =
    async (
      e
    ) => {
      e.preventDefault();

      if (
        !propiedadSeleccionada
      ) {
        return;
      }

      try {
        setError("");
        setMensaje("");

        setImagenProcesando(
          "nueva"
        );

        const response =
          await api.post(
            `/propiedades/${propiedadSeleccionada.idPropiedad}/imagenes`,
            {
              urlImagen:
                formularioImagen
                  .urlImagen
                  .trim(),

              descripcion:
                formularioImagen
                  .descripcion
                  .trim(),

              origen:
                "Manual",
            }
          );

        setMensaje(
          response.data.mensaje ||
            "Imagen agregada correctamente."
        );

        setFormularioImagen(
          formularioImagenInicial
        );

        setMostrarFormularioImagen(
          false
        );

        await recargarDetallePropiedad(
          propiedadSeleccionada
            .idPropiedad
        );
      } catch (error) {
        setError(
          error.response?.data
            ?.mensaje ||
            "No se pudo agregar la imagen."
        );
      } finally {
        setImagenProcesando(
          null
        );
      }
    };

  // =========================================================
  // SUBIR IMÁGENES DESDE DISPOSITIVO
  // =========================================================

  const subirImagenesDesdeDispositivo =
    async (
      e
    ) => {
      e.preventDefault();

      if (
        !propiedadSeleccionada
      ) {
        return;
      }

      if (
        archivosImagen.length ===
        0
      ) {
        setError(
          "Seleccioná al menos una imagen para subir."
        );

        return;
      }

      try {
        setError("");
        setMensaje("");

        setImagenProcesando(
          "subiendo"
        );

        const datos =
          new FormData();

        archivosImagen.forEach(
          (
            archivo
          ) => {
            datos.append(
              "imagenes",
              archivo
            );
          }
        );

        const descripcion =
          formularioImagen
            .descripcion
            .trim();

        if (descripcion) {
          datos.append(
            "descripcion",
            descripcion
          );
        }

        const response =
          await api.post(
            `/propiedades/${propiedadSeleccionada.idPropiedad}/imagenes/upload`,
            datos
          );

        setMensaje(
          response.data.mensaje ||
            "Imágenes subidas correctamente."
        );

        setFormularioImagen(
          formularioImagenInicial
        );

        setArchivosImagen([]);

        setMostrarFormularioImagen(
          false
        );

        await recargarDetallePropiedad(
          propiedadSeleccionada
            .idPropiedad
        );
      } catch (error) {
        setError(
          error.response?.data
            ?.mensaje ||
            "No se pudieron subir las imágenes seleccionadas."
        );
      } finally {
        setImagenProcesando(
          null
        );
      }
    };

  // =========================================================
  // ESTABLECER IMAGEN PRINCIPAL
  // =========================================================

  const establecerImagenPrincipal =
    async (
      imagen
    ) => {
      if (
        !propiedadSeleccionada ||
        imagen.esPrincipal
      ) {
        return;
      }

      try {
        setError("");
        setMensaje("");

        setImagenProcesando(
          imagen.idPropiedadImagen
        );

        const response =
          await api.patch(
            `/propiedades/${propiedadSeleccionada.idPropiedad}/imagenes/${imagen.idPropiedadImagen}/principal`
          );

        setMensaje(
          response.data.mensaje ||
            "Imagen principal actualizada correctamente."
        );

        await recargarDetallePropiedad(
          propiedadSeleccionada
            .idPropiedad
        );
      } catch (error) {
        setError(
          error.response?.data
            ?.mensaje ||
            "No se pudo establecer la imagen principal."
        );
      } finally {
        setImagenProcesando(
          null
        );
      }
    };

  // =========================================================
  // ELIMINAR IMAGEN
  // =========================================================

  const eliminarImagen =
    async (
      imagen
    ) => {
      if (
        !propiedadSeleccionada
      ) {
        return;
      }

      const confirmar =
        window.confirm(
          "¿Querés eliminar esta imagen de la propiedad?"
        );

      if (!confirmar) {
        return;
      }

      try {
        setError("");
        setMensaje("");

        setImagenProcesando(
          imagen.idPropiedadImagen
        );

        const response =
          await api.delete(
            `/propiedades/${propiedadSeleccionada.idPropiedad}/imagenes/${imagen.idPropiedadImagen}`
          );

        setMensaje(
          response.data.mensaje ||
            "Imagen eliminada correctamente."
        );

        await recargarDetallePropiedad(
          propiedadSeleccionada
            .idPropiedad
        );
      } catch (error) {
        setError(
          error.response?.data
            ?.mensaje ||
            "No se pudo eliminar la imagen."
        );
      } finally {
        setImagenProcesando(
          null
        );
      }
    };

  // =========================================================
  // RESTAURAR IMAGEN
  // =========================================================

  const restaurarImagen =
    async (
      imagen
    ) => {
      if (
        !propiedadSeleccionada ||
        imagen.estado !==
          "Eliminada"
      ) {
        return;
      }

      try {
        setError("");
        setMensaje("");

        setImagenProcesando(
          imagen.idPropiedadImagen
        );

        const response =
          await api.patch(
            `/propiedades/${propiedadSeleccionada.idPropiedad}/imagenes/${imagen.idPropiedadImagen}/restaurar`
          );

        setMensaje(
          response.data.mensaje ||
            "Imagen restaurada correctamente."
        );

        await recargarDetallePropiedad(
          propiedadSeleccionada
            .idPropiedad
        );
      } catch (error) {
        setError(
          error.response?.data
            ?.mensaje ||
            "No se pudo restaurar la imagen."
        );
      } finally {
        setImagenProcesando(
          null
        );
      }
    };

  // =========================================================
  // FORMATO FECHAS
  // =========================================================

  const formatearFecha =
    (
      fecha
    ) => {
      if (!fecha) {
        return "";
      }

      const [
        anio,
        mes,
        dia,
      ] =
        fecha.split("-");

      return `${dia}/${mes}/${anio}`;
    };

  const formatearFechaHora =
    (
      fecha
    ) => {
      if (!fecha) {
        return "Sin sincronizaciones";
      }

      return new Date(
        fecha
      ).toLocaleString(
        "es-AR",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    };

  // =========================================================
  // RESOLVER URL DE IMÁGENES
  // =========================================================
  //
  // Las imágenes subidas desde un dispositivo pueden haber
  // quedado guardadas con una URL local del equipo que hizo
  // la carga, por ejemplo:
  //
  // http://localhost:4000/uploads/...
  // http://192.168.x.x:4000/uploads/...
  //
  // Eso funciona en ese equipo, pero no necesariamente desde
  // otro dispositivo de la red. Para archivos locales de
  // HostFlow reconstruimos siempre la URL usando el origen
  // actual del backend.
  //
  // Las URLs externas (por ejemplo una imagen https pública)
  // se conservan sin cambios.
  // =========================================================

  const resolverUrlImagen =
    (
      urlImagen
    ) => {
      if (!urlImagen) {
        return "";
      }

      const valor =
        String(
          urlImagen
        ).trim();

      if (!valor) {
        return "";
      }

      let origenApi;

      try {
        origenApi =
          new URL(
            api.defaults.baseURL,
            window.location.origin
          ).origin;
      } catch {
        origenApi =
          `${window.location.protocol}//${window.location.hostname}:4000`;
      }

      try {
        const url =
          new URL(
            valor,
            origenApi
          );

        const host =
          url.hostname;

        const hostLocal =
          host === "localhost" ||
          host === "127.0.0.1" ||
          host === "::1" ||
          /^10\./.test(
            host
          ) ||
          /^192\.168\./.test(
            host
          ) ||
          /^172\.(1[6-9]|2\d|3[01])\./.test(
            host
          );

        const esArchivoLocalHostFlow =
          url.pathname.includes(
            "/uploads/"
          );

        if (
          hostLocal &&
          esArchivoLocalHostFlow
        ) {
          return `${origenApi}${url.pathname}${url.search}${url.hash}`;
        }

        /*
         * Si el backend más adelante devuelve rutas relativas
         * como /uploads/archivo.jpg, también quedan resueltas
         * contra el backend y no contra Vite (:5173).
         */
        const eraRutaRelativa =
          !/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(
            valor
          );

        if (
          eraRutaRelativa &&
          esArchivoLocalHostFlow
        ) {
          return `${origenApi}${url.pathname}${url.search}${url.hash}`;
        }

        return url.href;
      } catch {
        return valor;
      }
    };

  // =========================================================
  // IMAGEN PRINCIPAL
  // =========================================================

  const renderizarImagenPropiedad =
    (
      propiedad,
      detalle = false
    ) => {
      if (
        !propiedad
          .imagenPrincipal
      ) {
        return (
          <span
            aria-label="Propiedad sin imagen"
            role="img"
          >
            🏠
          </span>
        );
      }

      return (
        <>
          <img
            src={resolverUrlImagen(
              propiedad
                .imagenPrincipal
            )}
            alt={
              propiedad
                .descripcionImagenPrincipal ||
              `Foto de ${propiedad.nombre}`
            }
            loading={
              detalle
                ? "eager"
                : "lazy"
            }
            style={{
              width: "100%",
              height: "100%",
              objectFit:
                "cover",
              display:
                "block",
            }}
            onError={(
              event
            ) => {
              event.currentTarget
                .style.display =
                "none";

              const fallback =
                event.currentTarget
                  .nextElementSibling;

              if (
                fallback
              ) {
                fallback.style.display =
                  "flex";
              }
            }}
          />

          <span
            aria-label="Imagen no disponible"
            role="img"
            style={{
              display:
                "none",
              width:
                "100%",
              height:
                "100%",
              alignItems:
                "center",
              justifyContent:
                "center",
            }}
          >
            🏠
          </span>
        </>
      );
    };

  // =========================================================
  // ESTADO OPERATIVO
  // =========================================================

  const obtenerClaseEstado =
    (
      estado
    ) => {
      if (
        estado ===
        "Activa"
      ) {
        return "activa";
      }

      if (
        estado ===
          "Mantenimiento" ||
        estado ===
          "En mantenimiento"
      ) {
        return "mantenimiento";
      }

      if (
        estado ===
        "Inactiva"
      ) {
        return "inactiva";
      }

      return "";
    };

  // =========================================================
  // SITUACIÓN
  // =========================================================

  const obtenerClaseSituacion =
    (
      situacion
    ) => {
      if (
        situacion ===
        "Disponible"
      ) {
        return "activa";
      }

      if (
        situacion ===
        "Ocupada"
      ) {
        return "mantenimiento";
      }

      if (
        situacion ===
        "Reservada"
      ) {
        return "mantenimiento";
      }

      if (
        situacion ===
        "No disponible"
      ) {
        return "inactiva";
      }

      return "";
    };

  // =========================================================
  // INFORMACIÓN DE RESERVAS
  // =========================================================

  const renderizarSituacionReserva =
    (
      propiedad
    ) => {
      if (
        propiedad.situacion ===
        "No disponible"
      ) {
        return (
          <div className="property-reservation-info">
            <strong>
              No disponible para
              nuevas reservas
            </strong>

            <span>
              Estado operativo:{" "}
              {
                propiedad.estado
              }
            </span>
          </div>
        );
      }

      if (
        propiedad.situacion ===
          "Ocupada" &&
        propiedad.huespedActual
      ) {
        return (
          <div className="property-reservation-info">
            <strong>
              Huésped actual:{" "}
              {
                propiedad
                  .huespedActual
              }
            </strong>

            <span>
              Ingreso:{" "}
              {formatearFecha(
                propiedad
                  .fechaIngresoActual
              )}
            </span>

            <span>
              Salida:{" "}
              {formatearFecha(
                propiedad
                  .fechaEgresoActual
              )}
            </span>

            {propiedad.proximoHuesped && (
              <>
                <strong>
                  Próxima reserva
                </strong>

                <span>
                  {
                    propiedad
                      .proximoHuesped
                  }
                </span>

                <span>
                  Ingreso:{" "}
                  {formatearFecha(
                    propiedad
                      .proximaFechaIngreso
                  )}
                </span>
              </>
            )}
          </div>
        );
      }

      if (
        propiedad.proximoHuesped &&
        propiedad.proximaFechaIngreso
      ) {
        return (
          <div className="property-reservation-info">
            <span>
              Disponible actualmente
            </span>

            <strong>
              Próxima reserva:{" "}
              {
                propiedad
                  .proximoHuesped
              }
            </strong>

            <span>
              Ingreso:{" "}
              {formatearFecha(
                propiedad
                  .proximaFechaIngreso
              )}
            </span>

            {propiedad.proximaFechaEgreso && (
              <span>
                Salida:{" "}
                {formatearFecha(
                  propiedad
                    .proximaFechaEgreso
                )}
              </span>
            )}
          </div>
        );
      }

      return (
        <div className="property-reservation-info">
          <span>
            Disponible actualmente
          </span>

          <span>
            Sin reservas próximas
          </span>
        </div>
      );
    };

  // =========================================================
  // PUBLICAR EN CANAL
  // =========================================================

  const publicarEnCanal =
    async (
      propiedad,
      canal
    ) => {
      try {
        setError("");
        setMensaje("");

        setCanalPublicando(
          canal
        );

        const response =
          await api.post(
            `/propiedades/${propiedad.idPropiedad}/canales/publicar`,
            {
              canal,
            }
          );

        setMensaje(
          response.data.mensaje ||
            `Propiedad publicada correctamente en ${canal}.`
        );

        const detalleResponse =
          await api.get(
            `/propiedades/${propiedad.idPropiedad}`
          );

        setPropiedadSeleccionada(
          detalleResponse.data
            .propiedad
        );
      } catch (error) {
        setError(
          error.response?.data
            ?.mensaje ||
            `No se pudo publicar la propiedad en ${canal}.`
        );
      } finally {
        setCanalPublicando(
          null
        );
      }
    };

  // =========================================================
  // SINCRONIZAR MANUALMENTE UN CANAL
  // =========================================================

  const sincronizarCanal =
    async (
      propiedad,
      canal
    ) => {
      try {
        setError("");
        setMensaje("");

        setCanalSincronizando(
          canal
        );

        const response =
          await api.post(
            `/propiedades/${propiedad.idPropiedad}/canales/sincronizar`,
            {
              canal,
            }
          );

        setMensaje(
          response.data.mensaje ||
            `Propiedad sincronizada correctamente con ${canal}.`
        );

        /*
         * Recargamos detalle completo para que
         * se actualicen inmediatamente:
         *
         * - Estado de sincronización
         * - Última sincronización
         * - Mensaje de error
         * - Datos generales de la propiedad
         */
        await recargarDetallePropiedad(
          propiedad.idPropiedad
        );
      } catch (error) {
        setError(
          error.response?.data
            ?.mensaje ||
            `No se pudo sincronizar la propiedad con ${canal}.`
        );

        /*
         * Aunque haya error, refrescamos para
         * mostrar el estado Error persistido en Azure.
         */
        try {
          const detalleResponse =
            await api.get(
              `/propiedades/${propiedad.idPropiedad}`
            );

          setPropiedadSeleccionada(
            detalleResponse.data
              .propiedad
          );
        } catch (
          errorRecarga
        ) {
          console.error(
            "No se pudo recargar el detalle después del error de sincronización:",
            errorRecarga
          );
        }
      } finally {
        setCanalSincronizando(
          null
        );
      }
    };

  // =========================================================
  // CANALES
  // =========================================================

  const renderizarCanales =
    (
      propiedad
    ) => {
      const canales =
        propiedad.canales ||
        [];

      return (
        <div className="property-channels-section">
          <div className="property-channels-header">
            <div>
              <h4>
                Canales de publicación
              </h4>

              <p>
                Administrá la presencia
                de esta propiedad en los
                canales externos.
              </p>
            </div>
          </div>

          <div className="property-channels-grid">
            {canales.map(
              (
                canal
              ) => {
                const publicada =
                  canal.estadoPublicacion ===
                  "Publicada";

                const pendiente =
                  canal.estadoPublicacion ===
                  "Pendiente";

                const tieneError =
                  canal.estadoPublicacion ===
                    "Error" ||
                  canal.estadoSincronizacion ===
                    "Error";

                return (
                  <div
                    className="property-channel-card"
                    key={
                      canal.idCanalReserva
                    }
                  >
                    <div className="property-channel-title">
                      <strong>
                        {
                          canal.canal
                        }
                      </strong>

                      <span
                        className={`channel-status ${
                          publicada
                            ? "published"
                            : pendiente
                            ? "pending"
                            : tieneError
                            ? "error"
                            : "unpublished"
                        }`}
                      >
                        {
                          canal
                            .estadoPublicacion
                        }
                      </span>
                    </div>

                    {canal.idExterno ? (
                      <span className="property-channel-id">
                        ID externo:{" "}
                        {
                          canal.idExterno
                        }
                      </span>
                    ) : (
                      <span className="property-channel-id">
                        Sin ID externo
                      </span>
                    )}

                    <div className="property-channel-sync">
                      <span>
                        Sincronización:{" "}
                        <strong>
                          {
                            canal
                              .estadoSincronizacion
                          }
                        </strong>
                      </span>

                      <span>
                        Última sincronización:{" "}
                        {formatearFechaHora(
                          canal
                            .ultimaSincronizacion
                        )}
                      </span>
                    </div>

                    {canal.mensajeError && (
                      <div className="property-channel-error">
                        {
                          canal
                            .mensajeError
                        }
                      </div>
                    )}

                    <div className="property-channel-actions">
                      {!publicada &&
                        !pendiente && (
                          <button
                            type="button"
                            className="primary-button"
                            onClick={() =>
                              publicarEnCanal(
                                propiedad,
                                canal.canal
                              )
                            }
                            disabled={
                              canalPublicando !==
                                null ||
                              canalSincronizando !==
                                null
                            }
                          >
                            {canalPublicando ===
                            canal.canal
                              ? "Publicando..."
                              : `Publicar en ${canal.canal}`}
                          </button>
                        )}

                      {pendiente && (
                        <button
                          type="button"
                          className="secondary-button"
                          disabled
                        >
                          Publicación pendiente
                        </button>
                      )}

                      {publicada && (
                        <button
                          type="button"
                          className="property-channel-sync-button"
                          onClick={() =>
                            sincronizarCanal(
                              propiedad,
                              canal.canal
                            )
                          }
                          disabled={
                            canalSincronizando !==
                              null ||
                            canalPublicando !==
                              null
                          }
                        >
                          {canalSincronizando ===
                          canal.canal
                            ? "Sincronizando..."
                            : "Sincronizar ahora"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      );
    };

  // =========================================================
  // GALERÍA
  // =========================================================

  const renderizarGaleria =
    (
      propiedad
    ) => {
      return (
        <div className="property-gallery-section">
          <div className="property-channels-header">
            <div>
              <h4>
                Galería de imágenes
              </h4>

              <p>
                Administrá las fotos de
                esta propiedad y elegí
                cuál querés usar como
                portada.
              </p>
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={
                abrirFormularioImagen
              }
              disabled={
                mostrarFormularioImagen
              }
            >
              + Agregar imagen
            </button>
          </div>

          {mostrarFormularioImagen && (
            <div className="form-card">
              <h3>
                Agregar imágenes
              </h3>

              <div
                className="form-actions"
                style={{
                  marginTop: 0,
                  marginBottom: "18px",
                }}
              >
                <button
                  type="button"
                  className={
                    metodoAgregarImagen ===
                    "dispositivo"
                      ? "primary-button"
                      : "secondary-button"
                  }
                  onClick={() =>
                    cambiarMetodoAgregarImagen(
                      "dispositivo"
                    )
                  }
                  disabled={
                    imagenProcesando !==
                    null
                  }
                >
                  Desde dispositivo
                </button>

                <button
                  type="button"
                  className={
                    metodoAgregarImagen ===
                    "url"
                      ? "primary-button"
                      : "secondary-button"
                  }
                  onClick={() =>
                    cambiarMetodoAgregarImagen(
                      "url"
                    )
                  }
                  disabled={
                    imagenProcesando !==
                    null
                  }
                >
                  Por URL
                </button>
              </div>

              {metodoAgregarImagen ===
                "dispositivo" && (
                <form
                  onSubmit={
                    subirImagenesDesdeDispositivo
                  }
                >
                  <div className="form-grid">
                    <div>
                      <label>
                        Seleccionar imágenes
                      </label>

                      <label
                        htmlFor="property-image-upload"
                        className={`property-upload-area ${
                          imagenProcesando ===
                          "subiendo"
                            ? "disabled"
                            : ""
                        }`}
                      >
                        <input
                          id="property-image-upload"
                          className="property-upload-input"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          onChange={
                            manejarSeleccionArchivosImagen
                          }
                          disabled={
                            imagenProcesando ===
                            "subiendo"
                          }
                        />

                        <span className="property-upload-content">
                          <strong className="property-upload-title">
                            {archivosImagen.length >
                            0
                              ? archivosImagen.length ===
                                1
                                ? "1 imagen seleccionada"
                                : `${archivosImagen.length} imágenes seleccionadas`
                              : "Elegir imágenes del dispositivo"}
                          </strong>

                          <span className="property-upload-action">
                            {archivosImagen.length >
                            0
                              ? "Cambiar"
                              : "Seleccionar"}
                          </span>
                        </span>
                      </label>

                      <span className="property-upload-hint">
                        JPG, PNG o WEBP · hasta 20 imágenes · máximo 8 MB por archivo.
                      </span>
                    </div>

                    <div>
                      <label>
                        Descripción
                        opcional
                      </label>

                      <input
                        type="text"
                        name="descripcion"
                        value={
                          formularioImagen
                            .descripcion
                        }
                        onChange={
                          manejarCambioImagen
                        }
                        placeholder="Se aplicará a todas las imágenes seleccionadas"
                        disabled={
                          imagenProcesando ===
                          "subiendo"
                        }
                      />
                    </div>
                  </div>

                  {archivosImagen.length >
                    0 && (
                    <div className="property-upload-selected">
                      <strong>
                        {archivosImagen.length ===
                        1
                          ? "1 imagen lista para subir"
                          : `${archivosImagen.length} imágenes listas para subir`}
                      </strong>

                      <span className="property-upload-files">
                        {archivosImagen
                          .slice(
                            0,
                            4
                          )
                          .map(
                            (
                              archivo
                            ) =>
                              archivo.name
                          )
                          .join(
                            ", "
                          )}
                        {archivosImagen.length >
                        4
                          ? ` y ${
                              archivosImagen.length -
                              4
                            } más`
                          : ""}
                      </span>
                    </div>
                  )}

                  <div className="form-actions">
                    <button
                      type="submit"
                      className="primary-button"
                      disabled={
                        imagenProcesando ===
                          "subiendo" ||
                        archivosImagen.length ===
                          0
                      }
                    >
                      {imagenProcesando ===
                      "subiendo"
                        ? "Subiendo..."
                        : archivosImagen.length >
                          1
                        ? `Subir ${archivosImagen.length} imágenes`
                        : "Subir imagen"}
                    </button>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={
                        cancelarFormularioImagen
                      }
                      disabled={
                        imagenProcesando ===
                        "subiendo"
                      }
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              {metodoAgregarImagen ===
                "url" && (
                <form
                  onSubmit={
                    agregarImagen
                  }
                >
                  <div className="form-grid">
                    <div>
                      <label>
                        URL de la imagen
                      </label>

                      <input
                        type="url"
                        name="urlImagen"
                        value={
                          formularioImagen
                            .urlImagen
                        }
                        onChange={
                          manejarCambioImagen
                        }
                        placeholder="https://..."
                        required
                        disabled={
                          imagenProcesando ===
                          "nueva"
                        }
                      />
                    </div>

                    <div>
                      <label>
                        Descripción
                      </label>

                      <input
                        type="text"
                        name="descripcion"
                        value={
                          formularioImagen
                            .descripcion
                        }
                        onChange={
                          manejarCambioImagen
                        }
                        placeholder="Ej: Living principal"
                        disabled={
                          imagenProcesando ===
                          "nueva"
                        }
                      />
                    </div>
                  </div>

                  <div className="form-actions">
                    <button
                      type="submit"
                      className="primary-button"
                      disabled={
                        imagenProcesando ===
                        "nueva"
                      }
                    >
                      {imagenProcesando ===
                      "nueva"
                        ? "Agregando..."
                        : "Agregar imagen"}
                    </button>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={
                        cancelarFormularioImagen
                      }
                      disabled={
                        imagenProcesando ===
                        "nueva"
                      }
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {cargandoImagenes && (
            <p>
              Cargando imágenes...
            </p>
          )}

          {!cargandoImagenes &&
            imagenes.length ===
              0 && (
              <div className="property-reservation-info">
                <strong>
                  Esta propiedad todavía
                  no tiene imágenes.
                </strong>

                <span>
                  Podés agregar la primera
                  foto desde HostFlow.
                </span>
              </div>
            )}

          {!cargandoImagenes &&
            imagenes.length >
              0 && (
              <div className="property-gallery-grid">
                {imagenes.map(
                  (
                    imagen
                  ) => (
                    <div
                      className="property-gallery-card"
                      key={
                        imagen.idPropiedadImagen
                      }
                    >
                      <div
                        className="property-gallery-image"
                        role="button"
                        tabIndex="0"
                        title="Abrir vista previa"
                        aria-label={`Abrir vista previa de ${
                          imagen.descripcion ||
                          `imagen de ${propiedad.nombre}`
                        }`}
                        onClick={() =>
                          setImagenPrevisualizando(
                            imagen
                          )
                        }
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" ||
                            e.key === " "
                          ) {
                            e.preventDefault();

                            setImagenPrevisualizando(
                              imagen
                            );
                          }
                        }}
                      >
                        <img
                          src={resolverUrlImagen(
                            imagen.urlImagen
                          )}
                          alt={
                            imagen.descripcion ||
                            `Imagen de ${propiedad.nombre}`
                          }
                          loading="lazy"
                        />

                        {imagen.esPrincipal && (
                          <span className="property-gallery-main-badge">
                            ★ Principal
                          </span>
                        )}
                      </div>

                      <div className="property-gallery-info">
                        <strong>
                          {imagen.descripcion ||
                            "Sin descripción"}
                        </strong>

                        <span className="property-gallery-meta">
                          Origen:{" "}
                          {
                            imagen.origen
                          }{" "}
                          · Orden{" "}
                          {
                            imagen.orden
                          }
                        </span>
                      </div>

                      <div className="property-gallery-actions">
                        {!imagen.esPrincipal && (
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() =>
                              establecerImagenPrincipal(
                                imagen
                              )
                            }
                            disabled={
                              imagenProcesando ===
                              imagen.idPropiedadImagen
                            }
                          >
                            Portada
                          </button>
                        )}

                        {imagen.esPrincipal && (
                          <button
                            type="button"
                            className="secondary-button"
                            disabled
                          >
                            Principal
                          </button>
                        )}

                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            eliminarImagen(
                              imagen
                            )
                          }
                          disabled={
                            imagenProcesando ===
                            imagen.idPropiedadImagen
                          }
                        >
                          {imagenProcesando ===
                          imagen.idPropiedadImagen
                            ? "Procesando..."
                            : "Eliminar"}
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

          {!cargandoImagenes &&
            imagenesEliminadas.length >
              0 && (
              <div className="property-gallery-archive">
                <button
                  type="button"
                  className="property-gallery-archive-toggle"
                  onClick={() =>
                    setMostrarImagenesEliminadas(
                      (anterior) =>
                        !anterior
                    )
                  }
                >
                  <span>
                    Fotos eliminadas
                  </span>

                  <strong>
                    {imagenesEliminadas.length}
                  </strong>

                  <span>
                    {mostrarImagenesEliminadas
                      ? "Ocultar"
                      : "Ver"}
                  </span>
                </button>

                {mostrarImagenesEliminadas && (
                  <div className="property-gallery-grid property-gallery-grid-archived">
                    {imagenesEliminadas.map(
                      (imagen) => (
                        <div
                          className="property-gallery-card property-gallery-card-archived"
                          key={
                            imagen.idPropiedadImagen
                          }
                        >
                          <div
                            className="property-gallery-image"
                            role="button"
                            tabIndex="0"
                            title="Abrir vista previa"
                            onClick={() =>
                              setImagenPrevisualizando(
                                imagen
                              )
                            }
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" ||
                                e.key === " "
                              ) {
                                e.preventDefault();

                                setImagenPrevisualizando(
                                  imagen
                                );
                              }
                            }}
                          >
                            <img
                              src={resolverUrlImagen(
                                imagen.urlImagen
                              )}
                              alt={
                                imagen.descripcion ||
                                `Imagen eliminada de ${propiedad.nombre}`
                              }
                              loading="lazy"
                            />

                            <span className="property-gallery-archived-badge">
                              {imagen.estado ===
                              "PendienteEliminacion"
                                ? "Pendiente"
                                : "Eliminada"}
                            </span>
                          </div>

                          <div className="property-gallery-info">
                            <strong>
                              {imagen.descripcion ||
                                "Sin descripción"}
                            </strong>

                            <span className="property-gallery-meta">
                              Origen: {imagen.origen} · Orden {imagen.orden}
                            </span>
                          </div>

                          <div className="property-gallery-actions">
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() =>
                                restaurarImagen(
                                  imagen
                                )
                              }
                              disabled={
                                imagen.estado !==
                                  "Eliminada" ||
                                imagenProcesando ===
                                  imagen.idPropiedadImagen
                              }
                            >
                              {imagenProcesando ===
                              imagen.idPropiedadImagen
                                ? "Restaurando..."
                                : imagen.estado ===
                                  "PendienteEliminacion"
                                ? "Pendiente"
                                : "Restaurar"}
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )}

          {imagenPrevisualizando &&
            createPortal(
            <div
              className="property-image-preview-backdrop"
              onClick={() =>
                setImagenPrevisualizando(
                  null
                )
              }
              role="presentation"
            >
              <div
                className="property-image-preview-modal"
                role="dialog"
                aria-modal="true"
                aria-label="Vista previa de imagen"
                onClick={(e) =>
                  e.stopPropagation()
                }
              >
                <button
                  type="button"
                  className="property-image-preview-close"
                  onClick={() =>
                    setImagenPrevisualizando(
                      null
                    )
                  }
                  aria-label="Cerrar vista previa"
                  title="Cerrar"
                >
                  ×
                </button>

                <div className="property-image-preview-media">
                  <img
                    src={resolverUrlImagen(
                      imagenPrevisualizando
                        .urlImagen
                    )}
                    alt={
                      imagenPrevisualizando
                        .descripcion ||
                      `Imagen de ${propiedad.nombre}`
                    }
                  />
                </div>

                <div className="property-image-preview-info">
                  <div>
                    <strong>
                      {imagenPrevisualizando
                        .descripcion ||
                        "Sin descripción"}
                    </strong>

                    <span>
                      Origen: {
                        imagenPrevisualizando
                          .origen
                      } · Orden {
                        imagenPrevisualizando
                          .orden
                      }
                    </span>
                  </div>

                  {imagenPrevisualizando
                    .esPrincipal && (
                    <span className="property-image-preview-main">
                      ★ Principal
                    </span>
                  )}
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>
      );
    };

  // =========================================================
  // DETALLE
  // =========================================================

  const renderizarDetallePropiedad =
    () => {
      const propiedad =
        propiedadSeleccionada;

      const fechaAlta =
        propiedad.fechaCreacion
          ? new Date(
              propiedad.fechaCreacion
            ).toLocaleDateString(
              "es-AR",
              {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }
            )
          : "Sin dato";

      const tieneReservaActual =
        Boolean(
          propiedad.idReservaActual
        );

      const tieneProximaReserva =
        Boolean(
          propiedad.idProximaReserva
        );

      return (
        <div className="property-detail-view">
          <section className="property-detail-hero">
            <div className="property-detail-cover">
              {renderizarImagenPropiedad(
                propiedad,
                true
              )}

              <span className="property-detail-cover-label">
                Imagen principal
              </span>
            </div>

            <div className="property-detail-hero-content">
              <div className="property-detail-topline">
                <button
                  type="button"
                  className="property-detail-back"
                  onClick={
                    volverAPropiedades
                  }
                >
                  ← Volver a propiedades
                </button>

                <div className="property-statuses">
                  <span
                    className={`estado ${obtenerClaseEstado(
                      propiedad.estado
                    )}`}
                  >
                    {propiedad.estado}
                  </span>

                  <span
                    className={`estado ${obtenerClaseSituacion(
                      propiedad.situacion
                    )}`}
                  >
                    {
                      propiedad.situacion
                    }
                  </span>
                </div>
              </div>

              <span className="property-detail-eyebrow">
                PROPIEDAD #
                {propiedad.idPropiedad}
              </span>

              <h3>
                {propiedad.nombre}
              </h3>

              <p className="property-detail-location">
                {propiedad.direccion}
                {" · "}
                {propiedad.ciudad}
                {propiedad.provincia
                  ? `, ${propiedad.provincia}`
                  : ""}
              </p>

              <div className="property-detail-summary">
                <div>
                  <span>Tipo</span>
                  <strong>
                    {propiedad.tipo ||
                      "No especificado"}
                  </strong>
                </div>

                <div>
                  <span>Capacidad</span>
                  <strong>
                    {
                      propiedad.capacidadMaxima
                    }{" "}
                    huésped
                    {Number(
                      propiedad.capacidadMaxima
                    ) === 1
                      ? ""
                      : "es"}
                  </strong>
                </div>

                <div>
                  <span>Precio base</span>
                  <strong className="property-detail-price">
                    $
                    {Number(
                      propiedad.precioBase
                    ).toLocaleString(
                      "es-AR"
                    )}
                  </strong>
                </div>

                <div>
                  <span>Alta en HostFlow</span>
                  <strong>
                    {fechaAlta}
                  </strong>
                </div>
              </div>

              <div className="property-detail-hero-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() =>
                    editarPropiedad(
                      propiedad
                    )
                  }
                >
                  Editar propiedad
                </button>
              </div>
            </div>
          </section>

          <div className="property-detail-main-grid">
            <section className="property-detail-panel">
              <div className="property-detail-section-heading">
                <span className="property-detail-section-icon">
                  ⌂
                </span>

                <div>
                  <h4>
                    Información general
                  </h4>

                  <p>
                    Datos principales registrados para el inmueble.
                  </p>
                </div>
              </div>

              <div className="property-detail-data-list">
                <div>
                  <span>
                    Nombre
                  </span>

                  <strong>
                    {propiedad.nombre}
                  </strong>
                </div>

                <div>
                  <span>
                    Dirección
                  </span>

                  <strong>
                    {propiedad.direccion}
                  </strong>
                </div>

                <div>
                  <span>
                    Ciudad
                  </span>

                  <strong>
                    {propiedad.ciudad}
                  </strong>
                </div>

                <div>
                  <span>
                    Provincia
                  </span>

                  <strong>
                    {propiedad.provincia ||
                      "No especificada"}
                  </strong>
                </div>

                <div>
                  <span>
                    Tipo
                  </span>

                  <strong>
                    {propiedad.tipo ||
                      "No especificado"}
                  </strong>
                </div>

                <div>
                  <span>
                    Capacidad máxima
                  </span>

                  <strong>
                    {
                      propiedad.capacidadMaxima
                    }{" "}
                    huésped
                    {Number(
                      propiedad.capacidadMaxima
                    ) === 1
                      ? ""
                      : "es"}
                  </strong>
                </div>
              </div>
            </section>

            <section className="property-detail-panel">
              <div className="property-detail-section-heading">
                <span className="property-detail-section-icon property-detail-section-icon--status">
                  ◉
                </span>

                <div>
                  <h4>
                    Estado operativo
                  </h4>

                  <p>
                    Situación actual y disponibilidad de la propiedad.
                  </p>
                </div>
              </div>

              <div className="property-detail-operational">
                <div className="property-detail-operational-row">
                  <span>
                    Estado
                  </span>

                  <strong>
                    {propiedad.estado}
                  </strong>
                </div>

                <div className="property-detail-operational-row">
                  <span>
                    Situación
                  </span>

                  <strong>
                    {
                      propiedad.situacion
                    }
                  </strong>
                </div>

                <div className="property-detail-operational-row">
                  <span>
                    Precio base
                  </span>

                  <strong className="property-detail-price">
                    $
                    {Number(
                      propiedad.precioBase
                    ).toLocaleString(
                      "es-AR"
                    )}
                  </strong>
                </div>

                <div className="property-detail-operational-note">
                  {propiedad.situacion ===
                  "No disponible"
                    ? "La propiedad no está disponible para recibir nuevas reservas mientras mantenga su estado operativo actual."
                    : propiedad.situacion ===
                      "Ocupada"
                    ? "La propiedad se encuentra actualmente ocupada por una reserva activa."
                    : propiedad.situacion ===
                      "Reservada"
                    ? "La propiedad está libre actualmente, pero ya tiene una próxima reserva."
                    : "La propiedad se encuentra disponible y sin una reserva activa en este momento."}
                </div>
              </div>
            </section>
          </div>

          <section className="property-detail-panel property-detail-stays-panel">
            <div className="property-detail-section-heading">
              <span className="property-detail-section-icon property-detail-section-icon--calendar">
                ◷
              </span>

              <div>
                <h4>
                  Reservas y ocupación
                </h4>

                <p>
                  Estado de la estadía actual y próxima reserva registrada.
                </p>
              </div>
            </div>

            <div className="property-detail-stays-grid">
              <article
                className={`property-detail-stay-card ${
                  tieneReservaActual
                    ? "property-detail-stay-card--active"
                    : ""
                }`}
              >
                <div className="property-detail-stay-header">
                  <div>
                    <span>
                      Estadía actual
                    </span>

                    <strong>
                      {tieneReservaActual
                        ? `Reserva #${propiedad.idReservaActual}`
                        : "Sin ocupación actual"}
                    </strong>
                  </div>

                  <span
                    className={`property-detail-stay-status ${
                      tieneReservaActual
                        ? "active"
                        : "empty"
                    }`}
                  >
                    {tieneReservaActual
                      ? "Ocupada"
                      : "Libre"}
                  </span>
                </div>

                {tieneReservaActual ? (
                  <div className="property-detail-stay-body">
                    <div>
                      <span>
                        Huésped
                      </span>

                      <strong>
                        {propiedad.huespedActual ||
                          "Sin dato"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Ingreso
                      </span>

                      <strong>
                        {formatearFecha(
                          propiedad.fechaIngresoActual
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Egreso
                      </span>

                      <strong>
                        {formatearFecha(
                          propiedad.fechaEgresoActual
                        )}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <p className="property-detail-stay-empty">
                    No hay huéspedes alojados actualmente.
                  </p>
                )}
              </article>

              <article
                className={`property-detail-stay-card ${
                  tieneProximaReserva
                    ? "property-detail-stay-card--next"
                    : ""
                }`}
              >
                <div className="property-detail-stay-header">
                  <div>
                    <span>
                      Próxima reserva
                    </span>

                    <strong>
                      {tieneProximaReserva
                        ? `Reserva #${propiedad.idProximaReserva}`
                        : "Sin reserva próxima"}
                    </strong>
                  </div>

                  <span
                    className={`property-detail-stay-status ${
                      tieneProximaReserva
                        ? "next"
                        : "empty"
                    }`}
                  >
                    {tieneProximaReserva
                      ? "Programada"
                      : "Sin fecha"}
                  </span>
                </div>

                {tieneProximaReserva ? (
                  <div className="property-detail-stay-body">
                    <div>
                      <span>
                        Huésped
                      </span>

                      <strong>
                        {propiedad.proximoHuesped ||
                          "Sin dato"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Ingreso
                      </span>

                      <strong>
                        {formatearFecha(
                          propiedad.proximaFechaIngreso
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Egreso
                      </span>

                      <strong>
                        {formatearFecha(
                          propiedad.proximaFechaEgreso
                        )}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <p className="property-detail-stay-empty">
                    No hay reservas futuras registradas para esta propiedad.
                  </p>
                )}
              </article>
            </div>
          </section>

          <section className="property-detail-panel property-detail-management-panel">
            {renderizarGaleria(
              propiedad
            )}
          </section>

          <section className="property-detail-panel property-detail-management-panel">
            {renderizarCanales(
              propiedad
            )}
          </section>

          <div className="property-detail-footer">
            <button
              type="button"
              className="secondary-button"
              onClick={
                volverAPropiedades
              }
            >
              Volver a propiedades
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={() =>
                editarPropiedad(
                  propiedad
                )
              }
            >
              Editar propiedad
            </button>
          </div>
        </div>
      );
    };

  // =========================================================
  // CARGANDO
  // =========================================================

  if (cargando) {
    return (
      <h2>
        Cargando propiedades...
      </h2>
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <section className="propiedades-page">
      <div className="section-header">
        <div>
          <h2>
            {propiedadSeleccionada
              ? "Detalle de propiedad"
              : "Gestión de propiedades"}
          </h2>

          <p>
            {propiedadSeleccionada
              ? "Información operativa de la propiedad."
              : "Listado de inmuebles registrados en HostFlow."}
          </p>
        </div>

        {!propiedadSeleccionada && (
          <button
            className="primary-button"
            onClick={
              abrirFormularioNuevaPropiedad
            }
          >
            Nueva propiedad
          </button>
        )}
      </div>

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

      {cargandoDetalle && (
        <div className="form-card">
          <h3>
            Cargando detalle...
          </h3>
        </div>
      )}

      {!cargandoDetalle &&
        propiedadSeleccionada &&
        renderizarDetallePropiedad()}

      {!cargandoDetalle &&
        !propiedadSeleccionada && (
          <>
            {mostrarFormulario && (
              <form
                className="form-card"
                onSubmit={
                  guardarPropiedad
                }
              >
                <h3>
                  {idPropiedadEditando
                    ? "Editar propiedad"
                    : "Registrar nueva propiedad"}
                </h3>

                <div className="form-grid">
                  <div>
                    <label>
                      Nombre
                    </label>

                    <input
                      type="text"
                      name="nombre"
                      value={
                        formulario.nombre
                      }
                      placeholder="Ej: Depto Pellegrini"
                      onChange={
                        manejarCambio
                      }
                      required
                    />
                  </div>

                  <div>
                    <label>
                      Tipo
                    </label>

                    <select
                      name="tipo"
                      value={
                        formulario.tipo
                      }
                      onChange={
                        manejarCambio
                      }
                    >
                      <option value="Departamento">
                        Departamento
                      </option>

                      <option value="Casa">
                        Casa
                      </option>

                      <option value="Loft">
                        Loft
                      </option>

                      <option value="Monoambiente">
                        Monoambiente
                      </option>
                    </select>
                  </div>

                  <div>
                    <label>
                      Dirección
                    </label>

                    <input
                      type="text"
                      name="direccion"
                      value={
                        formulario.direccion
                      }
                      placeholder="Ej: Av. Pellegrini 1500"
                      onChange={
                        manejarCambio
                      }
                      required
                    />
                  </div>

                  <div>
                    <label>
                      Ciudad
                    </label>

                    <input
                      type="text"
                      name="ciudad"
                      value={
                        formulario.ciudad
                      }
                      placeholder="Ej: Rosario"
                      onChange={
                        manejarCambio
                      }
                      required
                    />
                  </div>

                  <div>
                    <label>
                      Provincia
                    </label>

                    <input
                      type="text"
                      name="provincia"
                      value={
                        formulario.provincia
                      }
                      placeholder="Ej: Santa Fe"
                      onChange={
                        manejarCambio
                      }
                      required
                    />
                  </div>

                  <div>
                    <label>
                      Capacidad máxima
                    </label>

                    <input
                      type="number"
                      name="capacidadMaxima"
                      value={
                        formulario
                          .capacidadMaxima
                      }
                      min="1"
                      step="1"
                      onChange={
                        manejarCambio
                      }
                      required
                    />
                  </div>

                  <div>
                    <label>
                      Precio base
                    </label>

                    <input
                      type="number"
                      name="precioBase"
                      value={
                        formulario
                          .precioBase
                      }
                      min="1"
                      step="0.01"
                      onChange={
                        manejarCambio
                      }
                      required
                    />
                  </div>

                  <div>
                    <label>
                      Estado
                    </label>

                    <select
                      name="estado"
                      value={
                        formulario.estado
                      }
                      onChange={
                        manejarCambio
                      }
                    >
                      <option value="Activa">
                        Activa
                      </option>

                      <option value="Mantenimiento">
                        Mantenimiento
                      </option>

                      <option value="Inactiva">
                        Inactiva
                      </option>
                    </select>
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="primary-button"
                  >
                    {idPropiedadEditando
                      ? "Guardar cambios"
                      : "Guardar propiedad"}
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={
                      limpiarFormulario
                    }
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            <div className="properties-grid">
              {propiedades.map(
                (
                  propiedad
                ) => (
                  <div
                    className="property-card"
                    key={
                      propiedad
                        .idPropiedad
                    }
                  >
                    <div className="property-image">
                      {renderizarImagenPropiedad(
                        propiedad
                      )}
                    </div>

                    <div className="property-info">
                      <div className="property-title">
                        <h3>
                          {
                            propiedad.nombre
                          }
                        </h3>

                        <div className="property-statuses">
                          <span
                            className={`estado ${obtenerClaseEstado(
                              propiedad.estado
                            )}`}
                          >
                            {
                              propiedad.estado
                            }
                          </span>

                          <span
                            className={`estado ${obtenerClaseSituacion(
                              propiedad.situacion
                            )}`}
                          >
                            {
                              propiedad
                                .situacion
                            }
                          </span>
                        </div>
                      </div>

                      <p>
                        {
                          propiedad.direccion
                        }
                      </p>

                      <p>
                        {
                          propiedad.ciudad
                        }
                        {propiedad.provincia
                          ? `, ${propiedad.provincia}`
                          : ""}
                      </p>

                      <div className="property-details">
                        <span>
                          Tipo:{" "}
                          {propiedad.tipo ||
                            "No especificado"}
                        </span>

                        <span>
                          Capacidad:{" "}
                          {
                            propiedad
                              .capacidadMaxima
                          }{" "}
                          huéspedes
                        </span>

                        <span>
                          Precio base: $
                          {Number(
                            propiedad
                              .precioBase
                          ).toLocaleString(
                            "es-AR"
                          )}
                        </span>
                      </div>

                      {renderizarSituacionReserva(
                        propiedad
                      )}

                      <div className="property-actions">
                        <button
                          className="secondary-button"
                          onClick={() =>
                            editarPropiedad(
                              propiedad
                            )
                          }
                        >
                          Editar
                        </button>

                        <button
                          className="primary-button"
                          onClick={() =>
                            verDetallePropiedad(
                              propiedad
                                .idPropiedad
                            )
                          }
                        >
                          Ver detalle
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </>
        )}
    </section>
  );
}

export default Propiedades;