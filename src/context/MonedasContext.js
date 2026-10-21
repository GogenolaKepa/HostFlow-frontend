import {createContext,useContext} from 'react';
export const MonedasContext=createContext({estado:null,tarifas:[],error:'',recargar:async()=>{}});
export const useMonedas=()=>useContext(MonedasContext);
