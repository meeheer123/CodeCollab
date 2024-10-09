const WebSocket = require('ws');
const url = require('url');

// Create WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

// Object to keep track of rooms and the clients in each room
const rooms = {};

// Function to handle joining a room
const joinRoom = (roomName, ws) => {
  // Create the room if it doesn't exist
  if (!rooms[roomName]) {
    rooms[roomName] = new Set();
  }

  // Add the client to the room
  rooms[roomName].add(ws);

  // Handle client disconnection
  ws.on('close', () => {
    rooms[roomName].delete(ws);
    if (rooms[roomName].size === 0) {
      delete rooms[roomName]; // Delete the room if empty
    }
  });
};

// Broadcast message to all clients in the room except the sender
const broadcastToRoom = (roomName, message, sender) => {
  if (rooms[roomName]) {
    rooms[roomName].forEach(client => {
      if (client !== sender && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
};

// Handle WebSocket connection
wss.on('connection', (ws, req) => {
  const queryParams = url.parse(req.url, true).query;
  const roomName = queryParams.room || 'default'; // Default room if none provided

  console.log(`Client connected to room: ${roomName}`);
  joinRoom(roomName, ws);

  // Handle incoming messages from clients
  ws.on('message', (message) => {
    console.log(`Received message in room ${roomName}: ${message}`);
    // Broadcast the message to others in the same room
    broadcastToRoom(roomName, message, ws);
  });

  // Notify when a client disconnects
  ws.on('close', () => {
    console.log(`Client disconnected from room: ${roomName}`);
  });
});

console.log('WebSocket server is running on ws://localhost:8080');
