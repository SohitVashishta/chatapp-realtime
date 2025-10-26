// src/services/signalRConnection.js
import * as signalR from '@microsoft/signalr';

const connection = new signalR.HubConnectionBuilder()
  .withUrl("https://chatapp-realtime-50bf.onrender.com/chathub")
  .withAutomaticReconnect()
  .build();

async function startConnection() {
  if (connection.state === signalR.HubConnectionState.Disconnected) {
    try {
      await connection.start();
      console.log("SignalR Connected.");
    } catch (err) {
      console.error("Connection failed: ", err);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return startConnection();
    }
  }
  return connection;
}

export { connection, startConnection };
