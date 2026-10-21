import { useCallback, useEffect, useRef, useState } from "react";
import api from "../services/api";
import DetalleHuesped from "../components/huespedes/DetalleHuesped";

import {useBorradorProtegido,useProtectorBorradores} from '../context/BorradoresContext';
import {huespedVacio,formularioDesdeHuesped,payloadHuesped,listaHuespedesValida,guardadoHuespedValido,filtrarHuespedes} from '../services/formularioHuesped';

function Huespedes({ onVerReserva }) {
  const {protector}=useProtectorBorradores(),envio=useRef(false),vivo=useRef(true),consulta=useRef(null),baseFormulario=useRef(huespedVacio());
  const [guardando,setGuardando]=useState(false),[bloqueado,setBloqueado]=useState(false);
  const [busqueda,setBusqueda]=useState('');

  const [huespedes, setHuespedes] =
    useState([]);

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState("");

  const [mensaje, setMensaje] =
    useState("");

  const [
    mostrarFormulario,
    setMostrarFormulario,
  ] = useState(false);

  const [
    idHuespedEditando,
    setIdHuespedEditando,
  ] = useState(null);

  const [idDetalle, setIdDetalle] = useState(null);
  const visibles=filtrarHuespedes(huespedes,busqueda);

  const [formulario, setFormulario] =
    useState({
      nombre: "",
      apellido: "",
      email: "",
      telefono: "",
      dni: "",
      nacionalidad: "",
    });



  // =========================================================
  // OBTENER HUÉSPEDES
  // =========================================================

  const obtenerHuespedes=useCallback(async()=>{
    consulta.current?.abort();const c=new AbortController();consulta.current=c;
    try{
      const {data}=await api.get('/huespedes',{signal:c.signal});
      if(!listaHuespedesValida(data))throw Error('Listado de huéspedes incompleto.');
      if(!c.signal.aborted&&vivo.current){setHuespedes(data.huespedes);setError('');}
    }catch{if(!c.signal.aborted&&vivo.current)setError('No se pudieron acreditar los huéspedes. Podés recargar la lista.');}
    finally{if(!c.signal.aborted&&vivo.current)setCargando(false);}
  },[]);
  useEffect(()=>{vivo.current=true;obtenerHuespedes();return()=>{vivo.current=false;consulta.current?.abort();};},[obtenerHuespedes]);
  useBorradorProtegido(mostrarFormulario&&JSON.stringify(formulario)!==JSON.stringify(baseFormulario.current),guardando);

  const verHuesped = id => setIdDetalle(id);
  const cerrarDetalle = () => setIdDetalle(null);

  // =========================================================
  // FORMULARIO
  // =========================================================

  const manejarCambio=e=>{const {name,value}=e.target;setFormulario(actual=>({...actual,[name]:value}));};
  const limpiarFormulario=()=>{setFormulario(huespedVacio());baseFormulario.current=huespedVacio();setIdHuespedEditando(null);setMostrarFormulario(false);};
  const abrirFormularioNuevoHuesped=()=>protector.solicitar(()=>{
    if(envio.current)return;setMensaje('');setError('');setBloqueado(false);setIdHuespedEditando(null);
    const nuevo=huespedVacio();baseFormulario.current=nuevo;setFormulario(nuevo);setMostrarFormulario(true);
  });
  const editarHuesped=huesped=>protector.solicitar(()=>{
    if(envio.current)return;setMensaje('');setError('');setBloqueado(false);setIdHuespedEditando(huesped.idHuesped);
    const datos=formularioDesdeHuesped(huesped);baseFormulario.current=datos;setFormulario(datos);setMostrarFormulario(true);
  });
  const guardarHuesped=async e=>{
    e.preventDefault();if(envio.current||bloqueado)return;setError('');setMensaje('');let datos;
    try{datos=payloadHuesped(formulario,{emailRequerido:!idHuespedEditando||Boolean(baseFormulario.current.email)});}
    catch(error){setError(error.message);return;}
    envio.current=true;setGuardando(true);
    try{
      const respuesta=idHuespedEditando?await api.put('/huespedes/'+idHuespedEditando,datos):await api.post('/huespedes',datos);
      if(!guardadoHuespedValido(respuesta.data.huesped,datos,idHuespedEditando))throw Error('No se recibió confirmación completa del huésped.');
      if(!vivo.current)return;
      const g=respuesta.data.huesped;
      setHuespedes(actual=>actual.some(x=>x.idHuesped===g.idHuesped)?actual.map(x=>x.idHuesped===g.idHuesped?{...x,...g}:x):[...actual,g]);
      setMensaje(idHuespedEditando?'Huésped modificado correctamente.':'Huésped manual registrado correctamente.');
      limpiarFormulario();await obtenerHuespedes();
    }catch(error){
      if(!vivo.current)return;
      const incierto=!error.response||error.response.status===409||error.response.status>=500;
      if(incierto)setBloqueado(true);
      setError((error.response?.data?.mensaje||error.message||'No se pudo guardar el huésped.')+(incierto?' Recargá y comprobá el registro antes de reenviar; el error no prueba que no se guardó.':''));
    }finally{envio.current=false;if(vivo.current)setGuardando(false);}
  };

  // =========================================================
  // FORMATO
  // =========================================================

  const irAReserva = (
    idReserva
  ) => {
    // Guardamos la reserva seleccionada para que Reservas pueda
    // ubicarla y destacarla cuando conectemos la navegación desde App.
    window.sessionStorage.setItem(
      "hostflowReservaObjetivo",
      String(idReserva)
    );

    // Si App.jsx nos pasa el callback de navegación, lo usamos.
    // Si todavía no está conectado, la pantalla no se rompe.
    if (
      typeof onVerReserva ===
      "function"
    ) {
      onVerReserva(
        idReserva
      );
      return;
    }

    setMensaje(
      `Reserva #${idReserva} seleccionada.`
    );
  };

  // =========================================================
  // CARGA
  // =========================================================

  if (cargando) {
    return (
      <h2>
        Cargando huéspedes...
      </h2>
    );
  }

  return (
    <section className="huespedes-page">
      {/* =====================================================
          ENCABEZADO
      ====================================================== */}

      <div className="section-header">
        <div>
          <h2>
            Gestión de huéspedes
          </h2>

          <p>
            Huéspedes registrados
            manualmente o recibidos
            desde canales externos.
          </p>
        </div>

        <div className="page-actions">
        <button type="button" className="secondary-button" disabled={guardando} onClick={obtenerHuespedes}>Recargar huéspedes</button>
        <button
          className="primary-button"
          onClick={
            abrirFormularioNuevoHuesped
          }
        >
          Agregar huésped manual
        </button>
        </div>
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

      <div className="guest-search" role="search" aria-label="Buscar huéspedes">
        <div className="guest-search-field"><label htmlFor="buscar-huesped">Buscar huéspedes</label><input id="buscar-huesped" type="search" placeholder="Nombre, email, documento o ID" aria-describedby="buscar-huesped-ayuda" value={busqueda} onChange={e=>setBusqueda(e.target.value)} /><span id="buscar-huesped-ayuda">Podés combinar nombre y apellido, con o sin tildes.</span></div>
        <p role="status">{visibles.length} de {huespedes.length} huéspedes</p><button type="button" className="secondary-button" disabled={!busqueda} onClick={()=>setBusqueda('')}>Limpiar búsqueda</button>
      </div>
      {visibles.length===0&&<p className="guest-search-empty" role="status">{huespedes.length?'No hay huéspedes que coincidan con la búsqueda.':'Todavía no hay huéspedes registrados.'}</p>}
      {guardando&&<p role="status">Guardando huésped…</p>}
      {bloqueado&&<p role="alert">Guardado sin confirmación. No se reenvía automáticamente; comprobá el registro tras recargar.</p>}

      {/* =====================================================
          FORMULARIO
      ====================================================== */}

      {mostrarFormulario && (
        <form
          className="form-card"
          onSubmit={
            guardarHuesped
          }
        >
          <h3>
            {idHuespedEditando
              ? "Editar huésped"
              : "Registrar huésped manual"}
          </h3>

          <div className="form-grid">
            <div>
              <label htmlFor="huesped-nombre">
                Nombre
              </label>

              <input
                type="text"
                name="nombre"
                id="huesped-nombre" maxLength={100} disabled={guardando||bloqueado} required
                value={
                  formulario.nombre
                }
                placeholder="Ej: Juan"
                onChange={
                  manejarCambio
                }
              />
            </div>

            <div>
              <label htmlFor="huesped-apellido">
                Apellido
              </label>

              <input
                type="text"
                name="apellido"
                id="huesped-apellido" maxLength={100} disabled={guardando||bloqueado} required
                value={
                  formulario.apellido
                }
                placeholder="Ej: Pérez"
                onChange={
                  manejarCambio
                }
              />
            </div>

            <div>
              <label htmlFor="huesped-email">
                Email
              </label>

              <input
                type="email"
                name="email"
                id="huesped-email" maxLength={150} disabled={guardando||bloqueado} required={!idHuespedEditando||Boolean(baseFormulario.current.email)}
                value={
                  formulario.email
                }
                placeholder="Ej: hostflow@email.com"
                onChange={
                  manejarCambio
                }
              />
            </div>

            <div>
              <label htmlFor="huesped-telefono">
                Teléfono
              </label>

              <input
                type="text"
                name="telefono"
                id="huesped-telefono" maxLength={50} disabled={guardando||bloqueado}
                value={
                  formulario.telefono
                }
                placeholder="Ej: 3415555555"
                onChange={
                  manejarCambio
                }
              />
            </div>

            <div>
              <label htmlFor="huesped-dni">
                DNI
              </label>

              <input
                type="text"
                name="dni"
                id="huesped-dni" maxLength={100} disabled={guardando||bloqueado}
                value={
                  formulario.dni
                }
                placeholder="Ej: 40123456"
                onChange={
                  manejarCambio
                }
              />
            </div>

            <div>
              <label htmlFor="huesped-nacionalidad">
                Nacionalidad
              </label>

              <input
                type="text"
                name="nacionalidad"
                id="huesped-nacionalidad" maxLength={100} disabled={guardando||bloqueado}
                value={
                  formulario.nacionalidad
                }
                placeholder="Ej: Argentina"
                onChange={
                  manejarCambio
                }
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="primary-button" disabled={guardando||bloqueado}
            >
              {idHuespedEditando
                ? "Guardar cambios"
                : "Guardar huésped"}
            </button>

            <button
              type="button"
              className="secondary-button" disabled={guardando}
              onClick={
                () => protector.solicitar(limpiarFormulario)
              }
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* =====================================================
          DETALLE DEL HUÉSPED
      ====================================================== */}

      {idDetalle !== null && <DetalleHuesped idHuesped={idDetalle} onClose={cerrarDetalle} onVerReserva={irAReserva} />}

      {/* =====================================================
          LISTADO
      ====================================================== */}

      <div className="table-card huespedes-desktop-list">
        <table>
          <thead>
            <tr>
              <th>
                Huésped
              </th>

              <th>
                Contacto
              </th>

              <th>
                Origen
              </th>

              <th>
                Reservas
              </th>

              <th>
                Situación
              </th>

              <th>
                Acciones
              </th>
            </tr>
          </thead>

          <tbody>
            {visibles.map(
              (huesped) => (
                <tr
                  key={
                    huesped.idHuesped
                  }
                >
                  <td>
                    <strong>
                      {
                        huesped.nombre
                      }{" "}
                      {
                        huesped.apellido
                      }
                    </strong>
                  </td>

                  <td>
                    <div className="guest-contact">
                      <span>
                        {
                          huesped.email
                        }
                      </span>

                      <span>
                        {
                          huesped.telefono
                        }
                      </span>
                    </div>
                  </td>

                  <td>
                    <span
                      className={`channel-badge channel-${huesped.origenRegistro.toLowerCase()}`}
                    >
                      {
                        huesped.origenRegistro
                      }
                    </span>
                  </td>

                  <td>
                    {
                      huesped.cantidadReservas
                    }
                  </td>

                  <td>
                    <span className="guest-status">
                      {
                        huesped.situacion
                      }
                    </span>
                  </td>

                  <td>
                    <div className="table-actions">
                      <button
                        className="secondary-button"
                        onClick={() =>
                          verHuesped(
                            huesped.idHuesped
                          )
                        }
                      >
                        Ver huésped
                      </button>

                      <button
                        className="secondary-button"
                        onClick={() =>
                          editarHuesped(
                            huesped
                          )
                        }
                      >
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      <div className="huespedes-mobile-list">
        {visibles.map(
          (
            huesped
          ) => (
            <article
              key={`mobile-${huesped.idHuesped}`}
              className="huesped-mobile-card"
            >
              <div className="huesped-mobile-card-top">
                <div className="huesped-mobile-identidad">
                  <span className="huesped-mobile-avatar">
                    {String(
                      huesped.nombre ||
                        "H"
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </span>

                  <div>
                    <h3>
                      {
                        huesped.nombre
                      }{" "}
                      {
                        huesped.apellido
                      }
                    </h3>

                    <span
                      className={`channel-badge channel-${String(
                        huesped.origenRegistro
                      ).toLowerCase()}`}
                    >
                      {
                        huesped.origenRegistro
                      }
                    </span>
                  </div>
                </div>

                <span className="guest-status huesped-mobile-status">
                  {
                    huesped.situacion
                  }
                </span>
              </div>

              <div className="huesped-mobile-contacto">
                <div>
                  <span>
                    Email
                  </span>

                  <strong>
                    {
                      huesped.email
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Teléfono
                  </span>

                  <strong>
                    {
                      huesped.telefono
                    }
                  </strong>
                </div>
              </div>

              <div className="huesped-mobile-meta">
                <div>
                  <span>
                    Reservas
                  </span>

                  <strong>
                    {
                      huesped.cantidadReservas
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Situación
                  </span>

                  <strong>
                    {
                      huesped.situacion
                    }
                  </strong>
                </div>
              </div>

              <div className="huesped-mobile-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    verHuesped(
                      huesped.idHuesped
                    )
                  }
                >
                  Ver huésped
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    editarHuesped(
                      huesped
                    )
                  }
                >
                  Editar
                </button>
              </div>
            </article>
          )
        )}
      </div>
    </section>
  );
}

export default Huespedes;
