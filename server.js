const WebSocket = require('ws');
const express = require('express');
const http = require('http');

// Setup Express app
const app = express();
const server = http.createServer(app);

// Setup WebSocket server
const username = 'client 1'
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');

  // Listen for messages from clients
  ws.on('message', (message) => {
    const data = JSON.parse(message);

    // Broadcast the message to all other connected clients
    wss.clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
