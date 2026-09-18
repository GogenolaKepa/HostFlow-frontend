import {
  useEffect,
  useState,
} from "react";

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

        const response =
          await api.get(
            `/propiedades/${idPropiedad}/imagenes`
          );

        setImagenes(
          response.data.imagenes ||
            []
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
      ] =
        await Promise.all([
          api.get(
            `/propiedades/${idPropiedad}`
          ),

          api.get(
            `/propiedades/${idPropiedad}/imagenes`
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

      setMostrarFormularioImagen(
        false
      );

      setFormularioImagen(
        formularioImagenInicial
      );

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

      setMostrarFormularioImagen(
        true
      );
    };

  const cancelarFormularioImagen =
    () => {
      setFormularioImagen(
        formularioImagenInicial
      );

      setMostrarFormularioImagen(
        false
      );
    };

  // =========================================================
  // AGREGAR IMAGEN
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
            src={
              propiedad
                .imagenPrincipal
            }
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
                          className="secondary-button"
                          disabled
                        >
                          Administrar
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
            <form
              className="form-card"
              onSubmit={
                agregarImagen
              }
            >
              <h3>
                Agregar imagen
              </h3>

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
                      <div className="property-gallery-image">
                        <img
                          src={
                            imagen.urlImagen
                          }
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

                        <span>
                          Origen:{" "}
                          {
                            imagen.origen
                          }
                        </span>

                        <span>
                          Orden:{" "}
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
                            Usar como portada
                          </button>
                        )}

                        {imagen.esPrincipal && (
                          <button
                            type="button"
                            className="secondary-button"
                            disabled
                          >
                            Portada actual
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

      return (
        <div className="property-card">
          <div className="property-image">
            {renderizarImagenPropiedad(
              propiedad,
              true
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
                <strong>
                  Tipo:
                </strong>{" "}
                {propiedad.tipo ||
                  "No especificado"}
              </span>

              <span>
                <strong>
                  Capacidad máxima:
                </strong>{" "}
                {
                  propiedad
                    .capacidadMaxima
                }{" "}
                huéspedes
              </span>

              <span>
                <strong>
                  Precio base:
                </strong>{" "}
                $
                {Number(
                  propiedad
                    .precioBase
                ).toLocaleString(
                  "es-AR"
                )}
              </span>

              {propiedad.fechaCreacion && (
                <span>
                  <strong>
                    Registrada en HostFlow:
                  </strong>{" "}
                  {new Date(
                    propiedad
                      .fechaCreacion
                  ).toLocaleDateString(
                    "es-AR"
                  )}
                </span>
              )}
            </div>

            {renderizarSituacionReserva(
              propiedad
            )}

            {renderizarGaleria(
              propiedad
            )}

            {renderizarCanales(
              propiedad
            )}

            <div className="property-actions">
              <button
                className="secondary-button"
                onClick={
                  volverAPropiedades
                }
              >
                Volver a propiedades
              </button>

              <button
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