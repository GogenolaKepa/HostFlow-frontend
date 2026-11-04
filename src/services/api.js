import axios from "axios";
import { configurarAutenticacion } from "./session";
import {resolverBaseApi} from './configuracionApiPublica';

const api = axios.create({
  baseURL: resolverBaseApi({env:import.meta.env,ubicacion:window.location}),
  withCredentials: false,
});

configurarAutenticacion(api);

export default api;
