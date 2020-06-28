import { Component, OnInit } from "@angular/core";
import { Client } from "@stomp/stompjs";
import * as SockJS from "sockjs-client";
import { Mensaje } from "./models/mensaje";

@Component({
  selector: "app-chat",
  templateUrl: "./chat.component.html",
  styleUrls: ["./chat.component.css"],
})
export class ChatComponent implements OnInit {

  private cliente: Client;
  conectado: boolean = false;
  mensaje: Mensaje = new Mensaje();
  mensajes: Mensaje[] = [];
  escribiendo: string;
  clienteId:string;

  constructor() {
    this.clienteId = 'id-'+new Date().getTime()+ '_' +Math.random().toString(36).substr(2);
  }

  ngOnInit(): void {

    this.cliente = new Client();

    this.cliente.webSocketFactory = () => {
      return new SockJS("http://localhost:8080/chat-websocket");
    };

    this.cliente.onConnect = (frame) => {

      console.log("desconectados" + !this.cliente.connected + " : " + frame);

      this.conectado = true;
      this.cliente.subscribe("/chat/mensaje", (e) => {
        let mensaje = JSON.parse(e.body) as Mensaje;
        mensaje.fecha = new Date(mensaje.fecha);

        if (!this.mensaje.colores && mensaje.tipo == "NUEVO_USUARIO" &&
          this.mensaje.username == mensaje.username) {
          this.mensaje.colores = mensaje.colores;
          //console.log(this.mensaje.colores);
        }

        this.mensajes.push(mensaje);
        //console.log(mensaje);
      });

      this.cliente.subscribe("/chat/escribiendo", (e) => {
        this.escribiendo = e.body;
        setTimeout(() => (this.escribiendo = ""), 3000);
      });

      //console.log(this.clienteId);    
      this.cliente.subscribe('/chat/historial/'+this.clienteId, e=> {
        const historial = JSON.parse(e.body) as Mensaje[];
        this.mensajes = historial.map(m =>{
          m.fecha = new Date(m.fecha);
          return m;
        }).reverse();
      });

      this.cliente.publish({destination:'/app/historial',body:this.clienteId});
      
      this.cliente.publish({ destination: "/app/mensaje",body: JSON.stringify(this.mensaje)});
    };

    this.cliente.onDisconnect = (frame) => {
     // console.log('Desconectados : '+!this.cliente.connected+' : '+frame);
      this.conectado = false;
      this.mensaje = new Mensaje();
      this.mensajes= [];
    };

  }

  conectar(): void { 
    this.mensaje.tipo = "NUEVO_USUARIO";
    this.cliente.activate();
  }

  desconectar(): void {
    this.cliente.deactivate();
  }

  enviarMensaje(): void {
    this.mensaje.tipo = "MENSAJE";
    this.cliente.publish({
      destination: "/app/mensaje",
      body: JSON.stringify(this.mensaje),
    });
    this.mensaje.texto = "";
  }

  escribiendoEvento(): void {
    this.cliente.publish({
      destination: "/app/escribiendo",
      body: this.mensaje.username,
    });
  }
}
